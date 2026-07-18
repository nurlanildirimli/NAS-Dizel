import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Calendar,
  Car,
  Tag,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react-native';
import { type LucideIcon } from 'lucide-react-native';

import { Header, PagePanel, Screen } from '../../src/components/layout';
import { Button, Card, Modal } from '../../src/components/ui';
import { getIncomeSummary } from '../../src/services/services';
import { colors, radii, spacing } from '../../src/theme';
import { formatMoney } from '../../src/utils/formatMoney';

const monthlyLine = [8, 34, 22, 18, 16, 24, 62, 36, 48, 62, 50, 46, 54, 68, 84, 62, 46, 58, 76, 86];
const yearlyBars = [42, 52, 68, 72, 94, 92, 88, 70, 78, 90, 86, 100];
const modelRows = [
  { label: 'Bosch 0445110006', value: '0 AZN', width: '100%' },
  { label: 'Delphi EJBR03101D', value: '0 AZN', width: '78%' },
  { label: 'Denso 095000-6590', value: '0 AZN', width: '58%' },
  { label: 'Siemens A2C59511612', value: '0 AZN', width: '46%' },
  { label: 'Bosch 0445110376', value: '0 AZN', width: '34%' },
] as const;

type ExpandedIncomePanel = 'monthly' | 'yearly' | 'models' | null;

