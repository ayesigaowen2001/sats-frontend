export type ReportValue = number | string | null;

export interface ReportMeta {
  organization_id: string;
  organization_name: string;
  date_from: string;
  date_to: string;
  generated_at: string;
  generated_by: string;
  windowed: boolean;
}

export interface ReportSummaryItem {
  key: string;
  label: string;
  value: ReportValue;
  unit: string | null;
}

export interface ReportSectionRow {
  label: string;
  count: number;
  value: ReportValue;
  unit: string | null;
  percentage: number | null;
}

export interface ReportSection {
  key: string;
  title: string;
  rows: ReportSectionRow[];
  total: number;
  note: string | null;
}

export interface ModuleReport {
  report_type: string;
  title: string;
  description: string;
  meta: ReportMeta;
  subject: unknown[];
  summary: ReportSummaryItem[];
  sections: ReportSection[];
  message: string;
}
