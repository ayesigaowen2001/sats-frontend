import {
  localNodes,
  organizations,
  subscriptions,
} from "@/lib/server/data/sats-seed";
import type { OrganizationsPageResponse } from "@/types/sats-api";

export async function getOrganizationsPageData(): Promise<OrganizationsPageResponse> {
  const trialOrganizations = organizations.filter(
    (organization) => organization.subscriptionStatus === "Trial",
  ).length;

  return {
    hero: {
      eyebrow: "Organization management",
      title:
        "Multi-tenant administration for subscriptions, branding, local nodes, and governance.",
      description:
        "This route captures the central operations layer of SATS, including subscription posture, tenant scale, and local control room nodes.",
    },
    metrics: [
      {
        label: "Organizations onboarded",
        value: String(organizations.length),
        change: "One trial pending conversion",
        tone: "positive",
      },
      {
        label: "Trial subscriptions",
        value: String(trialOrganizations),
        change: "Needs administrator follow-up",
        tone: "warning",
      },
      {
        label: "Visible local nodes",
        value: String(localNodes.length),
        change: "All tenants reporting",
        tone: "stable",
      },
    ],
    organizations,
    subscriptions,
    nodes: localNodes,
    generatedAt: new Date().toISOString(),
  };
}
