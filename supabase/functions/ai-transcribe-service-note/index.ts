declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const functionName = 'ai-transcribe-service-note';
const featureName = 'transcription';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'gpt-4o-mini-transcribe';

  if (!apiKey) {
    await logAiUsage({
      feature: featureName,
      functionName,
      model,
      status: 'error',
      errorSummary: 'OPENAI_API_KEY is not configured',
    });
    return jsonResponse({ error: 'OPENAI_API_KEY is not configured' }, 500);
  }

  let retryCount = 0;
  let audioSeconds: number | null = null;

  try {
    const formData = await request.formData() as unknown as { get: (name: string) => FormDataEntryValue | null };
    const audio = formData.get('audio');
    audioSeconds = parseDurationSeconds(formData.get('durationSeconds'));

    if (!(audio instanceof File)) {
      await logAiUsage({
        feature: featureName,
        functionName,
        model,
        status: 'error',
        audioSeconds,
        errorSummary: 'audio file is required',
      });
      return jsonResponse({ error: 'audio file is required' }, 400);
    }

    const openAiFormData = new FormData();
    openAiFormData.append('file', audio, audio.name || 'service-note.m4a');
    openAiFormData.append('model', model);
    openAiFormData.append('language', 'az');
    openAiFormData.append(
      'prompt',
      [
        'Diesel Common Rail injector workshop note in Azerbaijani.',
        'Mechanic may say forsunka, farsunka, farsonka, injector, stend, sökülmə, qapaq, valf, iynə, şayba.',
        'Important injector brands: Bosch, Delphi, Denso, Siemens.',
        'If speech sounds like "boş" near "forsunka/injector markası", transcribe it as "Bosch", not the Azerbaijani word "boş".',
        'Also preserve brand names in Latin script: Bosch, Delphi, Denso, Siemens.',
        'Transcribe accurately. Do not summarize.',
      ].join(' '),
    );

    const openAiResult = await fetchOpenAiWithRetry('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiFormData,
    });
    retryCount = openAiResult.retryCount;
    const openAiResponse = openAiResult.response;

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      await logAiUsage({
        feature: featureName,
        functionName,
        model,
        status: 'error',
        audioSeconds,
        estimatedCostUsd: estimateTranscriptionCost(audioSeconds),
        retryCount,
        errorSummary: errorText,
      });
      return jsonResponse({ error: errorText }, openAiResponse.status);
    }

    const data = await openAiResponse.json();
    const transcript = typeof data.text === 'string' ? data.text.trim() : '';

    if (!transcript) {
      await logAiUsage({
        feature: featureName,
        functionName,
        model,
        status: 'error',
        audioSeconds,
        estimatedCostUsd: estimateTranscriptionCost(audioSeconds),
        retryCount,
        errorSummary: 'OpenAI transcription response was empty',
      });
      return jsonResponse({
        transcript: '',
        warnings: ['Səs yazısı mətinə çevrilmədi. Yazını yenidən yoxlayın.'],
      }, 200);
    }

    await logAiUsage({
      feature: featureName,
      functionName,
      model,
      status: 'success',
      audioSeconds,
      estimatedCostUsd: estimateTranscriptionCost(audioSeconds),
      retryCount,
    });

    return jsonResponse({ transcript, warnings: [] }, 200);
  } catch (error) {
    await logAiUsage({
      feature: featureName,
      functionName,
      model,
      status: 'error',
      audioSeconds,
      retryCount,
      errorSummary: error instanceof Error ? error.message : 'Unknown error',
    });
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function fetchOpenAiWithRetry(url: string, init: RequestInit): Promise<{ response: Response; retryCount: number }> {
  let retryCount = 0;

  try {
    const response = await fetch(url, init);
    if (!isTransientStatus(response.status)) {
      return { response, retryCount };
    }

    await delay(500);
    retryCount = 1;
    return { response: await fetch(url, init), retryCount };
  } catch (error) {
    await delay(500);
    retryCount = 1;
    try {
      return { response: await fetch(url, init), retryCount };
    } catch {
      throw error;
    }
  }
}

function isTransientStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDurationSeconds(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function estimateTranscriptionCost(audioSeconds: number | null) {
  const rate = getNumberEnv('OPENAI_TRANSCRIBE_USD_PER_MINUTE', 0.003);
  return ((audioSeconds ?? 0) / 60) * rate;
}

function getNumberEnv(key: string, fallback: number) {
  const value = Number(Deno.env.get(key));
  return Number.isFinite(value) ? value : fallback;
}

async function logAiUsage(input: {
  feature: string;
  functionName: string;
  model: string;
  status: 'success' | 'error';
  inputTokens?: number | null;
  outputTokens?: number | null;
  audioSeconds?: number | null;
  estimatedCostUsd?: number;
  retryCount?: number;
  errorSummary?: string;
}) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/ai_usage_logs`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        feature: input.feature,
        function_name: input.functionName,
        model: input.model,
        status: input.status,
        input_tokens: input.inputTokens ?? null,
        output_tokens: input.outputTokens ?? null,
        audio_seconds: input.audioSeconds ?? null,
        estimated_cost_usd: Number((input.estimatedCostUsd ?? 0).toFixed(6)),
        retry_count: input.retryCount ?? 0,
        error_summary: input.errorSummary ? truncate(input.errorSummary, 500) : null,
      }),
    });
  } catch {
    // Usage logging is best-effort and must not break transcription.
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
