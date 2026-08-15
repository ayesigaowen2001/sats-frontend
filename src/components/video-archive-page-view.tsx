"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { getSessionData } from "@/lib/auth-tokens";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  clipsService,
  type ClipListFilters,
  type VideoClip,
} from "@/lib/video/clips-service";
import { useAuthStore } from "@/store/useAuthStore";

interface OrganizationOption {
  id: string;
  name: string;
}

interface ClipFormValues extends Record<string, string> {
  device_number: string;
  animal_number: string;
  recording_started_at: string;
  recording_ended_at: string;
  activity_detected: string;
}

interface FilterFormValues {
  device_number: string;
  animal_number: string;
  activity: string;
  recorded_from: string;
  recorded_to: string;
}

const defaultValues: ClipFormValues = {
  device_number: "",
  animal_number: "",
  recording_started_at: "",
  recording_ended_at: "",
  activity_detected: "",
};

const defaultFilterValues: FilterFormValues = {
  device_number: "",
  animal_number: "",
  activity: "",
  recorded_from: "",
  recorded_to: "",
};

function toIsoDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date-time value.");
  }

  return date.toISOString();
}

function formatDateTime(value: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function VideoArchivePageView(): React.JSX.Element {
  const { user } = useAuthStore();

  const [rows, setRows] = useState<VideoClip[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [filters, setFilters] = useState<FilterFormValues>(defaultFilterValues);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    page: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<ClipFormValues>(defaultValues);
  const [createFile, setCreateFile] = useState<File | null>(null);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [playingClip, setPlayingClip] = useState<VideoClip | null>(null);

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

  const loadClips = useCallback(
    async (orgId: string) => {
      if (!orgId) {
        setRows([]);
        return;
      }

      const appliedFilters: ClipListFilters = {
        device_number: filters.device_number.trim() || null,
        animal_number: filters.animal_number.trim() || null,
        activity: filters.activity.trim() || null,
        recorded_from: filters.recorded_from
          ? new Date(filters.recorded_from).toISOString()
          : null,
        recorded_to: filters.recorded_to
          ? new Date(filters.recorded_to).toISOString()
          : null,
        page,
        per_page: 20,
      };

      return clipsService.listClips(orgId, appliedFilters);
    },
    [filters, page],
  );

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
        const result = await loadClips(activeOrgId);

        if (!isMounted || !result) return;

        setRows(result.items);
        setPagination({
          total: result.pagination.total,
          pages: result.pagination.pages,
          page: result.pagination.page,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev,
        });
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

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeOrgId) {
      setCreateError("Organization is required.");
      return;
    }

    if (!createValues.device_number.trim()) {
      setCreateError("Device number is required.");
      return;
    }

    if (!createFile) {
      setCreateError("A video file is required.");
      return;
    }

    let recordingStartedAt: string;
    let recordingEndedAt: string;

    try {
      recordingStartedAt = toIsoDateTime(createValues.recording_started_at);
      recordingEndedAt = toIsoDateTime(createValues.recording_ended_at);
    } catch {
      setCreateError(
        "Recording start and end times must be valid date-time values.",
      );
      return;
    }

    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      await clipsService.uploadClip(
        activeOrgId,
        {
          device_number: createValues.device_number.trim(),
          animal_number: createValues.animal_number.trim() || null,
          recording_started_at: recordingStartedAt,
          recording_ended_at: recordingEndedAt,
          activity_detected: createValues.activity_detected.trim() || null,
        },
        createFile,
      );

      setCreateSuccess("Video clip uploaded successfully.");
      setCreateValues(defaultValues);
      setCreateFile(null);
      setShowCreateForm(false);

      const result = await loadClips(activeOrgId);
      if (result) {
        setRows(result.items);
        setPagination({
          total: result.pagination.total,
          pages: result.pagination.pages,
          page: result.pagination.page,
          hasNext: result.pagination.hasNext,
          hasPrev: result.pagination.hasPrev,
        });
      }
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to upload video clip.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilterValues);
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1) return;
    setPage(nextPage);
  };

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
              setCreateError("");
              setCreateSuccess("");
              setCreateValues(defaultValues);
              setCreateFile(null);
              setShowCreateForm(true);
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            Upload video clip
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
              setShowCreateForm(false);
              setCreateError("");
              setCreateSuccess("");
              setPage(1);
              setPlayingClip(null);
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
              Upload video clip
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setCreateError("");
                setCreateSuccess("");
              }}
              className="text-xs text-[var(--color-fog)] hover:text-[var(--color-ice)]"
            >
              Close
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Device number
            </span>
            <input
              required
              type="text"
              value={createValues.device_number}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  device_number: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              placeholder="e.g. DEV-00001"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Animal number (optional)
            </span>
            <input
              type="text"
              value={createValues.animal_number}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  animal_number: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              placeholder="e.g. ANM-00001"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Recording started at
            </span>
            <input
              required
              type="datetime-local"
              value={createValues.recording_started_at}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  recording_started_at: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Recording ended at
            </span>
            <input
              required
              type="datetime-local"
              value={createValues.recording_ended_at}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  recording_ended_at: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Video file
            </span>
            <input
              required
              type="file"
              accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/mpeg"
              onChange={(event) => {
                setCreateFile(event.target.files?.[0] ?? null);
              }}
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 file:mr-4 file:rounded-md file:border-0 file:bg-[var(--color-sand)]/20 file:px-3 file:py-1 file:text-sm file:font-semibold"
            />
            <p className="mt-1 text-xs text-[var(--color-fog)]">
              MP4, MOV, MKV, WebM or MPEG (max 200 MB).
            </p>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Activity detected (optional)
            </span>
            <input
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
              maxLength={500}
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
              {isCreating ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      ) : null}

      {/* Filters */}
      {activeOrgId ? (
        <form
          onSubmit={applyFilters}
          className="grid gap-3 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            type="text"
            value={filters.device_number}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                device_number: event.target.value,
              }))
            }
            placeholder="Device number"
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={filters.animal_number}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                animal_number: event.target.value,
              }))
            }
            placeholder="Animal number"
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={filters.activity}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                activity: event.target.value,
              }))
            }
            placeholder="Activity"
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          />
          <label className="flex flex-col text-xs text-[var(--color-fog)]">
            Recorded from
            <input
              type="datetime-local"
              value={filters.recorded_from}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  recorded_from: event.target.value,
                }))
              }
              className="mt-1 rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs text-[var(--color-fog)]">
            Recorded to
            <input
              type="datetime-local"
              value={filters.recorded_to}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  recorded_to: event.target.value,
                }))
              }
              className="mt-1 rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/20"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
            >
              Reset
            </button>
          </div>
        </form>
      ) : null}

      {/* Media player */}
      {playingClip ? (
        <div className="rounded-2xl border border-[var(--color-shell-border)] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[var(--color-ice)]">
              Clip Player
            </h3>
            <button
              type="button"
              onClick={() => setPlayingClip(null)}
              className="text-xs text-[var(--color-fog)] hover:text-[var(--color-ice)]"
            >
              Close
            </button>
          </div>
          {playingClip.videoUrl ? (
            <video
              src={playingClip.videoUrl}
              controls
              autoPlay
              playsInline
              className="mt-3 aspect-video w-full rounded-xl bg-black"
            />
          ) : (
            <p className="mt-3 text-sm text-[var(--color-mist)]">
              No video file available for this clip.
            </p>
          )}
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-[var(--color-mist)]">
              Device:{" "}
              <span className="text-[var(--color-ice)]">
                {playingClip.deviceNumber || "-"}
              </span>
            </p>
            <p className="text-[var(--color-mist)]">
              Animal:{" "}
              <span className="text-[var(--color-ice)]">
                {playingClip.animalNumber || "-"}
              </span>
            </p>
            <p className="text-[var(--color-mist)]">
              Started:{" "}
              <span className="text-[var(--color-ice)]">
                {formatDateTime(playingClip.recordingStartedAt)}
              </span>
            </p>
            <p className="text-[var(--color-mist)]">
              Duration:{" "}
              <span className="text-[var(--color-ice)]">
                {playingClip.durationSeconds}s
              </span>
            </p>
          </div>
        </div>
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
          detail="Upload a video clip to populate this archive."
        />
      ) : (
        <>
          <DataTable<VideoClip>
            columns={[
              {
                header: "Started",
                render: (row) => formatDateTime(row.recordingStartedAt),
              },
              {
                header: "Ended",
                render: (row) => formatDateTime(row.recordingEndedAt),
              },
              {
                header: "Device",
                render: (row) => (
                  <code className="text-xs font-mono text-[var(--color-fog)]">
                    {row.deviceNumber || "-"}
                  </code>
                ),
              },
              {
                header: "Animal",
                render: (row) => (
                  <code className="text-xs font-mono text-[var(--color-fog)]">
                    {row.animalNumber || "-"}
                  </code>
                ),
              },
              {
                header: "Duration",
                render: (row) => `${row.durationSeconds}s`,
              },
              {
                header: "Activity",
                render: (row) => row.activityDetected || "-",
              },
              {
                header: "Play",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => setPlayingClip(row)}
                    className="text-xs font-semibold text-[var(--color-sand)] hover:underline"
                  >
                    Watch
                  </button>
                ),
              },
            ]}
            rows={rows}
            showCard
            horizontalScroll
            minColumnWidthRem={10}
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <p className="text-sm text-[var(--color-mist)]">
              Page {pagination.page} of{" "}
              {pagination.pages > 0 ? pagination.pages : 1} · {pagination.total}{" "}
              clips
            </p>
            <button
              type="button"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
