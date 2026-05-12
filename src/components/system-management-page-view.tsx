"use client";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { ModulePageShell } from "@/components/module-page-shell";
import { ResourceFeedback } from "@/components/resource-feedback";
import { useSatsResource } from "@/hooks/use-sats-resource";
import { useSatsStore } from "@/store/sats-store";
import { useUIStore } from "@/store/useUIStore";

export function SystemManagementPageView() {
  const systemManagement = useSatsStore((state) => state.systemManagement);
  const isLoading = useSatsStore((state) => state.loading.systemManagement);
  const error = useSatsStore((state) => state.errors.systemManagement);
  const loadSystemManagement = useSatsStore(
    (state) => state.loadSystemManagement,
  );
  const themeMode = useUIStore((state) => state.themeMode);
  const setThemeMode = useUIStore((state) => state.setThemeMode);
  const systemThemeColors = useUIStore((state) => state.systemThemeColors);
  const setSystemThemeColors = useUIStore(
    (state) => state.setSystemThemeColors,
  );

  useSatsResource(systemManagement, isLoading, loadSystemManagement);

  if (error) {
    return (
      <ResourceFeedback title="System settings unavailable" detail={error} />
    );
  }

  if (!systemManagement) {
    return (
      <ResourceFeedback
        title="Loading system management"
        detail="The global platform settings, security policies, and runtime controls are being loaded from SATS services."
      />
    );
  }

  return (
    <ModulePageShell
      hero={systemManagement.hero}
      metrics={systemManagement.metrics}
      generatedAt={systemManagement.generatedAt}
      badges={systemManagement.settings.map((item) => item.category)}
    >
      <DataPanel
        eyebrow="Theming"
        title="Application theme and organization brand colors"
        description="Select the application theme mode. In System mode, administrators define only three brand colors: primary, secondary, and accent."
      >
        <div className="grid gap-4 rounded-[1.25rem] border border-[var(--color-shell-border)] bg-[var(--color-shell)] p-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-ice)]">
              Theme mode
            </span>
            <select
              value={themeMode}
              onChange={(event) =>
                setThemeMode(event.target.value as "light" | "dark" | "system")
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-night)] px-3 py-2 text-[var(--color-ice)] outline-none"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>

          <div className="rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-night-soft)] p-3">
            <p className="text-sm font-semibold text-[var(--color-ice)]">
              Current mode
            </p>
            <p className="mt-1 text-sm text-[var(--color-mist)]">
              {themeMode === "system"
                ? "System theme active with organization colors"
                : `${themeMode[0].toUpperCase()}${themeMode.slice(1)} theme active`}
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-ice)]">
              Primary color
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={systemThemeColors.primary}
                onChange={(event) =>
                  setSystemThemeColors({
                    ...systemThemeColors,
                    primary: event.target.value,
                  })
                }
                className="h-10 w-14 cursor-pointer rounded border border-[var(--color-shell-border)] bg-transparent"
              />
              <input
                type="text"
                value={systemThemeColors.primary}
                onChange={(event) =>
                  setSystemThemeColors({
                    ...systemThemeColors,
                    primary: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-night)] px-3 py-2 text-[var(--color-ice)] outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-ice)]">
              Secondary color
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={systemThemeColors.secondary}
                onChange={(event) =>
                  setSystemThemeColors({
                    ...systemThemeColors,
                    secondary: event.target.value,
                  })
                }
                className="h-10 w-14 cursor-pointer rounded border border-[var(--color-shell-border)] bg-transparent"
              />
              <input
                type="text"
                value={systemThemeColors.secondary}
                onChange={(event) =>
                  setSystemThemeColors({
                    ...systemThemeColors,
                    secondary: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-night)] px-3 py-2 text-[var(--color-ice)] outline-none"
              />
            </div>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-semibold text-[var(--color-ice)]">
              Accent color
            </span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={systemThemeColors.accent}
                onChange={(event) =>
                  setSystemThemeColors({
                    ...systemThemeColors,
                    accent: event.target.value,
                  })
                }
                className="h-10 w-14 cursor-pointer rounded border border-[var(--color-shell-border)] bg-transparent"
              />
              <input
                type="text"
                value={systemThemeColors.accent}
                onChange={(event) =>
                  setSystemThemeColors({
                    ...systemThemeColors,
                    accent: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--color-shell-border)] bg-[var(--color-night)] px-3 py-2 text-[var(--color-ice)] outline-none"
              />
            </div>
          </label>
        </div>
      </DataPanel>

      <DataPanel
        eyebrow="Configuration"
        title="Platform-level settings that shape runtime behavior"
      >
        <DataTable
          rows={systemManagement.settings}
          columns={[
            { header: "Category", render: (row) => row.category },
            { header: "Name", render: (row) => row.name },
            { header: "Value", render: (row) => row.value },
            { header: "Scope", render: (row) => row.scope },
            {
              header: "Updated",
              render: (row) => new Date(row.lastUpdatedAt).toLocaleString(),
            },
          ]}
        />
      </DataPanel>

      <DataPanel
        eyebrow="Security"
        title="Enforcement policies and governance controls"
      >
        <DataTable
          rows={systemManagement.policies}
          columns={[
            { header: "Policy", render: (row) => row.policyName },
            { header: "Status", render: (row) => row.status },
            {
              header: "Enforcement",
              render: (row) => row.enforcementLevel,
            },
            {
              header: "Updated",
              render: (row) => new Date(row.lastUpdatedAt).toLocaleString(),
            },
          ]}
        />
      </DataPanel>
    </ModulePageShell>
  );
}
