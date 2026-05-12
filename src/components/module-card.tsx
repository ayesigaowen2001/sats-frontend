import type { SatsModule } from "@/types/sats";

const statusClasses: Record<SatsModule["status"], string> = {
  Core: "bg-emerald-300/15 text-emerald-100 ring-1 ring-emerald-200/20",
  Operational: "bg-sky-300/15 text-sky-100 ring-1 ring-sky-200/20",
  Planned: "bg-amber-300/15 text-amber-100 ring-1 ring-amber-200/20",
};

export function ModuleCard({
  name,
  purpose,
  highlights,
  integrations,
  status,
}: SatsModule) {
  return (
    <article className="group rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-[var(--color-sand)]/40 hover:bg-white/[0.08]">
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-xl font-semibold text-white">{name}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}
        >
          {status}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-[var(--color-mist)]">
        {purpose}
      </p>
      <div className="mt-6 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-fog)]">
            Highlights
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {highlights.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs text-[var(--color-mist)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-fog)]">
            Integrations
          </p>
          <p className="mt-2 text-sm text-white/80">
            {integrations.join(" • ")}
          </p>
        </div>
      </div>
    </article>
  );
}
