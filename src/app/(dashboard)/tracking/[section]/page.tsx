import { notFound } from "next/navigation";

import { GeofenceEventsReportPageView } from "../../../../components/geofence-events-report-page-view";
import { GeofencesReportPageView } from "../../../../components/geofences-report-page-view";
import { TrackingCoverageReportPageView } from "../../../../components/tracking-coverage-report-page-view";
import { TrackingGeofenceEventsPageView } from "../../../../components/tracking-geofence-events-page-view";
import { TrackingGeofencesPageView } from "../../../../components/tracking-geofences-page-view";
import { TrackingLiveMapPageView } from "../../../../components/tracking-live-map-page-view";
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

  if (section === "geofences-report") {
    return <GeofencesReportPageView />;
  }

  if (section === "geofence-events-report") {
    return <GeofenceEventsReportPageView />;
  }

  if (section === "tracking-coverage-report") {
    return <TrackingCoverageReportPageView />;
  }

  notFound();
}
