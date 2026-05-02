"use client";

import { useCallback, useEffect, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  defaultDeviceCategoryInput,
  deviceCategoriesService,
  type DeviceCategory,
  type DeviceCategoryInput,
} from "@/lib/devices/device-categories-service";

const categoryFormFields: EntityFormField<DeviceCategoryInput>[] = [
  { name: "category_name", label: "Category name", required: true },
  {
    name: "description",
    label: "Description",
    required: true,
    colSpan: 2,
  },
];

export function DeviceCategoriesPageView() {
  const [rows, setRows] = useState<DeviceCategory[] | null>(null);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] = useState<DeviceCategoryInput>(
    defaultDeviceCategoryInput,
  );
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingCategory, setEditingCategory] = useState<DeviceCategory | null>(
    null,
  );
  const [updateValues, setUpdateValues] = useState<DeviceCategoryInput>(
    defaultDeviceCategoryInput,
  );
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingCategoryId, setDeletingCategoryId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadCategories = useCallback(async () => {
    setError("");
    return deviceCategoriesService.listCategories();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await loadCategories();
        if (isMounted) {
          setRows(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load device categories",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadCategories]);

  const handleCreateCategory = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      await deviceCategoriesService.createCategory(createValues);
      const refreshedRows = await loadCategories();
      setRows(refreshedRows);
      setCreateValues(defaultDeviceCategoryInput);
      setCreateSuccess("Device category created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create device category",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (category: DeviceCategory) => {
    setShowCreateForm(false);
    clearActionMessages();
    setEditingCategory(category);
    setUpdateValues({
      category_name: category.category_name,
      description: category.description,
    });
  };

  const handleUpdateCategory = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingCategory) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      await deviceCategoriesService.updateCategory(
        editingCategory.id,
        updateValues,
      );
      const refreshedRows = await loadCategories();
      setRows(refreshedRows);
      setEditingCategory(null);
      setUpdateSuccess("Device category updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update device category",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this device category? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingCategoryId(id);
    clearActionMessages();

    try {
      await deviceCategoriesService.deleteCategory(id);
      const refreshedRows = await loadCategories();
      setRows(refreshedRows);

      if (editingCategory?.id === id) {
        setEditingCategory(null);
      }

      setDeleteSuccess("Device category deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete device category",
      );
    } finally {
      setDeletingCategoryId("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Device categories
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setEditingCategory(null);
            clearActionMessages();
          }}
          className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
        >
          {showCreateForm ? "Cancel" : "Add category"}
        </button>
      </div>

      {/* Global load error */}
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {/* Create form */}
      {showCreateForm ? (
        <EntityForm
          title="Create device category"
          fields={categoryFormFields}
          values={createValues}
          errorMessage={createError}
          submitLabel="Create category"
          submitLoadingLabel="Creating..."
          isSubmitting={isCreating}
          onSubmit={handleCreateCategory}
          onChange={(name, value) =>
            setCreateValues((prev) => ({ ...prev, [name]: value }))
          }
        />
      ) : null}

      {/* Create success */}
      {createSuccess ? (
        <p className="text-sm text-emerald-400">{createSuccess}</p>
      ) : null}

      {/* Edit form */}
      {editingCategory ? (
        <EntityForm
          title={`Edit category — ${editingCategory.category_name}`}
          fields={categoryFormFields}
          values={updateValues}
          errorMessage={updateError}
          submitLabel="Save changes"
          submitLoadingLabel="Saving..."
          isSubmitting={isUpdating}
          onSubmit={handleUpdateCategory}
          onChange={(name, value) =>
            setUpdateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setEditingCategory(null);
            clearActionMessages();
          }}
        />
      ) : null}

      {/* Update / delete feedback */}
      {updateSuccess ? (
        <p className="text-sm text-emerald-400">{updateSuccess}</p>
      ) : null}
      {deleteSuccess ? (
        <p className="text-sm text-emerald-400">{deleteSuccess}</p>
      ) : null}
      {deleteError ? (
        <p className="text-sm text-rose-400">{deleteError}</p>
      ) : null}

      {/* Table */}
      {rows === null ? (
        <ResourceFeedback state="loading" resourceName="device categories" />
      ) : rows.length === 0 ? (
        <ResourceFeedback state="empty" resourceName="device categories" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            {
              header: "Category name",
              render: (row) => row.category_name,
            },
            {
              header: "Description",
              render: (row) => row.description,
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDeleteCategory(row.id);
                  }}
                  isDeleting={deletingCategoryId === row.id}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
