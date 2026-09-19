"use client";

import {
  ModuleReportPageView,
  type ReportSubjectOption,
} from "@/components/module-report-page-view";
import { animalsService } from "@/lib/animals/animals-service";

async function loadAnimalsForReport(
  orgId: string,
): Promise<ReportSubjectOption[]> {
  const result = await animalsService.listAnimals(orgId, {
    page: 1,
    per_page: 100,
  });

  return result.items.map((animal) => ({
    id: animal.animalNumber,
    label: animal.commonName
      ? `${animal.animalNumber} — ${animal.commonName}`
      : animal.animalNumber,
  }));
}

export function AnimalsReportPageView() {
  return (
    <ModuleReportPageView
      module="animals"
      title="Animals Report"
      subjectLabel="Animal"
      loadSubjects={loadAnimalsForReport}
    />
  );
}

