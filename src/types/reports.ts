export type ReportKey =
  | 'income'
  | 'vehicles'
  | 'injectors'
  | 'payments'
  | 'services'
  | 'parts'
  | 'price_changes'
  | 'debts'
  | 'problem_vehicles';

export type ReportPeriod = 'today' | 'week' | 'month' | 'year';

export type ExportDatasetKey =
  | 'vehicles'
  | 'services'
  | 'service_injectors'
  | 'payments'
  | 'price_catalog'
  | 'service_line_items'
  | 'devices';

export type ReportRow = Record<string, string | number | boolean | null>;
export type ExportRow = Record<string, string | number | boolean | null>;
