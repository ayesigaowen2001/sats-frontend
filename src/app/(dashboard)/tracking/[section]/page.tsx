import { notFound } from "next/navigation";

import { TrackingGeofencesPageView } from "../../../../components/tracking-geofences-page-view";
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

  return <ModuleSectionPage pathname={`/tracking/${section}`} />;
}
