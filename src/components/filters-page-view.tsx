"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function FiltersPageView() {
  const filters = useSatsStore((state) => state.filters);
  const isLoading = useSatsStore((state) => state.loading.filters);
  const error = useSatsStore((state) => state.errors.filters);
  const loadFilters = useSatsStore((state) => state.loadFilters);

  useSatsResource(filters, isLoading, loadFilters);

  if (error) {
    return <ResourceFeedback title="Filter data unavailable" detail={error} />;
  }

  if (!filters) {
    return (
      <ResourceFeedback
        title="Loading saved filters"
        detail="The filters engine is loading shared presets and reusable query definitions for the workspace."
      />
    );
  }

  return (
    <ModulePageShell
      hero={filters.hero}
      metrics={filters.metrics}
      generatedAt={filters.generatedAt}
      badges={filters.presets.map((item) => item.name)}
    >
      <DataPanel
        eyebrow="Presets"
        title="Reusable saved views by module and ownership scope"
      >
        <DataTable
          rows={filters.presets}
          columns={[
            { header: "Preset", render: (row) => row.name },
            { header: "Module", render: (row) => row.targetModule },
            {
              header: "Criteria",
              render: (row) => `${row.criteriaCount} rules`,
            },
            { header: "Scope", render: (row) => row.scope },
            { header: "Owner", render: (row) => row.owner },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Queries"
        title="Persisted query definitions for shared application logic"
      >
        <DataTable
          rows={filters.queryDefinitions}
          columns={[
            { header: "Name", render: (row) => row.name },
            { header: "Target", render: (row) => row.target },
            { header: "Expression", render: (row) => row.expression },
            { header: "Status", render: (row) => row.status },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}