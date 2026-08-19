import { File, UploadType } from 'expo-file-system';

import { serviceNoteTranscriptionResponseSchema } from '../schemas/serviceNoteTranscription';
import { toAiServiceError } from '../utils/aiErrors';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function getAudioFileName(uri: string) {
  return uri.split('/').pop() || `service-note-${Date.now()}.m4a`;
}

function getAudioMimeType(uri: string) {
  const lowerUri = uri.toLowerCase();
  if (lowerUri.endsWith('.webm')) {
    return 'audio/webm';
  }
  if (lowerUri.endsWith('.3gp')) {
    return 'audio/3gpp';
  }
  return 'audio/m4a';
}

function getResponseError(data: unknown) {
  if (
    data
    && typeof data === 'object'
    && 'error' in data
    && typeof data.error === 'string'
  ) {
    return data.error;
  }

  return 'Audio transcription failed.';
}

export async function transcribeServiceNoteAudio(uri: string, durationMs?: number) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  try {
    const file = new File(uri);
    const response = await file.upload(`${supabaseUrl}/functions/v1/ai-transcribe-service-note`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'audio',
      mimeType: getAudioMimeType(uri),
      parameters: {
        filename: getAudioFileName(uri),
        durationSeconds: String(Math.max(0, Math.round((durationMs ?? 0) / 100) / 10)),
      },
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
    });

    let data: unknown;
    try {
      data = JSON.parse(response.body);
    } catch {
      data = { error: response.body };
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(getResponseError(data));
    }

    return serviceNoteTranscriptionResponseSchema.parse(data);
  } catch (error) {
    throw toAiServiceError(error);
  }
}
