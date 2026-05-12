import { devices, sensorCatalog } from "@/lib/server/data/sats-seed";
import type { DevicesPageResponse } from "@/types/sats-api";

export async function getDevicesPageData(): Promise<DevicesPageResponse> {
  const lowBatteryCount = devices.filter(
    (device) => device.batteryPercentage <= 20,
  ).length;

  return {
    hero: {
      eyebrow: "Device management",
      title:
        "Operational visibility for collars, tags, firmware state, and sensor payloads.",
      description:
        "Fleet health, firmware posture, and sensor capabilities are exposed through the SATS backend boundary instead of being embedded in the page.",
    },
    metrics: [
      {
        label: "Managed devices",
        value: String(devices.length),
        change: "3 categories deployed",
        tone: "positive",
      },
      {
        label: "Low battery devices",
        value: String(lowBatteryCount),
        change: "Maintenance queue active",
        tone: "warning",
      },
      {
        label: "Sensor capabilities",
        value: String(sensorCatalog.length),
        change: "Telemetry stack standardized",
        tone: "stable",
      },
    ],
    devices,
    sensors: sensorCatalog,
    generatedAt: new Date().toISOString(),
  };
}
