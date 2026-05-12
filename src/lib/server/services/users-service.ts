import {
  permissionCatalog,
  roleCatalog,
  userAccounts,
} from "@/lib/server/data/sats-seed";
import type { UsersPageResponse } from "@/types/sats-api";

export async function getUsersPageData(): Promise<UsersPageResponse> {
  const globalRoles = roleCatalog.filter((role) => role.isGlobal).length;

  return {
    hero: {
      eyebrow: "User management",
      title: "Identity, RBAC, and access boundaries for the entire SATS platform.",
      description:
        "This module manages system administrators, organization administrators, field operators, roles, and permission boundaries across tenants.",
    },
    metrics: [
      {
        label: "Managed users",
        value: String(userAccounts.length),
        change: "Across system and tenant boundaries",
        tone: "positive",
      },
      {
        label: "Defined roles",
        value: String(roleCatalog.length),
        change: `${globalRoles} global roles`,
        tone: "stable",
      },
      {
        label: "Permission rules",
        value: String(permissionCatalog.length),
        change: "RBAC matrix active",
        tone: "warning",
      },
    ],
    users: userAccounts,
    roles: roleCatalog,
    permissions: permissionCatalog,
    generatedAt: new Date().toISOString(),
  };
}