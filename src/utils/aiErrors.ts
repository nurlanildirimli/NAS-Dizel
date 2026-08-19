export class AiServiceError extends Error {
  userMessage: string;
  technicalDetail: string;

  constructor(userMessage: string, technicalDetail: string) {
    super(userMessage);
    this.name = 'AiServiceError';
    this.userMessage = userMessage;
    this.technicalDetail = technicalDetail;
  }
}

export function toAiServiceError(error: unknown): AiServiceError {
  if (error instanceof AiServiceError) {
    return error;
  }

  const detail = getTechnicalDetail(error);
  const lowerDetail = detail.toLowerCase();

  if (lowerDetail.includes('network request failed') || lowerDetail.includes('failed to fetch')) {
    return new AiServiceError('İnternet bağlantısı yoxlanıla bilmədi.', detail);
  }

  if (lowerDetail.includes('rate limit') || lowerDetail.includes('429')) {
    return new AiServiceError('AI xidməti hazırda çox yüklənib. Bir az sonra yenidən yoxlayın.', detail);
  }

  if (lowerDetail.includes('function') && lowerDetail.includes('not found')) {
    return new AiServiceError('AI funksiyası tapılmadı. Supabase funksiyalarını yenidən deploy edin.', detail);
  }

  if (lowerDetail.includes('schema') || lowerDetail.includes('invalid_type') || lowerDetail.includes('parse')) {
    return new AiServiceError('AI cavabı düzgün formatda gəlmədi. Yenidən yoxlayın.', detail);
  }

  if (lowerDetail.includes('openai_api_key')) {
    return new AiServiceError('OpenAI açarı Supabase-də düzgün qurulmayıb.', detail);
  }

  return new AiServiceError('AI əməliyyatı tamamlanmadı. Yenidən yoxlayın.', detail);
}

export function formatAiError(error: unknown) {
  const aiError = toAiServiceError(error);
  return `${aiError.userMessage}\n${aiError.technicalDetail}`;
}

function getTechnicalDetail(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error) {
    return error;
  }

  return 'Naməlum xəta';
}
