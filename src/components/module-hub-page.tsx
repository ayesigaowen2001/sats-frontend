"use client";

import Link from "next/link";

import { primaryNavigation } from "@/lib/navigation";

const moduleIconMap: Record<string, string> = {
  tracking: "pi pi-map-marker",
  health: "pi pi-heart",
  devices: "pi pi-mobile",
  video: "pi pi-video",
  notifications: "pi pi-bell",
  filters: "pi pi-filter",
  reports: "pi pi-chart-line",
  organizations: "pi pi-building",
  users: "pi pi-users",
  administrator: "pi pi-briefcase",
  dataMigration: "pi pi-upload",
  systemManagement: "pi pi-cog",
};

export function ModuleHubPage() {
  const hiddenModuleKeys = new Set([
    "filters",
    "notifications",
    "reports",
    "migration",
    "system-management",
  ]);

  const modules = primaryNavigation.filter(
    (item) => item.key !== "overview" && !hiddenModuleKeys.has(item.key),
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-2 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {modules.map((module) => (
          <Link
            key={module.key}
            href={module.href}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl px-4 py-6 text-center transition-colors hover:bg-[var(--color-shell-strong)]"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-shell-border)] bg-white/10 text-2xl text-[var(--color-ice)]">
              {module.key === "animals" ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="4" r="2" />
                  <circle cx="18" cy="8" r="2" />
                  <circle cx="20" cy="16" r="2" />
                  <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
                </svg>
              ) : (
                <i className={moduleIconMap[module.key] ?? "pi pi-th-large"} />
              )}
            </span>
            <span className="text-sm font-semibold text-[var(--color-ice)] sm:text-base">
              {module.label}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
