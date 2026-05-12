import type { ReactNode } from "react";

import { ModuleLayout } from "@/components/layout/ModuleLayout";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ModuleLayout>{children}</ModuleLayout>;
}
