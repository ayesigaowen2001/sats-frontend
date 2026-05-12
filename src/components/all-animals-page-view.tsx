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
} from "@/lib/animals/animal-classifications-service";
import {
  animalsService,
  type Animal,
  type AnimalInput,
} from "@/lib/animals/animals-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";

interface AnimalFormValues extends Record<string, string> {
  animal_number: string;
  classification_id: string;
  device_id: string;
  common_name: string;
  gender: string;
  age: string;
  weight_kg: string;
  date_tagged: string;
  location_lat: string;
  location_lng: string;
}

interface OrganizationOption {
  id: string;
  name: string;
}

const defaultAnimalValues: AnimalFormValues = {
  animal_number: "",
  classification_id: "",
  device_id: "",
  common_name: "",
  gender: "Male",
  age: "",
  weight_kg: "",
  date_tagged: "",
  location_lat: "",
  location_lng: "",
};

const genderOptions = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

function toPayload(values: AnimalFormValues): AnimalInput {
  const classificationId = Number(values.classification_id);

  if (!values.animal_number.trim()) {
    throw new Error("Animal number is required.");
  }

  if (!Number.isInteger(classificationId) || classificationId <= 0) {
    throw new Error("Classification is required.");
  }

  if (!values.common_name.trim()) {
    throw new Error("Common name is required.");
  }

  if (!values.gender.trim()) {
    throw new Error("Gender is required.");
  }

  const age = Number(values.age);
  if (Number.isNaN(age) || age < 0) {
    throw new Error("Age must be a non-negative number.");
  }

  const weightKg = Number(values.weight_kg);
  if (Number.isNaN(weightKg) || weightKg <= 0) {
    throw new Error("Weight (kg) must be a positive number.");
  }

  if (!values.date_tagged.trim()) {
    throw new Error("Date tagged is required.");
  }

  let locationTagged: [number | null, number | null] | null = null;

  if (values.location_lat.trim() || values.location_lng.trim()) {
    const lat = values.location_lat.trim() ? Number(values.location_lat) : null;
    const lng = values.location_lng.trim() ? Number(values.location_lng) : null;
    locationTagged = [lat, lng];
  }

  return {
    animal_number: values.animal_number.trim(),
    classification_id: classificationId,
    device_id: values.device_id.trim() || null,
    common_name: values.common_name.trim(),
    gender: values.gender,
    age,
    weight_kg: weightKg,
    date_tagged: values.date_tagged,
    location_tagged: locationTagged,
  };
}

function fromAnimal(animal: Animal): AnimalFormValues {
  const lat = animal.locationTagged?.[0];
  const lng = animal.locationTagged?.[1];

  return {
    animal_number: animal.animalNumber,
    classification_id: String(animal.classificationId),
    device_id: animal.deviceId ?? "",
    common_name: animal.commonName,
    gender: animal.gender,
    age: String(animal.age),
    weight_kg: String(animal.weightKg),
    date_tagged: animal.dateTagged ? animal.dateTagged.split("T")[0] : "",
    location_lat: lat != null ? String(lat) : "",
    location_lng: lng != null ? String(lng) : "",
  };
}

