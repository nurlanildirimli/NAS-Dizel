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
  const worksheetData: unknown[][] = [
    headers,
    ...rows.map((row) => headers.map((header) => row[header] ?? '')),
  ];
  const xml = [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    `<Worksheet ss:Name="${escapeXmlAttribute(sanitizeSheetName(sheetName))}">`,
    '<Table>',
    ...worksheetData.map((row) => (
      `<Row>${row.map((cell) => `<Cell><Data ss:Type="${getExcelCellType(cell)}">${escapeXmlText(formatExcelCell(cell))}</Data></Cell>`).join('')}</Row>`
    )),
    '</Table>',
    '</Worksheet>',
    '</Workbook>',
  ].join('');

  return new TextEncoder().encode(xml).buffer;
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

function getExcelCellType(value: unknown): 'Number' | 'String' {
  return typeof value === 'number' && Number.isFinite(value) ? 'Number' : 'String';
}

function formatExcelCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return String(value);
}

function escapeXmlText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replaceAll('"', '&quot;');
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
