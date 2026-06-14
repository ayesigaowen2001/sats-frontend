"use client";

import { useOrganization } from "@/hooks/useOrganization";

export function OrganizationSwitcher() {
  const organizations = useOrganization((state) => state.organizations);
  const activeOrganizationId = useOrganization(
    (state) => state.activeOrganizationId,
  );
  const setActiveOrganizationId = useOrganization(
    (state) => state.setActiveOrganizationId,
  );

  return (
    <label className="flex items-center gap-3 rounded-full border border-[var(--color-shell-border)] bg-[var(--color-shell)] px-4 py-2 text-sm text-[var(--color-mist)]">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-fog)]">
        Org
      </span>
      <select
        value={activeOrganizationId}
        onChange={(event) => setActiveOrganizationId(event.target.value)}
        className="bg-transparent text-sm font-medium text-[var(--color-ice)] outline-none"
      >
        {organizations.map((organization) => (
          <option
            key={organization.id}
            value={organization.id}
            className="bg-slate-900 text-white"
          >
            {organization.name}
          </option>
        ))}
      </select>
    </label>
  );
}
