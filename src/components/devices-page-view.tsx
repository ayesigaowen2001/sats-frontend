"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function DevicesPageView() {
  const devices = useSatsStore((state) => state.devices);
  const isLoading = useSatsStore((state) => state.loading.devices);
  const error = useSatsStore((state) => state.errors.devices);
  const loadDevices = useSatsStore((state) => state.loadDevices);

  useSatsResource(devices, isLoading, loadDevices);

  if (error) {
    return <ResourceFeedback title="Device data unavailable" detail={error} />;
  }

  if (!devices) {
    return (
      <ResourceFeedback
        title="Loading device fleet"
        detail="The device management route is requesting fleet, firmware, and sensor capability data from SATS services."
      />
    );
  }

  return (
    <ModulePageShell
      hero={devices.hero}
      metrics={devices.metrics}
      generatedAt={devices.generatedAt}
      badges={devices.sensors.map((sensor) => sensor.sensorName)}
    >
      <DataPanel
        eyebrow="Fleet registry"
        title="Device posture across categories, links, and battery state"
      >
        <DataTable
          rows={devices.devices}
          columns={[
            { header: "Serial", render: (row) => row.serial },
            { header: "Category", render: (row) => row.category },
            {
              header: "Connectivity",
              render: (row) => row.communicationType,
            },
            {
              header: "Firmware",
              render: (row) => row.firmwareVersion,
            },
            {
              header: "State",
              render: (row) => `${row.status} • ${row.batteryPercentage}%`,
            },
            {
              header: "Assignment",
              render: (row) => row.assignedAnimal,
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Sensor catalog"
        title="Reusable telemetry capabilities in the current device specification model"
      >
        <DataTable
          rows={devices.sensors}
          columns={[
            { header: "Sensor", render: (row) => row.sensorName },
            { header: "Unit", render: (row) => row.unit },
            {
              header: "Description",
              render: (row) => row.description,
            },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}
