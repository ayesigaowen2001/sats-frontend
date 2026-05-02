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
  defaultSensorInput,
  sensorsService,
  type Sensor,
  type SensorInput,
} from "@/lib/devices/sensors-service";

const sensorFormFields: EntityFormField<SensorInput>[] = [
  { name: "sensor_name", label: "Sensor name", required: true },
  { name: "unit", label: "Unit", required: true },
  { name: "description", label: "Description", required: true, colSpan: 2 },
];

export function SensorLibraryPageView() {
  const [rows, setRows] = useState<Sensor[] | null>(null);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<SensorInput>(defaultSensorInput);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [updateValues, setUpdateValues] =
    useState<SensorInput>(defaultSensorInput);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingSensorId, setDeletingSensorId] = useState("");
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

  const loadSensors = useCallback(async () => {
    setError("");
    return sensorsService.listSensors();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const data = await loadSensors();
        if (isMounted) setRows(data);
      } catch (requestError) {
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load sensors",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadSensors]);

  const handleCreateSensor = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      await sensorsService.createSensor(createValues);
      const refreshedRows = await loadSensors();
      setRows(refreshedRows);
      setCreateValues(defaultSensorInput);
      setCreateSuccess("Sensor created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create sensor",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (sensor: Sensor) => {
    setShowCreateForm(false);
    clearActionMessages();
    setEditingSensor(sensor);
    setUpdateValues({
      sensor_name: sensor.sensor_name,
      unit: sensor.unit,
      description: sensor.description,
    });
  };

  const handleUpdateSensor = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingSensor) return;

    setUpdateError("");
    setUpdateSuccess("");
    setDeleteSuccess("");
    setIsUpdating(true);

    try {
      await sensorsService.updateSensor(editingSensor.id, updateValues);
      const refreshedRows = await loadSensors();
      setRows(refreshedRows);
      setEditingSensor(null);
      setUpdateSuccess("Sensor updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update sensor",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSensor = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this sensor? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingSensorId(id);
    clearActionMessages();

    try {
      await sensorsService.deleteSensor(id);
      const refreshedRows = await loadSensors();
      setRows(refreshedRows);

      if (editingSensor?.id === id) setEditingSensor(null);

      setDeleteSuccess("Sensor deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete sensor",
      );
    } finally {
      setDeletingSensorId("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Sensor library
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setEditingSensor(null);
            clearActionMessages();
          }}
          className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
        >
          {showCreateForm ? "Cancel" : "Add sensor"}
        </button>
      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {/* Create form */}
      {showCreateForm ? (
        <EntityForm
          title="Create sensor"
          fields={sensorFormFields}
          values={createValues}
          errorMessage={createError}
          submitLabel="Create sensor"
          submitLoadingLabel="Creating..."
          isSubmitting={isCreating}
          onSubmit={handleCreateSensor}
          onChange={(name, value) =>
            setCreateValues((prev) => ({ ...prev, [name]: value }))
          }
        />
      ) : null}

      {createSuccess ? (
        <p className="text-sm text-emerald-400">{createSuccess}</p>
      ) : null}

      {/* Edit form */}
      {editingSensor ? (
        <EntityForm
          title={`Edit sensor — ${editingSensor.sensor_name}`}
          fields={sensorFormFields}
          values={updateValues}
          errorMessage={updateError}
          submitLabel="Save changes"
          submitLoadingLabel="Saving..."
          isSubmitting={isUpdating}
          onSubmit={handleUpdateSensor}
          onChange={(name, value) =>
            setUpdateValues((prev) => ({ ...prev, [name]: value }))
          }
          onCancel={() => {
            setEditingSensor(null);
            clearActionMessages();
          }}
        />
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

      {/* Table */}
      {rows === null ? (
        <ResourceFeedback state="loading" resourceName="sensors" />
      ) : rows.length === 0 ? (
        <ResourceFeedback state="empty" resourceName="sensors" />
      ) : (
        <DataTable
          rows={rows}
          columns={[
            { header: "Sensor name", render: (row) => row.sensor_name },
            { header: "Unit", render: (row) => row.unit },
            { header: "Description", render: (row) => row.description },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDeleteSensor(row.id);
                  }}
                  isDeleting={deletingSensorId === row.id}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
