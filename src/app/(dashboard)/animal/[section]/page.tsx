import { notFound } from "next/navigation";

import { AllAnimalsPageView } from "@/components/all-animals-page-view";
import { AnimalClassificationsPageView } from "@/components/animal-classifications-page-view";
import { ModuleSectionPage } from "@/components/module-section-page";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function AnimalSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("animal", section)) {
    notFound();
  }

  if (section === "all") {
    return <AllAnimalsPageView />;
  }

  if (section === "classifications") {
    return <AnimalClassificationsPageView />;
  }

  return <ModuleSectionPage pathname={`/animal/${section}`} />;
}
