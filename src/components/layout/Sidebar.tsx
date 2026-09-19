"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getDashboardModule,
  getDefaultSidebarItem,
  type DashboardNavItem,
} from "@/lib/dashboard-config";
import { getSessionData, type SessionData } from "@/lib/auth-tokens";
import { canAccessPath } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAppsActive = pathname === "/apps" || pathname === "/";
  const currentModule = getDashboardModule(pathname);
  const defaultSidebarItem = getDefaultSidebarItem(pathname);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  // Read session data only after hydration to avoid mismatch
  useEffect(() => {
    // Session data is browser-only and must be loaded after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionData(getSessionData());
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return null;
  }

  const canAccess = (href: string) => {
    if (!sessionData) {
      return true;
    }

    return canAccessPath(
      href,
      sessionData.permissions ?? [],
      Boolean(sessionData.user.is_system_admin),
    );
  };

  const displayLabelFor = (item: DashboardNavItem) =>
    !sessionData?.user.is_system_admin &&
    item.href === "/organization/all-organizations"
      ? "My organisation"
      : item.label;

  const isItemActive = (href: string) =>
    pathname === href ||
    (pathname === currentModule.href && defaultSidebarItem?.href === href);

  const navigateTo = (href: string) => {
    router.push(href);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      onClose();
    }
  };

  const isGroupExpanded = (item: DashboardNavItem) => {
    const hasActiveChild =
      item.children?.some((child) => isItemActive(child.href)) ?? false;

    return expandedGroups[item.href] ?? hasActiveChild;
  };

  const toggleGroup = (item: DashboardNavItem) => {
    const next = !isGroupExpanded(item);
    setExpandedGroups((current) => ({ ...current, [item.href]: next }));
  };

  const navButtonClass = (isActive: boolean) =>
    cn(
      "sats-sidebar-menu-item flex w-full items-center gap-3 rounded-[1.3rem] border px-4 py-3 text-left transition-colors",
      isActive
        ? "border-[var(--color-sand)]/40 bg-[var(--color-sand)]/12"
        : "border-white/[0.06] bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.08]",
    );

  const visibleItems = currentModule.items
    .filter((item) => item.label.trim().toLowerCase() !== "dashboard")
    .map((item) => {
      if (item.children?.length) {
        const children = item.children.filter((child) => canAccess(child.href));
        return children.length ? { ...item, children } : null;
      }

      return canAccess(item.href) ? item : null;
    })
    .filter((item): item is DashboardNavItem => item !== null);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-black/60 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Close sidebar"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[320px] flex-none border-r border-[var(--color-shell-border)] bg-[var(--color-night-soft)] shadow-[18px_0_48px_rgba(0,0,0,0.35)] transition-transform lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] lg:shadow-none print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full lg:hidden",
        )}
      >
        <div className="relative h-full w-full px-6 py-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-shell-border)] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-shell-strong)]"
            aria-label="Hide sidebar"
          >
            <span className="pi pi-bars text-sm" aria-hidden="true" />
          </button>

          <div className="flex items-center pr-12">
            <h1 className="text-lg font-semibold text-[var(--color-ice)]">
              {currentModule.label}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => {
              router.push("/apps");

              if (typeof window !== "undefined" && window.innerWidth < 1024) {
                onClose();
              }
            }}
            className={cn(
              "mt-4 flex w-full items-center gap-3 rounded-[1.3rem] border px-4 py-3 text-left transition-colors",
              isAppsActive
                ? "border-[var(--color-sand)]/40 bg-[var(--color-sand)]/12"
                : "border-white/[0.06] bg-white/[0.025] hover:border-white/10 hover:bg-white/[0.08]",
            )}
            aria-current={isAppsActive ? "page" : undefined}
          >
            <span
              className={cn(
                "pi text-sm",
                isAppsActive
                  ? "pi-th-large text-[var(--color-sand)]"
                  : "pi-th-large text-[var(--color-fog)]",
              )}
              aria-hidden="true"
            />
            <span className="block text-sm font-semibold text-[var(--color-ice)]">
              Apps
            </span>
          </button>

          <nav className="mt-4 flex flex-col gap-2">
            {visibleItems.map((item) => {
              if (item.children?.length) {
                const isExpanded = isGroupExpanded(item);
                const isGroupActive = item.children.some((child) =>
                  isItemActive(child.href),
                );

                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(item)}
                      className={navButtonClass(isGroupActive)}
                      aria-expanded={isExpanded}
                    >
                      <span
                        className={cn(
                          "pi text-sm",
                          isGroupActive
                            ? "text-[var(--color-sand)]"
                            : "text-[var(--color-fog)]",
                          isExpanded ? "pi-chevron-down" : "pi-chevron-right",
                        )}
                        aria-hidden="true"
                      />
                      <span className="block flex-1 text-sm font-semibold text-[var(--color-ice)]">
                        {item.label}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="mt-2 flex flex-col gap-2 border-l border-white/[0.08] pl-4">
                        {item.children.map((child) => {
                          const isActive = isItemActive(child.href);

                          return (
                            <button
                              key={child.href}
                              type="button"
                              onClick={() => navigateTo(child.href)}
                              className={navButtonClass(isActive)}
                              aria-current={isActive ? "page" : undefined}
                            >
                              <span
                                className={cn(
                                  "pi text-sm",
                                  isActive
                                    ? "pi-chevron-right text-[var(--color-sand)]"
                                    : "pi-angle-right text-[var(--color-fog)]",
                                )}
                                aria-hidden="true"
                              />
                              <span className="block text-sm font-semibold text-[var(--color-ice)]">
                                {child.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }

              const isActive = isItemActive(item.href);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigateTo(item.href)}
                  className={navButtonClass(isActive)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "pi text-sm",
                      isActive
                        ? "pi-chevron-right text-[var(--color-sand)]"
                        : "pi-angle-right text-[var(--color-fog)]",
                    )}
                    aria-hidden="true"
                  />
                  <span className="block text-sm font-semibold text-[var(--color-ice)]">
                    {displayLabelFor(item)}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
