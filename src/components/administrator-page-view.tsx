"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function AdministratorPageView() {
  const administrator = useSatsStore((state) => state.administrator);
  const isLoading = useSatsStore((state) => state.loading.administrator);
  const error = useSatsStore((state) => state.errors.administrator);
  const loadAdministrator = useSatsStore(
    (state) => state.loadAdministrator,
  );

  useSatsResource(administrator, isLoading, loadAdministrator);

  if (error) {
    return (
      <ResourceFeedback title="Administrator data unavailable" detail={error} />
    );
  }

  if (!administrator) {
    return (
      <ResourceFeedback
        title="Loading administrator console"
        detail="The platform is hydrating domain mappings, tenant onboarding, and rollout governance queues."
      />
    );
  }

  return (
    <ModulePageShell
      hero={administrator.hero}
      metrics={administrator.metrics}
      generatedAt={administrator.generatedAt}
      badges={administrator.domains.map((item) => item.organizationName)}
    >
      <DataPanel
        eyebrow="Domains"
        title="Tenant domain readiness and certificate health"
      >
        <DataTable
          rows={administrator.domains}
          columns={[
            { header: "Organization", render: (row) => row.organizationName },
            { header: "Domain", render: (row) => row.domain },
            { header: "Status", render: (row) => row.status },
            { header: "SSL", render: (row) => row.sslStatus },
            {
              header: "Checked",
              render: (row) => new Date(row.lastCheckedAt).toLocaleString(),
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Onboarding"
        title="Enterprise tenant rollout and support pipeline"
      >
        <DataTable
          rows={administrator.onboardingQueue}
          columns={[
            { header: "Organization", render: (row) => row.organizationName },
            { header: "Stage", render: (row) => row.stage },
            { header: "Owner", render: (row) => row.owner },
            {
              header: "Requested",
              render: (row) => new Date(row.requestedAt).toLocaleString(),
            },
            { header: "Notes", render: (row) => row.notes },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}