"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export interface SystemThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

const defaultSystemThemeColors: SystemThemeColors = {
  primary: "#0f4c5c",
  secondary: "#f7f3e8",
  accent: "#d17a22",
};

interface UIState {
  themeMode: ThemeMode;
  systemThemeColors: SystemThemeColors;
  mobileSidebarOpen: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setSystemThemeColors: (colors: SystemThemeColors) => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      themeMode: "system",
      systemThemeColors: defaultSystemThemeColors,
      mobileSidebarOpen: false,
      setThemeMode: (themeMode) => set({ themeMode }),
      setSystemThemeColors: (systemThemeColors) => set({ systemThemeColors }),
      setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
    }),
    {
      name: "sats-ui-preferences",
      partialize: (state) => ({
        themeMode: state.themeMode,
        systemThemeColors: state.systemThemeColors,
      }),
    },
  ),
);
