"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function HealthPageView() {
  const health = useSatsStore((state) => state.health);
  const isLoading = useSatsStore((state) => state.loading.health);
  const error = useSatsStore((state) => state.errors.health);
  const loadHealth = useSatsStore((state) => state.loadHealth);

  useSatsResource(health, isLoading, loadHealth);

  if (error) {
    return <ResourceFeedback title="Health data unavailable" detail={error} />;
  }

  if (!health) {
    return (
      <ResourceFeedback
        title="Loading health intelligence"
        detail="The health module is loading active cases, anomaly trends, and biometric monitoring summaries."
      />
    );
  }

  return (
    <ModulePageShell
      hero={health.hero}
      metrics={health.metrics}
      generatedAt={health.generatedAt}
      badges={health.cases.map((item) => item.healthStatus)}
    >
      <DataPanel
        eyebrow="Active cases"
        title="Animals currently in the clinical and anomaly queue"
      >
        <DataTable
          rows={health.cases}
          columns={[
            { header: "Animal", render: (row) => row.animalName },
            { header: "Organization", render: (row) => row.organizationName },
            { header: "Status", render: (row) => row.healthStatus },
            { header: "Detected issue", render: (row) => row.detectedIssue },
            {
              header: "Confidence",
              render: (row) => `${Math.round(row.confidenceScore * 100)}%`,
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Trends"
        title="Monitoring windows for biometric and movement health indicators"
      >
        <DataTable
          rows={health.trends}
          columns={[
            { header: "Metric", render: (row) => row.metric },
            { header: "Window", render: (row) => row.window },
            { header: "Baseline", render: (row) => row.baseline },
            { header: "Current", render: (row) => row.current },
            { header: "Trend", render: (row) => row.trend },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}