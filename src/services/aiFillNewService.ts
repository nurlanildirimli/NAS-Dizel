import {
  aiFillNewServiceRequestSchema,
  aiFillNewServiceResponseSchema,
  type AiFillNewServiceRequest,
  type AiFillNewServiceResponse,
} from '../schemas/aiFillNewService';
import { supabase } from '../lib/supabase';

export async function fillNewServiceWithAi(input: AiFillNewServiceRequest): Promise<AiFillNewServiceResponse> {
  const request = aiFillNewServiceRequestSchema.parse(input);
  const { data, error } = await supabase.functions.invoke('ai-fill-new-service', {
    body: request,
  });

  if (error) {
    throw error;
  }

  return aiFillNewServiceResponseSchema.parse(data);
}
