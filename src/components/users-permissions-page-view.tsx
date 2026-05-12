"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  type CreatePermissionInput,
  permissionService,
  type PermissionRecord,
  type UpdatePermissionInput,
} from "@/lib/users/permission-service";
import {
  roleService,
  type RolePermissionRecord,
  type RoleRecord,
} from "@/lib/users/role-service";

type PermissionsTabKey = "catalog" | "role-permissions" | "assign";

interface TabItem {
  key: PermissionsTabKey;
  label: string;
}

const tabs: TabItem[] = [
  { key: "catalog", label: "Permissions Catalog" },
  { key: "role-permissions", label: "Role Permissions" },
  { key: "assign", label: "Assign Permissions" },
];

interface AssignPermissionFormValues {
  role_id: string;
  module_name: string;
}

const defaultAssignValues: AssignPermissionFormValues = {
  role_id: "",
  module_name: "",
};

interface CreatePermissionFormValues extends Record<string, string> {
  module_name: string;
  action: string;
  description: string;
}

const defaultCreatePermissionValues: CreatePermissionFormValues = {
  module_name: "",
  action: "",
  description: "",
};

export function UsersPermissionsPageView() {
  const [activeTab, setActiveTab] = useState<PermissionsTabKey>("catalog");
  const [rows, setRows] = useState<PermissionRecord[] | null>(null);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [rolePermissionRows, setRolePermissionRows] = useState<
    RolePermissionRecord[]
  >([]);
  const [selectedAssignedPermissionIds, setSelectedAssignedPermissionIds] =
    useState<number[]>([]);
  const [error, setError] = useState("");

  const [assignValues, setAssignValues] =
    useState<AssignPermissionFormValues>(defaultAssignValues);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    [],
  );
  const [rolePermissionsError, setRolePermissionsError] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assignSuccess, setAssignSuccess] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<CreatePermissionFormValues>(
    defaultCreatePermissionValues,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<PermissionRecord | null>(null);
  const [updateValues, setUpdateValues] = useState<CreatePermissionFormValues>(
    defaultCreatePermissionValues,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [deletingPermissionId, setDeletingPermissionId] = useState<
    number | null
  >(null);

  const loadPermissions = useCallback(async () => {
    const response = await permissionService.listPermissions(1, 200);
    return response.items;
  }, []);

  const loadRoles = useCallback(async () => {
    const response = await roleService.listRoles(1, 200);
    return response.items;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [permissionItems, roleItems] = await Promise.all([
          loadPermissions(),
          loadRoles(),
        ]);

        if (!isMounted) {
          return;
        }

        setRows(permissionItems);
        setRoles(roleItems);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load permissions",
        );
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadPermissions, loadRoles]);

  const moduleOptions = useMemo(() => {
    const modules = new Set<string>();

    for (const item of rows ?? []) {
      modules.add(item.moduleName);
    }

    return Array.from(modules).sort((left, right) => left.localeCompare(right));
  }, [rows]);

  const createPermissionFields = useMemo<
    EntityFormField<CreatePermissionFormValues>[]
  >(
    () => [
      {
        name: "module_name",
        label: "Module",
        type: "select",
        required: true,
        options: moduleOptions.map((moduleName) => ({
          value: moduleName,
          label: moduleName,
        })),
      },
      {
        name: "action",
        label: "Action",
        type: "select",
        required: true,
        options: [
          { value: "create", label: "create" },
          { value: "read", label: "read" },
          { value: "update", label: "update" },
          { value: "delete", label: "delete" },
        ],
      },
      {
        name: "description",
        label: "Description",
        required: true,
        colSpan: 2,
      },
    ],
    [moduleOptions],
  );

  const modulePermissions = useMemo(() => {
    if (!rows || !assignValues.module_name) {
      return [];
    }

    return rows.filter((item) => item.moduleName === assignValues.module_name);
  }, [assignValues.module_name, rows]);

  const roleLabelById = useMemo(() => {
    return roles.reduce<Record<string, string>>((acc, role) => {
      acc[role.id] = role.roleName;
      return acc;
    }, {});
  }, [roles]);

  const selectedRoleName =
    roleLabelById[assignValues.role_id] ?? assignValues.role_id;

  const togglePermissionId = (permissionId: number) => {
    setSelectedPermissionIds((current) => {
      if (current.includes(permissionId)) {
        return current.filter((id) => id !== permissionId);
      }

      return [...current, permissionId];
    });
  };

  const toggleAssignedPermissionId = (permissionId: number) => {
    setSelectedAssignedPermissionIds((current) => {
      if (current.includes(permissionId)) {
        return current.filter((id) => id !== permissionId);
      }

      return [...current, permissionId];
    });
  };

  const loadRolePermissions = useCallback(async (roleId: string) => {
    const permissionItems = await roleService.getRolePermissions(roleId);
    setRolePermissionRows(permissionItems);
    setSelectedAssignedPermissionIds([]);
  }, []);

  useEffect(() => {
    const roleId = assignValues.role_id;

    if (!roleId) {
      setRolePermissionRows([]);
      setRolePermissionsError("");
      setSelectedAssignedPermissionIds([]);
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        const permissionItems = await roleService.getRolePermissions(roleId);

        if (!isMounted) {
          return;
        }

        setRolePermissionRows(permissionItems);
        setRolePermissionsError("");
        setSelectedAssignedPermissionIds([]);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setRolePermissionRows([]);
        setRolePermissionsError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load role permissions",
        );
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [assignValues.role_id]);

  const handleAssignPermissions = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setAssignError("");
    setAssignSuccess("");
    setIsAssigning(true);

    try {
      if (!assignValues.role_id) {
        throw new Error("Please select a role.");
      }

      if (!assignValues.module_name) {
        throw new Error("Please select a module.");
      }

      if (!selectedPermissionIds.length) {
        throw new Error("Select at least one action to assign.");
      }

      await roleService.assignPermissionsToRole(assignValues.role_id, {
        permission_ids: selectedPermissionIds,
      });

      setAssignSuccess("Permissions assigned successfully.");
      setSelectedPermissionIds([]);
      await loadRolePermissions(assignValues.role_id);
    } catch (requestError) {
      setAssignError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to assign permissions",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemovePermissions = async () => {
    setAssignError("");
    setAssignSuccess("");
    setIsRemoving(true);

    try {
      if (!assignValues.role_id) {
        throw new Error("Please select a role.");
      }

      if (!selectedAssignedPermissionIds.length) {
        throw new Error("Select at least one assigned permission to remove.");
      }

      await roleService.removePermissionsFromRole(assignValues.role_id, {
        permission_ids: selectedAssignedPermissionIds,
      });

      await loadRolePermissions(assignValues.role_id);
      setAssignSuccess("Permissions removed successfully.");
    } catch (requestError) {
      setAssignError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to remove permissions",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCreatePermission = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const payload: CreatePermissionInput = {
        module_name: createValues.module_name.trim(),
        action: createValues.action.trim(),
        description: createValues.description.trim(),
      };

      if (!payload.module_name || !payload.action || !payload.description) {
        throw new Error("Module name, action, and description are required.");
      }

      await permissionService.createPermission(payload);
      const refreshedRows = await loadPermissions();
      setRows(refreshedRows);
      setCreateValues(defaultCreatePermissionValues);
      setCreateSuccess("Permission created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create permission",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEditPermission = (permission: PermissionRecord) => {
    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
    setEditingPermission(permission);
    setUpdateValues({
      module_name: permission.moduleName,
      action: permission.action,
      description: permission.description,
    });
  };

  const handleUpdatePermission = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingPermission) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setIsUpdating(true);

    try {
      const payload: UpdatePermissionInput = {
        module_name: updateValues.module_name.trim(),
        action: updateValues.action.trim(),
        description: updateValues.description.trim(),
      };

      if (!payload.module_name || !payload.action || !payload.description) {
        throw new Error("Module name, action, and description are required.");
      }

      await permissionService.updatePermission(editingPermission.id, payload);
      const refreshedRows = await loadPermissions();
      setRows(refreshedRows);
      setEditingPermission(null);
      setUpdateSuccess("Permission updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update permission",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePermission = async (permission: PermissionRecord) => {
    const shouldDelete = window.confirm(
      `Delete permission ${permission.moduleName}.${permission.action}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setCreateSuccess("");
    setUpdateSuccess("");
    setDeletingPermissionId(permission.id);

    try {
      await permissionService.deletePermission(permission.id);
      const refreshedRows = await loadPermissions();
      setRows(refreshedRows);

      if (editingPermission?.id === permission.id) {
        setEditingPermission(null);
      }

      setDeleteSuccess("Permission deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete permission",
      );
    } finally {
      setDeletingPermissionId(null);
    }
  };

  if (error) {
    return <ResourceFeedback title="Permissions unavailable" detail={error} />;
  }

  if (!rows) {
    return (
      <ResourceFeedback
        title="Loading permissions"
        detail="Fetching permissions catalog from SATS services."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Permissions
          </h2>
          {activeTab === "catalog" ? (
            <button
              type="button"
              onClick={() => {
                setShowCreateForm((current) => !current);
                setEditingPermission(null);
                setCreateError("");
                setCreateSuccess("");
                setUpdateError("");
                setUpdateSuccess("");
                setDeleteError("");
                setDeleteSuccess("");
              }}
              className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
            >
              {showCreateForm ? "Close form" : "Create permission"}
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--color-shell-border)] p-2">
          {tabs.map((tab) => {
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

        <div className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Role
            </span>
            <select
              value={assignValues.role_id}
              onChange={(event) =>
                setAssignValues((current) => ({
                  ...current,
                  role_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
            >
              <option value="">-- Select a role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.roleName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Module
            </span>
            <select
              value={assignValues.module_name}
              onChange={(event) => {
                const moduleName = event.target.value;
                setAssignValues((current) => ({
                  ...current,
                  module_name: moduleName,
                }));
                setSelectedPermissionIds([]);
              }}
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
            >
              <option value="">-- Select a module --</option>
              {moduleOptions.map((moduleName) => (
                <option key={moduleName} value={moduleName}>
                  {moduleName}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-[var(--color-mist)]">
            Selected role: {assignValues.role_id ? selectedRoleName : "-"}
          </div>
        </div>

        {activeTab === "assign" ? (
          <form
            onSubmit={handleAssignPermissions}
            className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[var(--color-ice)]">
                Assign permissions to role
              </h3>
            </div>

            <div className="sm:col-span-2 rounded-xl border border-[var(--color-shell-border)] p-3">
              <p className="text-sm font-medium text-[var(--color-ice)]">
                Available actions
              </p>
              {modulePermissions.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {modulePermissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissionIds.includes(permission.id)}
                        onChange={() => togglePermissionId(permission.id)}
                        className="mt-1"
                      />
                      <span className="text-sm text-[var(--color-ice)]">
                        <strong className="block text-white">
                          {permission.action}
                        </strong>
                        <span className="text-[var(--color-mist)]">
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-[var(--color-mist)]">
                  Select a module to see actions available for assignment.
                </p>
              )}
            </div>

            {assignError ? (
              <p className="sm:col-span-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {assignError}
              </p>
            ) : null}

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isAssigning}
                className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAssigning ? "Assigning..." : "Assign permission"}
              </button>
            </div>
          </form>
        ) : null}

        {activeTab === "role-permissions" ? (
          <section className="space-y-3 rounded-2xl border border-[var(--color-shell-border)] p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[var(--color-ice)]">
                Permissions assigned to selected role
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (!assignValues.role_id) {
                    return;
                  }

                  void loadRolePermissions(assignValues.role_id);
                }}
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)]"
              >
                Refresh
              </button>
            </div>

            {rolePermissionsError ? (
              <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
                {rolePermissionsError}
              </p>
            ) : null}

            <div className="space-y-2">
              {assignValues.role_id ? (
                rolePermissionRows.length ? (
                  rolePermissionRows.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAssignedPermissionIds.includes(
                          permission.id,
                        )}
                        onChange={() =>
                          toggleAssignedPermissionId(permission.id)
                        }
                        className="mt-1"
                      />
                      <span className="text-sm text-[var(--color-ice)]">
                        <strong className="block text-white">
                          {permission.moduleName}.{permission.action}
                        </strong>
                        <span className="text-[var(--color-mist)]">
                          {permission.description}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-[var(--color-mist)]">
                    No permissions currently assigned to this role.
                  </p>
                )
              ) : (
                <p className="text-sm text-[var(--color-mist)]">
                  Select a role above to load assigned permissions.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void handleRemovePermissions();
                }}
                disabled={isRemoving || !selectedAssignedPermissionIds.length}
                className="rounded-full border border-rose-300/40 bg-rose-500/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-rose-100 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRemoving ? "Removing..." : "Remove selected"}
              </button>
            </div>
          </section>
        ) : null}

        {assignSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {assignSuccess}
          </p>
        ) : null}

        {activeTab === "catalog" && showCreateForm ? (
          <EntityForm
            title="Create permission"
            fields={createPermissionFields}
            values={createValues}
            errorMessage={createError}
            submitLabel="Create permission"
            submitLoadingLabel="Creating..."
            isSubmitting={isCreating}
            onSubmit={handleCreatePermission}
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

        {activeTab === "catalog" && editingPermission ? (
          <EntityForm
            title={`Update permission #${editingPermission.id}`}
            fields={createPermissionFields}
            values={updateValues}
            errorMessage={updateError}
            submitLabel="Update permission"
            submitLoadingLabel="Updating..."
            isSubmitting={isUpdating}
            onSubmit={handleUpdatePermission}
            onCancel={() => {
              setEditingPermission(null);
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

        {activeTab === "catalog" ? (
          <DataTable
            rows={rows}
            horizontalScroll
            columns={[
              {
                header: "Module",
                render: (row) => row.moduleName,
              },
              {
                header: "Action",
                render: (row) => row.action,
              },
              {
                header: "Description",
                render: (row) => row.description,
              },
              {
                header: "Actions",
                render: (row) => (
                  <ResourceRowActions
                    onEdit={() => handleStartEditPermission(row)}
                    onDelete={() => {
                      void handleDeletePermission(row);
                    }}
                    isDeleting={deletingPermissionId === row.id}
                  />
                ),
              },
            ]}
          />
        ) : null}
      </section>
    </main>
  );
}
