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
  animalClassificationsService,
  type AnimalClassification,
  type AnimalClassificationInput,
} from "@/lib/animals/animal-classifications-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";

interface ClassificationFormValues extends Record<string, string> {
  kingdom: string;
  phylum: string;
  class_name: string;
  order_name: string;
  family: string;
  genus: string;
  species: string;
  common_name: string;
  conservation_status: string;
  organization_id: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

const GLOBAL_ORG_VALUE = "__GLOBAL__";

const defaultClassificationValues: ClassificationFormValues = {
  kingdom: "",
  phylum: "",
  class_name: "",
  order_name: "",
  family: "",
  genus: "",
  species: "",
  common_name: "",
  conservation_status: "",
  organization_id: GLOBAL_ORG_VALUE,
};

function toPayload(
  values: ClassificationFormValues,
): AnimalClassificationInput {
  return {
    kingdom: values.kingdom.trim(),
    phylum: values.phylum.trim(),
    class_name: values.class_name.trim(),
    order_name: values.order_name.trim(),
    family: values.family.trim(),
    genus: values.genus.trim(),
    species: values.species.trim(),
    common_name: values.common_name.trim(),
    conservation_status: values.conservation_status.trim(),
    organization_id:
      values.organization_id === GLOBAL_ORG_VALUE
        ? null
        : values.organization_id.trim(),
  };
}

function fromClassification(
  item: AnimalClassification,
): ClassificationFormValues {
  return {
    kingdom: item.kingdom,
    phylum: item.phylum,
    class_name: item.className,
    order_name: item.orderName,
    family: item.family,
    genus: item.genus,
    species: item.species,
    common_name: item.commonName,
    conservation_status: item.conservationStatus,
    organization_id: item.organizationId || GLOBAL_ORG_VALUE,
  };
}

export function AnimalClassificationsPageView() {
  const [rows, setRows] = useState<AnimalClassification[] | null>(null);
  const [error, setError] = useState("");

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<ClassificationFormValues>(
    defaultClassificationValues,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingClassification, setEditingClassification] =
    useState<AnimalClassification | null>(null);
  const [updateValues, setUpdateValues] = useState<ClassificationFormValues>(
    defaultClassificationValues,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingClassificationId, setDeletingClassificationId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const organizationNameById = useMemo(() => {
    const map = new Map<string, string>();

    organizations.forEach((organization) => {
      map.set(organization.id, organization.name);
    });

    return map;
  }, [organizations]);

  const formFields = useMemo<EntityFormField<ClassificationFormValues>[]>(
    () => [
      { name: "kingdom", label: "Kingdom", required: true },
      { name: "phylum", label: "Phylum", required: true },
      { name: "class_name", label: "Class", required: true },
      { name: "order_name", label: "Order", required: true },
      { name: "family", label: "Family", required: true },
      { name: "genus", label: "Genus", required: true },
      { name: "species", label: "Species", required: true },
      { name: "common_name", label: "Common name", required: true },
      {
        name: "conservation_status",
        label: "Conservation status",
        required: true,
      },
      {
        name: "organization_id",
        label: "Scope (organization)",
        type: "select",
        options: [
          { value: GLOBAL_ORG_VALUE, label: "Global (organization_id = null)" },
          ...organizations.map((organization) => ({
            value: organization.id,
            label: organization.name,
          })),
        ],
        colSpan: 2,
      },
    ],
    [organizations],
  );

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadClassifications = useCallback(async () => {
    setError("");
    return animalClassificationsService.listClassifications();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [classificationsResult, organizationsResult] =
        await Promise.allSettled([
          loadClassifications(),
          organizationCrudService.listOrganizations(),
        ]);

      if (!isMounted) {
        return;
      }

      const loadErrors: string[] = [];

      if (classificationsResult.status === "fulfilled") {
        setRows(classificationsResult.value);
      } else {
        setRows([]);
        loadErrors.push(
          classificationsResult.reason instanceof Error
            ? classificationsResult.reason.message
            : "Failed to load classifications",
        );
      }

      if (organizationsResult.status === "fulfilled") {
        setOrganizations(
          organizationsResult.value.map((organization) => ({
            id: organization.id,
            name: organization.organization_name,
          })),
        );
      } else {
        setOrganizations([]);
        loadErrors.push("Failed to load organizations");
      }

      setError(loadErrors.join(" | "));
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadClassifications]);

  const handleCreateClassification = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      await animalClassificationsService.createClassification(
        toPayload(createValues),
      );
      const refreshedRows = await loadClassifications();
      setRows(refreshedRows);
      setCreateValues(defaultClassificationValues);
      setCreateSuccess("Animal classification created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create classification",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (classification: AnimalClassification) => {
    setShowCreateForm(false);
    clearActionMessages();
    setEditingClassification(classification);
    setUpdateValues(fromClassification(classification));
  };

  const handleUpdateClassification = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingClassification) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      await animalClassificationsService.updateClassification(
        editingClassification.id,
        toPayload(updateValues),
      );
      const refreshedRows = await loadClassifications();
      setRows(refreshedRows);
      setEditingClassification(null);
      setUpdateSuccess("Animal classification updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update classification",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClassification = async (
    classification: AnimalClassification,
  ) => {
    const shouldDelete = window.confirm(
      `Delete classification ${classification.commonName}? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setDeletingClassificationId(classification.id);

    try {
      await animalClassificationsService.deleteClassification(
        classification.id,
      );
      const refreshedRows = await loadClassifications();
      setRows(refreshedRows);

      if (editingClassification?.id === classification.id) {
        setEditingClassification(null);
      }

      setDeleteSuccess("Animal classification deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete classification",
      );
    } finally {
      setDeletingClassificationId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Animal classifications
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm(true);
            setEditingClassification(null);
            clearActionMessages();
          }}
          className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
        >
          Add classification
        </button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {showCreateForm ? (
        <EntityForm
          title="Create animal classification"
          fields={formFields}
          values={createValues}
          errorMessage={createError}
          submitLabel="Create classification"
          submitLoadingLabel="Creating..."
          isSubmitting={isCreating}
          onSubmit={handleCreateClassification}
          onChange={(name, value) =>
            setCreateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setShowCreateForm(false);
            clearActionMessages();
          }}
        />
      ) : null}

      {editingClassification ? (
        <EntityForm
          title={`Edit classification ${editingClassification.commonName}`}
          fields={formFields}
          values={updateValues}
          errorMessage={updateError}
          submitLabel="Save changes"
          submitLoadingLabel="Saving..."
          isSubmitting={isUpdating}
          onSubmit={handleUpdateClassification}
          onChange={(name, value) =>
            setUpdateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setEditingClassification(null);
            clearActionMessages();
          }}
        />
      ) : null}

      {createSuccess ? (
        <p className="text-sm text-emerald-400">{createSuccess}</p>
      ) : null}
      {updateSuccess ? (
        <p className="text-sm text-emerald-400">{updateSuccess}</p>
      ) : null}
      {deleteSuccess ? (
        <p className="text-sm text-emerald-400">{deleteSuccess}</p>
      ) : null}
      {deleteError ? (
        <p className="text-sm text-rose-400">{deleteError}</p>
      ) : null}

      {rows === null ? (
        <ResourceFeedback
          state="loading"
          resourceName="animal classifications"
        />
      ) : rows.length === 0 ? (
        <ResourceFeedback state="empty" resourceName="animal classifications" />
      ) : (
        <DataTable
          rows={rows}
          horizontalScroll
          columns={[
            { header: "Common name", render: (row) => row.commonName },
            { header: "Species", render: (row) => row.species },
            { header: "Class", render: (row) => row.className },
            { header: "Order", render: (row) => row.orderName },
            { header: "Family", render: (row) => row.family },
            { header: "Genus", render: (row) => row.genus },
            {
              header: "Conservation",
              render: (row) => row.conservationStatus,
            },
            {
              header: "Organization",
              render: (row) =>
                row.organizationId
                  ? (organizationNameById.get(row.organizationId) ??
                    row.organizationId)
                  : "Global",
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDeleteClassification(row);
                  }}
                  isDeleting={deletingClassificationId === row.id}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
