import {
  domainMappings,
  onboardingQueue,
} from "@/lib/server/data/sats-seed";
import type { AdministratorPageResponse } from "@/types/sats-api";

export async function getAdministratorPageData(): Promise<AdministratorPageResponse> {
  const activeDomains = domainMappings.filter(
    (domain) => domain.status === "Active",
  ).length;

  return {
    hero: {
      eyebrow: "Administrator",
      title: "Global enterprise administration for domains, onboarding, and platform support.",
      description:
        "System administrators use this module to manage domain readiness, enterprise onboarding queues, and multi-organization rollout controls.",
    },
    metrics: [
      {
        label: "Managed domains",
        value: String(domainMappings.length),
        change: `${activeDomains} active tenant endpoints`,
        tone: "positive",
      },
      {
        label: "Onboarding queue",
        value: String(onboardingQueue.length),
        change: "Enterprise rollout tasks pending",
        tone: "warning",
      },
      {
        label: "Platform support state",
        value: "Stable",
        change: "Global admin console online",
        tone: "stable",
      },
    ],
    domains: domainMappings,
    onboardingQueue,
    generatedAt: new Date().toISOString(),
  };
}