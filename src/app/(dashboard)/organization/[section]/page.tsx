import { notFound } from "next/navigation";

import { OrganizationActiveSubscriptionsPageView } from "../../../../components/organization-active-subscriptions-page-view";
import { OrganizationAllOrganizationsPageView } from "../../../../components/organization-all-organizations-page-view";
import { OrganizationBrandingPageView } from "../../../../components/organization-branding-page-view";
import { OrganizationLocalNodesPageView } from "../../../../components/organization-local-nodes-page-view";
import { OrganizationSubscriptionPlansPageView } from "../../../../components/organization-subscription-plans-page-view";
import { ModuleSectionPage } from "@/components/module-section-page";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function OrganizationSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("organization", section)) {
    notFound();
  }

  if (section === "all-organizations") {
    return <OrganizationAllOrganizationsPageView />;
  }

  if (section === "subscriptions") {
    return <OrganizationSubscriptionPlansPageView />;
  }

  if (section === "active-subscriptions") {
    return <OrganizationActiveSubscriptionsPageView />;
  }

  if (section === "branding") {
    return <OrganizationBrandingPageView />;
  }

  if (section === "local-nodes") {
    return <OrganizationLocalNodesPageView />;
  }

  return <ModuleSectionPage pathname={`/organization/${section}`} />;
}
