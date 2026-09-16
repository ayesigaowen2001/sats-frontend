"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { getSessionData } from "@/lib/auth-tokens";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  observationsService,
  type FieldObservation,
  type ObservationDetails,
  type ObservationFilters,
  type ObservationInput,
  type ObservationSeverity,
  type ObservationStatus,
  type ObservationType,
} from "@/lib/video/observations-service";
import { useAuthStore } from "@/store/useAuthStore";

interface OrganizationOption {
  id: string;
  name: string;
}

interface FormValues {
  observation_type: ObservationType;
  severity: ObservationSeverity;
  observed_at: string;
  longitude: string;
  latitude: string;
  location_accuracy_m: string;
  animal_number: string;
  description: string;
  details: string;
  status: ObservationStatus;
  resolution_notes: string;
}

interface FilterValues {
  observation_type: "" | ObservationType;
  severity: "" | ObservationSeverity;
  status: "" | ObservationStatus;
  animal_number: string;
  observed_from: string;
  observed_to: string;
}

const defaultForm: FormValues = {
  observation_type: "other",
  severity: "medium",
  observed_at: "",
  longitude: "",
  latitude: "",
  location_accuracy_m: "",
  animal_number: "",
  description: "",
  details: "{}",
  status: "open",
  resolution_notes: "",
};

const defaultFilters: FilterValues = {
  observation_type: "",
  severity: "",
  status: "",
  animal_number: "",
  observed_from: "",
  observed_to: "",
};

const observationTypes: ObservationType[] = [
  "poaching_sign",
  "carcass",
  "vehicle_sighting",
  "other",
];

const severities: ObservationSeverity[] = ["low", "medium", "high", "critical"];
const statuses: ObservationStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
];

function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function detailsKey(type: ObservationType) {
  return type === "poaching_sign"
    ? "poaching_sign"
    : type === "carcass"
      ? "carcass"
      : type === "vehicle_sighting"
        ? "vehicle_sighting"
        : "other";
}

function toForm(observation: FieldObservation): FormValues {
  const detail =
    observation[
      detailsKey(observation.observationType) === "other"
        ? "description"
        : (detailsKey(observation.observationType) as "description")
    ];
  return {
    observation_type: observation.observationType,
    severity: observation.severity,
    observed_at: observation.observedAt
      ? observation.observedAt.slice(0, 16)
      : "",
    longitude: observation.location
      ? String(observation.location.coordinates[0])
      : "",
    latitude: observation.location
      ? String(observation.location.coordinates[1])
      : "",
    location_accuracy_m:
      observation.locationAccuracyM === null
        ? ""
        : String(observation.locationAccuracyM),
    animal_number: observation.animalNumber,
    description: observation.description,
    details:
      detail && typeof detail === "object"
        ? JSON.stringify(detail, null, 2)
        : "{}",
    status: observation.status,
    resolution_notes: observation.resolutionNotes,
  };
}

