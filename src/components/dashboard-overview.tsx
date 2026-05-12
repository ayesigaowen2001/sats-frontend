import { LiveFeed } from "@/components/live-feed";
import { MetricCard } from "@/components/metric-card";
import { ModuleCard } from "@/components/module-card";
import { SchemaTable } from "@/components/schema-table";
import { SectionHeading } from "@/components/section-heading";
import { WorkflowStrip } from "@/components/workflow-strip";
import type { OverviewResponse } from "@/types/sats-api";

interface DashboardOverviewProps {
  overview: OverviewResponse;
}

export function DashboardOverview({ overview }: DashboardOverviewProps) {
  return (
    <main className="flex w-full flex-1 flex-col gap-10 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(229,184,117,0.28),transparent_30%),linear-gradient(135deg,rgba(6,31,44,0.96),rgba(4,18,28,0.98))] p-7 shadow-[0_32px_120px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-sand)]">
              {overview.hero.eyebrow}
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {overview.hero.title}
              </h1>
              <p className="max-w-3xl text-base leading-8 text-[var(--color-mist)] sm:text-lg">
                {overview.hero.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {overview.quickStats.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/85"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-fog)]">
              Last updated {new Date(overview.generatedAt).toLocaleString()}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {overview.metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </section>

      <LiveFeed alerts={overview.alerts} points={overview.strategicPoints} />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Module architecture"
          title="A system map aligned to your SATS domain model"
          description="Each route-level module below now sits behind a typed endpoint and shared client store, creating a real frontend-backend boundary inside the Next app."
        />
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {overview.modules.map((module) => (
            <ModuleCard key={module.name} {...module} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Operational flow"
          title="End-to-end workflow from field capture to conservation action"
          description="The workflow remains grounded in onboarding, telemetry collection, transmission, AI detection, event escalation, and conservation reporting."
        />
        <WorkflowStrip phases={overview.workflow} />
      </section>

      <section className="space-y-6 pb-6">
        <SectionHeading
          eyebrow="Data foundation"
          title="PostgreSQL and PostGIS schema translated into product structure"
          description="The SQL scaffold shipped with this pass mirrors these sections and is ready to back the route handlers with a real database adapter."
        />
        <SchemaTable sections={overview.schemaSections} />
      </section>
    </main>
  );
}
