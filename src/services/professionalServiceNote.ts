import {
  professionalServiceNoteRequestSchema,
  professionalServiceNoteResponseSchema,
  type ProfessionalServiceNoteRequest,
  type ProfessionalServiceNoteResponse,
} from '../schemas/professionalServiceNote';
import { supabase } from '../lib/supabase';
import { toAiServiceError } from '../utils/aiErrors';

export async function generateProfessionalServiceNote(
  input: ProfessionalServiceNoteRequest,
): Promise<ProfessionalServiceNoteResponse> {
  const request = professionalServiceNoteRequestSchema.parse(input);
  try {
    const { data, error } = await supabase.functions.invoke('ai-professional-service-note', {
      body: request,
    });

    if (error) {
      throw error;
    }

    return professionalServiceNoteResponseSchema.parse(data);
  } catch (error) {
    throw toAiServiceError(error);
  }
}
