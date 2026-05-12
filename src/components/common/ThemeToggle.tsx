"use client";

import { useUIStore } from "@/store/useUIStore";

export function ThemeToggle() {
  const themeMode = useUIStore((state) => state.themeMode);
  const setThemeMode = useUIStore((state) => state.setThemeMode);

  const nextMode =
    themeMode === "light" ? "dark" : themeMode === "dark" ? "system" : "light";

  return (
    <button
      type="button"
      onClick={() => setThemeMode(nextMode)}
      className="rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] px-4 py-2 text-sm font-medium text-[var(--color-ice)] transition-colors hover:border-white/20 hover:bg-[var(--color-shell-strong)]"
    >
      Theme: {themeMode[0].toUpperCase()}
      {themeMode.slice(1)}
    </button>
  );
}
