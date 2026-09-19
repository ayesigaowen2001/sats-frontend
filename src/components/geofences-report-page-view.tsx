"use client";

import {
  ModuleReportPageView,
  type ReportSubjectOption,
} from "@/components/module-report-page-view";
import { geofencesService } from "@/lib/tracking/geofences-service";

async function loadGeofencesForReport(
  orgId: string,
): Promise<ReportSubjectOption[]> {
  const geofences = await geofencesService.listGeofences(orgId);

  return geofences.map((geofence) => ({
    id: geofence.id,
    label: geofence.parkName,
  }));
}

export function GeofencesReportPageView() {
  return (
    <ModuleReportPageView
      module="geofences"
      title="Geofences Report"
      subjectLabel="Geofence"
      loadSubjects={loadGeofencesForReport}
    />
  );
}
