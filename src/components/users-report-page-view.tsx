"use client";

import {
  ModuleReportPageView,
  type ReportSubjectOption,
} from "@/components/module-report-page-view";
import { userService } from "@/lib/users/user-service";

async function loadUsersForReport(orgId: string): Promise<ReportSubjectOption[]> {
  // List users without an organisation query filter (the backend scopes by the
  // session's organisation header), then filter locally by organisation so the
  // selector is populated for whatever org is currently selected.
  const result = await userService.listUsers(1, 500);

  return result.items
    .filter((user) => user.organizationId === orgId)
    .map((user) => ({
      id: user.id,
      label: user.name || user.email,
    }));
}

export function UsersReportPageView() {
  return (
    <ModuleReportPageView
      module="users"
      title="Users Report"
      subjectLabel="User"
      loadSubjects={loadUsersForReport}
    />
  );
}
