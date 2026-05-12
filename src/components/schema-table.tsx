import type { SchemaSection } from "@/types/sats";

interface SchemaTableProps {
  sections: SchemaSection[];
}

export function SchemaTable({ sections }: SchemaTableProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {sections.map((section) => (
        <article
          key={section.title}
          className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-semibold text-white">{section.title}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--color-mist)]">
            {section.description}
          </p>
          <div className="mt-6 space-y-4">
            {section.rows.map((row) => (
              <div
                key={row.name}
                className="rounded-2xl border border-white/8 bg-black/15 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <strong className="text-sm uppercase tracking-[0.2em] text-[var(--color-sand)]">
                    {row.name}
                  </strong>
                  <p className="text-sm leading-6 text-white/80">
                    {row.fields.join(" • ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
