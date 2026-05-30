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
  deviceCategoriesService,
  type DeviceCategory,
} from "@/lib/devices/device-categories-service";
import {
  deviceSpecificationsService,
  type DeviceSpecification,
  type DeviceSpecificationInput,
  type SpecificationSensor,
} from "@/lib/devices/device-specifications-service";
import { sensorsService, type Sensor } from "@/lib/devices/sensors-service";

interface DeviceSpecificationFormValues extends Record<string, string> {
  category_id: string;
  gps_model: string;
  communication_type: string;
  battery_type: string;
  camera_enabled: string;
  description: string;
}

type SpecificationsTab = "specifications" | "spec-sensors";

const defaultSpecificationValues: DeviceSpecificationFormValues = {
  category_id: "",
  gps_model: "",
  communication_type: "",
  battery_type: "",
  camera_enabled: "false",
  description: "",
};

const communicationTypeOptions = [
  { value: "lora", label: "LoRa" },
  { value: "gsm", label: "GSM" },
  { value: "satellite", label: "Satellite" },
];

const commonGpsModels = [
  "u-blox NEO-M8N",
  "u-blox ZED-F9P",
  "Quectel L76",
  "Quectel L86",
  "MediaTek MT3333",
];

const commonBatteryTypes = ["Li-ion", "LiPo", "LiFePO4", "NiMH", "Alkaline"];

function toFormValues(
  specification: DeviceSpecification,
): DeviceSpecificationFormValues {
  const communicationTypes = parseCommunicationTypes(
    specification.communication_type,
  );

  return {
    category_id: String(specification.category_id),
    gps_model: specification.gps_model,
    communication_type: Array.from(new Set(communicationTypes)).join(","),
    battery_type: specification.battery_type,
    camera_enabled: specification.camera_enabled ? "true" : "false",
    description: specification.description,
  };
}

