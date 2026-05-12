"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  getDashboardModule,
  getDefaultSidebarItem,
} from "@/lib/dashboard-config";
import "@/lib/session-debug"; // Initialize session debug utilities

interface ModuleLayoutProps {
  children: ReactNode;
}

export function ModuleLayout({ children }: ModuleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isModuleHub = pathname === "/";
  const currentModule = getDashboardModule(pathname);
  const defaultSidebarItem = getDefaultSidebarItem(pathname);

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

  return (
    <div className="flex min-h-screen bg-[var(--color-night)] text-[var(--color-ice)]">
      {isModuleHub ? null : <Sidebar />}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
