import { notFound } from "next/navigation";

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

  notFound();
}
