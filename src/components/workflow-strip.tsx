import type { WorkflowPhase } from "@/types/sats";

interface WorkflowStripProps {
  phases: WorkflowPhase[];
}

export function WorkflowStrip({ phases }: WorkflowStripProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-7">
      {phases.map((phase) => (
        <article
          key={phase.title}
          className="rounded-[1.5rem] border border-white/10 bg-black/20 p-5"
        >
          <h3 className="text-base font-semibold text-white">{phase.title}</h3>
          <p className="mt-3 text-sm leading-6 text-[var(--color-mist)]">
            {phase.summary}
          </p>
        </article>
      ))}
    </div>
  );
}
