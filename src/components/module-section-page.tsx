import Link from "next/link";

import { DataPanel } from "@/components/data-panel";
import { ModulePageShell } from "@/components/module-page-shell";
import {
  dashboardModules,
  getDashboardModule,
  getDashboardItem,
} from "@/lib/dashboard-config";
import { toTitleCase } from "@/lib/utils";
import type { SystemMetric } from "@/types/sats";

interface ModuleSectionPageProps {
  pathname: string;
}

export function ModuleSectionPage({ pathname }: ModuleSectionPageProps) {
  const activeModule = getDashboardModule(pathname);
  const item = getDashboardItem(pathname);

  const metrics: SystemMetric[] = [
    {
      label: "Sidebar items",
      value: String(activeModule.items.length),
      change: `${activeModule.category} module`,
      tone: "stable",
    },
    {
      label: "Module focus",
      value: toTitleCase(activeModule.key),
      change: item.label,
      tone: "positive",
    },
    {
      label: "Implementation state",
      value: "Scaffolded",
      change: "Ready for domain-specific widgets",
      tone: "warning",
    },
  ];

  return (
    <ModulePageShell
      hero={{
        eyebrow: activeModule.label,
        title: item.label,
        description: item.description,
      }}
      metrics={metrics}
      generatedAt={new Date().toISOString()}
      badges={activeModule.highlights}
    >
      <DataPanel
        eyebrow="Section scaffold"
        title={`${item.label} workspace`}
        description="This route is wired into the new dashboard shell so the module layout, breadcrumbs, and top bar remain consistent while you flesh out feature-specific widgets."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-[1.4rem] border border-white/10 bg-black/15 p-5">
            <h3 className="text-lg font-semibold text-white">
              Designed intent
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-mist)]">
              {activeModule.heroDescription}
            </p>
          </article>
          <article className="rounded-[1.4rem] border border-white/10 bg-black/15 p-5">
            <h3 className="text-lg font-semibold text-white">
              Next implementation step
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-mist)]">
              Replace this scaffold with the dedicated tables, charts, forms,
              and map surfaces required for this section.
            </p>
          </article>
        </div>
      </DataPanel>

      <DataPanel
        eyebrow="Module navigation"
        title="Related section links"
        description="Every item below is live and routed through the same module-specific sidebar."
      >
        <div className="grid gap-3 xl:grid-cols-2">
          {activeModule.items.map((relatedItem) => {
            const isActive = relatedItem.href === item.href;

            return (
              <Link
                key={relatedItem.href}
                href={relatedItem.href}
                className={`rounded-[1.3rem] border p-4 transition-colors ${
                  isActive
                    ? "border-[var(--color-sand)]/35 bg-[var(--color-sand)]/10"
                    : "border-white/10 bg-black/15 hover:border-white/20 hover:bg-white/[0.05]"
                }`}
              >
                <span className="block text-sm font-semibold text-white">
                  {relatedItem.label}
                </span>
                <span className="mt-2 block text-sm leading-6 text-[var(--color-mist)]">
                  {relatedItem.description}
                </span>
              </Link>
            );
          })}
        </div>
      </DataPanel>

      <DataPanel
        eyebrow="Platform reach"
        title="Other dashboard modules"
        description="The new shell keeps the top bar and shared controls stable while the sidebar swaps to the currently active domain."
      >
        <div className="flex flex-wrap gap-3">
          {dashboardModules
            .filter(
              (candidate) =>
                candidate.showInHub && candidate.key !== activeModule.key,
            )
            .map((candidate) => (
              <Link
                key={candidate.href}
                href={candidate.href}
                className="rounded-full border border-white/10 bg-black/15 px-4 py-2 text-sm text-[var(--color-mist)] transition-colors hover:border-white/20 hover:text-white"
              >
                {candidate.label}
              </Link>
            ))}
        </div>
      </DataPanel>
    </ModulePageShell>
  );
}
