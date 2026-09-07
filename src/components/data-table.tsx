"use client";

import { useState, type ReactNode } from "react";

import { PageNumbers } from "@/components/common/pagination";

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
  pagination?: boolean;
  pageSize?: number;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  rows,
  showCard = true,
  horizontalScroll = false,
  minColumnWidthRem = 12,
  pagination = true,
  pageSize = 10,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const minTableWidth = `${columns.length * minColumnWidthRem}rem`;
  const safePageSize = Math.max(1, pageSize);
  const totalPages = pagination
    ? Math.max(1, Math.ceil(rows.length / safePageSize))
    : 1;
  const visiblePage = Math.min(currentPage, totalPages);
  const visibleRows = pagination
    ? rows.slice((visiblePage - 1) * safePageSize, visiblePage * safePageSize)
    : rows;

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
          className="hidden grid-cols-[repeat(var(--column-count),minmax(0,1fr))] gap-3 border-b border-white/10 bg-black/30 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-fog)] md:grid"
          style={{ ["--column-count" as string]: columns.length }}
        >
          {columns.map((column) => (
            <div key={column.header} className="min-w-[10rem]">
              {column.header}
            </div>
          ))}
        </div>
        <div className="divide-y divide-white/10 bg-black/10">
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className="grid gap-3 px-4 py-2.5 md:grid-cols-[repeat(var(--column-count),minmax(0,1fr))]"
              style={{ ["--column-count" as string]: columns.length }}
            >
              {columns.map((column) => (
                <div
                  key={column.header}
                  className="min-w-[10rem] break-words text-sm leading-5 text-white/85"
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
      {pagination && totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-3">
          <p className="text-xs text-[var(--color-fog)]">
            Page {visiblePage} of {totalPages} · {rows.length} records
          </p>
          <PageNumbers
            currentPage={visiblePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            size="sm"
          />
        </div>
      ) : null}
    </div>
  );
}
