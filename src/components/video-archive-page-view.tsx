"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { getSessionData } from "@/lib/auth-tokens";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  clipsService,
  type VideoClip,
  type VideoClipInput,
} from "@/lib/video/clips-service";
import { useAuthStore } from "@/store/useAuthStore";

interface OrganizationOption {
  id: string;
  name: string;
}

interface ClipFormValues extends Record<string, string> {
  camera_id: string;
  animal_id: string;
  timestamp: string;
  video_path: string;
  activity_detected: string;
  duration_seconds: string;
}

const defaultValues: ClipFormValues = {
  camera_id: "",
  animal_id: "",
  timestamp: "",
  video_path: "",
  activity_detected: "",
  duration_seconds: "",
};

function isValidUuid(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

function toPayload(values: ClipFormValues): VideoClipInput {
  return {
    camera_id: values.camera_id.trim(),
    animal_id: values.animal_id.trim(),
    timestamp: values.timestamp,
    video_path: values.video_path.trim(),
    activity_detected: values.activity_detected.trim(),
    duration_seconds: Number(values.duration_seconds || 0),
  };
}

function fromClip(clip: VideoClip): ClipFormValues {
  return {
    camera_id: clip.cameraId,
    animal_id: clip.animalId,
    timestamp: clip.timestamp ? clip.timestamp.slice(0, 16) : "",
    video_path: clip.videoPath,
    activity_detected: clip.activityDetected,
    duration_seconds: String(clip.durationSeconds),
  };
}

function asDatetimeLocalValue(value: string): string {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16);
  }

  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function VideoArchivePageView(): React.JSX.Element {
  const { user } = useAuthStore();

  const [rows, setRows] = useState<VideoClip[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<ClipFormValues>(defaultValues);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingClip, setEditingClip] = useState<VideoClip | null>(null);
  const [updateValues, setUpdateValues] =
    useState<ClipFormValues>(defaultValues);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingClipId, setDeletingClipId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [hasHydrated, setHasHydrated] = useState(false);

  const isSystemAdmin = useMemo(() => {
    if (!hasHydrated) return false;
    const sessionData = getSessionData();
    return sessionData?.user?.is_system_admin ?? false;
  }, [hasHydrated]);

  const activeOrgId = useMemo(() => {
    if (!isSystemAdmin && user?.organizationId) {
      return user.organizationId;
    }

    return selectedOrgId;
  }, [isSystemAdmin, selectedOrgId, user?.organizationId]);

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadClips = useCallback(async (orgId: string) => {
    if (!orgId) {
      setRows([]);
      return [];
    }

    return clipsService.listClips(orgId);
  }, []);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

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

        if (!isSystemAdmin && user?.organizationId) {
          setSelectedOrgId(user.organizationId);
        }
      } else {
        setOrganizations([]);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isSystemAdmin, user?.organizationId]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!activeOrgId) {
        setRows([]);
        setLoadError("");
        return;
      }

      setRows(null);
      setLoadError("");

      try {
        const clips = await loadClips(activeOrgId);

        if (isMounted) {
          setRows(clips);
        }
      } catch (requestError) {
        if (isMounted) {
          setRows([]);
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load video clips",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [activeOrgId, loadClips]);

  const validateForm = (values: ClipFormValues): string | null => {
    if (!values.camera_id.trim()) {
      return "Camera ID is required.";
    }

    if (!isValidUuid(values.camera_id)) {
      return "Camera ID must be a valid UUID.";
    }

    if (!values.animal_id.trim()) {
      return "Animal ID is required.";
    }

    if (!isValidUuid(values.animal_id)) {
      return "Animal ID must be a valid UUID.";
    }

    if (!values.timestamp) {
      return "Timestamp is required.";
    }

    if (!values.video_path.trim()) {
      return "Video path is required.";
    }

    if (!values.activity_detected.trim()) {
      return "Activity detected is required.";
    }

    const duration = Number(values.duration_seconds);
    if (!Number.isFinite(duration) || duration < 0) {
      return "Duration seconds must be a valid number greater than or equal to 0.";
    }

    return null;
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeOrgId) {
      setCreateError("Organization is required.");
      return;
    }

    const validationMessage = validateForm(createValues);

    if (validationMessage) {
      setCreateError(validationMessage);
      return;
    }

    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      const payload = toPayload(createValues);

      if (createFile) {
        await clipsService.createClipWithFile(activeOrgId, payload, createFile);
      } else {
        await clipsService.createClip(activeOrgId, payload);
      }

      setCreateSuccess("Video clip created successfully.");
      setCreateValues(defaultValues);
      setCreateFile(null);
      setShowCreateForm(false);

      const updated = await loadClips(activeOrgId);
      setRows(updated);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create video clip.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = (clip: VideoClip) => {
    clearActionMessages();
    setShowCreateForm(false);
    setEditingClip(clip);
    setUpdateValues({
      ...fromClip(clip),
      timestamp: asDatetimeLocalValue(clip.timestamp),
    });
    setUpdateFile(null);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeOrgId || !editingClip) {
      setUpdateError("No clip selected.");
      return;
    }

    const validationMessage = validateForm(updateValues);

    if (validationMessage) {
      setUpdateError(validationMessage);
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setIsUpdating(true);

    try {
      const payload = toPayload(updateValues);

      if (updateFile) {
        await clipsService.updateClipWithFile(
          activeOrgId,
          editingClip.id,
          payload,
          updateFile,
        );
      } else {
        await clipsService.updateClip(activeOrgId, editingClip.id, payload);
      }

      setUpdateSuccess("Video clip updated successfully.");
      setEditingClip(null);
      setUpdateValues(defaultValues);
      setUpdateFile(null);

      const updated = await loadClips(activeOrgId);
      setRows(updated);
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update video clip.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (clipId: string) => {
    setDeletingClipId(clipId);
    setDeleteError("");
    setDeleteSuccess("");
  };

  const handleConfirmDelete = async () => {
    if (!activeOrgId || !deletingClipId) {
      setDeleteError("No clip selected.");
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");

    try {
      await clipsService.deleteClip(activeOrgId, deletingClipId);
      setDeletingClipId("");
      setDeleteSuccess("Video clip deleted successfully.");

      const updated = await loadClips(activeOrgId);
      setRows(updated);
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete video clip.",
      );
    }
  };

  const handleCancelDelete = () => {
    setDeletingClipId("");
    setDeleteError("");
  };

  if (deletingClipId) {
    const clip = rows?.find((item) => item.id === deletingClipId);

    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-6">
          <h3 className="mb-3 text-lg font-semibold text-rose-100">
            Delete Clip
          </h3>
          <p className="mb-4 text-sm text-rose-100/80">
            Are you sure you want to delete this video clip?
          </p>
          {clip ? (
            <p className="mb-4 text-sm font-mono text-white/70">
              {clip.videoPath}
            </p>
          ) : null}
          {deleteError ? (
            <p className="mb-3 text-sm text-rose-200">{deleteError}</p>
          ) : null}
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
          Video Archive
        </h2>
        {activeOrgId ? (
          <button
            type="button"
            onClick={() => {
              clearActionMessages();
              setEditingClip(null);
              setUpdateFile(null);
              setCreateValues(defaultValues);
              setCreateFile(null);
              setShowCreateForm(true);
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            Create video clip
          </button>
        ) : null}
      </div>

      {!hasHydrated || !isSystemAdmin ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="video-archive-org"
            className="text-sm text-[var(--color-mist)]"
          >
            Organization
          </label>
          <select
            id="video-archive-org"
            value={selectedOrgId}
            onChange={(event) => {
              setSelectedOrgId(event.target.value);
              setEditingClip(null);
              setUpdateFile(null);
              setShowCreateForm(false);
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
              Create video clip
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
              Camera ID
            </span>
            <input
              required
              type="text"
              value={createValues.camera_id}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  camera_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              placeholder="Camera UUID"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Animal ID
            </span>
            <input
              required
              type="text"
              value={createValues.animal_id}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  animal_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              placeholder="Animal UUID"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Timestamp
            </span>
            <input
              required
              type="datetime-local"
              value={createValues.timestamp}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  timestamp: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Duration (seconds)
            </span>
            <input
              required
              type="number"
              min={0}
              value={createValues.duration_seconds}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  duration_seconds: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              placeholder="e.g. 45"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Video path
            </span>
            <input
              required
              type="text"
              value={createValues.video_path}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  video_path: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              placeholder="/clips/patrol/day-1.mp4"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Upload local video file (optional)
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setCreateFile(file);
                if (file) {
                  setCreateValues((prev) => ({
                    ...prev,
                    video_path: prev.video_path || file.name,
                  }));
                }
              }}
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 file:mr-4 file:rounded-md file:border-0 file:bg-[var(--color-sand)]/20 file:px-3 file:py-1 file:text-sm file:font-semibold"
            />
            <p className="mt-1 text-xs text-[var(--color-fog)]">
              If selected, the file is sent as multipart to the same endpoint.
            </p>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Activity detected
            </span>
            <input
              required
              type="text"
              value={createValues.activity_detected}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  activity_detected: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              placeholder="e.g. Elephant crossing"
            />
          </label>

          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <div>
              {createError ? (
                <p className="text-sm text-rose-300">{createError}</p>
              ) : null}
              {createSuccess ? (
                <p className="text-sm text-emerald-300">{createSuccess}</p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      ) : null}

      {editingClip ? (
        <form
          onSubmit={handleUpdate}
          className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ice)]">
              Update video clip
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingClip(null);
                setUpdateFile(null);
                clearActionMessages();
              }}
              className="text-xs text-[var(--color-fog)] hover:text-[var(--color-ice)]"
            >
              Close
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Camera ID
            </span>
            <input
              required
              type="text"
              value={updateValues.camera_id}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  camera_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Animal ID
            </span>
            <input
              required
              type="text"
              value={updateValues.animal_id}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  animal_id: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Timestamp
            </span>
            <input
              required
              type="datetime-local"
              value={updateValues.timestamp}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  timestamp: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Duration (seconds)
            </span>
            <input
              required
              type="number"
              min={0}
              value={updateValues.duration_seconds}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  duration_seconds: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Video path
            </span>
            <input
              required
              type="text"
              value={updateValues.video_path}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  video_path: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Replace with local video file (optional)
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setUpdateFile(file);
                if (file) {
                  setUpdateValues((prev) => ({
                    ...prev,
                    video_path: prev.video_path || file.name,
                  }));
                }
              }}
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 file:mr-4 file:rounded-md file:border-0 file:bg-[var(--color-sand)]/20 file:px-3 file:py-1 file:text-sm file:font-semibold"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Activity detected
            </span>
            <input
              required
              type="text"
              value={updateValues.activity_detected}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  activity_detected: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <div>
              {updateError ? (
                <p className="text-sm text-rose-300">{updateError}</p>
              ) : null}
              {updateSuccess ? (
                <p className="text-sm text-emerald-300">{updateSuccess}</p>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={isUpdating}
              className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      ) : null}

      {!activeOrgId ? (
        <p className="text-sm text-[var(--color-mist)]">
          Select an organization to view and manage video clips.
        </p>
      ) : rows === null ? (
        <ResourceFeedback
          title="Loading video clips"
          detail="Fetching clips for the selected organization."
        />
      ) : rows.length === 0 ? (
        <ResourceFeedback
          title="No clips found"
          detail="Create a new video clip to populate this archive."
        />
      ) : (
        <DataTable<VideoClip>
          columns={[
            {
              header: "Timestamp",
              render: (row) => {
                const parsed = new Date(row.timestamp);
                return Number.isNaN(parsed.getTime())
                  ? row.timestamp
                  : parsed.toLocaleString();
              },
            },
            {
              header: "Camera",
              render: (row) => (
                <code className="text-xs font-mono text-[var(--color-fog)]">
                  {row.cameraId.slice(0, 8)}...
                </code>
              ),
            },
            {
              header: "Animal",
              render: (row) => (
                <code className="text-xs font-mono text-[var(--color-fog)]">
                  {row.animalId.slice(0, 8)}...
                </code>
              ),
            },
            {
              header: "Activity",
              render: (row) => row.activityDetected || "-",
            },
            {
              header: "Duration",
              render: (row) => `${row.durationSeconds}s`,
            },
            {
              header: "Video Path",
              render: (row) => row.videoPath,
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleEditClick(row)}
                  onDelete={() => handleDeleteClick(row.id)}
                  isDeleting={deletingClipId === row.id}
                />
              ),
            },
          ]}
          rows={rows}
          showCard
          horizontalScroll
          minColumnWidthRem={10}
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
