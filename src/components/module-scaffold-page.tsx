import { DataPanel } from "@/components/data-panel";
import { ModulePageShell } from "@/components/module-page-shell";
import {
  getNavigationItem,
  navigationGroups,
  userTierLabels,
} from "@/lib/navigation";
import type { SystemMetric } from "@/types/sats";

interface ModuleScaffoldPageProps {
  href: string;
}

export function ModuleScaffoldPage({ href }: ModuleScaffoldPageProps) {
  const moduleItem = getNavigationItem(href);
  const group = navigationGroups.find((item) => item.key === moduleItem.group);

  const metrics: SystemMetric[] = [
    {
      label: "Access tiers",
      value: String(moduleItem.tiers.length),
      change: moduleItem.tiers.map((tier) => userTierLabels[tier]).join(" • "),
      tone: "stable",
    },
    {
      label: "Workspace lanes",
      value: String(moduleItem.workspaceAreas.length),
      change: moduleItem.scope,
      tone: moduleItem.status === "Live" ? "positive" : "warning",
    },
    {
      label: "Delivery state",
      value: moduleItem.status,
      change: group?.label ?? "Application module",
      tone: moduleItem.status === "Live" ? "positive" : "warning",
    },
  ];

  return (
    <ModulePageShell
      hero={{
        eyebrow: moduleItem.label,
        title: moduleItem.workspaceTitle,
        description: moduleItem.workspaceSubtitle,
      }}
      metrics={metrics}
      generatedAt={new Date().toISOString()}
      badges={moduleItem.capabilities}
    >
      <DataPanel
        eyebrow="Application role"
        title="How this module fits into the SATS platform"
        description={moduleItem.description}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {moduleItem.workspaceAreas.map((area) => (
            <article
              key={area.title}
              className="rounded-[1.4rem] border border-white/10 bg-black/15 p-5"
            >
              <h3 className="text-lg font-semibold text-white">{area.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--color-mist)]">
                {area.summary}
              </p>
            </article>
          ))}
        </div>
      </DataPanel>

      <DataPanel
        eyebrow="Access model"
        title="Multi-level users and organizational boundaries"
        description="SATS is being structured as a multi-organization application platform with clear separation between system administration, organizational administration, and operational use."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {moduleItem.tiers.map((tier) => (
            <article
              key={tier}
              className="rounded-[1.4rem] border border-white/10 bg-black/15 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-sand)]">
                {userTierLabels[tier]}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-mist)]">
                {tier === "system-administrator"
                  ? "Platform-wide authority across tenant onboarding, system policies, and enterprise governance."
                  : tier === "organization-administrator"
                    ? "Tenant-level control for users, configurations, subscriptions, devices, and operational oversight."
                    : "Execution-focused access for rangers, analysts, and field teams working within organization boundaries."}
              </p>
            </article>
          ))}
        </div>
      </DataPanel>
    </ModulePageShell>
  );
}
