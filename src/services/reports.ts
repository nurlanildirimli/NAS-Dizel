import * as XLSX from 'xlsx';

import { supabase } from '../lib/supabase';
import { exportRowsSchema, reportRowsSchema } from '../schemas/reports';
import {
  type ExportDatasetKey,
  type ExportRow,
  type ReportKey,
  type ReportPeriod,
  type ReportRow,
} from '../types/reports';

export async function getReportSummary(reportKey: ReportKey, periodKey: ReportPeriod): Promise<ReportRow[]> {
  const { data, error } = await supabase.rpc('get_report_summary', {
    report_key: reportKey,
    period_key: periodKey,
  });

  if (error) {
    throw error;
  }

  return reportRowsSchema.parse(data ?? []);
}

export async function exportDataset(datasetKey: ExportDatasetKey): Promise<ExportRow[]> {
  const { data, error } = await supabase.rpc('export_dataset', {
    dataset_key: datasetKey,
  });

  if (error) {
    throw error;
  }

  return exportRowsSchema.parse(data ?? []);
}

export function toCsv(rows: ExportRow[]): string {
  const headers = getExportHeaders(rows);

  if (headers.length === 0) {
    return '';
  }

  const lines = rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','));

  return [headers.join(','), ...lines].join('\n');
}

export function toExcelFile(rows: ExportRow[], sheetName: string): ArrayBuffer {
  const headers = getExportHeaders(rows);
  const worksheetData = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName));

  return XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
  });
}

function getExportHeaders(rows: ExportRow[]): string[] {
  return Array.from(rows.reduce<Set<string>>((keys, row) => {
    Object.keys(row).forEach((key) => keys.add(key));
    return keys;
  }, new Set()));
}

function sanitizeSheetName(sheetName: string): string {
  const sanitized = sheetName.replace(/[:\\/?*[\]]/g, ' ').trim();
  return (sanitized || 'Export').slice(0, 31);
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);

  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}
