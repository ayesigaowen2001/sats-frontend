"use client";

import { create } from "zustand";

import { organizationContextOptions } from "@/lib/navigation";
import type { OrganizationSummary } from "@/types";

interface OrganizationState {
  organizations: OrganizationSummary[];
  activeOrganizationId: string;
  setActiveOrganizationId: (organizationId: string) => void;
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  organizations: organizationContextOptions.map((organization) => ({
    id: organization.id,
    name: organization.name,
    domain: organization.domain,
    scope: organization.scope,
  })),
  activeOrganizationId: "platform-authority",
  setActiveOrganizationId: (organizationId) =>
    set({ activeOrganizationId: organizationId }),
}));
