"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ForbiddenView } from "@/components/forbidden-view";
import { PageErrorBoundary } from "@/components/page-error-boundary";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  getDashboardModule,
  getDefaultSidebarItem,
} from "@/lib/dashboard-config";
import {
  getSessionData,
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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

    if (!sessionData) {
      setPermissionsReady(true);
      return;
    }

    if (typeof sessionData.permissions !== "undefined") {
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
  }, [hasHydrated, sessionData]);

  useEffect(() => {
    if (isModuleHub) {
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

  if (!hasHydrated || !permissionsReady) {
    return <ResourceFeedback state="loading" resourceName="permissions" />;
  }

  if (!sessionData) {
    return (
      <ResourceFeedback
        title="Access required"
        detail="Sign in to view this workspace."
      />
    );
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
    <div className="flex min-h-screen bg-[var(--color-night)] text-[var(--color-ice)]">
      {isModuleHub ? null : (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar
          showSidebarToggle={!isModuleHub && !isSidebarOpen}
          onSidebarOpen={() => setIsSidebarOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </main>
      </div>
    </div>
  );
}
