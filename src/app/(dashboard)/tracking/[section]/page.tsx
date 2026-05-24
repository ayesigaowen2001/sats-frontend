import { notFound } from "next/navigation";

import { TrackingGeofenceEventsPageView } from "../../../../components/tracking-geofence-events-page-view";
import { TrackingGeofencesPageView } from "../../../../components/tracking-geofences-page-view";
import { TrackingLiveMapPageView } from "../../../../components/tracking-live-map-page-view";
import { ModuleSectionPage } from "@/components/module-section-page";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function TrackingSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("tracking", section)) {
    notFound();
  }

  if (section === "geofences") {
    return <TrackingGeofencesPageView />;
  }

  if (section === "geofence-events") {
    return <TrackingGeofenceEventsPageView />;
  }

  if (section === "map") {
    return <TrackingLiveMapPageView />;
  }

  return <ModuleSectionPage pathname={`/tracking/${section}`} />;
}
