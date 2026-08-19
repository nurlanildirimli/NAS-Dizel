export type AiUsageFeature = 'professional_note' | 'transcription';
export type AiUsageStatus = 'success' | 'error';
export type AiUsageFilter = 'all' | AiUsageFeature | 'errors';

export type AiUsageLog = {
  id: string;
  feature: AiUsageFeature;
  functionName: string;
  model: string;
  status: AiUsageStatus;
  inputTokens: number | null;
  outputTokens: number | null;
  audioSeconds: number | null;
  estimatedCostUsd: number;
  retryCount: number;
  errorSummary: string | null;
  createdAt: string;
};

export type AiUsagePeriodSummary = {
  requestCount: number;
  successCount: number;
  errorCount: number;
  estimatedCostUsd: number;
};

export type AiUsageSummary = {
  today: AiUsagePeriodSummary;
  month: AiUsagePeriodSummary;
  all: AiUsagePeriodSummary;
};
