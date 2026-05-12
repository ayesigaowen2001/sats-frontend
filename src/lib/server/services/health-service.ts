import { healthCases, healthTrends } from "@/lib/server/data/sats-seed";
import type { HealthPageResponse } from "@/types/sats-api";

export async function getHealthPageData(): Promise<HealthPageResponse> {
  const criticalCases = healthCases.filter(
    (item) => item.healthStatus === "Critical",
  ).length;

  return {
    hero: {
      eyebrow: "Health management",
      title: "Biometric monitoring, AI health intelligence, and clinical response workflows.",
      description:
        "The health module now exposes active animal cases and analytics trends through a dedicated endpoint and workspace.",
    },
    metrics: [
      {
        label: "Active cases",
        value: String(healthCases.length),
        change: "AI-assisted clinical queue",
        tone: "positive",
      },
      {
        label: "Critical cases",
        value: String(criticalCases),
        change: "Immediate intervention needed",
        tone: "warning",
      },
      {
        label: "Trend monitors",
        value: String(healthTrends.length),
        change: "Analytics windows active",
        tone: "stable",
      },
    ],
    cases: healthCases,
    trends: healthTrends,
    generatedAt: new Date().toISOString(),
  };
}