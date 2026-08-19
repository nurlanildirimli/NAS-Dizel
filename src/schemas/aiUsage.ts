import { z } from 'zod';

export const aiUsageLogRowSchema = z.object({
  id: z.string().uuid(),
  feature: z.enum(['professional_note', 'transcription']),
  function_name: z.string(),
  model: z.string(),
  status: z.enum(['success', 'error']),
  input_tokens: z.number().nullable(),
  output_tokens: z.number().nullable(),
  audio_seconds: z.union([z.string(), z.number()]).nullable(),
  estimated_cost_usd: z.union([z.string(), z.number()]),
  retry_count: z.number(),
  error_summary: z.string().nullable(),
  created_at: z.string(),
});

export const aiUsageLogRowsSchema = z.array(aiUsageLogRowSchema);
