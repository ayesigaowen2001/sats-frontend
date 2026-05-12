import {
  liveAlerts,
  modules,
  schemaSections,
  strategicPoints,
  systemMetrics,
  workflow,
} from "@/lib/sats-data";
import { LiveFeed } from "@/components/live-feed";
import { MetricCard } from "@/components/metric-card";
import { ModuleCard } from "@/components/module-card";
import { SchemaTable } from "@/components/schema-table";
import { SectionHeading } from "@/components/section-heading";
import { WorkflowStrip } from "@/components/workflow-strip";

const quickStats = [
  "IoT telemetry ingestion",
  "AI-assisted health detection",
  "Multi-organization governance",
  "Geospatial video intelligence",
];

export function DashboardShell() {
  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-10 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(229,184,117,0.28),transparent_30%),linear-gradient(135deg,rgba(6,31,44,0.96),rgba(4,18,28,0.98))] p-7 shadow-[0_32px_120px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-sand)]">
              Smart Animal Tracking System
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Wildlife operations command built for live tracking, health
                intelligence, and conservation response.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-[var(--color-mist)] sm:text-lg">
                This first implementation pass turns your SATS concept into a
                working frontend foundation with domain models, module mapping,
                workflow visibility, and schema-aware operational surfaces.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {quickStats.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/85"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {systemMetrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </section>

      <LiveFeed alerts={liveAlerts} points={strategicPoints} />

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Module architecture"
          title="A system map aligned to your SATS domain model"
          description="Each module below is defined from your specification and positioned as part of a coherent operational platform rather than a generic dashboard placeholder."
        />
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard key={module.name} {...module} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading
          eyebrow="Operational flow"
          title="End-to-end workflow from field capture to conservation action"
          description="The workflow is modeled around device onboarding, telemetry capture, resilient transmission, intelligence, and coordinated response."
        />
        <WorkflowStrip phases={workflow} />
      </section>

      <section className="space-y-6 pb-6">
        <SectionHeading
          eyebrow="Data foundation"
          title="PostgreSQL and PostGIS schema translated into product structure"
          description="These schema groups summarize the tables and entities needed to support multi-tenancy, device telemetry, wildlife health, geofencing, video, and reporting."
        />
        <SchemaTable sections={schemaSections} />
      </section>
    </main>
  );
}
