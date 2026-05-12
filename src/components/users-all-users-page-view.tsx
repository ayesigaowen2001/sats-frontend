"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  type CreateOrganizationUserInput,
  type UpdateNodeAccountInput,
  type UserRecord,
  userService,
} from "@/lib/users/user-service";

interface CreateUserFormValues extends Record<string, string> {
  organization_name: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  status: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface UpdateUserFormValues extends Record<string, string> {
  name: string;
  email: string;
  phone: string;
  status: string;
  admin_notes: string;
}

const defaultCreateUserValues: CreateUserFormValues = {
  organization_name: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  status: "Active",
};

const defaultUpdateUserValues: UpdateUserFormValues = {
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

export function UsersAllUsersPageView() {
  const [rows, setRows] = useState<UserRecord[] | null>(null);
  const [error, setError] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<CreateUserFormValues>(
    defaultCreateUserValues,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [updateValues, setUpdateValues] = useState<UpdateUserFormValues>(
    defaultUpdateUserValues,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const loadUsers = useCallback(async () => {
    const response = await userService.listUsers(1, 100);
    return response.items;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [items, organizationItems] = await Promise.all([
          loadUsers(),
          organizationCrudService.listOrganizations(),
        ]);

        if (isMounted) {
          setRows(items);
          setOrganizations(
            organizationItems.map((item) => ({
              id: item.id,
              name: item.organization_name,
            })),
          );
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load users",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadUsers]);

  const createUserFields = useMemo<EntityFormField<CreateUserFormValues>[]>(
    () => [
      {
        name: "organization_name",
        label: "Organization",
        type: "select",
        required: true,
        options: organizations.map((item) => ({
          value: item.name,
          label: item.name,
        })),
      },
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
    ],
    [organizations],
  );

  const updateUserFields = useMemo<EntityFormField<UpdateUserFormValues>[]>(
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

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const selectedOrganization = organizations.find(
        (item) => item.name === createValues.organization_name,
      );

      if (!selectedOrganization?.id) {
        throw new Error("Please select an organization.");
      }

      const payload: CreateOrganizationUserInput = {
        name: createValues.name.trim(),
        email: createValues.email.trim(),
        phone: createValues.phone.trim(),
        password: createValues.password,
        status: createValues.status.trim(),
      };

      if (
        !payload.name ||
        !payload.email ||
        !payload.phone ||
        !payload.password
      ) {
        throw new Error("Name, email, phone, and password are required.");
      }

      await userService.createOrganizationUser(
        selectedOrganization.id,
        payload,
      );

      const refreshedRows = await loadUsers();
      setRows(refreshedRows);
      setCreateValues(defaultCreateUserValues);
      setCreateSuccess("User created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create user",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (user: UserRecord) => {
    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
    setEditingUser(user);
    setUpdateValues({
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      admin_notes: user.adminNotes ?? "",
    });
  };

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingUser) {
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

      await userService.updateNodeAccount(editingUser.id, payload);

      const refreshedRows = await loadUsers();
      setRows(refreshedRows);
      setEditingUser(null);
      setUpdateSuccess("User updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update user",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (user: UserRecord) => {
    const shouldDelete = window.confirm(
      `Delete user ${user.name}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setDeletingUserId(user.id);

    try {
      await userService.deleteUser(user.id);
      const refreshedRows = await loadUsers();
      setRows(refreshedRows);

      if (editingUser?.id === user.id) {
        setEditingUser(null);
      }

      setDeleteSuccess("User deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete user",
      );
    } finally {
      setDeletingUserId("");
    }
  };

  if (error) {
    return <ResourceFeedback title="Users unavailable" detail={error} />;
  }

  if (!rows) {
    return (
      <ResourceFeedback
        title="Loading users"
        detail="Fetching all users from SATS services."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            All users
          </h2>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setEditingUser(null);
              setCreateError("");
              setCreateSuccess("");
              setUpdateError("");
              setUpdateSuccess("");
              setDeleteError("");
              setDeleteSuccess("");
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            {showCreateForm ? "Close form" : "Create user"}
          </button>
        </div>

        {showCreateForm ? (
          <EntityForm
            title="Create user"
            fields={createUserFields}
            values={createValues}
            errorMessage={createError}
            submitLabel="Create user"
            submitLoadingLabel="Creating..."
            isSubmitting={isCreating}
            onSubmit={handleCreateUser}
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

        {editingUser ? (
          <EntityForm
            title={`Update user: ${editingUser.name}`}
            fields={updateUserFields}
            values={updateValues}
            errorMessage={updateError}
            submitLabel="Update user"
            submitLoadingLabel="Updating..."
            isSubmitting={isUpdating}
            onSubmit={handleUpdateUser}
            onCancel={() => {
              setEditingUser(null);
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
              header: "System admin",
              render: (row) => (row.isSystemAdmin ? "Yes" : "No"),
            },
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
                    void handleDeleteUser(row);
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
