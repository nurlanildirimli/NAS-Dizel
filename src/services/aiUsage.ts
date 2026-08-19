import { z } from 'zod';

import { supabase } from '../lib/supabase';
import { aiUsageLogRowsSchema, aiUsageLogRowSchema } from '../schemas/aiUsage';
import {
  type AiUsageFilter,
  type AiUsageLog,
  type AiUsagePeriodSummary,
  type AiUsageSummary,
} from '../types/aiUsage';

type AiUsageLogRow = z.infer<typeof aiUsageLogRowSchema>;

function toNumber(value: string | number | null): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapAiUsageLog(row: AiUsageLogRow): AiUsageLog {
  return {
    id: row.id,
    feature: row.feature,
    functionName: row.function_name,
    model: row.model,
    status: row.status,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    audioSeconds: toNumber(row.audio_seconds),
    estimatedCostUsd: toNumber(row.estimated_cost_usd) ?? 0,
    retryCount: row.retry_count,
    errorSummary: row.error_summary,
    createdAt: row.created_at,
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function summarize(logs: AiUsageLog[]): AiUsagePeriodSummary {
  return logs.reduce<AiUsagePeriodSummary>((summary, log) => ({
    requestCount: summary.requestCount + 1,
    successCount: summary.successCount + (log.status === 'success' ? 1 : 0),
    errorCount: summary.errorCount + (log.status === 'error' ? 1 : 0),
    estimatedCostUsd: summary.estimatedCostUsd + log.estimatedCostUsd,
  }), {
    requestCount: 0,
    successCount: 0,
    errorCount: 0,
    estimatedCostUsd: 0,
  });
}

export async function listAiUsageLogs(filter: AiUsageFilter = 'all'): Promise<AiUsageLog[]> {
  let query = supabase
    .from('ai_usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter === 'errors') {
    query = query.eq('status', 'error');
  } else if (filter !== 'all') {
    query = query.eq('feature', filter);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return aiUsageLogRowsSchema.parse(data ?? []).map(mapAiUsageLog);
}

export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    throw error;
  }

  const logs = aiUsageLogRowsSchema.parse(data ?? []).map(mapAiUsageLog);
  const todayStart = startOfToday();
  const monthStart = startOfMonth();

  return {
    today: summarize(logs.filter((log) => log.createdAt >= todayStart)),
    month: summarize(logs.filter((log) => log.createdAt >= monthStart)),
    all: summarize(logs),
  };
}
