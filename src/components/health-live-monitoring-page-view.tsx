"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import {
  healthLogsService,
  type HealthLogFilters,
  type HealthLogRecord,
} from "@/lib/health/health-logs-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";

interface OrganizationOption {
  id: string;
  name: string;
}

interface HealthLogsFilterValues {
  organization_id: string;
  animal_number: string;
  device_number: string;
  from_ts: string;
  to_ts: string;
  page: string;
}

interface HealthLogPagination {
  total: number;
  pages: number;
  page: number;
  perPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

const defaultFilters: HealthLogsFilterValues = {
  organization_id: "",
  animal_number: "",
  device_number: "",
  from_ts: "",
  to_ts: "",
  page: "1",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function toIsoTimestamp(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function normalizeFilterValues(
  values: HealthLogsFilterValues,
): HealthLogsFilterValues {
  return {
    organization_id: values.organization_id.trim(),
    animal_number: values.animal_number.trim(),
    device_number: values.device_number.trim(),
    from_ts: values.from_ts,
    to_ts: values.to_ts,
    page: String(Math.max(1, Number(values.page) || 1)),
  };
}

function numericDisplay(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : value;
}

export function HealthLiveMonitoringPageView(): React.JSX.Element {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  const [filters, setFilters] =
    useState<HealthLogsFilterValues>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<HealthLogsFilterValues>(defaultFilters);

  const [rows, setRows] = useState<HealthLogRecord[]>([]);
  const [pagination, setPagination] = useState<HealthLogPagination | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const result = await organizationCrudService.listOrganizations();

      if (!isMounted) {
        return;
      }

      if (result && Array.isArray(result)) {
        setOrganizations(
          result.map((org) => ({
            id: org.id,
            name: org.organization_name,
          })),
        );
      } else {
        setOrganizations([]);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadHealthLogs = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const requestFilters: HealthLogFilters = {
      organization_id: appliedFilters.organization_id || undefined,
      animal_number: appliedFilters.animal_number || undefined,
      device_number: appliedFilters.device_number || undefined,
      from_ts: toIsoTimestamp(appliedFilters.from_ts),
      to_ts: toIsoTimestamp(appliedFilters.to_ts),
      page: Number(appliedFilters.page),
      per_page: 50,
    };

    try {
      const response = await healthLogsService.listHealthLogs(requestFilters);

      setRows(response.items);
      setPagination(response.pagination);
      setSuccessMessage(response.message);
    } catch (requestError) {
      setRows([]);
      setPagination(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load health logs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadHealthLogs();
  }, [loadHealthLogs]);

  const applyFilters = (nextFilters: HealthLogsFilterValues) => {
    const normalized = normalizeFilterValues(nextFilters);

    setFilters(normalized);
    setAppliedFilters(normalized);
    setError("");
  };

  const handleSubmitFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    applyFilters({
      ...filters,
      page: "1",
    });
  };

  const handleResetFilters = () => {
    setSuccessMessage("");
    applyFilters(defaultFilters);
  };

  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.pages ?? 1;

  const pageSummary = useMemo(() => {
    if (!pagination) {
      return "No records loaded";
    }

    return `Page ${pagination.page} of ${pagination.pages} (${pagination.total} records)`;
  }, [pagination]);

  return (
    <main className="flex w-full flex-1 flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <form
          onSubmit={handleSubmitFilters}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex-1 min-w-[14rem] max-w-[20rem]">
            <span className="text-xs font-medium text-[var(--color-ice)]">
              Animal number
            </span>
            <input
              value={filters.animal_number}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  animal_number: event.target.value,
                  page: "1",
                }))
              }
              placeholder="e.g. ANM-00001"
              className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none placeholder:text-white/30"
            />
          </label>

          <label className="flex-1 min-w-[14rem] max-w-[20rem]">
            <span className="text-xs font-medium text-[var(--color-ice)]">
              Device number
            </span>
            <input
              value={filters.device_number}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  device_number: event.target.value,
                  page: "1",
                }))
              }
              placeholder="e.g. DEV-00001"
              className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none placeholder:text-white/30"
            />
          </label>

          <label className="min-w-[12rem] flex-1 max-w-[16rem]">
            <span className="text-xs font-medium text-[var(--color-ice)]">
              From
            </span>
            <input
              type="datetime-local"
              value={filters.from_ts}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from_ts: event.target.value,
                  page: "1",
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none"
            />
          </label>

          <label className="min-w-[12rem] flex-1 max-w-[16rem]">
            <span className="text-xs font-medium text-[var(--color-ice)]">
              To
            </span>
            <input
              type="datetime-local"
              value={filters.to_ts}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  to_ts: event.target.value,
                  page: "1",
                }))
              }
              className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="rounded-lg border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Loading..." : "Apply"}
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-lg border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)]"
          >
            Reset
          </button>

          <span className="text-xs text-[var(--color-mist)] whitespace-nowrap">
            {pageSummary}
          </span>
        </form>
      </div>

      {error ? (
        <p className="rounded-[1rem] border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!error && successMessage ? (
        <p className="rounded-[1rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </p>
      ) : null}

      <DataPanel
        eyebrow="Live health monitoring"
        title="Health logs stream"
        description="Monitor incoming biometric logs. System admins can view all logs, while organization users see only animals in their organization according to server permissions."
      >
        <DataTable
          rows={rows}
          horizontalScroll
          columns={[
            {
              header: "Timestamp",
              render: (row) => formatDateTime(row.timestamp),
            },
            { header: "Animal", render: (row) => row.animalNumber },
            { header: "Device", render: (row) => row.deviceNumber },
            {
              header: "Heart rate (bpm)",
              render: (row) => numericDisplay(row.heartRateBpm),
            },
            {
              header: "Temp (C)",
              render: (row) => numericDisplay(row.bodyTemperatureC),
            },
            {
              header: "SpO2",
              render: (row) => numericDisplay(row.oxygenLevelSpo2),
            },
            {
              header: "Activity",
              render: (row) => numericDisplay(row.activityLevel),
            },
            {
              header: "Created",
              render: (row) => formatDateTime(row.createdAt),
            },
          ]}
        />
      </DataPanel>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          disabled={isLoading || !pagination?.hasPrev || currentPage <= 1}
          onClick={() =>
            applyFilters({
              ...filters,
              page: String(Math.max(1, currentPage - 1)),
            })
          }
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Previous
        </button>

        <span className="text-sm text-[var(--color-mist)]">
          Page {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          disabled={
            isLoading || !pagination?.hasNext || currentPage >= totalPages
          }
          onClick={() =>
            applyFilters({
              ...filters,
              page: String(currentPage + 1),
            })
          }
          className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </main>
  );
}
