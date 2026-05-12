"use client";

import { useEffect } from "react";

import { useUIStore } from "@/store/useUIStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeMode = useUIStore((state) => state.themeMode);
  const systemThemeColors = useUIStore((state) => state.systemThemeColors);

  useEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = themeMode;

    if (themeMode === "system") {
      root.style.setProperty("--system-primary", systemThemeColors.primary);
      root.style.setProperty("--system-secondary", systemThemeColors.secondary);
      root.style.setProperty("--system-accent", systemThemeColors.accent);
      return;
    }

    root.style.removeProperty("--system-primary");
    root.style.removeProperty("--system-secondary");
    root.style.removeProperty("--system-accent");
  }, [themeMode, systemThemeColors]);

  return children;
}
