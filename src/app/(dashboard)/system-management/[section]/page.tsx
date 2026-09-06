import { notFound } from "next/navigation";

import { hasModuleSection } from "@/lib/dashboard-config";

export default async function SystemManagementSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("system-management", section)) {
    notFound();
  }

  notFound();
}
