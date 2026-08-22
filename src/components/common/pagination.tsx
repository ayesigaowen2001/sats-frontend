"use client";

interface PageNumbersProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

function getPageItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis-start" | "ellipsis-end"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis-start" | "ellipsis-end"> = [];
  const left = Math.max(2, currentPage - 1);
  const right = Math.min(totalPages - 1, currentPage + 1);

  items.push(1);

  if (left > 2) {
    items.push("ellipsis-start");
  }

  for (let page = left; page <= right; page += 1) {
    items.push(page);
  }

  if (right < totalPages - 1) {
    items.push("ellipsis-end");
  }

  items.push(totalPages);

  return items;
}

export function PageNumbers({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  size = "md",
}: PageNumbersProps): React.JSX.Element | null {
  if (totalPages <= 1) {
    return null;
  }

  const items = getPageItems(currentPage, totalPages);

  const sizeClasses =
    size === "sm" ? "h-7 min-w-7 px-2 text-xs" : "h-9 min-w-9 px-3 text-sm";

  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5">
      {items.map((item, index) => {
        if (item === "ellipsis-start" || item === "ellipsis-end") {
          return (
            <span
              key={`${item}-${index}`}
              className="px-2 text-[var(--color-fog)]"
              aria-hidden
            >
              …
            </span>
          );
        }

        const isActive = item === currentPage;

        return (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onPageChange(item)}
            aria-current={isActive ? "page" : undefined}
            className={`${sizeClasses} rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              isActive
                ? "border-[var(--color-sand)] bg-[var(--color-sand)]/25 text-[var(--color-ice)]"
                : "border-white/10 bg-white/5 text-[var(--color-mist)] hover:border-white/25 hover:bg-white/10 hover:text-[var(--color-ice)]"
            }`}
          >
            {item}
          </button>
        );
      })}
    </nav>
  );
}
