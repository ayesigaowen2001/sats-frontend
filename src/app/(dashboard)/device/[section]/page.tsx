import { notFound } from "next/navigation";

import { AllDevicesPageView } from "@/components/all-devices-page-view";
import { DeviceBatteryLogsPageView } from "@/components/device-battery-logs-page-view";
import { DeviceCategoriesPageView } from "@/components/device-categories-page-view";
import { DeviceSpecificationsPageView } from "@/components/device-specifications-page-view";
import { SensorLibraryPageView } from "@/components/sensor-library-page-view";
import { ModuleSectionPage } from "@/components/module-section-page";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function DeviceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("device", section)) {
    notFound();
  }

  if (section === "categories") {
    return <DeviceCategoriesPageView />;
  }

  if (section === "all-devices") {
    return <AllDevicesPageView />;
  }

  if (section === "sensor-library") {
    return <SensorLibraryPageView />;
  }

  if (section === "specifications") {
    return <DeviceSpecificationsPageView />;
  }

  if (section === "power-status") {
    return <DeviceBatteryLogsPageView />;
  }

  return <ModuleSectionPage pathname={`/device/${section}`} />;
}
