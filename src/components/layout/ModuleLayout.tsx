"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ForbiddenView } from "@/components/forbidden-view";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { PageLoader } from "@/components/common/page-loader";
import {
  getDashboardModule,
  getDefaultSidebarItem,
} from "@/lib/dashboard-config";
import {
  getAccessToken,
  getSessionData,
  isTokenExpired,
  setSessionPermissions,
  type SessionData,
} from "@/lib/auth-tokens";
import { canAccessPath } from "@/lib/rbac";
import { roleService } from "@/lib/users/role-service";
import "@/lib/session-debug"; // Initialize session debug utilities

interface ModuleLayoutProps {
  children: ReactNode;
}

export function ModuleLayout({ children }: ModuleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const isModuleHub = pathname === "/" || pathname === "/apps";
  const currentModule = getDashboardModule(pathname);
  const defaultSidebarItem = getDefaultSidebarItem(pathname);
  const hasValidAuthentication = Boolean(
    sessionData?.accessToken?.trim() &&
    getAccessToken().trim() &&
    !isTokenExpired(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // Session data is browser-only and must be loaded after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionData(getSessionData());
    setHasHydrated(true);

    if (window.matchMedia("(min-width: 1024px)").matches) {
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!hasValidAuthentication || !sessionData) {
      const nextPath = pathname || "/";
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (typeof sessionData.permissions !== "undefined") {
      // Permissions are already hydrated in the stored session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermissionsReady(true);
      return;
    }

    let isActive = true;

    void (async () => {
      try {
        const permissions = await roleService.getMyPermissions();

        if (!isActive) {
          return;
        }

        setSessionPermissions(permissions);
        setSessionData(getSessionData());
      } catch (error) {
        console.warn("Failed to load stored permissions:", error);
      } finally {
        if (isActive) {
          setPermissionsReady(true);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [hasHydrated, hasValidAuthentication, pathname, router, sessionData]);

  useEffect(() => {
    if (isModuleHub) {
      // Keep the hub closed when switching away from module navigation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSidebarOpen(false);
    }
  }, [isModuleHub]);

  useEffect(() => {
    if (isModuleHub) {
      return;
    }

    if (!defaultSidebarItem) {
      return;
    }

    if (
      pathname === currentModule.href &&
      defaultSidebarItem.href !== pathname
    ) {
      router.replace(defaultSidebarItem.href);
    }
  }, [currentModule.href, defaultSidebarItem, isModuleHub, pathname, router]);

  if (!hasHydrated || !hasValidAuthentication || !permissionsReady) {
    return <PageLoader />;
  }

  if (!sessionData) {
    return <PageLoader />;
  }

  if (
    !canAccessPath(
      pathname,
      sessionData.permissions ?? [],
      Boolean(sessionData.user.is_system_admin),
    )
  ) {
    return (
      <div className="flex min-h-screen bg-[var(--color-night)] text-[var(--color-ice)]">
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Topbar
            showSidebarToggle={false}
            onSidebarOpen={() => setIsSidebarOpen(true)}
          />
          <ForbiddenView />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-night)] text-[var(--color-ice)]">
      <div className="flex min-h-0 flex-1">
        {isModuleHub ? null : (
          <Sidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Topbar
            showSidebarToggle={!isModuleHub && !isSidebarOpen}
            onSidebarOpen={() => setIsSidebarOpen(true)}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
            <PageErrorBoundary>{children}</PageErrorBoundary>
          </main>
        </div>
      </div>
      <footer className="border-t border-[var(--color-shell-border)] px-4 py-4 text-center text-xs text-[var(--color-fog)] sm:px-6">
        Copyright SATS @2025
      </footer>
    </div>
  );
}
