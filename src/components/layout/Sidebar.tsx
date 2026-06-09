"use client";

import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getDashboardModule,
  getDefaultSidebarItem,
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

  // Read session data only after hydration to avoid mismatch
  useEffect(() => {
    setSessionData(getSessionData());
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    return null;
  }

  const moduleItems: MenuItem[] = currentModule.items
    .filter((item) => item.label.trim().toLowerCase() !== "dashboard")
    .filter((item) => {
      if (!sessionData) {
        return true;
      }

      return canAccessPath(
        item.href,
        sessionData.permissions ?? [],
        Boolean(sessionData.user.is_system_admin),
      );
    })
    .map((item) => {
      const displayLabel =
        !sessionData?.user.is_system_admin &&
        item.href === "/organization/all-organizations"
          ? "My organisation"
          : item.label;

      const isActive =
        pathname === item.href ||
        (pathname === currentModule.href &&
          defaultSidebarItem?.href === item.href);

      return {
        key: item.href,
        label: displayLabel,
        command: () => {
          router.push(item.href);

          if (typeof window !== "undefined" && window.innerWidth < 1024) {
            onClose();
          }
        },
        template: (_, options) => (
          <button
            type="button"
            onClick={options.onClick}
            className={cn(
              "sats-sidebar-menu-item flex items-center gap-3 rounded-[1.3rem] border px-4 py-3 text-left transition-colors",
              isActive
                ? "border-[var(--color-sand)]/40 bg-[var(--color-sand)]/12"
                : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]",
            )}
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
              {displayLabel}
            </span>
          </button>
        ),
      };
    });

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
          "fixed inset-y-0 left-0 z-40 w-[320px] flex-none border-r border-[var(--color-shell-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] transition-transform lg:sticky lg:top-0 lg:z-20 lg:h-screen",
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
                : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/[0.04]",
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

          <Menu model={moduleItems} className="sats-sidebar-menu mt-4" />
        </div>
      </aside>
    </>
  );
}
