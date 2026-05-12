"use client";

import { Menu } from "primereact/menu";
import type { MenuItem } from "primereact/menuitem";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getDashboardModule,
  getDefaultSidebarItem,
} from "@/lib/dashboard-config";
import { getSessionData } from "@/lib/auth-tokens";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const currentModule = getDashboardModule(pathname);
  const defaultSidebarItem = getDefaultSidebarItem(pathname);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Read session data only after hydration to avoid mismatch
  useEffect(() => {
    setIsSystemAdmin(Boolean(getSessionData()?.user.is_system_admin));
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) {
    // Return empty sidebar placeholder during hydration
    return (
      <aside className="hidden w-[320px] flex-none border-r border-[var(--color-shell-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] lg:flex lg:h-screen lg:sticky lg:top-0">
        <div className="h-full w-full px-6 py-6">
          <h1 className="text-lg font-semibold text-[var(--color-ice)]">
            {currentModule.label}
          </h1>
        </div>
      </aside>
    );
  }

  const moduleItems: MenuItem[] = currentModule.items
    .filter((item) => item.label.trim().toLowerCase() !== "dashboard")
    .map((item) => {
      const displayLabel =
        !isSystemAdmin && item.href === "/organization/all-organizations"
          ? "My organisation"
          : item.label;

      const isActive =
        pathname === item.href ||
        (pathname === currentModule.href &&
          defaultSidebarItem?.href === item.href);

      return {
        key: item.href,
        label: displayLabel,
        command: () => router.push(item.href),
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
    <aside className="hidden w-[320px] flex-none border-r border-[var(--color-shell-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] lg:flex lg:h-screen lg:sticky lg:top-0">
      <div className="h-full w-full px-6 py-6">
        <h1 className="text-lg font-semibold text-[var(--color-ice)]">
          {currentModule.label}
        </h1>
        <Menu model={moduleItems} className="sats-sidebar-menu mt-4" />
      </div>
    </aside>
  );
}
