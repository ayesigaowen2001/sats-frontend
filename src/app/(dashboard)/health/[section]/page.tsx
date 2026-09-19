import { notFound } from "next/navigation";

import { HealthReportPageView } from "@/components/health-report-page-view";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function HealthSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("health", section)) {
    notFound();
  }

  if (section === "health-report") {
    return <HealthReportPageView />;
  }

  notFound();
}
