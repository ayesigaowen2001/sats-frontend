"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { dashboardModules } from "@/lib/dashboard-config";
import { cn } from "@/lib/utils";

interface SearchEntry {
  id: string;
  href: string;
  label: string;
  description: string;
  moduleLabel: string;
  type: "module" | "menu";
  keywords: string;
}

interface TopbarProps {
  showSidebarToggle?: boolean;
  onSidebarOpen?: () => void;
}

function rankResult(entry: SearchEntry, term: string) {
  const label = entry.label.toLowerCase();
  const moduleLabel = entry.moduleLabel.toLowerCase();
  const description = entry.description.toLowerCase();

  if (label === term) return 0;
  if (label.startsWith(term)) return 1;
  if (moduleLabel.startsWith(term)) return 2;
  if (label.includes(term)) return 3;
  if (moduleLabel.includes(term)) return 4;
  if (description.includes(term)) return 5;
  return 6;
}

export function Topbar({
  showSidebarToggle = false,
  onSidebarOpen,
}: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchIndex = useMemo<SearchEntry[]>(() => {
    const entries: SearchEntry[] = [];

    dashboardModules.forEach((dashboardModule) => {
      entries.push({
        id: `module:${dashboardModule.key}`,
        href: dashboardModule.href,
        label: dashboardModule.label,
        description: dashboardModule.description,
        moduleLabel: dashboardModule.label,
        type: "module",
        keywords: `${dashboardModule.label} ${dashboardModule.description} ${dashboardModule.highlights.join(" ")}`,
      });

      dashboardModule.items.forEach((item) => {
        entries.push({
          id: `menu:${dashboardModule.key}:${item.href}`,
          href: item.href,
          label: item.label,
          description: item.description,
          moduleLabel: dashboardModule.label,
          type: "menu",
          keywords: `${item.label} ${item.description} ${dashboardModule.label} ${dashboardModule.highlights.join(" ")}`,
        });
      });
    });

    return entries;
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return [] as SearchEntry[];
    }

    return searchIndex
      .filter((entry) => entry.keywords.toLowerCase().includes(term))
      .sort((left, right) => {
        const scoreDelta = rankResult(left, term) - rankResult(right, term);
        if (scoreDelta !== 0) return scoreDelta;
        return left.label.localeCompare(right.label);
      })
      .slice(0, 10);
  }, [query, searchIndex]);

  useEffect(() => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(0);
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (containerRef.current.contains(event.target as Node)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  useEffect(() => {
    if (!results.length) {
      setSelectedIndex(0);
      return;
    }

    if (selectedIndex > results.length - 1) {
      setSelectedIndex(0);
    }
  }, [results, selectedIndex]);

  const navigateTo = (entry: SearchEntry) => {
    setIsOpen(false);
    setQuery("");
    router.push(entry.href);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) {
      if (event.key === "Enter") {
        event.preventDefault();
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) =>
        current === 0 ? results.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      navigateTo(results[selectedIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-shell-border)] bg-[rgba(4,16,24,0.76)] backdrop-blur-xl">
      <div className="flex flex-col gap-5 px-4 py-4 sm:px-5 lg:px-6 xl:px-7">
        <div
          ref={containerRef}
          className="relative flex items-center justify-center"
        >
          {showSidebarToggle ? (
            <button
              type="button"
              onClick={onSidebarOpen}
              className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-shell-strong)]"
              aria-label="Show sidebar"
            >
              <span className="pi pi-bars text-sm" aria-hidden="true" />
            </button>
          ) : null}

          <label className="flex w-full max-w-2xl items-center gap-3 rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] px-4 py-2 text-sm text-[var(--color-mist)]">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fog)]">
              Search
            </span>
            <input
              type="search"
              placeholder="Search modules, animals, devices, organizations"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim()) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-[var(--color-ice)] outline-none"
            />
          </label>

          {isOpen && query.trim() ? (
            <div className="absolute left-1/2 top-[calc(100%+0.7rem)] z-40 w-full max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--color-shell-border)] bg-[rgba(10,28,40,0.96)] shadow-[0_26px_50px_rgba(0,0,0,0.32)]">
              {results.length ? (
                <ul className="max-h-[22rem] overflow-y-auto p-2">
                  {results.map((result, index) => {
                    const isSelected = index === selectedIndex;

                    return (
                      <li key={result.id}>
                        <button
                          type="button"
                          onMouseEnter={() => setSelectedIndex(index)}
                          onClick={() => navigateTo(result)}
                          className={cn(
                            "flex w-full items-start justify-between gap-4 rounded-xl px-3 py-2.5 text-left transition-colors",
                            isSelected
                              ? "bg-[var(--color-sand)]/18"
                              : "hover:bg-white/[0.06]",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[var(--color-ice)]">
                              {result.label}
                            </span>
                            <span className="mt-1 block truncate text-xs text-[var(--color-mist)]">
                              {result.moduleLabel} • {result.description}
                            </span>
                          </span>
                          <span className="mt-0.5 rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fog)]">
                            {result.type}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="px-4 py-4 text-sm text-[var(--color-mist)]">
                  No results for "{query.trim()}".
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
