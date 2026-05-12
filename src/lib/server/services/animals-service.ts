import { animals, classifications } from "@/lib/server/data/sats-seed";
import type { AnimalsPageResponse } from "@/types/sats-api";

export async function getAnimalsPageData(): Promise<AnimalsPageResponse> {
  const criticalAnimals = animals.filter(
    (animal) => animal.healthStatus === "Critical",
  ).length;

  return {
    hero: {
      eyebrow: "Animal management",
      title:
        "A species-aware registry for tagged wildlife, health status, and assigned devices.",
      description:
        "The animal module now has its own route, endpoint, and store-backed view for classifications, registry records, and health posture.",
    },
    metrics: [
      {
        label: "Registered animals",
        value: String(animals.length),
        change: "Across 4 flagship species",
        tone: "positive",
      },
      {
        label: "Critical health cases",
        value: String(criticalAnimals),
        change: "Needs veterinary dispatch",
        tone: "warning",
      },
      {
        label: "Tracked classifications",
        value: String(classifications.length),
        change: "Taxonomy synchronized",
        tone: "stable",
      },
    ],
    animals,
    classifications,
    generatedAt: new Date().toISOString(),
  };
}
