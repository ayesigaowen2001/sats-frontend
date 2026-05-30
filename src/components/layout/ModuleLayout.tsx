"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isModuleHub = pathname === "/" || pathname === "/apps";
  const currentModule = getDashboardModule(pathname);
  const defaultSidebarItem = getDefaultSidebarItem(pathname);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.matchMedia("(min-width: 1024px)").matches) {
      setIsSidebarOpen(true);
    }
  }, []);

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
          {children}
        </main>
      </div>
    </div>
  );
}
