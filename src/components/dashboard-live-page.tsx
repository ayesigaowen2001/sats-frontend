"use client";

import { DashboardOverview } from "@/components/dashboard-overview";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function DashboardLivePage() {
  const overview = useSatsStore((state) => state.overview);
  const isLoading = useSatsStore((state) => state.loading.overview);
  const error = useSatsStore((state) => state.errors.overview);
  const loadOverview = useSatsStore((state) => state.loadOverview);

  useSatsResource(overview, isLoading, loadOverview);

  if (error) {
    return (
      <ResourceFeedback title="Overview data unavailable" detail={error} />
    );
  }

  if (!overview) {
    return (
      <ResourceFeedback
        title="Loading SATS overview"
        detail="The dashboard is hydrating from the SATS overview endpoint and shared client store."
      />
    );
  }

  return <DashboardOverview overview={overview} />;
}
