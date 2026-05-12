import { geofenceEvents, trackingAssets } from "@/lib/server/data/sats-seed";
import type { TrackingPageResponse } from "@/types/sats-api";

export async function getTrackingPageData(): Promise<TrackingPageResponse> {
  const activeBreaches = geofenceEvents.filter(
    (event) => event.status === "Breach" || event.status === "Border",
  ).length;

  return {
    hero: {
      eyebrow: "Tracking module",
      title:
        "Live location intelligence for geofencing, movement analysis, and response.",
      description:
        "Telemetry streams, geofence events, and device-linked animal tracking now flow through a dedicated SATS endpoint and shared client store.",
    },
    metrics: [
      {
        label: "Tracked animals online",
        value: String(trackingAssets.length),
        change: "2 refreshed in the last 5 min",
        tone: "positive",
      },
      {
        label: "Active border events",
        value: String(activeBreaches),
        change: "Escalated to ranger teams",
        tone: "warning",
      },
      {
        label: "Telemetry cadence",
        value: "15 sec",
        change: "LoRa primary path stable",
        tone: "stable",
      },
    ],
    channels: ["LoRa", "GSM fallback", "Satellite recovery"],
    trackedAnimals: trackingAssets,
    geofenceEvents,
    generatedAt: new Date().toISOString(),
  };
}
