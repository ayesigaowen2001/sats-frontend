import {
  filterPresets,
  queryDefinitions,
} from "@/lib/server/data/sats-seed";
import type { FiltersPageResponse } from "@/types/sats-api";

export async function getFiltersPageData(): Promise<FiltersPageResponse> {
  return {
    hero: {
      eyebrow: "Filters engine",
      title: "Cross-module filter presets and reusable query definitions.",
      description:
        "This module centralizes the saved views and reusable criteria that should work consistently across the whole SATS application surface.",
    },
    metrics: [
      {
        label: "Saved presets",
        value: String(filterPresets.length),
        change: "Reusable across modules",
        tone: "positive",
      },
      {
        label: "Query definitions",
        value: String(queryDefinitions.length),
        change: "API-aligned filters",
        tone: "stable",
      },
      {
        label: "Cross-module scope",
        value: "Enabled",
        change: "Shared workspace filtering",
        tone: "warning",
      },
    ],
    presets: filterPresets,
    queryDefinitions,
    generatedAt: new Date().toISOString(),
  };
}