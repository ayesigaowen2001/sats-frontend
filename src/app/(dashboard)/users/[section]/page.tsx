import { notFound } from "next/navigation";

import { UsersAllUsersPageView } from "../../../../components/users-all-users-page-view";
import { UsersPermissionsPageView } from "../../../../components/users-permissions-page-view";
import { UsersRolesPermissionsPageView } from "../../../../components/users-roles-permissions-page-view";
import { UsersSystemAdministratorsPageView } from "../../../../components/users-system-administrators-page-view";
import { ModuleSectionPage } from "@/components/module-section-page";
import { hasModuleSection } from "@/lib/dashboard-config";

export default async function UsersSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!hasModuleSection("users", section)) {
    notFound();
  }

  if (section === "all") {
    return <UsersAllUsersPageView />;
  }

  if (section === "administrators") {
    return <UsersSystemAdministratorsPageView />;
  }

  if (section === "roles" || section === "roles-permissions") {
    return <UsersRolesPermissionsPageView />;
  }

  if (section === "permissions") {
    return <UsersPermissionsPageView />;
  }

  return <ModuleSectionPage pathname={`/users/${section}`} />;
}
