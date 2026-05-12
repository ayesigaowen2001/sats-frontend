import type { AlertItem, StrategicPoint } from "@/types/sats";

interface LiveFeedProps {
  alerts: AlertItem[];
  points: StrategicPoint[];
}

const severityClasses: Record<AlertItem["severity"], string> = {
  Critical: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  Warning: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  Info: "border-sky-300/30 bg-sky-400/10 text-sky-100",
};

export function LiveFeed({ alerts, points }: LiveFeedProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-fog)]">
              Live operational queue
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              Priority events across health, movement, and hardware
            </h3>
          </div>
          <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
            Real-time
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {alerts.map((alert) => (
            <article
              key={alert.title}
              className="rounded-[1.5rem] border border-white/8 bg-white/[0.04] p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${severityClasses[alert.severity]}`}
                >
                  {alert.severity}
                </span>
                <span className="text-xs uppercase tracking-[0.24em] text-[var(--color-fog)]">
                  {alert.module}
                </span>
              </div>
              <h4 className="mt-4 text-lg font-semibold text-white">
                {alert.title}
              </h4>
              <p className="mt-2 text-sm leading-7 text-[var(--color-mist)]">
                {alert.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-fog)]">
          Strategic strengths
        </p>
        <div className="mt-5 space-y-4">
          {points.map((point) => (
            <article
              key={point.title}
              className="rounded-[1.5rem] border border-white/10 bg-black/15 p-4"
            >
              <h3 className="text-lg font-semibold text-white">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-[var(--color-mist)]">
                {point.summary}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
