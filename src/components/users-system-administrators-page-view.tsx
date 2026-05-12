"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useAuthStore } from "@/store/useAuthStore";
import {
  type CreateSystemAdminInput,
  type UpdateNodeAccountInput,
  type UserRecord,
  userService,
} from "@/lib/users/user-service";

interface CreateSystemAdminFormValues extends Record<string, string> {
  name: string;
  email: string;
  phone: string;
  password: string;
  status: string;
  admin_notes: string;
}

const defaultCreateSystemAdminValues: CreateSystemAdminFormValues = {
  name: "",
  email: "",
  phone: "",
  password: "",
  status: "Active",
  admin_notes: "",
};

interface UpdateSystemAdminFormValues extends Record<string, string> {
  name: string;
  email: string;
  phone: string;
  status: string;
  admin_notes: string;
}

const defaultUpdateSystemAdminValues: UpdateSystemAdminFormValues = {
  name: "",
  email: "",
  phone: "",
  status: "Active",
  admin_notes: "",
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function UsersSystemAdministratorsPageView() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState<UserRecord[] | null>(null);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<CreateSystemAdminFormValues>(
    defaultCreateSystemAdminValues,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<UserRecord | null>(null);
  const [updateValues, setUpdateValues] = useState<UpdateSystemAdminFormValues>(
    defaultUpdateSystemAdminValues,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    setError("");
    const response = await userService.listUsers(1, 100, {
      is_system_admin: true,
    });
    return response.items;
  }, []);

  const createAdminFields = useMemo<
    EntityFormField<CreateSystemAdminFormValues>[]
  >(
    () => [
      { name: "name", label: "Name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", required: true },
      { name: "password", label: "Password", type: "password", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
          { value: "Suspended", label: "Suspended" },
        ],
      },
      {
        name: "admin_notes",
        label: "Admin notes",
        colSpan: 2,
      },
    ],
    [],
  );

  const updateAdminFields = useMemo<
    EntityFormField<UpdateSystemAdminFormValues>[]
  >(
    () => [
      { name: "name", label: "Name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", required: true },
      {
        name: "status",
        label: "Status",
        type: "select",
        required: true,
        options: [
          { value: "Active", label: "Active" },
          { value: "Inactive", label: "Inactive" },
          { value: "Suspended", label: "Suspended" },
        ],
      },
      {
        name: "admin_notes",
        label: "Admin notes",
        colSpan: 2,
      },
    ],
    [],
  );

  const handleCreateSystemAdmin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const payload: CreateSystemAdminInput = {
        name: createValues.name.trim(),
        email: createValues.email.trim(),
        phone: createValues.phone.trim(),
        password: createValues.password,
        status: createValues.status.trim(),
        granted_by: user.id,
        granted_at: new Date().toISOString(),
        admin_notes: createValues.admin_notes.trim(),
        is_system_admin: true,
        is_node: false,
        organization_id: null,
      };

      if (
        !payload.name ||
        !payload.email ||
        !payload.phone ||
        !payload.password
      ) {
        throw new Error("Name, email, phone, and password are required.");
      }

      await userService.createSystemAdmin(payload);
      const refreshedRows = await loadUsers();
      setRows(refreshedRows);
      setCreateValues(defaultCreateSystemAdminValues);
      setCreateSuccess("System administrator created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create system administrator",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (admin: UserRecord) => {
    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
    setEditingAdmin(admin);
    setUpdateValues({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      status: admin.status,
      admin_notes: admin.adminNotes ?? "",
    });
  };

  const handleUpdateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingAdmin) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      const payload: UpdateNodeAccountInput = {
        name: updateValues.name.trim(),
        email: updateValues.email.trim(),
        phone: updateValues.phone.trim(),
        status: updateValues.status.trim(),
        admin_notes: updateValues.admin_notes.trim(),
      };

      await userService.updateNodeAccount(editingAdmin.id, payload);
      const refreshedRows = await loadUsers();
      setRows(refreshedRows);
      setEditingAdmin(null);
      setUpdateSuccess("System administrator updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update system administrator",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAdmin = async (admin: UserRecord) => {
    const shouldDelete = window.confirm(
      `Delete system administrator ${admin.name}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setDeletingUserId(admin.id);

    try {
      await userService.deleteUser(admin.id);
      const refreshedRows = await loadUsers();
      setRows(refreshedRows);

      if (editingAdmin?.id === admin.id) {
        setEditingAdmin(null);
      }

      setDeleteSuccess("System administrator deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete system administrator",
      );
    } finally {
      setDeletingUserId("");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const items = await loadUsers();

        if (isMounted) {
          setRows(items);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load system administrators",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadUsers]);

  if (error) {
    return (
      <ResourceFeedback
        title="System administrators unavailable"
        detail={error}
      />
    );
  }

  if (!rows) {
    return (
      <ResourceFeedback
        title="Loading system administrators"
        detail="Fetching system administrators from SATS services."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            System administrators
          </h2>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setEditingAdmin(null);
              setCreateError("");
              setCreateSuccess("");
              setUpdateError("");
              setUpdateSuccess("");
              setDeleteError("");
              setDeleteSuccess("");
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            {showCreateForm ? "Close form" : "Add admin"}
          </button>
        </div>

        {showCreateForm ? (
          <EntityForm
            title="Create system administrator"
            fields={createAdminFields}
            values={createValues}
            errorMessage={createError}
            submitLabel="Create admin"
            submitLoadingLabel="Creating..."
            isSubmitting={isCreating}
            onSubmit={handleCreateSystemAdmin}
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

        {editingAdmin ? (
          <EntityForm
            title={`Update admin: ${editingAdmin.name}`}
            fields={updateAdminFields}
            values={updateValues}
            errorMessage={updateError}
            submitLabel="Update admin"
            submitLoadingLabel="Updating..."
            isSubmitting={isUpdating}
            onSubmit={handleUpdateAdmin}
            onCancel={() => {
              setEditingAdmin(null);
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

        <DataTable
          rows={rows}
          horizontalScroll
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
            { header: "Phone", render: (row) => row.phone || "-" },
            { header: "Status", render: (row) => row.status },
            { header: "Organization", render: (row) => row.organizationId },
            {
              header: "Node user",
              render: (row) => (row.isNode ? "Yes" : "No"),
            },
            {
              header: "Last login",
              render: (row) => formatTimestamp(row.lastLogin),
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDeleteAdmin(row);
                  }}
                  isDeleting={deletingUserId === row.id}
                />
              ),
            },
          ]}
        />
      </section>
    </main>
  );
}
