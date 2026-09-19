import type { ReportSectionRow } from "@/types/report";

const FALLBACK_COLORS = [
  "#0f4c5c",
  "#2a9d8f",
  "#e76f51",
  "#457b9d",
  "#6d597a",
  "#264653",
  "#e9c46a",
  "#f4a261",
];

function numericValue(row: ReportSectionRow) {
  return typeof row.value === "number" ? row.value : row.count;
}

export function ReportBarChart({
  rows,
  accentColor,
}: {
  rows: ReportSectionRow[];
  accentColor: string;
}) {
  const max = Math.max(...rows.map(numericValue), 1);

  return (
    <div className="flex items-end gap-3 py-2">
      {rows.map((row) => {
        const value = numericValue(row);

        return (
          <div
            key={row.label}
            className="flex min-w-[3.5rem] flex-1 flex-col items-center gap-1"
          >
            <span className="text-xs font-semibold tabular-nums text-slate-700">
              {value}
              {row.unit ? ` ${row.unit}` : ""}
            </span>
            <div
              className="w-full rounded-t-sm"
              style={{
                height: Math.max(4, Math.round((value / max) * 120)),
                backgroundColor: accentColor,
              }}
            />
            <span className="w-full truncate text-center text-[10px] leading-tight text-slate-500">
              {row.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ReportDonutChart({
  rows,
  accentColor,
}: {
  rows: ReportSectionRow[];
  accentColor: string;
}) {
  const total = rows.reduce((sum, row) => sum + (row.count || 0), 0) || 1;
  const radius = 52;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const colors = [accentColor, ...FALLBACK_COLORS];

  const segments = rows.reduce<
    Array<{ row: ReportSectionRow; dash: number; offset: number }>
  >((acc, row) => {
    const dash = ((row.count || 0) / total) * circumference;
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.dash : 0;

    return [...acc, { row, dash, offset }];
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        {segments.map(({ row, dash, offset }, index) => (
          <circle
            key={row.label}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
          />
        ))}
      </svg>

      <ul className="space-y-1.5">
        {rows.map((row, index) => (
          <li key={row.label} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="font-medium text-slate-700">{row.label}</span>
            <span className="tabular-nums text-slate-500">
              {row.percentage === null ? "" : `${row.percentage}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
