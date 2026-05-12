import { exportJobs, importJobs } from "@/lib/server/data/sats-seed";
import type { DataMigrationPageResponse } from "@/types/sats-api";

export async function getDataMigrationPageData(): Promise<DataMigrationPageResponse> {
  const failedImports = importJobs.filter((item) => item.status === "Failed").length;

  return {
    hero: {
      eyebrow: "Data migration",
      title: "Bulk import, export, validation, and exchange operations for structured data flow.",
      description:
        "Data migration is now a route-backed module for bulk onboarding, historical ingestion, and export-driven compliance workflows.",
    },
    metrics: [
      {
        label: "Import jobs",
        value: String(importJobs.length),
        change: `${failedImports} need intervention`,
        tone: "warning",
      },
      {
        label: "Export jobs",
        value: String(exportJobs.length),
        change: "Reporting handoff enabled",
        tone: "positive",
      },
      {
        label: "Template validation",
        value: "Active",
        change: "Schema checks applied",
        tone: "stable",
      },
    ],
    imports: importJobs,
    exports: exportJobs,
    generatedAt: new Date().toISOString(),
  };
}