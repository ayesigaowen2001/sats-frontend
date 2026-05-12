import type { ReactNode } from "react";

interface DataPanelProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function DataPanel({
  eyebrow,
  title,
  description,
  children,
}: DataPanelProps) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-sand)]">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-7 text-[var(--color-mist)]">
          {description}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}
