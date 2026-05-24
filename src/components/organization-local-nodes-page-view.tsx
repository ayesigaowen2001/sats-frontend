"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  type CreateLocalNodeInput,
  type UpdateNodeAccountInput,
  type UserRecord,
  userService,
} from "@/lib/users/user-service";

interface OrganizationOption {
  id: string;
  name: string;
}

interface CreateLocalNodeFormValues extends Record<string, string> {
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  status: string;
}

interface UpdateLocalNodeFormValues extends Record<string, string> {
  name: string;
  phone: string;
  status: string;
}

const defaultCreateLocalNodeValues: CreateLocalNodeFormValues = {
  organization_id: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  status: "Active",
};

const defaultUpdateLocalNodeValues: UpdateLocalNodeFormValues = {
  name: "",
  phone: "",
  status: "Active",
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

export function OrganizationLocalNodesPageView() {
  const [rows, setRows] = useState<UserRecord[] | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [loadError, setLoadError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<CreateLocalNodeFormValues>(
    defaultCreateLocalNodeValues,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingNode, setEditingNode] = useState<UserRecord | null>(null);
  const [updateValues, setUpdateValues] = useState<UpdateLocalNodeFormValues>(
    defaultUpdateLocalNodeValues,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const organizationNameById = useMemo(() => {
    return new Map(organizations.map((item) => [item.id, item.name]));
  }, [organizations]);

  const createFormFields = useMemo<
    EntityFormField<CreateLocalNodeFormValues>[]
  >(
    () => [
      {
        name: "organization_id",
        label: "Organization",
        type: "select",
        required: true,
        options: organizations.map((item) => ({
          value: item.id,
          label: item.name,
        })),
        colSpan: 2,
      },
      { name: "name", label: "Node name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", required: true },
      {
        name: "password",
        label: "Password (optional)",
        type: "password",
      },
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

  const updateFormFields = useMemo<
    EntityFormField<UpdateLocalNodeFormValues>[]
  >(
    () => [
      { name: "name", label: "Node name", required: true },
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
    ],
    [],
  );

  const loadNodes = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      return [];
    }

    const response = await userService.listUsers(1, 500);

    return response.items.filter(
      (user) => user.isNode && user.organizationId === organizationId,
    );
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const organizationItems =
          await organizationCrudService.listOrganizations();

        if (!isMounted) {
          return;
        }

        const options = organizationItems.map((item) => ({
          id: item.id,
          name: item.organization_name,
        }));

        setOrganizations(options);

        const selectedOrganizationId = options[0]?.id ?? "";
        setSelectedOrganizationId(selectedOrganizationId);
        setCreateValues((current) => ({
          ...current,
          organization_id: current.organization_id || selectedOrganizationId,
        }));

        if (!selectedOrganizationId) {
          setRows([]);
          return;
        }

        const nodeItems = await loadNodes(selectedOrganizationId);

        if (isMounted) {
          setRows(nodeItems);
        }
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load local nodes",
        );
        setRows([]);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadNodes]);

  useEffect(() => {
    if (!selectedOrganizationId) {
      return;
    }

    let isMounted = true;

    const loadByOrganization = async () => {
      try {
        const nodeItems = await loadNodes(selectedOrganizationId);

        if (isMounted) {
          setRows(nodeItems);
          setLoadError("");
        }
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load local nodes",
        );
        setRows([]);
      }
    };

    void loadByOrganization();

    return () => {
      isMounted = false;
    };
  }, [loadNodes, selectedOrganizationId]);

  const handleCreateLocalNode = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setUpdateSuccess("");
    setIsCreating(true);

    try {
      const organizationId = createValues.organization_id.trim();

      if (!organizationId) {
        throw new Error("Please select an organization.");
      }

      const payload: CreateLocalNodeInput = {
        name: createValues.name.trim(),
        email: createValues.email.trim(),
        phone: createValues.phone.trim(),
        status: createValues.status.trim(),
      };

      const password = createValues.password.trim();

      if (password) {
        payload.password = password;
      }

      if (
        !payload.name ||
        !payload.email ||
        !payload.phone ||
        !payload.status
      ) {
        throw new Error("Name, email, phone, and status are required.");
      }

      await userService.createLocalNode(organizationId, payload);

      const refreshedNodes = await loadNodes(organizationId);
      setRows(refreshedNodes);
      setShowCreateForm(false);
      setCreateValues((current) => ({
        ...defaultCreateLocalNodeValues,
        organization_id: organizationId,
      }));
      setCreateSuccess("Local node account created successfully.");
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create local node",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (node: UserRecord) => {
    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setEditingNode(node);
    setUpdateValues({
      name: node.name,
      phone: node.phone,
      status: node.status,
    });
  };

  const handleUpdateNode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingNode) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setIsUpdating(true);

    try {
      const payload: UpdateNodeAccountInput = {
        name: updateValues.name.trim(),
        phone: updateValues.phone.trim(),
        status: updateValues.status.trim(),
      };

      if (!payload.name || !payload.phone || !payload.status) {
        throw new Error("Name, phone, and status are required.");
      }

      await userService.updateNodeAccount(editingNode.id, payload);

      const refreshedNodes = await loadNodes(selectedOrganizationId);
      setRows(refreshedNodes);
      setEditingNode(null);
      setUpdateValues(defaultUpdateLocalNodeValues);
      setUpdateSuccess("Local node account updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update local node",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (!rows) {
    return (
      <ResourceFeedback
        title="Loading local node accounts"
        detail="Fetching local nodes for the selected organization."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Local nodes
          </h2>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current);
              setEditingNode(null);
              setCreateError("");
              setCreateSuccess("");
              setUpdateError("");
              setUpdateSuccess("");
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            {showCreateForm ? "Close form" : "Create local node"}
          </button>
        </div>

        {loadError ? (
          <p className="rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
            {loadError}
          </p>
        ) : null}

        <label className="block max-w-lg">
          <span className="text-sm font-medium text-[var(--color-ice)]">
            Organization nodes to view
          </span>
          <select
            value={selectedOrganizationId}
            onChange={(event) => {
              const nextOrganizationId = event.target.value;
              setSelectedOrganizationId(nextOrganizationId);
              setCreateValues((current) => ({
                ...current,
                organization_id: nextOrganizationId,
              }));
              setEditingNode(null);
              setUpdateError("");
              setUpdateSuccess("");
              setCreateSuccess("");
            }}
            className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
          >
            <option value="">-- Select an organization --</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>

        {showCreateForm ? (
          <EntityForm
            title="Create local node account"
            fields={createFormFields}
            values={createValues}
            errorMessage={createError}
            submitLabel="Create local node"
            submitLoadingLabel="Creating..."
            isSubmitting={isCreating}
            onSubmit={handleCreateLocalNode}
            onCancel={() => {
              setShowCreateForm(false);
              setCreateError("");
            }}
            onChange={(name, value) => {
              setCreateValues((current) => ({ ...current, [name]: value }));
            }}
          />
        ) : null}

        {editingNode ? (
          <EntityForm
            title={`Update local node: ${editingNode.name}`}
            fields={updateFormFields}
            values={updateValues}
            errorMessage={updateError}
            submitLabel="Update local node"
            submitLoadingLabel="Updating..."
            isSubmitting={isUpdating}
            onSubmit={handleUpdateNode}
            onCancel={() => {
              setEditingNode(null);
              setUpdateError("");
            }}
            onChange={(name, value) => {
              setUpdateValues((current) => ({ ...current, [name]: value }));
            }}
          />
        ) : null}

        {createSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {createSuccess}
          </p>
        ) : null}

        {updateSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {updateSuccess}
          </p>
        ) : null}

        {!rows.length ? (
          <ResourceFeedback
            title="No local nodes found"
            detail="Create a local node account for the selected organization to get started."
          />
        ) : (
          <DataTable
            rows={rows}
            horizontalScroll
            columns={[
              {
                header: "Node",
                render: (row) => (
                  <div>
                    <strong className="block text-white">{row.name}</strong>
                    <span className="text-[var(--color-mist)]">
                      {row.email}
                    </span>
                  </div>
                ),
              },
              { header: "Phone", render: (row) => row.phone || "-" },
              { header: "Status", render: (row) => row.status },
              {
                header: "Organization",
                render: (row) =>
                  organizationNameById.get(row.organizationId) ??
                  row.organizationId,
              },
              {
                header: "Last login",
                render: (row) => formatTimestamp(row.lastLogin),
              },
              {
                header: "Actions",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => handleStartEdit(row)}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ice)] transition-colors hover:bg-white/10"
                  >
                    Edit
                  </button>
                ),
              },
            ]}
          />
        )}
      </section>
    </main>
  );
}
