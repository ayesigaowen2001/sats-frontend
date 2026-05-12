"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function TrackingPageView() {
  const tracking = useSatsStore((state) => state.tracking);
  const isLoading = useSatsStore((state) => state.loading.tracking);
  const error = useSatsStore((state) => state.errors.tracking);
  const loadTracking = useSatsStore((state) => state.loadTracking);

  useSatsResource(tracking, isLoading, loadTracking);

  if (error) {
    return (
      <ResourceFeedback title="Tracking data unavailable" detail={error} />
    );
  }

  if (!tracking) {
    return (
      <ResourceFeedback
        title="Loading tracking telemetry"
        detail="The tracking module is requesting live route data from the SATS tracking endpoint."
      />
    );
  }

  return (
    <ModulePageShell
      hero={tracking.hero}
      metrics={tracking.metrics}
      generatedAt={tracking.generatedAt}
      badges={tracking.channels}
    >
      <DataPanel
        eyebrow="Tracked assets"
        title="Animals currently visible to the command center"
        description="These records represent the live operational slice exposed by the tracking service."
      >
        <DataTable
          rows={tracking.trackedAnimals}
          columns={[
            {
              header: "Animal",
              render: (row) => (
                <div>
                  <strong className="block text-white">{row.animalName}</strong>
                  <span className="text-[var(--color-mist)]">
                    {row.species}
                  </span>
                </div>
              ),
            },
            {
              header: "Device",
              render: (row) => row.deviceSerial,
            },
            {
              header: "Location",
              render: (row) =>
                `${row.region} (${row.latitude.toFixed(3)}, ${row.longitude.toFixed(3)})`,
            },
            {
              header: "Status",
              render: (row) => `${row.geofenceStatus} • ${row.healthStatus}`,
            },
            {
              header: "Vitals",
              render: (row) =>
                `${row.heartRateBpm} bpm • ${row.speedKmh.toFixed(1)} km/h`,
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Geofence events"
        title="Recent boundary transitions and escalation points"
        description="These incidents are the immediate candidates for ranger intervention and video cross-checking."
      >
        <DataTable
          rows={tracking.geofenceEvents}
          columns={[
            {
              header: "Park",
              render: (row) => row.parkName,
            },
            {
              header: "Animal",
              render: (row) => row.animalName,
            },
            {
              header: "Region",
              render: (row) => row.region,
            },
            {
              header: "Status",
              render: (row) => row.status,
            },
            {
              header: "Timestamp",
              render: (row) => new Date(row.timestamp).toLocaleString(),
            },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}
