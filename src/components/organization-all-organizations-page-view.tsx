"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { ServerIdFilter } from "@/components/common/server-id-filter";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { getSessionData } from "@/lib/auth-tokens";
import {
  defaultOrganizationInput,
  organizationCrudService,
  type Organization,
  type OrganizationInput,
} from "@/lib/organizations/organization-crud";

const organizationFormFields: EntityFormField<OrganizationInput>[] = [
  { name: "organization_name", label: "Organization name", required: true },
  { name: "location", label: "Location", required: true },
  { name: "country", label: "Country", required: true },
  { name: "domain", label: "Domain", required: true },
  { name: "contact_person", label: "Contact person", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", required: true },
  {
    name: "subscription_status",
    label: "Subscription status",
    type: "select",
    required: true,
    options: [
      { value: "Active", label: "Active" },
      { value: "Inactive", label: "Inactive" },
      { value: "Suspended", label: "Suspended" },
    ],
  },
  {
    name: "subscription_expiry",
    label: "Subscription expiry",
    type: "date",
    required: true,
    colSpan: 2,
  },
];

function toDateInputValue(value: string) {
  if (!value) {
    return "";
  }

  return value.includes("T") ? value.slice(0, 10) : value;
}

export function OrganizationAllOrganizationsPageView() {
  const isSystemAdmin = Boolean(getSessionData()?.user.is_system_admin);
  const [rows, setRows] = useState<Organization[] | null>(null);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<OrganizationInput>(
    defaultOrganizationInput,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [updateValues, setUpdateValues] = useState<OrganizationInput>(
    defaultOrganizationInput,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingOrganizationId, setDeletingOrganizationId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [filteredOrganization, setFilteredOrganization] =
    useState<Organization | null>(null);
  const [filterError, setFilterError] = useState("");

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadOrganizations = useCallback(async () => {
    setError("");
    const organizations = await organizationCrudService.listOrganizations();
    return organizations;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await loadOrganizations();

        if (isMounted) {
          setRows(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load organizations",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadOrganizations]);

  const handleCreateOrganization = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      await organizationCrudService.createOrganization(createValues);
      const refreshedRows = await loadOrganizations();
      setRows(refreshedRows);
      setCreateValues(defaultOrganizationInput);
      setCreateSuccess("Organization created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create organization",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (organization: Organization) => {
    setShowCreateForm(false);
    clearActionMessages();
    setEditingOrganization(organization);
    setUpdateValues({
      organization_name: organization.organization_name,
      location: organization.location,
      country: organization.country,
      domain: organization.domain,
      contact_person: organization.contact_person,
      email: organization.email,
      phone: organization.phone,
      subscription_status: organization.subscription_status,
      subscription_expiry: toDateInputValue(organization.subscription_expiry),
    });
  };

  const handleUpdateOrganization = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingOrganization) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      await organizationCrudService.updateOrganization(
        editingOrganization.id,
        updateValues,
      );

      const refreshedRows = await loadOrganizations();
      setRows(refreshedRows);
      setEditingOrganization(null);
      setUpdateSuccess("Organization updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update organization",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteOrganization = async (organization: Organization) => {
    const shouldDelete = window.confirm(
      `Delete organization ${organization.organization_name}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setDeletingOrganizationId(organization.id);

    try {
      await organizationCrudService.deleteOrganization(organization.id);

      const refreshedRows = await loadOrganizations();
      setRows(refreshedRows);

      if (editingOrganization?.id === organization.id) {
        setEditingOrganization(null);
      }

      setDeleteSuccess("Organization deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete organization",
      );
    } finally {
      setDeletingOrganizationId("");
    }
  };

  const handleFilterOrganizationById = async (organizationId: string) => {
    setFilterError("");

    try {
      const organization =
        await organizationCrudService.getOrganizationById(organizationId);
      setFilteredOrganization(organization);
    } catch (requestError) {
      setFilteredOrganization(null);
      setFilterError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load organization by ID",
      );
    }
  };

  const handleClearOrganizationFilter = () => {
    setFilteredOrganization(null);
    setFilterError("");
  };

  if (error) {
    return (
      <ResourceFeedback title="Organization data unavailable" detail={error} />
    );
  }

  if (!rows) {
    return (
      <ResourceFeedback
        title="Loading organizations"
        detail="Fetching all organizations from SATS services."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            {isSystemAdmin ? "All organizations" : "My organisation"}
          </h2>
          {isSystemAdmin ? (
            <>
              <div className="w-full lg:max-w-xl lg:flex-1">
                <ServerIdFilter
                  label="Organization lookup"
                  placeholder="Enter organization ID"
                  actionLabel="Find organization"
                  loadingLabel="Searching..."
                  errorMessage={filterError}
                  hasActiveResult={filteredOrganization !== null}
                  onSearch={handleFilterOrganizationById}
                  onClear={handleClearOrganizationFilter}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm((current) => !current);
                  setEditingOrganization(null);
                  clearActionMessages();
                }}
                className="self-start rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 lg:self-auto"
              >
                {showCreateForm ? "Close form" : "Create organization"}
              </button>
            </>
          ) : null}
        </div>

        {isSystemAdmin && showCreateForm ? (
          <EntityForm
            title="Create organization"
            fields={organizationFormFields}
            values={createValues}
            errorMessage={createError}
            submitLabel="Create organization"
            submitLoadingLabel="Creating..."
            isSubmitting={isCreating}
            onSubmit={handleCreateOrganization}
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

        {editingOrganization ? (
          <EntityForm
            title={`Update organization: ${editingOrganization.organization_name}`}
            fields={organizationFormFields}
            values={updateValues}
            errorMessage={updateError}
            submitLabel="Update organization"
            submitLoadingLabel="Updating..."
            isSubmitting={isUpdating}
            onSubmit={handleUpdateOrganization}
            onCancel={() => {
              setEditingOrganization(null);
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
          showCard={false}
          horizontalScroll
          minColumnWidthRem={11}
          rows={
            isSystemAdmin && filteredOrganization
              ? [filteredOrganization]
              : rows
          }
          columns={[
            {
              header: "Organization",
              render: (row) => row.organization_name,
            },
            {
              header: "Location",
              render: (row) => row.location,
            },
            {
              header: "Country",
              render: (row) => row.country,
            },
            {
              header: "Domain",
              render: (row) => row.domain,
            },
            {
              header: "Contact person",
              render: (row) => row.contact_person,
            },
            {
              header: "Email",
              render: (row) => row.email,
            },
            {
              header: "Phone",
              render: (row) => row.phone,
            },
            {
              header: "Subscription",
              render: (row) => row.subscription_status,
            },
            {
              header: "Expiry",
              render: (row) => row.subscription_expiry,
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDeleteOrganization(row);
                  }}
                  isDeleting={deletingOrganizationId === row.id}
                />
              ),
            },
          ]}
        />
      </section>
    </main>
  );
}
