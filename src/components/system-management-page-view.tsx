"use client";

import { useUIStore, type ThemeMode } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

export function SystemManagementPageView() {
  const themeMode = useUIStore((state) => state.themeMode);
  const setThemeMode = useUIStore((state) => state.setThemeMode);

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      {/* ── Theme / Appearance section ── */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Appearance
        </h2>
        <p className="text-sm text-[var(--color-mist)]">
          Control how the dashboard renders. <strong>System</strong> applies the
          organization branding colors fetched from the API.{" "}
          <strong>Light</strong> and <strong>Dark</strong> use fixed global
          palettes.
        </p>

        <div className="rounded-2xl border border-[var(--color-shell-border)] p-4">
          <h3 className="mb-3 text-base font-semibold text-[var(--color-ice)]">
            Application theme
          </h3>
          <p className="mb-4 text-sm text-[var(--color-mist)]">
            Choose which theme the platform should use.
          </p>
          <div className="flex flex-wrap gap-3">
            {(["system", "light", "dark"] as ThemeMode[]).map((mode) => {
              const isActive = themeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setThemeMode(mode)}
                  className={cn(
                    "rounded-full border px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors",
                    isActive
                      ? "border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 text-[var(--color-ice)]"
                      : "border-white/20 text-[var(--color-mist)] hover:border-white/40 hover:text-[var(--color-ice)]",
                  )}
                >
                  {mode === "system" ? "System (branding)" : mode}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
