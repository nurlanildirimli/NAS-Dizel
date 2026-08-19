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

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'vehicle',
    'injector',
    'details',
    'injectorProblems',
    'payment',
    'problemCustomer',
    'warnings',
  ],
  properties: {
    vehicle: {
      type: 'object',
      additionalProperties: false,
      required: ['licensePlate', 'brand', 'phone', 'mileage', 'problemDescription'],
      properties: {
        licensePlate: { type: ['string', 'null'] },
        brand: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        mileage: { type: ['integer', 'null'], minimum: 1 },
        problemDescription: { type: ['string', 'null'] },
      },
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
    details: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'optionName', 'itemType', 'injectorNumbers', 'price'],
        properties: {
          name: { type: 'string' },
          optionName: { type: ['string', 'null'] },
          itemType: { type: ['string', 'null'], enum: ['labor', 'part', null] },
          injectorNumbers: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 8 },
          },
          price: { type: ['number', 'null'], minimum: 0 },
        },
      },
    },
    injectorProblems: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['injectorNumbers', 'problems', 'note'],
        properties: {
          injectorNumbers: {
            type: 'array',
            items: { type: 'integer', minimum: 1, maximum: 8 },
          },
          problems: {
            type: 'array',
            items: { type: 'string' },
          },
          note: { type: ['string', 'null'] },
        },
      },
    },
    payment: {
      type: 'object',
      additionalProperties: false,
      required: ['discountAmount', 'discountedPrice', 'paidAmount', 'note'],
      properties: {
        discountAmount: { type: ['number', 'null'], minimum: 0 },
        discountedPrice: { type: ['number', 'null'], minimum: 0 },
        paidAmount: { type: ['number', 'null'], minimum: 0 },
        note: { type: ['string', 'null'] },
      },
    },
    problemCustomer: {
      type: 'object',
      additionalProperties: false,
      required: ['isProblemCustomer', 'problemReason'],
      properties: {
        isProblemCustomer: { type: ['boolean', 'null'] },
        problemReason: { type: ['string', 'null'] },
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
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

  if (!apiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY is not configured' }, 500);
  }

  try {
    const body = await request.json();
    const instructions = String(body.instructions ?? '').trim();
    const currentInjectorCount = Number(body.currentInjectorCount) || 4;
    const catalogDetails = Array.isArray(body.catalogDetails) ? body.catalogDetails : [];

    if (!instructions) {
      return jsonResponse({ error: 'instructions is required' }, 400);
    }

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: [
                  'You extract Azerbaijani workshop service instructions into JSON.',
                  'Return only fields that are supported by the schema.',
                  'Never invent database ids.',
                  'Use injector company only from Bosch, Delphi, Denso, Siemens.',
                  'If count is missing, use the current injector count.',
                  'If a phrase says all injectors, bütün injectorlar, hamısı, or every injector, return injector numbers 1..count.',
                  'Normalize item names toward the provided catalog labels when possible.',
                  'Sökülmə is labor. İynə/Nozzle and Qapaq/Klapan are parts.',
                  'Yeni Çin iynə means item İynə with option Çin iynə.',
                  'A stated discount like 10 AZN endirim is payment.discountAmount.',
                  'If the user states a final after-discount price, use payment.discountedPrice and add a warning.',
                  'Example: "bütün injectorlarda sökülmə oldu" means one Sökülmə detail for injectorNumbers 1..count.',
                  'Example: "1-ci və 3-cü injectorda" means injectorNumbers [1, 3].',
                  'Example: "2, 3, 4-cü injectorlarda" means injectorNumbers [2, 3, 4].',
                  'Example: "Ümumi qiymətə 10 AZN endirim edildi" means payment.discountAmount is 10.',
                  'If unsure, set nullable fields to null and add a short Azerbaijani warning.',
                ].join(' '),
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: JSON.stringify({
                  currentInjectorCount,
                  supportedCatalogDetails: catalogDetails,
                  instructions,
                }),
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'new_service_ai_fill',
            strict: true,
            schema: responseSchema,
          },
        },
      }),
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();
      return jsonResponse({ error: errorText }, openAiResponse.status);
    }

    const data = await openAiResponse.json();
    const outputText = extractOutputText(data);

    if (!outputText) {
      return jsonResponse({ error: 'OpenAI response did not include JSON output' }, 502);
    }

    return jsonResponse(JSON.parse(outputText), 200);
  } catch (error) {
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
