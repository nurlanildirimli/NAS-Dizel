import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';

import { Header, PagePanel, Screen, StepHeader } from '../src/components/layout';
import { Button, Card, FilterPill, Modal } from '../src/components/ui';
import { exportDataset, getReportSummary, toCsv, toExcelFile } from '../src/services/reports';
import { colors, spacing } from '../src/theme';
import { type ExportDatasetKey, type ReportKey, type ReportPeriod, type ReportRow } from '../src/types/reports';

const reports: Array<{ label: string; key: ReportKey }> = [
  { label: 'Gəlir hesabatı', key: 'income' },
  { label: 'Avtomobil hesabatı', key: 'vehicles' },
  { label: 'Injector hesabatı', key: 'injectors' },
  { label: 'Ödəniş hesabatı', key: 'payments' },
  { label: 'Xidmət hesabatı', key: 'services' },
  { label: 'Hissə hesabatı', key: 'parts' },
  { label: 'Qiymət dəyişiklikləri hesabatı', key: 'price_changes' },
  { label: 'Borclar hesabatı', key: 'debts' },
  { label: 'Problemli müştərilər', key: 'problem_vehicles' },
];

const periods: Array<{ label: string; key: ReportPeriod }> = [
  { label: 'Bu gün', key: 'today' },
  { label: 'Bu həftə', key: 'week' },
  { label: 'Bu ay', key: 'month' },
  { label: 'Bu il', key: 'year' },
];

const datasets: Array<{ label: string; key: ExportDatasetKey }> = [
  { label: 'Avtomobillər', key: 'vehicles' },
  { label: 'Xidmətlər', key: 'services' },
  { label: 'Injector nəticələri', key: 'service_injectors' },
  { label: 'Ödənişlər', key: 'payments' },
  { label: 'Qiymət kataloqu', key: 'price_catalog' },
  { label: 'Service line items', key: 'service_line_items' },
  { label: 'Cihazlar', key: 'devices' },
];

type ExportFormat = 'csv' | 'excel';

const exportFormats: Array<{ label: string; key: ExportFormat }> = [
  { label: 'CSV', key: 'csv' },
  { label: 'Excel', key: 'excel' },
];

export default function ReportsScreen() {
  const [reportKey, setReportKey] = useState<ReportKey>('income');
  const [periodKey, setPeriodKey] = useState<ReportPeriod>('month');
  const [datasetKey, setDatasetKey] = useState<ExportDatasetKey>('vehicles');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [csvPreview, setCsvPreview] = useState('');
  const reportQuery = useQuery({
    queryKey: ['reports', reportKey, periodKey],
    queryFn: () => getReportSummary(reportKey, periodKey),
  });
  const exportMutation = useMutation({
    mutationFn: () => exportDataset(datasetKey),
    onSuccess: (rows) => {
      if (Platform.OS === 'web') {
        if (exportFormat === 'excel') {
          downloadExcel(toExcelFile(rows, activeDataset?.label ?? datasetKey), `${datasetKey}.xlsx`);
        } else {
          downloadCsv(toCsv(rows), `${datasetKey}.csv`);
        }

        return;
      }

      setCsvPreview(exportFormat === 'excel'
        ? 'Excel ixracı yalnız web üçün aktivdir.'
        : toCsv(rows));
    },
  });
  const activeReport = reports.find((report) => report.key === reportKey);
  const activeDataset = datasets.find((dataset) => dataset.key === datasetKey);
  const rows = useMemo(() => reportQuery.data ?? [], [reportQuery.data]);
  const columns = useMemo(() => getColumns(rows), [rows]);

  return (
    <Screen noBottomPadding backgroundColor={colors.surface}>
      <Header
        title="Hesabatlar"
        icon={FileText}
        compact
        action={(
          <Button title="Əvvəlki" variant="secondary" size="compact" icon={ArrowLeft} onPress={() => router.back()} />
        )}
      />
      <PagePanel edgeToEdge compact fill>
        <View style={styles.content}>
          <Card>
            <StepHeader title="Hesabatlar" />
            <View style={styles.pills}>
              {reports.map((report) => (
                <FilterPill
                  active={report.key === reportKey}
                  key={report.key}
                  label={report.label}
                  onPress={() => setReportKey(report.key)}
                  size="compact"
                />
              ))}
            </View>
            <View style={styles.pills}>
              {periods.map((period) => (
                <FilterPill
                  active={period.key === periodKey}
                  key={period.key}
                  label={period.label}
                  onPress={() => setPeriodKey(period.key)}
                  size="compact"
                />
              ))}
            </View>
          </Card>

          <Card>
            <StepHeader title={activeReport?.label ?? 'Hesabatlar'} />
            {reportQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : null}
            {reportQuery.isError ? (
              <View style={styles.state}>
                <Text style={styles.title}>Məlumat yüklənmədi</Text>
                <Button title="Yenidən yoxla" onPress={() => reportQuery.refetch()} />
              </View>
            ) : null}
            {rows.length === 0 && !reportQuery.isLoading ? (
              <View style={styles.state}>
                <Text style={styles.title}>Nəticə tapılmadı</Text>
              </View>
            ) : null}
            {rows.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                  <View style={styles.tableRow}>
                    {columns.map((column) => (
                      <Text key={column} style={styles.tableHeader}>{column}</Text>
                    ))}
                  </View>
                  {rows.map((row, index) => (
                    <View key={`${reportKey}-${index}`} style={styles.tableRow}>
                      {columns.map((column) => (
                        <Text key={column} style={styles.tableCell}>{formatCell(row[column])}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}
          </Card>

          <Card>
            <StepHeader title="CSV" />
            <View style={styles.pills}>
              {exportFormats.map((format) => (
                <FilterPill
                  active={format.key === exportFormat}
                  key={format.key}
                  label={format.label}
                  onPress={() => setExportFormat(format.key)}
                  size="compact"
                />
              ))}
            </View>
            <View style={styles.pills}>
              {datasets.map((dataset) => (
                <FilterPill
                  active={dataset.key === datasetKey}
                  key={dataset.key}
                  label={dataset.label}
                  onPress={() => setDatasetKey(dataset.key)}
                  size="compact"
                />
              ))}
            </View>
            <Button
              disabled={exportMutation.isPending}
              title="Yüklə"
              onPress={() => exportMutation.mutate()}
            />
            <Text style={styles.muted}>{activeDataset?.label}</Text>
          </Card>
        </View>
        <Modal
          cancelLabel="Əvvəlki"
          confirmLabel="Yüklə"
          onCancel={() => setCsvPreview('')}
          onConfirm={() => setCsvPreview('')}
          title={exportFormat === 'excel' ? 'Excel' : 'CSV'}
          visible={Boolean(csvPreview) && Platform.OS !== 'web'}
        >
          <ScrollView style={styles.previewBox}>
            <Text style={styles.previewText}>{csvPreview}</Text>
          </ScrollView>
        </Modal>
      </PagePanel>
    </Screen>
  );
}

function getColumns(rows: ReportRow[]): string[] {
  return Array.from(rows.reduce<Set<string>>((columns, row) => {
    Object.keys(row).forEach((key) => columns.add(key));
    return columns;
  }, new Set()));
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  return String(value);
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadExcel(workbook: ArrayBuffer, filename: string) {
  const blob = new Blob([workbook], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  pills: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    gap: spacing.md,
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
    marginTop: spacing.md,
  },
  table: {
    marginTop: spacing.lg,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    width: 132,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    padding: spacing.sm,
  },
  tableCell: {
    width: 132,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    padding: spacing.sm,
  },
  previewBox: {
    maxHeight: 320,
  },
  previewText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
});
