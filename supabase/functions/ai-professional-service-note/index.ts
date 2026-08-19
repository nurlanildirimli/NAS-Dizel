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

const functionName = 'ai-professional-service-note';
const featureName = 'professional_note';

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'professionalText',
    'priceLines',
    'priceTotal',
    'priceTotalSource',
    'detectedOperations',
    'warnings',
    'missingInfo',
    'injector',
  ],
  properties: {
    professionalText: { type: 'string' },
    priceLines: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'amount', 'source', 'scope'],
        properties: {
          name: { type: 'string' },
          amount: { type: 'number', minimum: 0 },
          source: { type: 'string', enum: ['spoken', 'catalog', 'unmatched'] },
          scope: { type: 'string' },
        },
      },
    },
    priceTotal: { type: 'number', minimum: 0 },
    priceTotalSource: { type: 'string', enum: ['stated_total', 'stated_lines', 'catalog', 'none'] },
    detectedOperations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'itemType',
          'injectorNumbers',
          'appliesToAllInjectors',
          'quantity',
          'statedPrice',
          'sourceText',
        ],
        properties: {
          name: { type: 'string' },
          itemType: { type: ['string', 'null'], enum: ['labor', 'part', 'extra', 'unknown', null] },
          injectorNumbers: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 8 },
          },
          appliesToAllInjectors: { type: 'boolean' },
          quantity: { type: ['number', 'null'], minimum: 0 },
          statedPrice: { type: ['number', 'null'], minimum: 0 },
          sourceText: { type: 'string' },
        },
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    missingInfo: {
      type: 'array',
      items: { type: 'string' },
    },
    injector: {
      type: 'object',
      additionalProperties: false,
      required: ['count', 'company', 'code'],
      properties: {
        count: { type: ['integer', 'null'], minimum: 1, maximum: 8 },
        company: { type: ['string', 'null'], enum: ['Bosch', 'Delphi', 'Denso', 'Siemens', null] },
        code: { type: ['string', 'null'] },
      },
    },
  },
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_TEXT_MODEL') ?? 'gpt-5.6-luna';

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

  try {
    const body = await request.json();
    const vehicle = body.vehicle ?? {};
    const rawNote = String(body.rawNote ?? '').trim();

    if (!rawNote) {
      await logAiUsage({
        feature: featureName,
        functionName,
        model,
        status: 'error',
        errorSummary: 'rawNote is required',
      });
      return jsonResponse({ error: 'rawNote is required' }, 400);
    }

    const openAiResult = await fetchOpenAiWithRetry('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: [{
              type: 'input_text',
              text: [
                'You write clean Azerbaijani professional service notes for a diesel common rail injector workshop.',
                'The mechanic may use informal Azerbaijani, Turkish, Russian, or misspelled workshop words.',
                'Normalize terms like farsonka/farsunka/forsunka/injector to "forsunka" or "injector" naturally in Azerbaijani.',
                'Known injector brands are Bosch, Delphi, Denso, and Siemens. Preserve these names in Latin script.',
                'Speech transcription may incorrectly write Bosch as Azerbaijani "boş". If raw note says "forsunkanın markası boş", "farsunkanın markası boş", "injector markası boş", or similar, interpret it as "injector brand Bosch" and set injector.company to "Bosch". Do not write "boş" as a brand.',
                'Write concise professional text that a customer and workshop can understand later.',
                'Do not invent work that was not stated.',
                'Extract stated mechanic prices as priceLines and sum them into priceTotal.',
                'Mechanic-stated prices are the charged prices. Do not replace them with catalog or estimated prices.',
                'If a total price is stated, set priceTotalSource to "stated_total". If only item prices are stated, set priceTotalSource to "stated_lines".',
                'If no price is stated, set priceTotal to 0, priceTotalSource to "none", and add a warning.',
                'Also extract every service operation into detectedOperations, even when no price is stated.',
                'For detectedOperations, use itemType labor for work such as sökülmə/taxma/stend/test; part for replaced parts such as iynə/qapaq/şayba/filter.',
                'For all-injector operations, set appliesToAllInjectors true and leave injectorNumbers empty unless specific numbers are stated.',
                'For selected operations, put the explicit injector numbers into injectorNumbers.',
                'For quantity, use stated count when present; otherwise null. For statedPrice, use the exact price for that operation when present; otherwise null.',
                'Detect injector count, company, and code only when explicitly stated, except the Bosch/"boş" transcription correction above.',
                'If important diesel-injector info is missing, add short Azerbaijani missingInfo items.',
                'Important info includes injector count, injector company/code, which injector had the problem, and whether payment was made.',
                'Understand "bütün forsunkalarda", "hamısında", and "dördünün də" as all injectors when injector count is known.',
                'Understand "1-ci forsunkada", "birinci forsunkada", "1-ci və 3-cü", and "2, 3, 4-cü forsunkalarda" as selected injector references.',
                'Normalize "valf", "klapan", and "qapaq" as qapaq/valf replacement context.',
                'Normalize "şayba", "sayba", "iynə", "iyne", "nozzle", "sökülmə", "sokulme", "sökdük", and "stenddə yoxladıq" naturally in the professional text.',
                'For examples: "valfi dəyişdik 100 manata" becomes a price line "Valf dəyişdirildi" amount 100.',
                'For examples: "dördünün də şaybasını dəyişdik 10 manata" becomes a price line "Dörd forsunkanın şaybası dəyişdirildi" amount 10.',
                'For examples: "ümumi qiymət 110 manat" sets priceTotal to 110 and may use one price line "Ümumi məbləğ" amount 110.',
                'For examples: "bütün forsunkalarda sökülmə oldu" creates detectedOperations name "Sökülmə", itemType "labor", appliesToAllInjectors true.',
                'For examples: "1-ci forsunkada yeni Çin iynə qoyuldu" creates detectedOperations name "Çin iynə", itemType "part", injectorNumbers [1].',
                'For examples: "2, 3, 4-cü forsunkalarda stenddə yoxlama edildi" creates detectedOperations name "Stenddə yoxlama", itemType "labor", injectorNumbers [2,3,4].',
                'Return strict JSON only.',
              ].join(' '),
            }],
          },
          {
            role: 'user',
            content: [{
              type: 'input_text',
              text: JSON.stringify({
                vehicle,
                rawNote,
                desiredStyleExample: [
                  'Avtomobil: 50-BD-930',
                  'Avtomobilin forsunkaları sökülərək stenddə yoxlanıldı.',
                  'Yoxlama zamanı müəyyən olundu ki, forsunkalardan biri geri dönüş verir, digər üç forsunkanın işlək olduğu təsdiqləndi.',
                  'Geri dönüş verən forsunkanın valfi dəyişdirildi - 100 AZN.',
                  'Forsunkalar yerinə quraşdırıldı və dörd forsunkanın şaybası yenisi ilə əvəz edildi - 10 AZN.',
                  'Ümumi məbləğ: 110 AZN.',
                ].join('\n'),
              }),
            }],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'professional_service_note',
            strict: true,
            schema: responseSchema,
          },
        },
      }),
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
        retryCount,
        errorSummary: errorText,
      });
      return jsonResponse({ error: errorText }, openAiResponse.status);
    }

    const data = await openAiResponse.json();
    const outputText = extractOutputText(data);
    const usage = extractTextUsage(data);

    if (!outputText) {
      await logAiUsage({
        feature: featureName,
        functionName,
        model,
        status: 'error',
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: estimateTextCost(usage.inputTokens, usage.outputTokens),
        retryCount,
        errorSummary: 'OpenAI response did not include JSON output',
      });
      return jsonResponse({ error: 'OpenAI response did not include JSON output' }, 502);
    }

    await logAiUsage({
      feature: featureName,
      functionName,
      model,
      status: 'success',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd: estimateTextCost(usage.inputTokens, usage.outputTokens),
      retryCount,
    });

    return jsonResponse(JSON.parse(outputText), 200);
  } catch (error) {
    await logAiUsage({
      feature: featureName,
      functionName,
      model,
      status: 'error',
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

function extractOutputText(data: { output_text?: string; output?: Array<{ content?: Array<{ text?: string }> }> }) {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  return data.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => typeof text === 'string' && text.length > 0);
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

function extractTextUsage(data: { usage?: { input_tokens?: number; output_tokens?: number } }) {
  return {
    inputTokens: typeof data.usage?.input_tokens === 'number' ? data.usage.input_tokens : null,
    outputTokens: typeof data.usage?.output_tokens === 'number' ? data.usage.output_tokens : null,
  };
}

function estimateTextCost(inputTokens: number | null, outputTokens: number | null) {
  const inputRate = getNumberEnv('OPENAI_TEXT_INPUT_USD_PER_1M', 0.20);
  const outputRate = getNumberEnv('OPENAI_TEXT_OUTPUT_USD_PER_1M', 1.20);
  return ((inputTokens ?? 0) / 1_000_000 * inputRate) + ((outputTokens ?? 0) / 1_000_000 * outputRate);
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
    // Usage logging is best-effort and must not break AI generation.
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
