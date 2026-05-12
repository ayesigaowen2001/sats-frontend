"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";

export function UsersPageView() {
  const users = useSatsStore((state) => state.users);
  const isLoading = useSatsStore((state) => state.loading.users);
  const error = useSatsStore((state) => state.errors.users);
  const loadUsers = useSatsStore((state) => state.loadUsers);

  useSatsResource(users, isLoading, loadUsers);

  if (error) {
    return <ResourceFeedback title="User data unavailable" detail={error} />;
  }

  if (!users) {
    return (
      <ResourceFeedback
        title="Loading user management"
        detail="The platform is loading identities, roles, and permission contracts from the SATS access service."
      />
    );
  }

  return (
    <ModulePageShell
      hero={users.hero}
      metrics={users.metrics}
      generatedAt={users.generatedAt}
      badges={users.roles.map((role) => role.name)}
    >
      <DataPanel
        eyebrow="Users"
        title="System, organization, and field users"
      >
        <DataTable
          rows={users.users}
          columns={[
            {
              header: "User",
              render: (row) => (
                <div>
                  <strong className="block text-white">{row.name}</strong>
                  <span className="text-[var(--color-mist)]">{row.email}</span>
                </div>
              ),
            },
            { header: "Tier", render: (row) => row.tier },
            { header: "Organization", render: (row) => row.organizationName },
            { header: "Roles", render: (row) => row.roles.join(", ") },
            {
              header: "Last login",
              render: (row) => new Date(row.lastLogin).toLocaleString(),
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Roles"
        title="RBAC definitions used to segment platform access"
      >
        <DataTable
          rows={users.roles}
          columns={[
            { header: "Role", render: (row) => row.name },
            { header: "Scope", render: (row) => row.scope },
            {
              header: "Assignment",
              render: (row) => `${row.memberCount} members`,
            },
            {
              header: "Global",
              render: (row) => (row.isGlobal ? "Yes" : "No"),
            },
            { header: "Description", render: (row) => row.description },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Permissions"
        title="Operational permissions mapped to role bundles"
      >
        <DataTable
          rows={users.permissions}
          columns={[
            { header: "Module", render: (row) => row.moduleName },
            { header: "Action", render: (row) => row.action },
            { header: "Scope", render: (row) => row.scope },
            {
              header: "Assigned roles",
              render: (row) => row.assignedRoles.join(", "),
            },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}