import { notFound } from "next/navigation";

import { hasModuleSection } from "@/lib/dashboard-config";

export default async function NotificationsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("notifications", section)) {
    notFound();
  }

  notFound();
}