export default function IncomeScreen() {
  const [expandedPanel, setExpandedPanel] = useState<ExpandedIncomePanel>(null);
  const todayQuery = useQuery({
    queryKey: ['income', 'today'],
    queryFn: () => getIncomeSummary('today'),
  });
  const monthQuery = useQuery({
    queryKey: ['income', 'month'],
    queryFn: () => getIncomeSummary('month'),
  });
  const yearQuery = useQuery({
    queryKey: ['income', 'year'],
    queryFn: () => getIncomeSummary('year'),
  });
  const todaySummary = todayQuery.data;
  const monthSummary = monthQuery.data;
  const yearSummary = yearQuery.data;
  const displaySummary = monthSummary ?? todaySummary ?? yearSummary;
  const isLoading = todayQuery.isLoading || monthQuery.isLoading || yearQuery.isLoading;
  const isError = todayQuery.isError || monthQuery.isError || yearQuery.isError;

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header title="Gəlir" icon={BarChart3} compact />
      <PagePanel edgeToEdge compact fill>
        {isLoading && !displaySummary ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : null}

        {isError ? (
          <Card>
            <View style={styles.state}>
              <Text style={styles.stateText}>Məlumat yüklənmədi</Text>
              <Button
                title="Yenidən yoxla"
                onPress={() => {
                  todayQuery.refetch();
                  monthQuery.refetch();
                  yearQuery.refetch();
                }}
              />
            </View>
          </Card>
        ) : null}

        {displaySummary ? (
          <>
            <View style={styles.metricGrid}>
              <IncomeMetricCard
                icon={TrendingUp}
                iconColor={colors.success}
                iconBackground={colors.successSoft}
                label="Bu gün gəlir"
                value={formatMoney(todaySummary?.incomeTotal ?? 0)}
                trend="↗ 12%"
                trendColor={colors.success}
              />
              <IncomeMetricCard
                icon={TrendingUp}
                iconColor={colors.primary}
                iconBackground={colors.primarySoft}
                label="Bu ay gəlir"
                value={formatMoney(monthSummary?.incomeTotal ?? 0)}
                trend="↗ 18%"
                trendColor={colors.success}
              />
              <IncomeMetricCard
                icon={TrendingUp}
                iconColor={colors.purple}
                iconBackground={colors.purpleSoft}
                label="Bu il gəlir"
                value={formatMoney(yearSummary?.incomeTotal ?? 0)}
                trend="↗ 22%"
                trendColor={colors.success}
              />
              <IncomeMetricCard
                icon={Wallet}
                iconColor={colors.warning}
                iconBackground={colors.warningSoft}
                label="Qalan borc"
                value={formatMoney(displaySummary.debtTotal)}
                trend={displaySummary.debtTotal > 0 ? '● borc var' : '● borc yoxdur'}
                trendColor={displaySummary.debtTotal > 0 ? colors.danger : colors.success}
              />
              <IncomeMetricCard
                icon={Calendar}
                iconColor={colors.primary}
                iconBackground={colors.primarySoft}
                label="Bu ay xidmət sayı"
                value={String(monthSummary?.serviceCount ?? 0)}
                trend="↗ 15%"
                trendColor={colors.success}
              />
              <IncomeMetricCard
                icon={Car}
                iconColor={colors.purple}
                iconBackground={colors.purpleSoft}
                label="Bu ay avtomobil sayı"
                value={String(monthSummary?.vehicleCount ?? 0)}
                trend="↗ 12%"
                trendColor={colors.success}
              />
              <IncomeMetricCard
                wide
                icon={Wrench}
                iconColor={colors.primary}
                iconBackground={colors.primarySoft}
                label="Bu ay injector sayı"
                value={String(monthSummary?.injectorCount ?? 0)}
                trend="↗ 16%"
                trendColor={colors.success}
              />
            </View>

            <View style={styles.chartGrid}>
              <ChartCard
                title="Aylıq gəlir"
                value={formatMoney(monthSummary?.incomeTotal ?? 0)}
                subtitle="Bu ay üzrə gündəlik gəlir (AZN)"
                onPress={() => setExpandedPanel('monthly')}
              >
                <LineChartPreview />
              </ChartCard>
              <ChartCard
                title="İllik gəlir"
                value={formatMoney(yearSummary?.incomeTotal ?? 0)}
                subtitle="Son 12 ay (AZN)"
                onPress={() => setExpandedPanel('yearly')}
              >
                <BarChartPreview />
              </ChartCard>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setExpandedPanel('models')}
              style={({ pressed }) => [styles.modelsCard, pressed && styles.pressedCard]}
            >
              <View style={styles.modelsIntro}>
                <Text style={styles.sectionTitle}>Gələn injector modelləri</Text>
                <Text style={styles.sectionSubtitle}>Bu ay üzrə ən çox gəlir gətirən modellər</Text>
                <View style={[styles.iconBubble, { backgroundColor: colors.purpleSoft }]}>
                  <TrendingUp color={colors.purple} size={26} />
                </View>
              </View>
              <View style={styles.modelsList}>
                {modelRows.map((row, index) => (
                  <View key={row.label} style={styles.modelRow}>
                    <View style={styles.modelLine}>
                      <Text numberOfLines={1} style={styles.modelName}>
                        {index + 1}. {row.label}
                      </Text>
                      <Text numberOfLines={1} style={styles.modelValue}>{row.value}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: row.width }]} />
                    </View>
                  </View>
                ))}
              </View>
            </Pressable>

            <View style={styles.bottomGrid}>
              <IncomeMetricCard
                compact
                icon={Wrench}
                iconColor={colors.primary}
                iconBackground={colors.primarySoft}
                label="İş gəliri"
                value="0 AZN"
                trend="↗ 0%"
                trendColor={colors.success}
              />
              <IncomeMetricCard
                compact
                icon={Wallet}
                iconColor={colors.purple}
                iconBackground={colors.purpleSoft}
                label="Hissə gəliri"
                value="0 AZN"
                trend="↗ 0%"
                trendColor={colors.success}
              />
              <IncomeMetricCard
                compact
                icon={Tag}
                iconColor={colors.danger}
                iconBackground={colors.dangerSoft}
                label="Endirimlər"
                value="0 AZN"
                trend="↘ 0%"
                trendColor={colors.danger}
              />
            </View>

            {isLoading ? <ActivityIndicator color={colors.primary} /> : null}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Məlumatlar real gəlir xülasəsinə əsaslanır</Text>
              <Text style={styles.footerText}>Yenilənib: indi</Text>
            </View>

            <Modal
              cancelLabel="Bağla"
              onCancel={() => setExpandedPanel(null)}
              title={getExpandedTitle(expandedPanel)}
              visible={Boolean(expandedPanel)}
            >
              <ScrollView style={styles.expandedScroll} showsVerticalScrollIndicator={false}>
                {expandedPanel === 'monthly' ? (
                  <ExpandedChart
                    title="Aylıq gəlir"
                    value={formatMoney(monthSummary?.incomeTotal ?? 0)}
                    subtitle="Bu ay üzrə gündəlik gəlir (AZN)"
                  >
                    <LineChartPreview expanded />
                  </ExpandedChart>
                ) : null}
                {expandedPanel === 'yearly' ? (
                  <ExpandedChart
                    title="İllik gəlir"
                    value={formatMoney(yearSummary?.incomeTotal ?? 0)}
                    subtitle="Son 12 ay üzrə gəlir (AZN)"
                  >
                    <BarChartPreview expanded />
                  </ExpandedChart>
                ) : null}
                {expandedPanel === 'models' ? <ExpandedModels /> : null}
              </ScrollView>
            </Modal>
          </>
        ) : null}
      </PagePanel>
    </Screen>
  );
}

function IncomeMetricCard({
  icon: Icon,
  iconColor,
  iconBackground,
  label,
  value,
  trend,
  trendColor,
  wide,
  compact,
}: {
  icon: LucideIcon;
  iconColor: string;
  iconBackground: string;
  label: string;
  value: string;
  trend: string;
  trendColor: string;
  wide?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.metricCard, wide && styles.metricCardWide, compact && styles.compactMetricCard]}>
      <View style={styles.metricTop}>
        <View style={[styles.iconBubble, { backgroundColor: iconBackground }]}>
          <Icon color={iconColor} size={compact ? 18 : 20} strokeWidth={2.3} />
        </View>
        <Text numberOfLines={2} style={styles.metricTitle}>
          {label}
        </Text>
      </View>
      <View style={styles.metricBottom}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={styles.metricValue}>
          {value}
        </Text>
        <Text style={[styles.trend, { color: trendColor }]}>{trend}</Text>
      </View>
    </View>
  );
}

