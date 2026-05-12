import { overviewSeed } from "@/lib/server/data/sats-seed";
import type { OverviewResponse } from "@/types/sats-api";

export async function getOverviewData(): Promise<OverviewResponse> {
  return {
    ...overviewSeed,
    generatedAt: new Date().toISOString(),
  };
}
