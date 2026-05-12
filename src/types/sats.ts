export type ModuleStatus = "Core" | "Operational" | "Planned";

export interface SystemMetric {
  label: string;
  value: string;
  change: string;
  tone: "stable" | "positive" | "warning";
}

export interface SatsModule {
  name: string;
  purpose: string;
  highlights: string[];
  integrations: string[];
  status: ModuleStatus;
}

export interface WorkflowPhase {
  title: string;
  summary: string;
}

export interface SchemaRow {
  name: string;
  fields: string[];
}

export interface SchemaSection {
  title: string;
  description: string;
  rows: SchemaRow[];
}

export interface AlertItem {
  title: string;
  severity: "Critical" | "Warning" | "Info";
  module: string;
  detail: string;
}

export interface StrategicPoint {
  title: string;
  summary: string;
}