export function AllAnimalsPageView() {
  const [rows, setRows] = useState<Animal[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [classifications, setClassifications] = useState<
    AnimalClassification[]
  >([]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<AnimalFormValues>(defaultAnimalValues);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [updateValues, setUpdateValues] =
    useState<AnimalFormValues>(defaultAnimalValues);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingAnimalId, setDeletingAnimalId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const classificationOptions = useMemo(
    () =>
      classifications.map((c) => ({
        value: String(c.id),
        label: `${c.commonName} (${c.species})`,
      })),
    [classifications],
  );

  const formFields = useMemo<EntityFormField<AnimalFormValues>[]>(
    () => [
      {
        name: "animal_number",
        label: "Animal number",
        required: true,
      },
      {
        name: "common_name",
        label: "Common name",
        required: true,
      },
      {
        name: "classification_id",
        label: "Classification",
        type: "select",
        required: true,
        options: [
          { value: "", label: "— Select classification —" },
          ...classificationOptions,
        ],
      },
      {
        name: "gender",
        label: "Gender",
        type: "select",
        required: true,
        options: genderOptions,
      },
      {
        name: "age",
        label: "Age (years)",
        required: true,
      },
      {
        name: "weight_kg",
        label: "Weight (kg)",
        required: true,
      },
      {
        name: "date_tagged",
        label: "Date tagged",
        type: "date",
        required: true,
      },
      {
        name: "device_id",
        label: "Device ID (optional)",
      },
      {
        name: "location_lat",
        label: "Location latitude (optional)",
      },
      {
        name: "location_lng",
        label: "Location longitude (optional)",
      },
    ],
    [classificationOptions],
  );

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadAnimals = useCallback(async (orgId: string) => {
    if (!orgId) {
      setRows([]);
      return [];
    }

    return animalsService.listAnimals(orgId);
  }, []);

  // Load organizations and classifications on mount
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [orgsResult, classificationsResult] = await Promise.allSettled([
        organizationCrudService.listOrganizations(),
        animalClassificationsService.listClassifications(),
      ]);

      if (!isMounted) {
        return;
      }

      const loadErrors: string[] = [];

      if (orgsResult.status === "fulfilled") {
        const orgs = orgsResult.value.map((o) => ({
          id: o.id,
          name: o.organization_name,
        }));
        setOrganizations(orgs);

        if (orgs.length > 0 && orgs[0]) {
          setSelectedOrgId(orgs[0].id);
        }
      } else {
        setOrganizations([]);
        loadErrors.push("Failed to load organizations");
      }

      if (classificationsResult.status === "fulfilled") {
        setClassifications(classificationsResult.value);
      } else {
        setClassifications([]);
        loadErrors.push("Failed to load classifications");
      }

      if (loadErrors.length > 0) {
        setLoadError(loadErrors.join(" | "));
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load animals when selected org changes
  useEffect(() => {
    if (!selectedOrgId) {
      setRows([]);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setRows(null);
      setLoadError("");

      try {
        const animals = await loadAnimals(selectedOrgId);

        if (isMounted) {
          setRows(animals);
        }
      } catch (err) {
        if (isMounted) {
          setRows([]);
          setLoadError(
            err instanceof Error ? err.message : "Failed to load animals",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [selectedOrgId, loadAnimals]);

  const handleCreateAnimal = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const payload = toPayload(createValues);
      await animalsService.registerAnimal(selectedOrgId, payload);
      const refreshed = await loadAnimals(selectedOrgId);
      setRows(refreshed);
      setCreateValues(defaultAnimalValues);
      setCreateSuccess("Animal registered successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to register animal",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (animal: Animal) => {
    setShowCreateForm(false);
    clearActionMessages();
    setEditingAnimal(animal);
    setUpdateValues(fromAnimal(animal));
  };

  const handleUpdateAnimal = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingAnimal) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setIsUpdating(true);

    try {
      const payload = toPayload(updateValues);
      await animalsService.updateAnimal(
        selectedOrgId,
        editingAnimal.id,
        payload,
      );
      const refreshed = await loadAnimals(selectedOrgId);
      setRows(refreshed);
      setEditingAnimal(null);
      setUpdateSuccess("Animal updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update animal",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAnimal = async (animal: Animal) => {
    const shouldDelete = window.confirm(
      `Delete animal "${animal.commonName}" (${animal.animalNumber})? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setUpdateSuccess("");
    setCreateSuccess("");
    setDeletingAnimalId(animal.id);

    try {
      await animalsService.deleteAnimal(selectedOrgId, animal.id);
      const refreshed = await loadAnimals(selectedOrgId);
      setRows(refreshed);

      if (editingAnimal?.id === animal.id) {
        setEditingAnimal(null);
      }

      setDeleteSuccess("Animal deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete animal",
      );
    } finally {
      setDeletingAnimalId("");
    }
  };

  const classificationLabelById = useMemo(() => {
    const map = new Map<number, string>();
    classifications.forEach((c) => {
      map.set(Number(c.id), `${c.commonName} (${c.species})`);
    });
    return map;
  }, [classifications]);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          All animals
        </h2>
        {selectedOrgId ? (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setEditingAnimal(null);
              clearActionMessages();
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            Register animal
          </button>
        ) : null}
      </div>

      {/* Organization selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="org-select"
          className="text-sm font-medium text-[var(--color-mist)]"
        >
          Organization
        </label>
        <select
          id="org-select"
          value={selectedOrgId}
          onChange={(e) => {
            setSelectedOrgId(e.target.value);
            setEditingAnimal(null);
            setShowCreateForm(false);
            clearActionMessages();
          }}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--color-ice)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sand)]"
        >
          <option value="">— Select organization —</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </div>

      {loadError ? <p className="text-sm text-rose-400">{loadError}</p> : null}

      {showCreateForm ? (
        <EntityForm
          title="Register new animal"
          fields={formFields}
          values={createValues}
          errorMessage={createError}
          submitLabel="Register animal"
          submitLoadingLabel="Registering..."
          isSubmitting={isCreating}
          onSubmit={handleCreateAnimal}
          onChange={(name, value) =>
            setCreateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setShowCreateForm(false);
            clearActionMessages();
          }}
        />
      ) : null}

      {editingAnimal ? (
        <EntityForm
          title={`Edit animal — ${editingAnimal.commonName} (${editingAnimal.animalNumber})`}
          fields={formFields}
          values={updateValues}
          errorMessage={updateError}
          submitLabel="Save changes"
          submitLoadingLabel="Saving..."
          isSubmitting={isUpdating}
          onSubmit={handleUpdateAnimal}
          onChange={(name, value) =>
            setUpdateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setEditingAnimal(null);
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

      {!selectedOrgId ? (
        <p className="text-sm text-[var(--color-mist)]">
          Select an organization to view its animals.
        </p>
      ) : rows === null ? (
        <ResourceFeedback state="loading" resourceName="animals" />
      ) : rows.length === 0 ? (
        <ResourceFeedback state="empty" resourceName="animals" />
      ) : (
        <DataTable
          rows={rows}
          horizontalScroll
          columns={[
            { header: "Animal #", render: (row) => row.animalNumber },
            { header: "Common name", render: (row) => row.commonName },
            {
              header: "Classification",
              render: (row) =>
                classificationLabelById.get(row.classificationId) ??
                String(row.classificationId),
            },
            { header: "Gender", render: (row) => row.gender },
            { header: "Age", render: (row) => String(row.age) },
            {
              header: "Weight (kg)",
              render: (row) => String(row.weightKg),
            },
            {
              header: "Date tagged",
              render: (row) =>
                row.dateTagged ? row.dateTagged.split("T")[0] : "—",
            },
            {
              header: "Device ID",
              render: (row) =>
                row.deviceId ? (
                  <span className="font-mono text-xs">{row.deviceId}</span>
                ) : (
                  "—"
                ),
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDeleteAnimal(row);
                  }}
                  isDeleting={deletingAnimalId === row.id}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
