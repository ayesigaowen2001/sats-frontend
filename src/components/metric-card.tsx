import type { SystemMetric } from "@/types/sats";

const toneClasses: Record<SystemMetric["tone"], string> = {
  stable: "border-white/12 bg-white/6 text-[var(--color-mist)]",
  positive: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-300/30 bg-amber-300/10 text-amber-100",
};

export function MetricCard({ label, value, change, tone }: SystemMetric) {
  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur-sm">
      <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-fog)]">
        {label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <strong className="text-4xl font-semibold tracking-tight text-white">
          {value}
        </strong>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}
        >
          {change}
        </span>
      </div>
    </article>
  );
}
