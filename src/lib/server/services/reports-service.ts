import { reports } from "@/lib/server/data/sats-seed";
import type { ReportsPageResponse } from "@/types/sats-api";

export async function getReportsPageData(): Promise<ReportsPageResponse> {
  const queuedReports = reports.filter(
    (report) => report.status === "Queued",
  ).length;

  return {
    hero: {
      eyebrow: "Reports module",
      title:
        "Operational reporting for movement, health analytics, reliability, and exports.",
      description:
        "Reports and exports are now modeled as a dedicated route and endpoint, ready for future PDF, CSV, and Excel generation services.",
    },
    metrics: [
      {
        label: "Published reports",
        value: String(reports.length - queuedReports),
        change: "Available to field leadership",
        tone: "positive",
      },
      {
        label: "Queued outputs",
        value: String(queuedReports),
        change: "Awaiting scheduled generation",
        tone: "warning",
      },
      {
        label: "Export formats",
        value: "3",
        change: "PDF, CSV, Excel",
        tone: "stable",
      },
    ],
    reports,
    exportFormats: ["PDF", "CSV", "Excel"],
    generatedAt: new Date().toISOString(),
  };
}