export function VideoActivityDetectionsPageView(): React.JSX.Element {
  const { user } = useAuthStore();
  const [hasHydrated, setHasHydrated] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [rows, setRows] = useState<FieldObservation[] | null>(null);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [form, setForm] = useState<FormValues>(defaultForm);
  const [editing, setEditing] = useState<FieldObservation | null>(null);
  const [evidence, setEvidence] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState("");

  const isSystemAdmin = useMemo(() => {
    if (!hasHydrated) return false;
    return getSessionData()?.user?.is_system_admin ?? false;
  }, [hasHydrated]);
  const activeOrgId = useMemo(
    () =>
      !isSystemAdmin && user?.organizationId
        ? user.organizationId
        : selectedOrgId,
    [isSystemAdmin, selectedOrgId, user?.organizationId],
  );

  const loadRows = useCallback(async () => {
    if (!activeOrgId) {
      setRows([]);
      return;
    }
    const applied: ObservationFilters = {
      ...filters,
      observed_from: filters.observed_from
        ? new Date(filters.observed_from).toISOString()
        : undefined,
      observed_to: filters.observed_to
        ? new Date(filters.observed_to).toISOString()
        : undefined,
      page,
      per_page: 20,
    };
    const result = await observationsService.listObservations(
      activeOrgId,
      applied,
    );
    setRows(result.items);
    setPagination({
      total: result.pagination.total,
      pages: result.pagination.pages || 1,
      page: result.pagination.page,
    });
  }, [activeOrgId, filters, page]);

  useEffect(() => setHasHydrated(true), []);
  useEffect(() => {
    let mounted = true;
    void organizationCrudService
      .listOrganizations()
      .then((items) => {
        if (!mounted) return;
        setOrganizations(
          items.map((item) => ({
            id: item.id,
            name: item.organization_name ?? item.id,
          })),
        );
        if (!isSystemAdmin && user?.organizationId)
          setSelectedOrgId(user.organizationId);
      })
      .catch(() => setOrganizations([]));
    return () => {
      mounted = false;
    };
  }, [isSystemAdmin, user?.organizationId]);
  useEffect(() => {
    setRows(null);
    setError("");
    void loadRows().catch((requestError: unknown) =>
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load observations.",
      ),
    );
  }, [loadRows]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...defaultForm,
      observed_at: new Date().toISOString().slice(0, 16),
    });
    setEvidence(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrgId) return setError("Select an organization first.");
    const longitude = Number(form.longitude);
    const latitude = Number(form.latitude);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude))
      return setError("Longitude and latitude are required.");
    if (form.observation_type === "other" && !form.description.trim())
      return setError("Description is required for other observations.");
    let details: ObservationDetails = {};
    try {
      details = JSON.parse(form.details) as ObservationDetails;
    } catch {
      return setError("Type details must be valid JSON.");
    }
    const input: ObservationInput = {
      observation_type: form.observation_type,
      severity: form.severity,
      observed_at: new Date(form.observed_at).toISOString(),
      location: { type: "Point", coordinates: [longitude, latitude] },
      location_accuracy_m: form.location_accuracy_m
        ? Number(form.location_accuracy_m)
        : null,
      description: form.description.trim() || null,
      animal_number: form.animal_number.trim() || null,
      ...(form.observation_type === "poaching_sign"
        ? { poaching_sign: details }
        : {}),
      ...(form.observation_type === "carcass" ? { carcass: details } : {}),
      ...(form.observation_type === "vehicle_sighting"
        ? { vehicle_sighting: details }
        : {}),
    };
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      let observation: FieldObservation;
      if (editing) {
        observation = await observationsService.updateObservation(
          activeOrgId,
          editing.observationNumber,
          {
            ...input,
            status: form.status,
            resolution_notes: form.resolution_notes.trim() || null,
          },
        );
      } else {
        observation = await observationsService.createObservation(
          activeOrgId,
          input,
        );
      }
      if (evidence)
        await observationsService.uploadMedia(
          activeOrgId,
          observation.observationNumber,
          evidence,
        );
      setShowForm(false);
      setEditing(null);
      setEvidence(null);
      setSuccess(editing ? "Observation updated." : "Observation recorded.");
      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save observation.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (observation: FieldObservation) => {
    if (
      !activeOrgId ||
      !window.confirm(`Delete ${observation.observationNumber}?`)
    )
      return;
    setDeleting(observation.id);
    setError("");
    try {
      await observationsService.deleteObservation(
        activeOrgId,
        observation.observationNumber,
      );
      await loadRows();
      setSuccess("Observation deleted.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete observation.",
      );
    } finally {
      setDeleting("");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Activity detections
          </h2>
          <p className="text-sm text-[var(--color-mist)]">
            Record camera evidence and field observations in one place.
          </p>
        </div>
        {activeOrgId ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)]"
          >
            Record observation
          </button>
        ) : null}
      </div>
      {!hasHydrated || !isSystemAdmin ? null : (
        <label className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-mist)]">
          Organization
          <select
            value={selectedOrgId}
            onChange={(event) => {
              setSelectedOrgId(event.target.value);
              setPage(1);
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
        </label>
      )}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
      {showForm ? (
        <form
          onSubmit={submit}
          className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between">
            <h3 className="font-semibold">
              {editing
                ? `Edit ${editing.observationNumber}`
                : "Record field observation"}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-[var(--color-fog)]"
            >
              Close
            </button>
          </div>
          <label>
            Type
            <select
              value={form.observation_type}
              disabled={Boolean(editing)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observation_type: event.target.value as ObservationType,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            >
              {observationTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              value={form.severity}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  severity: event.target.value as ObservationSeverity,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            >
              {severities.map((severity) => (
                <option key={severity}>{severity}</option>
              ))}
            </select>
          </label>
          {editing ? (
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as ObservationStatus,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Observed at
            <input
              required
              type="datetime-local"
              value={form.observed_at}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observed_at: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>
          <label>
            Longitude
            <input
              required
              type="number"
              step="any"
              value={form.longitude}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  longitude: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>
          <label>
            Latitude
            <input
              required
              type="number"
              step="any"
              value={form.latitude}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  latitude: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>
          <label>
            Animal number
            <input
              value={form.animal_number}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  animal_number: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>
          <label>
            Accuracy (metres)
            <input
              type="number"
              min="0"
              value={form.location_accuracy_m}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location_accuracy_m: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="sm:col-span-2">
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="mt-2 min-h-20 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>
          <label className="sm:col-span-2">
            {form.observation_type === "other"
              ? "Additional details (JSON, optional)"
              : `${form.observation_type.replaceAll("_", " ")} details (JSON)`}
            <textarea
              value={form.details}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  details: event.target.value,
                }))
              }
              className="mt-2 min-h-28 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 font-mono text-xs"
            />
          </label>
          {editing ? (
            <label className="sm:col-span-2">
              Resolution notes
              <textarea
                value={form.resolution_notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    resolution_notes: event.target.value,
                  }))
                }
                className="mt-2 min-h-20 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
              />
            </label>
          ) : null}
          <label className="sm:col-span-2">
            Camera evidence
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={(event) => setEvidence(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 file:mr-4 file:rounded-md file:border-0 file:bg-[var(--color-sand)]/20 file:px-3 file:py-1"
            />
            <span className="mt-1 block text-xs text-[var(--color-fog)]">
              Optional photo or video, up to 200 MB.
            </span>
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : "Record observation"}
            </button>
          </div>
        </form>
      ) : null}
      {activeOrgId ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
          }}
          className="grid gap-3 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2 lg:grid-cols-6"
        >
          <select
            value={filters.observation_type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                observation_type: event.target
                  .value as FilterValues["observation_type"],
              }))
            }
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All types</option>
            {observationTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select
            value={filters.severity}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                severity: event.target.value as FilterValues["severity"],
              }))
            }
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All severities</option>
            {severities.map((severity) => (
              <option key={severity}>{severity}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as FilterValues["status"],
              }))
            }
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <input
            placeholder="Animal number"
            value={filters.animal_number}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                animal_number: event.target.value,
              }))
            }
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={filters.observed_from}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                observed_from: event.target.value,
              }))
            }
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={filters.observed_to}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                observed_to: event.target.value,
              }))
            }
            className="rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
            <button className="rounded-lg border border-[var(--color-sand)] bg-[var(--color-sand)]/10 px-4 py-2 text-sm font-semibold">
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => {
                setFilters(defaultFilters);
                setPage(1);
              }}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold"
            >
              Reset
            </button>
          </div>
        </form>
      ) : null}
      {!activeOrgId ? (
        <p className="text-sm text-[var(--color-mist)]">
          Select an organization to view activity detections.
        </p>
      ) : rows === null ? (
        <ResourceFeedback
          title="Loading observations"
          detail="Fetching field observations for the selected organization."
          loading
        />
      ) : rows.length === 0 ? (
        <ResourceFeedback
          title="No observations found"
          detail="Record an observation from a camera or the field to begin."
        />
      ) : (
        <>
          <DataTable
            rows={rows}
            horizontalScroll
            columns={[
              {
                header: "Observation",
                render: (row) => (
                  <div>
                    <p className="font-semibold">{row.observationNumber}</p>
                    <p className="text-xs text-[var(--color-fog)]">
                      {row.observationType.replaceAll("_", " ")}
                    </p>
                  </div>
                ),
              },
              { header: "When", render: (row) => formatDate(row.observedAt) },
              {
                header: "Severity / status",
                render: (row) => `${row.severity} / ${row.status}`,
              },
              {
                header: "Location",
                render: (row) =>
                  row.location
                    ? `${row.location.coordinates[1]}, ${row.location.coordinates[0]}`
                    : "-",
              },
              {
                header: "Evidence",
                render: (row) =>
                  `${row.media.length} file${row.media.length === 1 ? "" : "s"}`,
              },
              {
                header: "Actions",
                render: (row) => (
                  <ResourceRowActions
                    onEdit={() => {
                      setEditing(row);
                      setForm(toForm(row));
                      setShowForm(true);
                    }}
                    onDelete={() => void remove(row)}
                    isDeleting={deleting === row.id}
                  />
                ),
              },
            ]}
          />
          <div className="flex items-center justify-between text-xs text-[var(--color-mist)]">
            <span>{pagination.total} observations</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
                className="rounded border border-white/20 px-3 py-1 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 py-1">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((current) => current + 1)}
                className="rounded border border-white/20 px-3 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
