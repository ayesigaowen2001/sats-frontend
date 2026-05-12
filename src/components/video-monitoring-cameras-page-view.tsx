"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { devicesService } from "@/lib/devices/devices-service";
import { getSessionData } from "@/lib/auth-tokens";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  camerasService,
  type Camera,
  type CameraInput,
} from "@/lib/video/cameras-service";
import { useAuthStore } from "@/store/useAuthStore";

interface OrganizationOption {
  id: string;
  name: string;
}

interface DeviceOption {
  id: string;
  label: string;
}

interface CameraFormValues extends Record<string, string | boolean> {
  device_id: string;
  camera_name: string;
  stream_url: string;
  latitude: string;
  longitude: string;
  is_active: boolean;
}

const defaultValues: CameraFormValues = {
  device_id: "",
  camera_name: "",
  stream_url: "",
  latitude: "",
  longitude: "",
  is_active: true,
};

function isValidUuid(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function toPayload(values: CameraFormValues): CameraInput {
  const latitude = values.latitude ? Number(values.latitude) : undefined;
  const longitude = values.longitude ? Number(values.longitude) : undefined;

  return {
    device_id: values.device_id,
    camera_name: values.camera_name,
    stream_url: values.stream_url,
    geo_coordinates:
      latitude !== undefined && longitude !== undefined
        ? {
            type: "Point",
            coordinates: [longitude, latitude],
          }
        : undefined,
    is_active: values.is_active === true,
  };
}

function fromCamera(camera: Camera): CameraFormValues {
  return {
    device_id: camera.deviceId,
    camera_name: camera.cameraName,
    stream_url: camera.streamUrl,
    latitude: camera.latitude ? String(camera.latitude) : "",
    longitude: camera.longitude ? String(camera.longitude) : "",
    is_active: camera.isActive,
  };
}

export function VideoCamerasPageView(): React.JSX.Element {
  const { user } = useAuthStore();

  const [rows, setRows] = useState<Camera[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<CameraFormValues>(defaultValues);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [updateValues, setUpdateValues] =
    useState<CameraFormValues>(defaultValues);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingCameraId, setDeletingCameraId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [hasHydrated, setHasHydrated] = useState(false);

  // Determine if user is system admin (can switch orgs) or org admin (locked to their org)
  const isSystemAdmin = useMemo(() => {
    if (!hasHydrated) return false;
    const sessionData = getSessionData();
    return sessionData?.user?.is_system_admin ?? false;
  }, [hasHydrated]);

  // Resolve active org ID based on user role
  const activeOrgId = useMemo(() => {
    if (!isSystemAdmin && user?.organizationId) {
      return user.organizationId;
    }
    return selectedOrgId;
  }, [isSystemAdmin, user?.organizationId, selectedOrgId]);

  const selectedOrganization = useMemo(() => {
    if (!activeOrgId) return undefined;
    return organizations.find((org) => org.id === activeOrgId);
  }, [activeOrgId, organizations]);

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadCameras = useCallback(async (orgId: string) => {
    if (!orgId) {
      setRows([]);
      return [];
    }

    return camerasService.listCameras(orgId);
  }, []);

  const loadDevices = useCallback(async (orgId: string) => {
    if (!orgId) {
      setDevices([]);
      return [];
    }

    const records = await devicesService.listDevicesByOrganization(orgId);
    const options = records.map((device) => ({
      id: device.id,
      label: device.deviceSerial || device.id,
    }));

    setDevices(options);
    return options;
  }, []);

  // Initialize hydration state
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Load organizations on mount
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [orgsResult] = await Promise.allSettled([
        organizationCrudService.listOrganizations(),
      ]);

      if (!isMounted) {
        return;
      }

      if (orgsResult.status === "fulfilled") {
        const options = orgsResult.value.map((org) => ({
          id: org.id,
          name: org.organization_name ?? `Organization ${org.id}`,
        }));
        setOrganizations(options);

        // Auto-select org if user is not system admin
        if (!isSystemAdmin && user?.organizationId) {
          setSelectedOrgId(user.organizationId);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isSystemAdmin, user?.organizationId]);

  // Load cameras when selectedOrgId changes
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!activeOrgId) {
        setRows([]);
        setLoadError("");
        return;
      }

      setLoadError("");
      try {
        const cameras = await loadCameras(activeOrgId);
        if (isMounted) {
          setRows(cameras);
        }
      } catch (err) {
        if (isMounted) {
          const requestError = err as Error & { status?: number };
          setLoadError(
            requestError.message ||
              (requestError.status
                ? `Failed to load cameras: ${requestError.status}`
                : "Failed to load cameras"),
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadCameras, activeOrgId]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!activeOrgId) {
        setDevices([]);
        return;
      }

      try {
        const options = await loadDevices(activeOrgId);

        if (!isMounted) {
          return;
        }

        setCreateValues((prev) => {
          if (options.some((device) => device.id === prev.device_id)) {
            return prev;
          }

          return {
            ...prev,
            device_id: options[0]?.id ?? "",
          };
        });

        setUpdateValues((prev) => {
          if (!editingCamera) {
            return prev;
          }

          if (options.some((device) => device.id === prev.device_id)) {
            return prev;
          }

          return {
            ...prev,
            device_id: options[0]?.id ?? "",
          };
        });
      } catch {
        if (isMounted) {
          setDevices([]);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [activeOrgId, editingCamera, loadDevices]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeOrgId) {
      setCreateError("Organization is required.");
      return;
    }

    if (!createValues.device_id.trim()) {
      setCreateError("Device ID is required.");
      return;
    }

    if (!devices.some((device) => device.id === createValues.device_id)) {
      setCreateError("Please select a valid device for this organization.");
      return;
    }

    if (!createValues.camera_name.trim()) {
      setCreateError("Camera name is required.");
      return;
    }

    if (!createValues.stream_url.trim()) {
      setCreateError("Stream URL is required.");
      return;
    }

    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const payload = toPayload(createValues);
      await camerasService.createCamera(activeOrgId, payload);

      setCreateSuccess("Camera created successfully.");
      setCreateValues(defaultValues);
      setShowCreateForm(false);

      // Reload cameras
      const updated = await loadCameras(activeOrgId);
      setRows(updated);
    } catch (err) {
      const error = err as Error;
      setCreateError(error.message || "Failed to create camera.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (camera: Camera) => {
    clearActionMessages();
    setEditingCamera(camera);
    setUpdateValues(fromCamera(camera));
    setShowCreateForm(false);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingCamera || !activeOrgId) {
      setUpdateError("No camera selected.");
      return;
    }

    if (!updateValues.device_id.trim()) {
      setUpdateError("Device ID is required.");
      return;
    }

    if (!devices.some((device) => device.id === updateValues.device_id)) {
      setUpdateError("Please select a valid device for this organization.");
      return;
    }

    if (!updateValues.camera_name.trim()) {
      setUpdateError("Camera name is required.");
      return;
    }

    if (!updateValues.stream_url.trim()) {
      setUpdateError("Stream URL is required.");
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setIsUpdating(true);

    try {
      const payload = toPayload(updateValues);
      await camerasService.updateCamera(activeOrgId, editingCamera.id, payload);

      setUpdateSuccess("Camera updated successfully.");
      setEditingCamera(null);
      setUpdateValues(defaultValues);

      // Reload cameras
      const updated = await loadCameras(activeOrgId);
      setRows(updated);
    } catch (err) {
      const error = err as Error;
      setUpdateError(error.message || "Failed to update camera.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (cameraId: string) => {
    setDeletingCameraId(cameraId);
    setDeleteError("");
    setDeleteSuccess("");
  };

  const handleConfirmDelete = async () => {
    if (!activeOrgId || !deletingCameraId) {
      setDeleteError("No camera selected.");
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");

    try {
      await camerasService.deleteCamera(activeOrgId, deletingCameraId);
      setDeleteSuccess("Camera deleted successfully.");
      setDeletingCameraId("");

      // Reload cameras
      const updated = await loadCameras(activeOrgId);
      setRows(updated);
    } catch (err) {
      const error = err as Error;
      setDeleteError(error.message || "Failed to delete camera.");
    }
  };

  const handleCancelDelete = () => {
    setDeletingCameraId("");
    setDeleteError("");
  };

  // Show confirmation dialog for delete
  if (deletingCameraId) {
    const cameraToDelete = rows?.find((c) => c.id === deletingCameraId);
    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-6">
          <h3 className="mb-3 text-lg font-semibold text-rose-100">
            Delete Camera
          </h3>
          <p className="mb-4 text-sm text-rose-100/80">
            Are you sure you want to delete this camera?
          </p>
          {cameraToDelete && (
            <p className="mb-4 text-sm font-mono text-white/60">
              {cameraToDelete.cameraName}
            </p>
          )}
          {deleteError && (
            <p className="mb-3 text-sm text-rose-200">{deleteError}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="rounded-lg border border-rose-300 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 transition-colors hover:bg-rose-500/30"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={handleCancelDelete}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Cameras
        </h2>
        {activeOrgId ? (
          <button
            type="button"
            onClick={() => {
              clearActionMessages();
              setEditingCamera(null);
              setCreateValues((prev) => ({
                ...defaultValues,
                device_id: devices[0]?.id ?? prev.device_id,
              }));
              setShowCreateForm(true);
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            Create camera
          </button>
        ) : null}
      </div>

      {!hasHydrated || !isSystemAdmin ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="camera-org"
            className="text-sm text-[var(--color-mist)]"
          >
            Organization
          </label>
          <select
            id="camera-org"
            value={selectedOrgId}
            onChange={(event) => {
              setSelectedOrgId(event.target.value);
              setEditingCamera(null);
              setShowCreateForm(false);
              setDevices([]);
              clearActionMessages();
            }}
            className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
          >
            <option value="">-- Select organization --</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}

      {showCreateForm ? (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ice)]">
              Create camera
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                clearActionMessages();
              }}
              className="text-xs text-[var(--color-fog)] hover:text-[var(--color-ice)]"
            >
              Close
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Device ID
            </span>
            <select
              required
              value={createValues.device_id}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  device_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            >
              <option value="">-- Select device --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Camera Name
            </span>
            <input
              required
              type="text"
              value={createValues.camera_name}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  camera_name: event.target.value,
                }))
              }
              placeholder="e.g. Front Gate Camera"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Stream URL
            </span>
            <input
              required
              type="text"
              value={createValues.stream_url}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  stream_url: event.target.value,
                }))
              }
              placeholder="e.g. rtsp://camera.local/stream"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <div className="hidden sm:block" />

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Latitude (Optional)
            </span>
            <input
              type="number"
              step="0.0001"
              value={createValues.latitude}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  latitude: event.target.value,
                }))
              }
              placeholder="Enter latitude"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Longitude (Optional)
            </span>
            <input
              type="number"
              step="0.0001"
              value={createValues.longitude}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  longitude: event.target.value,
                }))
              }
              placeholder="Enter longitude"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={createValues.is_active === true}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  is_active: event.target.checked,
                }))
              }
              className="rounded border border-white/20"
            />
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Active
            </span>
          </label>

          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            {createError && (
              <p className="text-sm text-rose-300">{createError}</p>
            )}
            {createSuccess && (
              <p className="text-sm text-emerald-300">{createSuccess}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {editingCamera ? (
        <form
          onSubmit={handleUpdate}
          className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ice)]">
              Update camera
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingCamera(null);
                clearActionMessages();
              }}
              className="text-xs text-[var(--color-fog)] hover:text-[var(--color-ice)]"
            >
              Close
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Device ID
            </span>
            <select
              required
              value={updateValues.device_id}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  device_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            >
              <option value="">-- Select device --</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Camera Name
            </span>
            <input
              required
              type="text"
              value={updateValues.camera_name}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  camera_name: event.target.value,
                }))
              }
              placeholder="e.g. Front Gate Camera"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Stream URL
            </span>
            <input
              required
              type="text"
              value={updateValues.stream_url}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  stream_url: event.target.value,
                }))
              }
              placeholder="e.g. rtsp://camera.local/stream"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <div className="hidden sm:block" />

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Latitude (Optional)
            </span>
            <input
              type="number"
              step="0.0001"
              value={updateValues.latitude}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  latitude: event.target.value,
                }))
              }
              placeholder="Enter latitude"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Longitude (Optional)
            </span>
            <input
              type="number"
              step="0.0001"
              value={updateValues.longitude}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  longitude: event.target.value,
                }))
              }
              placeholder="Enter longitude"
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={updateValues.is_active === true}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  is_active: event.target.checked,
                }))
              }
              className="rounded border border-white/20"
            />
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Active
            </span>
          </label>

          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            {updateError && (
              <p className="text-sm text-rose-300">{updateError}</p>
            )}
            {updateSuccess && (
              <p className="text-sm text-emerald-300">{updateSuccess}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {!selectedOrgId ? (
        <p className="text-sm text-[var(--color-mist)]">
          Select an organization to view and manage cameras.
        </p>
      ) : rows === null ? (
        <ResourceFeedback
          title="Loading cameras"
          detail="Fetching cameras for the selected organization."
        />
      ) : rows.length === 0 ? (
        <ResourceFeedback
          title="No cameras found"
          detail="Create a new camera to get started."
        />
      ) : (
        <DataTable<Camera>
          columns={[
            {
              header: "Camera Name",
              render: (row) => row.cameraName,
            },
            {
              header: "Device ID",
              render: (row) => (
                <code className="text-xs font-mono text-[var(--color-fog)]">
                  {row.deviceId.slice(0, 8)}...
                </code>
              ),
            },
            {
              header: "Stream URL",
              render: (row) => row.streamUrl,
            },
            {
              header: "Location",
              render: (row) =>
                row.latitude && row.longitude
                  ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
                  : "-",
            },
            {
              header: "Status",
              render: (row) => (
                <span
                  className={
                    row.isActive ? "text-emerald-300" : "text-orange-300"
                  }
                >
                  {row.isActive ? "Active" : "Inactive"}
                </span>
              ),
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleEditClick(row)}
                  onDelete={() => handleDeleteClick(row.id)}
                  isDeleting={deletingCameraId === row.id}
                />
              ),
            },
          ]}
          rows={rows}
          showCard
        />
      )}

      {deleteError ? (
        <p className="text-sm text-rose-300">{deleteError}</p>
      ) : null}
      {deleteSuccess ? (
        <p className="text-sm text-emerald-300">{deleteSuccess}</p>
      ) : null}
    </div>
  );
}