function parseCommunicationTypes(rawValue: unknown): string[] {
  if (typeof rawValue !== "string") {
    return [];
  }

  return rawValue
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function toggleCommunicationType(rawValue: string, value: string): string {
  const selected = new Set(parseCommunicationTypes(rawValue));

  if (selected.has(value)) {
    selected.delete(value);
  } else {
    selected.add(value);
  }

  return Array.from(selected).join(",");
}

function formatCommunicationTypes(rawValue: string): string {
  const selected = parseCommunicationTypes(rawValue);

  if (selected.length === 0) {
    return "-";
  }

  const labels = new Map(
    communicationTypeOptions.map((option) => [option.value, option.label]),
  );

  return selected.map((item) => labels.get(item) ?? item).join(", ");
}

function toPayload(
  values: DeviceSpecificationFormValues,
): DeviceSpecificationInput {
  const categoryId = Number(values.category_id);
  const communicationTypes = parseCommunicationTypes(values.communication_type);

  if (!Number.isInteger(categoryId) || categoryId < 0) {
    throw new Error("Category ID must be a valid non-negative integer.");
  }

  if (communicationTypes.length === 0) {
    throw new Error("Select at least one communication type.");
  }

  return {
    category_id: categoryId,
    gps_model: values.gps_model.trim(),
    communication_type: Array.from(new Set(communicationTypes)).join(","),
    battery_type: values.battery_type.trim(),
    camera_enabled: values.camera_enabled === "true",
    description: values.description.trim(),
  };
}

function isSameSensorId(sensorId: string, assignedIds: Set<string>): boolean {
  return assignedIds.has(sensorId) || assignedIds.has(String(Number(sensorId)));
}

export function DeviceSpecificationsPageView() {
  const [activeTab, setActiveTab] =
    useState<SpecificationsTab>("specifications");

  const [rows, setRows] = useState<DeviceSpecification[] | null>(null);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [categoriesError, setCategoriesError] = useState("");

  const [allSensors, setAllSensors] = useState<Sensor[]>([]);
  const [allSensorsError, setAllSensorsError] = useState("");
  const [isAllSensorsLoading, setIsAllSensorsLoading] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<DeviceSpecificationFormValues>(defaultSpecificationValues);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingSpecification, setEditingSpecification] =
    useState<DeviceSpecification | null>(null);
  const [updateValues, setUpdateValues] =
    useState<DeviceSpecificationFormValues>(defaultSpecificationValues);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingSpecificationId, setDeletingSpecificationId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [selectedSpecificationId, setSelectedSpecificationId] = useState("");
  const [specSensors, setSpecSensors] = useState<SpecificationSensor[] | null>(
    null,
  );
  const [specSensorsError, setSpecSensorsError] = useState("");
  const [isSpecSensorsLoading, setIsSpecSensorsLoading] = useState(false);
  const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([]);
  const [isAssigningSensors, setIsAssigningSensors] = useState(false);
  const [specSensorsActionError, setSpecSensorsActionError] = useState("");
  const [specSensorsActionSuccess, setSpecSensorsActionSuccess] = useState("");

  const selectedSpecification = useMemo(
    () => rows?.find((item) => item.id === selectedSpecificationId) ?? null,
    [rows, selectedSpecificationId],
  );

  const assignedSensorIds = useMemo(
    () => new Set((specSensors ?? []).map((item) => item.id)),
    [specSensors],
  );

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        value: category.id,
        label: `${category.category_name} (ID: ${category.id})`,
      })),
    [categories],
  );

  const gpsModelOptions = useMemo(() => {
    const known = new Set(commonGpsModels.map((item) => item.toLowerCase()));
    const extra = (rows ?? [])
      .map((item) => item.gps_model.trim())
      .filter((item) => item.length > 0)
      .filter((item) => {
        const key = item.toLowerCase();
        if (known.has(key)) {
          return false;
        }
        known.add(key);
        return true;
      });

    return [...commonGpsModels, ...extra].map((model) => ({
      value: model,
      label: model,
    }));
  }, [rows]);

  const batteryTypeOptions = useMemo(() => {
    const known = new Set(commonBatteryTypes.map((item) => item.toLowerCase()));
    const extra = (rows ?? [])
      .map((item) => item.battery_type.trim())
      .filter((item) => item.length > 0)
      .filter((item) => {
        const key = item.toLowerCase();
        if (known.has(key)) {
          return false;
        }
        known.add(key);
        return true;
      });

    return [...commonBatteryTypes, ...extra].map((batteryType) => ({
      value: batteryType,
      label: batteryType,
    }));
  }, [rows]);

  const specificationFormFields = useMemo<
    EntityFormField<DeviceSpecificationFormValues>[]
  >(
    () => [
      {
        name: "category_id",
        label: "Category",
        type: "select",
        required: true,
        options: categoryOptions,
      },
      {
        name: "gps_model",
        label: "GPS model",
        type: "select",
        required: true,
        options: gpsModelOptions,
      },
      {
        name: "battery_type",
        label: "Battery type",
        type: "select",
        required: true,
        options: batteryTypeOptions,
      },
      {
        name: "camera_enabled",
        label: "Camera enabled",
        type: "select",
        required: true,
        options: [
          { value: "true", label: "True" },
          { value: "false", label: "False" },
        ],
      },
      {
        name: "description",
        label: "Description",
        required: true,
        colSpan: 2,
      },
    ],
    [batteryTypeOptions, categoryOptions, gpsModelOptions],
  );

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadSpecifications = useCallback(async () => {
    setError("");
    return deviceSpecificationsService.listSpecifications();
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoriesError("");
    return deviceCategoriesService.listCategories();
  }, []);

  const loadSensors = useCallback(async () => {
    setAllSensorsError("");
    setIsAllSensorsLoading(true);

    try {
      const sensors = await sensorsService.listSensors();
      setAllSensors(sensors);
    } catch (requestError) {
      setAllSensorsError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load existing sensors",
      );
      setAllSensors([]);
    } finally {
      setIsAllSensorsLoading(false);
    }
  }, []);

  const loadSpecificationSensors = useCallback(
    async (specId: string, syncSelection = false) => {
      setSpecSensorsError("");
      setIsSpecSensorsLoading(true);

      try {
        const sensors =
          await deviceSpecificationsService.getSpecificationSensors(specId);
        setSpecSensors(sensors);

        if (syncSelection) {
          setSelectedSensorIds(sensors.map((sensor) => sensor.id));
        }
      } catch (requestError) {
        setSpecSensorsError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load specification sensors",
        );
        setSpecSensors([]);
      } finally {
        setIsSpecSensorsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await loadSpecifications();
        if (isMounted) {
          setRows(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load device specifications",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadSpecifications]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await loadCategories();
        if (isMounted) {
          setCategories(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setCategoriesError(
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

  useEffect(() => {
    void loadSensors();
  }, [loadSensors]);

  const handleCreateSpecification = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      await deviceSpecificationsService.createSpecification(
        toPayload(createValues),
      );
      const refreshedRows = await loadSpecifications();
      setRows(refreshedRows);
      setCreateValues(defaultSpecificationValues);
      setCreateSuccess("Device specification created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create device specification",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (specification: DeviceSpecification) => {
    setShowCreateForm(false);
    clearActionMessages();
    setEditingSpecification(specification);
    setUpdateValues(toFormValues(specification));
  };

  const handleUpdateSpecification = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingSpecification) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      await deviceSpecificationsService.updateSpecification(
        editingSpecification.id,
        toPayload(updateValues),
      );
      const refreshedRows = await loadSpecifications();
      setRows(refreshedRows);
      setEditingSpecification(null);
      setUpdateSuccess("Device specification updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update device specification",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSpecification = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this specification? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingSpecificationId(id);
    clearActionMessages();

    try {
      await deviceSpecificationsService.deleteSpecification(id);
      const refreshedRows = await loadSpecifications();
      setRows(refreshedRows);

      if (editingSpecification?.id === id) {
        setEditingSpecification(null);
      }

      if (selectedSpecificationId === id) {
        setSelectedSpecificationId("");
        setSpecSensors(null);
        setSelectedSensorIds([]);
      }

      setDeleteSuccess("Device specification deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete device specification",
      );
    } finally {
      setDeletingSpecificationId("");
    }
  };

  const handleOpenSpecSensors = (specification: DeviceSpecification) => {
    setActiveTab("spec-sensors");
    setSelectedSpecificationId(specification.id);
    setSpecSensorsActionError("");
    setSpecSensorsActionSuccess("");
    void loadSpecificationSensors(specification.id, true);
  };

  const handleToggleSensor = (sensorId: string) => {
    setSelectedSensorIds((prev) => {
      if (prev.includes(sensorId)) {
        return prev.filter((id) => id !== sensorId);
      }

      return [...prev, sensorId];
    });
  };

  const handleAssignSensors = async () => {
    if (!selectedSpecificationId) {
      setSpecSensorsActionError("Select a specification first.");
      return;
    }

    if (selectedSensorIds.length === 0) {
      setSpecSensorsActionError("Select at least one sensor to assign.");
      return;
    }

    const sensorIds = selectedSensorIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id >= 0);

    if (sensorIds.length === 0) {
      setSpecSensorsActionError("Selected sensors contain invalid IDs.");
      return;
    }

    setSpecSensorsActionError("");
    setSpecSensorsActionSuccess("");
    setIsAssigningSensors(true);

    try {
      await deviceSpecificationsService.assignSensorsToSpecification(
        selectedSpecificationId,
        { sensor_ids: sensorIds },
      );
      await loadSpecificationSensors(selectedSpecificationId, true);
      setSpecSensorsActionSuccess("Sensors assigned successfully.");
    } catch (requestError) {
      setSpecSensorsActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to assign sensors",
      );
    } finally {
      setIsAssigningSensors(false);
    }
  };

  const specificationRows = rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Device specifications
        </h2>
        {activeTab === "specifications" ? (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              setEditingSpecification(null);
              clearActionMessages();
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            {showCreateForm ? "Cancel" : "Add specification"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("specifications")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
            activeTab === "specifications"
              ? "border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 text-[var(--color-ice)]"
              : "border border-white/20 text-[var(--color-ice)] hover:bg-white/10"
          }`}
        >
          Specifications
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("spec-sensors")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
            activeTab === "spec-sensors"
              ? "border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 text-[var(--color-ice)]"
              : "border border-white/20 text-[var(--color-ice)] hover:bg-white/10"
          }`}
        >
          Specification Sensors
        </button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      {categoriesError ? (
        <p className="text-sm text-rose-400">{categoriesError}</p>
      ) : null}
      {allSensorsError ? (
        <p className="text-sm text-rose-400">{allSensorsError}</p>
      ) : null}

      {activeTab === "specifications" ? (
        <>
          {showCreateForm ? (
            <div className="space-y-3">
              <EntityForm
                title="Create device specification"
                fields={specificationFormFields}
                values={createValues}
                errorMessage={createError}
                submitLabel="Create specification"
                submitLoadingLabel="Creating..."
                isSubmitting={isCreating}
                onSubmit={handleCreateSpecification}
                onChange={(name, value) =>
                  setCreateValues((prev) => ({ ...prev, [name]: value }))
                }
              />

              <div className="rounded-2xl border border-[var(--color-shell-border)] p-4">
                <p className="text-sm font-medium text-[var(--color-ice)]">
                  Communication types
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {communicationTypeOptions.map((option) => {
                    const checked = parseCommunicationTypes(
                      createValues.communication_type,
                    ).includes(option.value);

                    return (
                      <label
                        key={option.value}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-shell-border)] px-3 py-1.5 text-sm text-[var(--color-ice)]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setCreateValues((prev) => ({
                              ...prev,
                              communication_type: toggleCommunicationType(
                                prev.communication_type,
                                option.value,
                              ),
                            }))
                          }
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {createSuccess ? (
            <p className="text-sm text-emerald-400">{createSuccess}</p>
          ) : null}

          {editingSpecification ? (
            <div className="space-y-3">
              <EntityForm
                title={`Edit specification #${editingSpecification.id}`}
                fields={specificationFormFields}
                values={updateValues}
                errorMessage={updateError}
                submitLabel="Save changes"
                submitLoadingLabel="Saving..."
                isSubmitting={isUpdating}
                onSubmit={handleUpdateSpecification}
                onChange={(name, value) =>
                  setUpdateValues((prev) => ({ ...prev, [name]: value }))
                }
                onCancel={() => {
                  setEditingSpecification(null);
                  clearActionMessages();
                }}
              />

              <div className="rounded-2xl border border-[var(--color-shell-border)] p-4">
                <p className="text-sm font-medium text-[var(--color-ice)]">
                  Communication types
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {communicationTypeOptions.map((option) => {
                    const checked = parseCommunicationTypes(
                      updateValues.communication_type,
                    ).includes(option.value);

                    return (
                      <label
                        key={option.value}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-shell-border)] px-3 py-1.5 text-sm text-[var(--color-ice)]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setUpdateValues((prev) => ({
                              ...prev,
                              communication_type: toggleCommunicationType(
                                prev.communication_type,
                                option.value,
                              ),
                            }))
                          }
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
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
              resourceName="device specifications"
            />
          ) : specificationRows.length === 0 ? (
            <ResourceFeedback
              state="empty"
              resourceName="device specifications"
            />
          ) : (
            <DataTable
              rows={specificationRows}
              horizontalScroll
              columns={[
                { header: "ID", render: (row) => row.id },
                { header: "Category ID", render: (row) => row.category_id },
                { header: "GPS model", render: (row) => row.gps_model },
                {
                  header: "Communication",
                  render: (row) =>
                    formatCommunicationTypes(row.communication_type),
                },
                { header: "Battery", render: (row) => row.battery_type },
                {
                  header: "Camera",
                  render: (row) => (row.camera_enabled ? "Yes" : "No"),
                },
                { header: "Description", render: (row) => row.description },
                {
                  header: "Assigned sensors",
                  render: (row) => (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenSpecSensors(row);
                      }}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ice)] transition-colors hover:bg-white/10"
                    >
                      Manage
                    </button>
                  ),
                },
                {
                  header: "Actions",
                  render: (row) => (
                    <ResourceRowActions
                      onEdit={() => handleStartEdit(row)}
                      onDelete={() => {
                        void handleDeleteSpecification(row.id);
                      }}
                      isDeleting={deletingSpecificationId === row.id}
                    />
                  ),
                },
              ]}
            />
          )}
        </>
      ) : (
        <section className="space-y-4 rounded-2xl border border-[var(--color-shell-border)] p-4">
          <h3 className="text-base font-semibold text-[var(--color-ice)]">
            Assign existing sensors to a specification
          </h3>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="text-sm font-medium text-[var(--color-ice)]">
                Specification
              </span>
              <select
                value={selectedSpecificationId}
                onChange={(event) => {
                  const specId = event.target.value;
                  setSelectedSpecificationId(specId);
                  setSpecSensorsActionError("");
                  setSpecSensorsActionSuccess("");

                  if (!specId) {
                    setSpecSensors(null);
                    setSelectedSensorIds([]);
                    return;
                  }

                  void loadSpecificationSensors(specId, true);
                }}
                className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white"
              >
                <option value="">-- Select specification --</option>
                {specificationRows.map((spec) => (
                  <option key={spec.id} value={spec.id}>
                    #{spec.id} | {spec.gps_model} | Category {spec.category_id}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={!selectedSpecificationId || isSpecSensorsLoading}
              onClick={() => {
                if (!selectedSpecificationId) {
                  return;
                }

                void loadSpecificationSensors(selectedSpecificationId, false);
              }}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSpecSensorsLoading ? "Loading..." : "Refresh assigned sensors"}
            </button>
          </div>

          {selectedSpecification ? (
            <p className="text-sm text-white/75">
              Selected specification: #{selectedSpecification.id} | GPS model:{" "}
              {selectedSpecification.gps_model} | Communication:{" "}
              {formatCommunicationTypes(
                selectedSpecification.communication_type,
              )}
            </p>
          ) : null}

          {specSensorsError ? (
            <p className="text-sm text-rose-400">{specSensorsError}</p>
          ) : null}
          {specSensorsActionError ? (
            <p className="text-sm text-rose-400">{specSensorsActionError}</p>
          ) : null}
          {specSensorsActionSuccess ? (
            <p className="text-sm text-emerald-400">
              {specSensorsActionSuccess}
            </p>
          ) : null}

          {!selectedSpecificationId ? (
            <ResourceFeedback
              title="No specification selected"
              detail="Select a specification to view and assign sensors."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-shell-border)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-ice)]">
                    Existing sensors
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      void loadSensors();
                    }}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-ice)]"
                  >
                    Reload sensors
                  </button>
                </div>

                {isAllSensorsLoading ? (
                  <ResourceFeedback
                    state="loading"
                    resourceName="existing sensors"
                  />
                ) : allSensors.length === 0 ? (
                  <ResourceFeedback
                    state="empty"
                    resourceName="existing sensors"
                  />
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {allSensors.map((sensor) => {
                      const checked = selectedSensorIds.includes(sensor.id);
                      const assigned = isSameSensorId(
                        sensor.id,
                        assignedSensorIds,
                      );

                      return (
                        <label
                          key={sensor.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-shell-border)] px-3 py-2"
                        >
                          <span className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                handleToggleSensor(sensor.id);
                              }}
                            />
                            <span className="text-sm text-[var(--color-ice)]">
                              #{sensor.id} {sensor.sensor_name} ({sensor.unit})
                            </span>
                          </span>
                          {assigned ? (
                            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                              Assigned
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={
                      isAssigningSensors || selectedSensorIds.length === 0
                    }
                    onClick={() => {
                      void handleAssignSensors();
                    }}
                    className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isAssigningSensors
                      ? "Assigning..."
                      : "Assign selected sensors"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--color-shell-border)] p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-[var(--color-ice)]">
                  Sensors assigned to this specification
                </h4>

                {isSpecSensorsLoading ? (
                  <ResourceFeedback
                    state="loading"
                    resourceName="specification sensors"
                  />
                ) : specSensors === null ? (
                  <ResourceFeedback
                    state="empty"
                    resourceName="specification sensors"
                  />
                ) : specSensors.length === 0 ? (
                  <ResourceFeedback
                    state="empty"
                    resourceName="specification sensors"
                  />
                ) : (
                  <DataTable
                    rows={specSensors}
                    columns={[
                      { header: "Sensor ID", render: (row) => row.id },
                      {
                        header: "Sensor name",
                        render: (row) => row.sensor_name,
                      },
                      { header: "Unit", render: (row) => row.unit },
                    ]}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
