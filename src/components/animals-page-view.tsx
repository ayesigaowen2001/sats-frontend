"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function AnimalsPageView() {
  const animals = useSatsStore((state) => state.animals);
  const isLoading = useSatsStore((state) => state.loading.animals);
  const error = useSatsStore((state) => state.errors.animals);
  const loadAnimals = useSatsStore((state) => state.loadAnimals);

  useSatsResource(animals, isLoading, loadAnimals);

  if (error) {
    return <ResourceFeedback title="Animal data unavailable" detail={error} />;
  }

  if (!animals) {
    return (
      <ResourceFeedback
        title="Loading animal registry"
        detail="The animal management route is hydrating its registry and classification data from the SATS backend."
      />
    );
  }

  return (
    <ModulePageShell
      hero={animals.hero}
      metrics={animals.metrics}
      generatedAt={animals.generatedAt}
      badges={animals.classifications.map((item) => item.commonName)}
    >
      <DataPanel
        eyebrow="Animal registry"
        title="Tagged wildlife with device and health context"
      >
        <DataTable
          rows={animals.animals}
          columns={[
            {
              header: "Animal",
              render: (row) => (
                <div>
                  <strong className="block text-white">{row.commonName}</strong>
                  <span className="text-[var(--color-mist)]">
                    {row.animalNumber}
                  </span>
                </div>
              ),
            },
            { header: "Species", render: (row) => row.species },
            {
              header: "Conservation",
              render: (row) => row.conservationStatus,
            },
            { header: "Device", render: (row) => row.assignedDevice },
            {
              header: "Health and location",
              render: (row) => `${row.healthStatus} • ${row.location}`,
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Classifications"
        title="Species taxonomy and tracked population counts"
      >
        <DataTable
          rows={animals.classifications}
          columns={[
            { header: "Common name", render: (row) => row.commonName },
            { header: "Species", render: (row) => row.species },
            {
              header: "Conservation status",
              render: (row) => row.conservationStatus,
            },
            {
              header: "Tracked count",
              render: (row) => row.trackedCount,
            },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}
