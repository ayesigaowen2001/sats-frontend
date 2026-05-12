"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function DataMigrationPageView() {
  const dataMigration = useSatsStore((state) => state.dataMigration);
  const isLoading = useSatsStore((state) => state.loading.dataMigration);
  const error = useSatsStore((state) => state.errors.dataMigration);
  const loadDataMigration = useSatsStore((state) => state.loadDataMigration);

  useSatsResource(dataMigration, isLoading, loadDataMigration);

  if (error) {
    return (
      <ResourceFeedback title="Migration data unavailable" detail={error} />
    );
  }

  if (!dataMigration) {
    return (
      <ResourceFeedback
        title="Loading migration operations"
        detail="The migration service is hydrating import queues, export jobs, and validation pipeline summaries."
      />
    );
  }

  return (
    <ModulePageShell
      hero={dataMigration.hero}
      metrics={dataMigration.metrics}
      generatedAt={dataMigration.generatedAt}
      badges={dataMigration.imports.map((item) => item.entityType)}
    >
      <DataPanel
        eyebrow="Imports"
        title="Bulk ingestion jobs across animals, tracking, and users"
      >
        <DataTable
          rows={dataMigration.imports}
          columns={[
            { header: "Entity", render: (row) => row.entityType },
            { header: "File", render: (row) => row.fileName },
            { header: "Status", render: (row) => row.status },
            { header: "Records", render: (row) => row.totalRecords },
            {
              header: "Outcome",
              render: (row) =>
                `${row.successfulRecords} success • ${row.failedRecords} failed`,
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Exports"
        title="Prepared extracts for audits, analytics, and partner delivery"
      >
        <DataTable
          rows={dataMigration.exports}
          columns={[
            { header: "Export", render: (row) => row.name },
            { header: "Format", render: (row) => row.format },
            { header: "Status", render: (row) => row.status },
            { header: "Requested by", render: (row) => row.requestedBy },
            {
              header: "Created",
              render: (row) => new Date(row.createdAt).toLocaleString(),
            },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}