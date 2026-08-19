import { z } from 'zod';

export const serviceNoteTranscriptionResponseSchema = z.object({
  transcript: z.string(),
  warnings: z.array(z.string()),
});

export type ServiceNoteTranscriptionResponse = z.infer<typeof serviceNoteTranscriptionResponseSchema>;
