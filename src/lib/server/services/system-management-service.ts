import {
  configSettings,
  securityPolicies,
} from "@/lib/server/data/sats-seed";
import type { SystemManagementPageResponse } from "@/types/sats-api";

export async function getSystemManagementPageData(): Promise<SystemManagementPageResponse> {
  const enforcedPolicies = securityPolicies.filter(
    (item) => item.status === "Enforced",
  ).length;

  return {
    hero: {
      eyebrow: "System management",
      title: "Global configuration, security policy, authentication, and runtime controls.",
      description:
        "This module manages the platform settings that affect authentication, branding defaults, operational timing, and security posture.",
    },
    metrics: [
      {
        label: "Config settings",
        value: String(configSettings.length),
        change: "Platform defaults active",
        tone: "positive",
      },
      {
        label: "Enforced policies",
        value: String(enforcedPolicies),
        change: "Security posture monitored",
        tone: "warning",
      },
      {
        label: "System scope",
        value: "Global",
        change: "Administrator controlled",
        tone: "stable",
      },
    ],
    settings: configSettings,
    policies: securityPolicies,
    generatedAt: new Date().toISOString(),
  };
}