import type { ReactNode } from "react";

import { MetricCard } from "@/components/metric-card";
import type { HeroContent } from "@/types/sats-api";
import type { SystemMetric } from "@/types/sats";

interface ModulePageShellProps {
  hero: HeroContent;
  metrics: SystemMetric[];
  generatedAt: string;
  badges?: string[];
  children: ReactNode;
}

export function ModulePageShell({
  hero,
  metrics,
  generatedAt,
  badges,
  children,
}: ModulePageShellProps) {
  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(226,189,121,0.22),transparent_24%),linear-gradient(135deg,rgba(6,31,44,0.96),rgba(4,18,28,0.98))] p-7 shadow-[0_32px_120px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--color-sand)]">
              {hero.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {hero.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--color-mist)] sm:text-lg">
              {hero.description}
            </p>
            {badges?.length ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/85"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </div>
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-[var(--color-fog)]">
          Last updated {new Date(generatedAt).toLocaleString()}
        </p>
      </section>
      {children}
    </main>
  );
}