function ChartCard({
  title,
  value,
  subtitle,
  children,
  onPress,
}: {
  title: string;
  value: string;
  subtitle: string;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chartCard, pressed && styles.pressedCard]}
    >
      <View style={styles.chartHeader}>
        <View style={styles.chartTitleBlock}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.valuePill}>
        {value}
      </Text>
      {children}
    </Pressable>
  );
}

function LineChartPreview({ expanded = false }: { expanded?: boolean }) {
  return (
    <View style={[styles.lineChart, expanded && styles.expandedChart]}>
      {monthlyLine.map((height, index) => (
        <View key={`${height}-${index}`} style={styles.lineColumn}>
          <View style={[styles.linePoint, { bottom: expanded ? height * 1.45 : height }]} />
          {index > 0 ? (
            <View style={[styles.lineSegment, { bottom: (expanded ? height * 1.45 : height) + 3 }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

function BarChartPreview({ expanded = false }: { expanded?: boolean }) {
  return (
    <View style={[styles.barChart, expanded && styles.expandedChart]}>
      {yearlyBars.map((height, index) => (
        <View key={`${height}-${index}`} style={styles.barColumn}>
          <View style={[styles.bar, { height: expanded ? height * 1.45 : height }]} />
        </View>
      ))}
    </View>
  );
}

function ExpandedChart({
  title,
  value,
  subtitle,
  children,
}: {
  title: string;
  value: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.expandedContent}>
      <View style={styles.expandedHeader}>
        <View style={styles.chartTitleBlock}>
          <Text style={styles.expandedTitle}>{title}</Text>
          <Text style={styles.expandedSubtitle}>{subtitle}</Text>
        </View>
        <Text style={styles.expandedValue}>{value}</Text>
      </View>
      {children}
      <Text style={styles.expandedNote}>Detallı analitika üçün bu bölmə sonradan real qrafik məlumatları ilə genişləndirilə bilər.</Text>
    </View>
  );
}

function ExpandedModels() {
  return (
    <View style={styles.expandedContent}>
      <Text style={styles.expandedSubtitle}>Bu ay üzrə ən çox gəlir gətirən injector modelləri</Text>
      <View style={styles.expandedModelList}>
        {modelRows.map((row, index) => (
          <View key={row.label} style={styles.expandedModelRow}>
            <Text style={styles.expandedModelName}>{index + 1}. {row.label}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: row.width }]} />
            </View>
            <Text style={styles.expandedModelValue}>{row.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.expandedNote}>Model siyahısı hazırda vizual xülasədir. Real model gəliri ayrıca analitika RPC-si əlavə ediləndə buradan göstəriləcək.</Text>
    </View>
  );
}

function getExpandedTitle(panel: ExpandedIncomePanel) {
  if (panel === 'monthly') {
    return 'Aylıq gəlir';
  }

  if (panel === 'yearly') {
    return 'İllik gəlir';
  }

  if (panel === 'models') {
    return 'Gələn injector modelləri';
  }

  return 'Detal';
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 140,
  },
  stateText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.md,
    minHeight: 108,
    minWidth: 138,
    padding: spacing.md,
    width: '31%',
  },
  metricCardWide: {
    width: '100%',
  },
  compactMetricCard: {
    minHeight: 104,
  },
  metricTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: radii.xl,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  metricTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  metricBottom: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  trend: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 165,
    padding: spacing.md,
    width: '48%',
  },
  chartHeader: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  chartTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  valuePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
    maxWidth: '100%',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  lineChart: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    flexDirection: 'row',
    height: 126,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  lineColumn: {
    flex: 1,
    position: 'relative',
  },
  linePoint: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 5,
    borderWidth: 2,
    height: 10,
    left: '35%',
    position: 'absolute',
    width: 10,
  },
  lineSegment: {
    backgroundColor: colors.primary,
    height: 2,
    left: '-50%',
    opacity: 0.65,
    position: 'absolute',
    width: '90%',
  },
  barChart: {
    alignItems: 'flex-end',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 126,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    minHeight: 18,
    width: 9,
  },
  modelsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  pressedCard: {
    opacity: 0.78,
  },
  modelsIntro: {
    gap: spacing.sm,
    minWidth: 140,
    width: '28%',
  },
  modelsList: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 170,
  },
  modelRow: {
    gap: spacing.sm,
  },
  modelLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  modelName: {
    color: colors.text,
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    minWidth: 0,
  },
  progressTrack: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    height: 9,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    height: '100%',
  },
  modelValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
    textAlign: 'right',
  },
  bottomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  expandedScroll: {
    maxHeight: 520,
  },
  expandedContent: {
    gap: spacing.md,
  },
  expandedHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  expandedTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  expandedSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  expandedValue: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  expandedChart: {
    height: 220,
    marginTop: spacing.sm,
  },
  expandedModelList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  expandedModelRow: {
    gap: spacing.sm,
  },
  expandedModelName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  expandedModelValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  expandedNote: {
    color: colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '600',
    lineHeight: 18,
  },
});
