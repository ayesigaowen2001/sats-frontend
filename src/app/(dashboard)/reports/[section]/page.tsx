import { notFound } from "next/navigation";

import { ModuleSectionPage } from "@/components/module-section-page";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function ReportsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("reports", section)) {
    notFound();
  }

  return <ModuleSectionPage pathname={`/reports/${section}`} />;
}
