"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function ReportsPageView() {
  const reports = useSatsStore((state) => state.reports);
  const isLoading = useSatsStore((state) => state.loading.reports);
  const error = useSatsStore((state) => state.errors.reports);
  const loadReports = useSatsStore((state) => state.loadReports);

  useSatsResource(reports, isLoading, loadReports);

  if (error) {
    return <ResourceFeedback title="Report data unavailable" detail={error} />;
  }

  if (!reports) {
    return (
      <ResourceFeedback
        title="Loading reports and exports"
        detail="The reports route is requesting queued outputs and export capabilities from the SATS reporting service."
      />
    );
  }

  return (
    <ModulePageShell
      hero={reports.hero}
      metrics={reports.metrics}
      generatedAt={reports.generatedAt}
      badges={reports.exportFormats}
    >
      <DataPanel
        eyebrow="Report queue"
        title="Operational analytics and exported intelligence products"
      >
        <DataTable
          rows={reports.reports}
          columns={[
            { header: "Title", render: (row) => row.title },
            { header: "Type", render: (row) => row.reportType },
            { header: "Period", render: (row) => row.period },
            { header: "Format", render: (row) => row.format },
            {
              header: "Generated",
              render: (row) => new Date(row.generatedAt).toLocaleString(),
            },
            { header: "Status", render: (row) => row.status },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}
