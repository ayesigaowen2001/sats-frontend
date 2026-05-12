"use client";

import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { fetchOrganizationById } from "@/lib/api/sats-client";
import { useSatsStore } from "@/store/sats-store";
import type { OrganizationRecord } from "@/types/sats-api";

export function OrganizationsPageView() {
  const organizations = useSatsStore((state) => state.organizations);
  const isLoading = useSatsStore((state) => state.loading.organizations);
  const error = useSatsStore((state) => state.errors.organizations);
  const loadOrganizations = useSatsStore((state) => state.loadOrganizations);

  const [orgIdInput, setOrgIdInput] = useState("");
  const [filteredOrg, setFilteredOrg] = useState<OrganizationRecord | null>(
    null,
  );
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  async function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    const id = orgIdInput.trim();
    if (!id) return;
    setFilterLoading(true);
    setFilterError(null);
    setFilteredOrg(null);
    try {
      const org = await fetchOrganizationById(id);
      setFilteredOrg(org);
    } catch (err) {
      setFilterError(
        err instanceof Error ? err.message : "Organisation not found.",
      );
    } finally {
      setFilterLoading(false);
    }
  }

  function handleClear() {
    setOrgIdInput("");
    setFilteredOrg(null);
    setFilterError(null);
  }

  useSatsResource(organizations, isLoading, loadOrganizations);

  if (error) {
    return (
      <ResourceFeedback title="Organization data unavailable" detail={error} />
    );
  }

  if (!organizations) {
    return (
      <ResourceFeedback
        title="Loading organization operations"
        detail="The organization management route is hydrating subscriptions, tenant summaries, and local nodes from SATS services."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      {/* Organisation ID filter */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Look up organisation by ID
        </h2>
        <form onSubmit={handleFilter} className="flex items-center gap-3">
          <input
            type="text"
            value={orgIdInput}
            onChange={(e) => setOrgIdInput(e.target.value)}
            placeholder="Enter organisation UUID…"
            className="flex-1 rounded border border-[var(--color-mist)] bg-transparent px-3 py-2 text-sm text-white placeholder-[var(--color-mist)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ice)]"
          />
          <button
            type="submit"
            disabled={filterLoading || !orgIdInput.trim()}
            className="rounded bg-[var(--color-ice)] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {filterLoading ? "Searching…" : "Search"}
          </button>
          {(filteredOrg || filterError) && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded border border-[var(--color-mist)] px-4 py-2 text-sm text-[var(--color-mist)] hover:text-white"
            >
              Clear
            </button>
          )}
        </form>

        {filterError && <p className="text-sm text-red-400">{filterError}</p>}

        {filteredOrg && (
          <DataTable
            rows={[filteredOrg]}
            columns={[
              {
                header: "Organisation",
                render: (row) => (
                  <div>
                    <strong className="block text-white">
                      {row.organizationName}
                    </strong>
                    <span className="text-[var(--color-mist)]">
                      {row.domain}
                    </span>
                  </div>
                ),
              },
              { header: "Location", render: (row) => row.location },
              {
                header: "Subscription",
                render: (row) => row.subscriptionStatus,
              },
              {
                header: "Scale",
                render: (row) =>
                  `${row.activeAnimals} animals • ${row.activeDevices} devices`,
              },
              { header: "Contact", render: (row) => row.contactPerson },
            ]}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Tenant registry with scale and operational ownership
        </h2>
        <DataTable
          rows={organizations.organizations}
          columns={[
            {
              header: "Organization",
              render: (row) => (
                <div>
                  <strong className="block text-white">
                    {row.organizationName}
                  </strong>
                  <span className="text-[var(--color-mist)]">{row.domain}</span>
                </div>
              ),
            },
            { header: "Location", render: (row) => row.location },
            {
              header: "Subscription",
              render: (row) => row.subscriptionStatus,
            },
            {
              header: "Scale",
              render: (row) =>
                `${row.activeAnimals} animals • ${row.activeDevices} devices`,
            },
            {
              header: "Contact",
              render: (row) => row.contactPerson,
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Plan posture, AI level, and retention policy
        </h2>
        <DataTable
          rows={organizations.subscriptions}
          columns={[
            { header: "Organization", render: (row) => row.organizationName },
            { header: "Plan", render: (row) => row.planName },
            { header: "AI level", render: (row) => row.aiLevel },
            {
              header: "Video",
              render: (row) => (row.videoEnabled ? "Enabled" : "Disabled"),
            },
            {
              header: "Retention",
              render: (row) => `${row.retentionMonths} months`,
            },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Control room and edge node visibility
        </h2>
        <DataTable
          rows={organizations.nodes}
          columns={[
            { header: "Organization", render: (row) => row.organizationName },
            { header: "Node", render: (row) => row.nodeName },
            { header: "Status", render: (row) => row.status },
            {
              header: "Software",
              render: (row) => row.softwareVersion,
            },
            {
              header: "Last seen",
              render: (row) => new Date(row.lastSeenAt).toLocaleString(),
            },
          ]}
        />
      </section>
    </main>
  );
}
