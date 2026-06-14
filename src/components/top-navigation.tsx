"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import {
  getNavigationItem,
  getVisibleNavigationItems,
  navigationGroups,
  userTierLabels,
} from "@/lib/navigation";
import { getSessionData, type SessionData } from "@/lib/auth-tokens";
import { canAccessPath } from "@/lib/rbac";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { useSatsStore } from "@/store/sats-store";

interface TopNavigationProps {
  children: ReactNode;
}

function getModuleInitials(label: string) {
  return label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TopNavigation({ children }: TopNavigationProps) {
  const pathname = usePathname();
  const currentTier = useSatsStore((state) => state.currentTier);
  const currentOrganizationId = useSatsStore(
    (state) => state.currentOrganizationId,
  );
  const organizationOptions = useSatsStore(
    (state) => state.organizationOptions,
  );
  const setCurrentTier = useSatsStore((state) => state.setCurrentTier);
  const setCurrentOrganizationId = useSatsStore(
    (state) => state.setCurrentOrganizationId,
  );
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const currentPage = getNavigationItem(pathname);
  const currentGroup = navigationGroups.find(
    (group) => group.key === currentPage.group,
  );
  const currentDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  const userContext = {
    fullName: "Amina Njoroge",
    tier: currentTier,
    organization:
      organizationOptions.find((item) => item.id === currentOrganizationId)
        ?.name ?? "SATS Platform Authority",
  };
  useEffect(() => {
    setSessionData(getSessionData());
    setHasHydrated(true);
  }, []);

  const visibleNavigation = getVisibleNavigationItems(currentTier).filter(
    (item) => {
      if (!hasHydrated || !sessionData) {
        return true;
      }

      return canAccessPath(
        item.href,
        sessionData.permissions ?? [],
        Boolean(sessionData.user.is_system_admin),
      );
    },
  );
  const groupedNavigation = navigationGroups.map((group) => ({
    ...group,
    items: visibleNavigation.filter((item) => item.group === group.key),
  }));
  const selectableOrganizations = organizationOptions.filter((item) =>
    currentTier === "system-administrator" ? true : item.scope === "Tenant",
  );

  return (
    <div className="flex min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(255,255,255,0))]">
      <aside className="hidden w-[332px] flex-none border-r border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] lg:flex lg:h-screen lg:sticky lg:top-0">
        <div className="flex h-full w-full flex-col gap-6 px-6 py-7">
          <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[var(--color-sand)]">
              SATS Platform
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Multi-Organization System
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--color-mist)]">
              ERP-style application shell for wildlife operations, tenant
              governance, and system administration.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-fog)]">
                  Active date
                </p>
                <p className="mt-2 font-medium text-white">{currentDate}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-fog)]">
                  User tier
                </p>
                <p className="mt-2 font-medium text-emerald-100">
                  {userTierLabels[userContext.tier]}
                </p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            {groupedNavigation.map((group) => (
              <section key={group.key}>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-fog)]">
                  {group.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-mist)]">
                  {group.description}
                </p>
                <nav className="mt-3 flex flex-col gap-2">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group rounded-[1.4rem] border px-4 py-4 transition-colors ${
                          isActive
                            ? "border-[var(--color-sand)]/35 bg-[linear-gradient(135deg,rgba(226,189,121,0.18),rgba(255,255,255,0.06))]"
                            : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-10 w-10 flex-none items-center justify-center rounded-2xl border text-[11px] font-semibold uppercase ${
                              isActive
                                ? "border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 text-white"
                                : "border-white/10 bg-black/20 text-[var(--color-mist)]"
                            }`}
                          >
                            {getModuleInitials(item.label)}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-white">
                              {item.label}
                            </span>
                            <span className="mt-1 block text-sm leading-6 text-[var(--color-mist)]">
                              {item.description}
                            </span>
                            <span className="mt-2 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em]">
                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[var(--color-mist)]">
                                {item.scope}
                              </span>
                              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[var(--color-mist)]">
                                {item.status}
                              </span>
                            </span>
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </section>
            ))}
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-fog)]">
              Active context
            </p>
            <p className="mt-3 text-base font-semibold text-white">
              {userContext.organization}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-mist)]">
              Signed in as {userContext.fullName}. The shell separates platform
              governance, tenant administration, and operational execution.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(4,16,24,0.82)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6 xl:px-7">
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {visibleNavigation.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "border-[var(--color-sand)]/40 bg-[var(--color-sand)]/14 text-white"
                        : "border-white/10 bg-white/[0.05] text-[var(--color-mist)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-sand)]">
                  Operations bar
                </p>
                <h2 className="mt-2 truncate text-2xl font-semibold text-white">
                  {currentPage.workspaceTitle}
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--color-mist)]">
                  {currentPage.workspaceSubtitle}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:justify-end">
                <label className="flex min-w-[280px] items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-[var(--color-mist)]">
                  <span className="text-[var(--color-fog)]">Search</span>
                  <input
                    type="search"
                    placeholder="apps, animals, users, devices, organizations"
                    className="w-full bg-transparent text-white outline-none placeholder:text-[var(--color-fog)]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[var(--color-mist)] transition-colors hover:border-white/20 hover:text-white">
                    <span className="mr-2">Role</span>
                    <select
                      value={currentTier}
                      onChange={(event) =>
                        setCurrentTier(event.target.value as typeof currentTier)
                      }
                      className="bg-transparent text-white outline-none"
                    >
                      {Object.entries(userTierLabels).map(([value, label]) => (
                        <option
                          key={value}
                          value={value}
                          className="bg-slate-900 text-white"
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[var(--color-mist)] transition-colors hover:border-white/20 hover:text-white">
                    <span className="mr-2">Org</span>
                    <select
                      value={currentOrganizationId}
                      onChange={(event) =>
                        setCurrentOrganizationId(event.target.value)
                      }
                      className="bg-transparent text-white outline-none"
                    >
                      {selectableOrganizations.map((organization) => (
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
                  <button className="rounded-full border border-[var(--color-sand)]/35 bg-[var(--color-sand)]/15 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[var(--color-sand)]/22">
                    New Record
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                {currentPage.status}
              </span>
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                {currentPage.scope}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-mist)]">
                {currentPage.tiers
                  .map((tier) => userTierLabels[tier])
                  .join(" • ")}
              </span>
            </div>
          </div>
        </header>

        <div className="min-w-0 flex-1 overflow-x-hidden">
          <div className="h-full px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            <div className="min-h-full rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
              <div className="border-b border-white/8 px-4 py-3 sm:px-5 lg:px-6">
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-mist)]">
                  <span className="font-medium text-white">Workspace</span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1">
                    {currentPage.label}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1">
                    {currentGroup?.label ?? "Application Modules"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1">
                    {userContext.organization}
                  </span>
                </div>
              </div>
              <PageErrorBoundary>{children}</PageErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
