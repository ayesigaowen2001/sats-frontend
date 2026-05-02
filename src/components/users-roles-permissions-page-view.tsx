"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { ServerIdFilter } from "@/components/common/server-id-filter";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import { type UserRecord, userService } from "@/lib/users/user-service";
import {
  type AssignRolesToUserInput,
  type CreateRoleInput,
  roleService,
  type RoleRecord,
} from "@/lib/users/role-service";

interface OrganizationOption {
  id: string;
  name: string;
}

interface CreateRoleFormValues extends Record<string, string> {
  organization_name: string;
  role_name: string;
  description: string;
  is_global: string;
}

const defaultCreateRoleValues: CreateRoleFormValues = {
  organization_name: "",
  role_name: "",
  description: "",
  is_global: "false",
};

type RolesTab = "catalog" | "lookup" | "user-roles";

const roleTabs: Array<{ key: RolesTab; label: string }> = [
  { key: "catalog", label: "Roles Catalog" },
  { key: "lookup", label: "Role Lookup" },
  { key: "user-roles", label: "User Roles" },
];

export function UsersRolesPermissionsPageView() {
  const [activeTab, setActiveTab] = useState<RolesTab>("catalog");
  const [rows, setRows] = useState<RoleRecord[] | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [userRoles, setUserRoles] = useState<RoleRecord[]>([]);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<CreateRoleFormValues>(
    defaultCreateRoleValues,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [updateValues, setUpdateValues] = useState<CreateRoleFormValues>(
    defaultCreateRoleValues,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [userRolesError, setUserRolesError] = useState("");
  const [userRolesSuccess, setUserRolesSuccess] = useState("");
  const [isAssigningUserRoles, setIsAssigningUserRoles] = useState(false);

  const loadRoles = useCallback(async () => {
    const response = await roleService.listRoles(1, 200);
    return response.items;
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await userService.listUsers(1, 100);
    return response.items;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [roleItems, organizationItems, userItems] = await Promise.all([
          loadRoles(),
          organizationCrudService.listOrganizations(),
          loadUsers(),
        ]);

        if (!isMounted) {
          return;
        }

        setRows(roleItems);
        setOrganizations(
          organizationItems.map((item) => ({
            id: item.id,
            name: item.organization_name,
          })),
        );
        setUsers(userItems);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load roles",
        );
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadRoles, loadUsers]);

  useEffect(() => {
    if (activeTab !== "user-roles") {
      return;
    }

    if (!selectedUserId) {
      setUserRoles([]);
      setUserRolesError("");
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        const items = await roleService.getUserRoles(selectedUserId);

        if (!isMounted) {
          return;
        }

        setUserRoles(items);
        setUserRolesError("");
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setUserRoles([]);
        setUserRolesError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load user roles",
        );
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [activeTab, selectedUserId]);

  const roleFields = useMemo<EntityFormField<CreateRoleFormValues>[]>(
    () => [
      {
        name: "is_global",
        label: "Role scope",
        type: "select",
        required: true,
        options: [
          { value: "true", label: "Global role" },
          { value: "false", label: "Organization role" },
        ],
      },
      {
        name: "organization_name",
        label: "Organization",
        type: "select",
        required: createValues.is_global !== "true",
        options: organizations.map((item) => ({
          value: item.name,
          label: item.name,
        })),
      },
      { name: "role_name", label: "Role name", required: true, colSpan: 2 },
      {
        name: "description",
        label: "Description",
        required: true,
        colSpan: 2,
      },
    ],
    [createValues.is_global, organizations],
  );

  const organizationNameById = useMemo(() => {
    return organizations.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }, [organizations]);

  const handleCreateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const isGlobal = createValues.is_global === "true";
      const selectedOrganization = organizations.find(
        (item) => item.name === createValues.organization_name,
      );

      if (!isGlobal && !selectedOrganization?.id) {
        throw new Error("Please select an organization for a non-global role.");
      }

      const payload: CreateRoleInput = {
        organization_id: isGlobal ? null : (selectedOrganization?.id ?? null),
        role_name: createValues.role_name.trim(),
        description: createValues.description.trim(),
        is_global: isGlobal,
      };

      if (!payload.role_name || !payload.description) {
        throw new Error("Role name and description are required.");
      }

      await roleService.createRole(payload);

      const refreshedRows = await loadRoles();
      setRows(refreshedRows);
      setCreateValues(defaultCreateRoleValues);
      setCreateSuccess("Role created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create role",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEditRole = (role: RoleRecord) => {
    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
    setEditingRole(role);
    setUpdateValues({
      organization_name:
        role.organizationId && organizationNameById[role.organizationId]
          ? organizationNameById[role.organizationId]
          : "",
      role_name: role.roleName,
      description: role.description,
      is_global: role.isGlobal ? "true" : "false",
    });
  };

  const handleUpdateRole = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingRole) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setIsUpdating(true);

    try {
      const isGlobal = updateValues.is_global === "true";
      const selectedOrganization = organizations.find(
        (item) => item.name === updateValues.organization_name,
      );

      if (!isGlobal && !selectedOrganization?.id) {
        throw new Error("Please select an organization for a non-global role.");
      }

      const payload: CreateRoleInput = {
        organization_id: isGlobal ? null : (selectedOrganization?.id ?? null),
        role_name: updateValues.role_name.trim(),
        description: updateValues.description.trim(),
        is_global: isGlobal,
      };

      if (!payload.role_name || !payload.description) {
        throw new Error("Role name and description are required.");
      }

      await roleService.updateRole(editingRole.id, payload);
      const refreshedRows = await loadRoles();
      setRows(refreshedRows);
      setEditingRole(null);
      setUpdateSuccess("Role updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update role",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteRole = async (role: RoleRecord) => {
    const shouldDelete = window.confirm(
      `Delete role ${role.roleName}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setDeletingRoleId(role.id);

    try {
      await roleService.deleteRole(role.id);
      const refreshedRows = await loadRoles();
      setRows(refreshedRows);

      if (editingRole?.id === role.id) {
        setEditingRole(null);
      }

      if (selectedRole?.id === role.id) {
        setSelectedRole(null);
      }

      setDeleteSuccess("Role deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete role",
      );
    } finally {
      setDeletingRoleId("");
    }
  };

  const handleFindRoleById = async (roleId: string) => {
    setLookupError("");

    try {
      const role = await roleService.getRoleById(roleId);
      setSelectedRole(role);
    } catch (requestError) {
      setSelectedRole(null);
      setLookupError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load role by ID",
      );
    }
  };

  const handleClearRoleLookup = () => {
    setSelectedRole(null);
    setLookupError("");
  };

  const toggleSelectedRoleId = (roleId: string) => {
    const numericRoleId = Number(roleId);

    if (!Number.isFinite(numericRoleId)) {
      return;
    }

    setSelectedRoleIds((current) => {
      if (current.includes(numericRoleId)) {
        return current.filter((id) => id !== numericRoleId);
      }

      return [...current, numericRoleId];
    });
  };

  const handleAssignRolesToUser = async () => {
    setUserRolesError("");
    setUserRolesSuccess("");
    setIsAssigningUserRoles(true);

    try {
      if (!selectedUserId) {
        throw new Error("Please select a user.");
      }

      if (!selectedRoleIds.length) {
        throw new Error("Select at least one role to assign.");
      }

      const payload: AssignRolesToUserInput = {
        role_ids: selectedRoleIds,
      };

      await roleService.assignRolesToUser(selectedUserId, payload);
      const refreshedRoles = await roleService.getUserRoles(selectedUserId);
      setUserRoles(refreshedRoles);
      setSelectedRoleIds([]);
      setUserRolesSuccess("Roles assigned to user successfully.");
    } catch (requestError) {
      setUserRolesError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to assign roles to user",
      );
    } finally {
      setIsAssigningUserRoles(false);
    }
  };

  if (error) {
    return <ResourceFeedback title="Roles unavailable" detail={error} />;
  }

  if (!rows) {
    return (
      <ResourceFeedback
        title="Loading roles"
        detail="Fetching role catalog from SATS services."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Roles
          </h2>
          {activeTab === "catalog" ? (
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((current) => !current);
                setEditingRole(null);
                setCreateError("");
                setCreateSuccess("");
                setUpdateError("");
                setUpdateSuccess("");
                setDeleteError("");
                setDeleteSuccess("");
              }}
              className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
            >
              {showCreateForm ? "Close form" : "Add role"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--color-shell-border)] p-2">
          {roleTabs.map((tab) => {
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 text-[var(--color-ice)]"
                    : "border border-transparent bg-transparent text-[var(--color-mist)] hover:border-white/10 hover:text-[var(--color-ice)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "catalog" && showCreateForm ? (
          <EntityForm
            title="Create role"
            fields={roleFields}
            values={createValues}
            errorMessage={createError}
            submitLabel="Create role"
            submitLoadingLabel="Creating..."
            isSubmitting={isCreating}
            onSubmit={handleCreateRole}
            onCancel={() => {
              setShowCreateForm(false);
              setCreateError("");
            }}
            onChange={(name, value) =>
              setCreateValues((current) => ({ ...current, [name]: value }))
            }
          />
        ) : null}

        {createSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {createSuccess}
          </p>
        ) : null}

        {activeTab === "catalog" && editingRole ? (
          <EntityForm
            title={`Update role: ${editingRole.roleName}`}
            fields={roleFields}
            values={updateValues}
            errorMessage={updateError}
            submitLabel="Update role"
            submitLoadingLabel="Updating..."
            isSubmitting={isUpdating}
            onSubmit={handleUpdateRole}
            onCancel={() => {
              setEditingRole(null);
              setUpdateError("");
            }}
            onChange={(name, value) =>
              setUpdateValues((current) => ({ ...current, [name]: value }))
            }
          />
        ) : null}

        {updateSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {updateSuccess}
          </p>
        ) : null}

        {deleteError ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {deleteError}
          </p>
        ) : null}

        {deleteSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {deleteSuccess}
          </p>
        ) : null}

        {activeTab === "lookup" ? (
          <div className="space-y-3">
            <ServerIdFilter
              label="Role lookup"
              placeholder="Enter role ID"
              actionLabel="Find role"
              loadingLabel="Searching..."
              errorMessage={lookupError}
              hasActiveResult={selectedRole !== null}
              onSearch={handleFindRoleById}
              onClear={handleClearRoleLookup}
            />

            {selectedRole ? (
              <DataTable
                rows={[selectedRole]}
                horizontalScroll
                columns={[
                  {
                    header: "Role",
                    render: (row) => row.roleName,
                  },
                  {
                    header: "Description",
                    render: (row) => row.description || "-",
                  },
                  {
                    header: "Scope",
                    render: (row) => (row.isGlobal ? "Global" : "Organization"),
                  },
                  {
                    header: "Organization",
                    render: (row) => {
                      if (row.isGlobal || !row.organizationId) {
                        return "-";
                      }

                      return (
                        organizationNameById[row.organizationId] ??
                        row.organizationId
                      );
                    },
                  },
                  {
                    header: "Actions",
                    render: (row) => (
                      <ResourceRowActions
                        onEdit={() => handleStartEditRole(row)}
                        onDelete={() => {
                          void handleDeleteRole(row);
                        }}
                        isDeleting={deletingRoleId === row.id}
                      />
                    ),
                  },
                ]}
              />
            ) : (
              <ResourceFeedback
                title="Role lookup ready"
                detail="Search by role ID to load role details from the server."
              />
            )}
          </div>
        ) : null}

        {activeTab === "catalog" ? (
          <DataTable
            rows={rows}
            horizontalScroll
            columns={[
              {
                header: "Role",
                render: (row) => row.roleName,
              },
              {
                header: "Description",
                render: (row) => row.description || "-",
              },
              {
                header: "Scope",
                render: (row) => (row.isGlobal ? "Global" : "Organization"),
              },
              {
                header: "Organization",
                render: (row) => {
                  if (row.isGlobal || !row.organizationId) {
                    return "-";
                  }

                  return (
                    organizationNameById[row.organizationId] ??
                    row.organizationId
                  );
                },
              },
              {
                header: "Actions",
                render: (row) => (
                  <ResourceRowActions
                    onEdit={() => handleStartEditRole(row)}
                    onDelete={() => {
                      void handleDeleteRole(row);
                    }}
                    isDeleting={deletingRoleId === row.id}
                  />
                ),
              },
            ]}
          />
        ) : null}

        {activeTab === "user-roles" ? (
          <div className="space-y-3 rounded-2xl border border-[var(--color-shell-border)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[var(--color-ice)]">
                User roles
              </h3>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-[var(--color-ice)]">
                User
              </span>
              <select
                value={selectedUserId}
                onChange={(event) => {
                  setSelectedUserId(event.target.value);
                  setSelectedRoleIds([]);
                  setUserRolesError("");
                  setUserRolesSuccess("");
                }}
                className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
              >
                <option value="">-- Select a user --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>

            {userRolesError ? (
              <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {userRolesError}
              </p>
            ) : null}

            {userRolesSuccess ? (
              <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                {userRolesSuccess}
              </p>
            ) : null}

            <div className="rounded-xl border border-[var(--color-shell-border)] p-3">
              <p className="text-sm font-medium text-[var(--color-ice)]">
                Assign roles
              </p>
              {rows.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {rows.map((role) => {
                    const numericRoleId = Number(role.id);
                    const isChecked = Number.isFinite(numericRoleId)
                      ? selectedRoleIds.includes(numericRoleId)
                      : false;

                    return (
                      <label
                        key={role.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectedRoleId(role.id)}
                          className="mt-1"
                        />
                        <span className="text-sm text-[var(--color-ice)]">
                          <strong className="block text-white">
                            {role.roleName}
                          </strong>
                          <span className="text-[var(--color-mist)]">
                            {role.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-mist)]">
                  No roles available for assignment.
                </p>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    void handleAssignRolesToUser();
                  }}
                  disabled={isAssigningUserRoles || !selectedUserId}
                  className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isAssigningUserRoles ? "Assigning..." : "Assign roles"}
                </button>
              </div>
            </div>

            <DataTable
              rows={userRoles}
              horizontalScroll
              columns={[
                {
                  header: "Role",
                  render: (row) => row.roleName,
                },
                {
                  header: "Description",
                  render: (row) => row.description || "-",
                },
                {
                  header: "Scope",
                  render: (row) => (row.isGlobal ? "Global" : "Organization"),
                },
                {
                  header: "Organization",
                  render: (row) => {
                    if (row.isGlobal || !row.organizationId) {
                      return "-";
                    }

                    return (
                      organizationNameById[row.organizationId] ??
                      row.organizationId
                    );
                  },
                },
              ]}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}
