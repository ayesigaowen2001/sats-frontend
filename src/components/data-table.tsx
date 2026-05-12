import type { ReactNode } from "react";

interface DataTableColumn<T extends { id: string | number }> {
  header: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T extends { id: string | number }> {
  columns: DataTableColumn<T>[];
  rows: T[];
  showCard?: boolean;
  horizontalScroll?: boolean;
  minColumnWidthRem?: number;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  showCard = true,
  horizontalScroll = false,
  minColumnWidthRem = 12,
}: DataTableProps<T>) {
  const minTableWidth = `${columns.length * minColumnWidthRem}rem`;

  return (
    <div className={horizontalScroll ? "overflow-x-auto" : undefined}>
      <div
        className={
          showCard
            ? "overflow-hidden rounded-[1.25rem] border border-white/10"
            : ""
        }
        style={horizontalScroll ? { minWidth: minTableWidth } : undefined}
      >
        <div
          className="hidden grid-cols-[repeat(var(--column-count),minmax(0,1fr))] gap-4 border-b border-white/10 bg-black/30 px-4 py-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-fog)] md:grid"
          style={{ ["--column-count" as string]: columns.length }}
        >
          {columns.map((column) => (
            <div key={column.header} className="min-w-[10rem]">
              {column.header}
            </div>
          ))}
        </div>
        <div className="divide-y divide-white/10 bg-black/10">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-4 px-4 py-4 md:grid-cols-[repeat(var(--column-count),minmax(0,1fr))]"
              style={{ ["--column-count" as string]: columns.length }}
            >
              {columns.map((column) => (
                <div
                  key={column.header}
                  className="min-w-[10rem] break-words text-sm leading-6 text-white/85"
                >
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-fog)] md:hidden">
                    {column.header}
                  </span>
                  {column.render(row)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
