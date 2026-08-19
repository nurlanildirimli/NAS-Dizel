import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Bot } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../src/components/layout';
import { Button, Card, FilterPill } from '../src/components/ui';
import { getAiUsageSummary, listAiUsageLogs } from '../src/services/aiUsage';
import { colors, spacing } from '../src/theme';
import { type AiUsageFeature, type AiUsageFilter, type AiUsageLog } from '../src/types/aiUsage';

const filters: Array<{ label: string; key: AiUsageFilter }> = [
  { label: 'Hamısı', key: 'all' },
  { label: 'Servis mətni', key: 'professional_note' },
  { label: 'Səsdən mətnə', key: 'transcription' },
  { label: 'Xətalar', key: 'errors' },
];

export default function AiUsageScreen() {
  const [filterKey, setFilterKey] = useState<AiUsageFilter>('all');
  const summaryQuery = useQuery({
    queryKey: ['ai-usage', 'summary'],
    queryFn: getAiUsageSummary,
  });
  const logsQuery = useQuery({
    queryKey: ['ai-usage', 'logs', filterKey],
    queryFn: () => listAiUsageLogs(filterKey),
  });

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header
        title="AI istifadəsi"
        icon={Bot}
        compact
        action={(
          <Button title="Əvvəlki" variant="secondary" size="compact" icon={ArrowLeft} onPress={() => router.back()} />
        )}
      />
      <PagePanel edgeToEdge compact fill>
        {summaryQuery.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {summaryQuery.isError ? (
          <Card>
            <View style={styles.state}>
              <Text style={styles.title}>Məlumat yüklənmədi</Text>
              <Button title="Yenidən yoxla" onPress={() => summaryQuery.refetch()} />
            </View>
          </Card>
        ) : null}

        {summaryQuery.data ? (
          <View style={styles.summaryGrid}>
            <SummaryCard title="Bu gün" summary={summaryQuery.data.today} />
            <SummaryCard title="Bu ay" summary={summaryQuery.data.month} />
            <SummaryCard title="Hamısı" summary={summaryQuery.data.all} />
          </View>
        ) : null}

        <View style={styles.filters}>
          {filters.map((filter) => (
            <FilterPill
              active={filter.key === filterKey}
              key={filter.key}
              label={filter.label}
              onPress={() => setFilterKey(filter.key)}
              size="compact"
            />
          ))}
        </View>

        {logsQuery.isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {logsQuery.isError ? (
          <Card>
            <View style={styles.state}>
              <Text style={styles.title}>Məlumat yüklənmədi</Text>
              <Button title="Yenidən yoxla" onPress={() => logsQuery.refetch()} />
            </View>
          </Card>
        ) : null}

        {logsQuery.data?.length === 0 ? (
          <Card>
            <View style={styles.state}>
              <Bot color={colors.primary} size={34} />
              <Text style={styles.title}>Nəticə tapılmadı</Text>
            </View>
          </Card>
        ) : null}

        <View style={styles.list}>
          {logsQuery.data?.map((log) => <AiUsageLogCard key={log.id} log={log} />)}
        </View>
      </PagePanel>
    </Screen>
  );
}

function SummaryCard({
  title,
  summary,
}: {
  title: string;
  summary: { requestCount: number; successCount: number; errorCount: number; estimatedCostUsd: number };
}) {
  return (
    <View style={styles.summaryCard}>
      <Card>
        <Text style={styles.muted}>{title}</Text>
        <Text style={styles.cost}>{formatUsd(summary.estimatedCostUsd)}</Text>
        <Text style={styles.muted}>
          {summary.requestCount} sorğu · {summary.successCount} uğurlu · {summary.errorCount} xəta
        </Text>
      </Card>
    </View>
  );
}

function AiUsageLogCard({ log }: { log: AiUsageLog }) {
  return (
    <Card>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          <Text style={styles.title}>{getFeatureLabel(log.feature)}</Text>
          <Text style={styles.muted}>{log.model} · {formatDateTime(log.createdAt)}</Text>
        </View>
        <Text style={[styles.status, log.status === 'error' && styles.errorStatus]}>
          {log.status === 'success' ? 'Uğurlu' : 'Xəta'}
        </Text>
      </View>
      <View style={styles.metrics}>
        <Metric label="Token" value={formatTokens(log)} />
        <Metric label="Səs" value={log.audioSeconds === null ? '-' : `${log.audioSeconds.toFixed(1)} san`} />
        <Metric label="Cəhd" value={String(log.retryCount + 1)} />
        <Metric label="Xərc" value={formatUsd(log.estimatedCostUsd)} />
      </View>
      {log.errorSummary ? <Text style={styles.errorText}>{log.errorSummary}</Text> : null}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function getFeatureLabel(feature: AiUsageFeature) {
  return feature === 'professional_note' ? 'Servis mətni' : 'Səsdən mətnə';
}

function formatTokens(log: AiUsageLog) {
  if (log.inputTokens === null && log.outputTokens === null) {
    return '-';
  }

  return `${log.inputTokens ?? 0} / ${log.outputTokens ?? 0}`;
}

function formatUsd(value: number) {
  return `$${value.toFixed(4)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 150,
  },
  filters: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
    gap: spacing.md,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  cost: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: spacing.xs,
  },
  status: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '900',
  },
  errorStatus: {
    color: colors.danger,
  },
  metrics: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  metric: {
    minWidth: 92,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
  },
});
