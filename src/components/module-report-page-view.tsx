"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ResourceFeedback } from "@/components/resource-feedback";
import {
  ReportDocument,
  type ReportOrganizationContact,
} from "@/components/report-document";
import { getSessionData } from "@/lib/auth-tokens";
import { organizationBrandingService } from "@/lib/organizations/organization-branding-service";
import {
  organizationCrudService,
  type Organization,
} from "@/lib/organizations/organization-crud";
import { moduleReportsService } from "@/lib/reports/module-reports-service";
import type { ModuleReport } from "@/types/report";

export interface ReportSubjectOption {
  id: string;
  label: string;
}

interface ModuleReportPageViewProps {
  /** The report endpoint segment, e.g. "animals". */
  module: string;
  /** Human readable title shown in the toolbar. */
  title: string;
  /** Optional label for a per-subject selector (e.g. "User"). */
  subjectLabel?: string;
  /** Optional loader returning the subjects available for an organisation. */
  loadSubjects?: (orgId: string) => Promise<ReportSubjectOption[]>;
}

function toIsoDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);
  dateFrom.setUTCDate(dateFrom.getUTCDate() - 30);

  return { dateFrom: toIsoDate(dateFrom), dateTo: toIsoDate(dateTo) };
}

function toOrganizationContact(
  organization: Organization,
): ReportOrganizationContact {
  return {
    name: organization.organization_name,
    contactPerson: organization.contact_person,
    email: organization.email,
    phone: organization.phone,
    domain: organization.domain,
    location: organization.location,
    country: organization.country,
  };
}

export function ModuleReportPageView({
  module,
  title,
  subjectLabel,
  loadSubjects,
}: ModuleReportPageViewProps) {
  const sessionData = getSessionData();
  const isSystemAdmin = Boolean(sessionData?.user.is_system_admin);
  const ownOrgId = sessionData?.user.organization_id ?? "";

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultDateRange().dateFrom);
  const [dateTo, setDateTo] = useState(defaultDateRange().dateTo);
  const [report, setReport] = useState<ModuleReport | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<ReportSubjectOption[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");

  // Keep the latest subject loader without adding it as an effect dependency.
  const loadSubjectsRef = useRef(loadSubjects);

  useEffect(() => {
    loadSubjectsRef.current = loadSubjects;
  });

  // Load the list of organisations the current user can report against.
  useEffect(() => {
    let mounted = true;

    organizationCrudService
      .listOrganizations()
      .then((items) => {
        if (!mounted) {
          return;
        }

        setOrganizations(items);

        const defaultId = isSystemAdmin
          ? ownOrgId || items[0]?.id || ""
          : ownOrgId;

        setSelectedOrgId(defaultId);
        setSubjects([]);
        setSubjectId("");
      })
      .catch((requestError) => {
        if (mounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load organisations",
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [isSystemAdmin, ownOrgId]);

  // Load optional subjects (e.g. users) for the selected organisation.
  useEffect(() => {
    if (!selectedOrgId || !loadSubjectsRef.current) {
      return;
    }

    let mounted = true;

    loadSubjectsRef.current?.(selectedOrgId)
      .then((items) => {
        if (mounted) {
          setSubjects(items);
          setSubjectId("");
        }
      })
      .catch((requestError) => {
        console.warn("Failed to load report subjects:", requestError);

        if (mounted) {
          setSubjects([]);
          setSubjectId("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedOrgId]);

  // Fetch the report and organisation logo whenever the selection changes.
  useEffect(() => {
    if (!selectedOrgId) {
      return;
    }

    let mounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError("");

    moduleReportsService
      .getModuleReport(
        selectedOrgId,
        module,
        { dateFrom, dateTo },
        subjectId || undefined,
      )
      .then((result) => {
        if (mounted) {
          setReport(result);
        }
      })
      .catch((requestError) => {
        if (mounted) {
          setReport(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load report",
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    organizationBrandingService
      .getLogoUrl(selectedOrgId)
      .then((url) => {
        if (mounted) {
          setLogoUrl(url);
        }
      })
      .catch(() => {
        if (mounted) {
          setLogoUrl(null);
        }
      });

    return () => {
      mounted = false;
    };
  }, [dateFrom, dateTo, module, selectedOrgId, subjectId]);

  const organization = useMemo(() => {
    const found = organizations.find((item) => item.id === selectedOrgId);

    return found ? toOrganizationContact(found) : null;
  }, [organizations, selectedOrgId]);

  const handleDownloadCsv = async () => {
    if (!selectedOrgId) {
      return;
    }

    setIsDownloading(true);
    setError("");

    try {
      await moduleReportsService.downloadModuleReportCsv(
        selectedOrgId,
        module,
        { dateFrom, dateTo },
        subjectId || undefined,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to download report",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* Toolbar (hidden when printing) */}
      <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-sand)]">
              Report
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">{title}</h1>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {isSystemAdmin ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--color-ice)]">
                  Organisation
                </span>
                <select
                  value={selectedOrgId}
                  onChange={(event) => {
                    setSelectedOrgId(event.target.value);
                    setSubjectId("");
                  }}
                  className="rounded-md border border-white/15 bg-[var(--color-shell)] px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none focus:ring-1 focus:ring-[var(--color-sand)] [&_option]:bg-white [&_option]:text-black"
                >
                  {organizations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.organization_name}
                    </option>
                  ))}
                </select>
              </label>
            ) : organization ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--color-ice)]">
                  Organisation
                </span>
                <span className="rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-sm text-[var(--color-mist)]">
                  {organization.name}
                </span>
              </div>
            ) : null}

            {loadSubjects ? (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--color-ice)]">
                  {subjectLabel ?? "Subject"}
                </span>
                <select
                  value={subjectId}
                  onChange={(event) => setSubjectId(event.target.value)}
                  className="rounded-md border border-white/15 bg-[var(--color-shell)] px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none focus:ring-1 focus:ring-[var(--color-sand)] [&_option]:bg-white [&_option]:text-black"
                >
                  <option value="">All</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                From
              </span>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-md border border-white/15 bg-[var(--color-shell)] px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none focus:ring-1 focus:ring-[var(--color-sand)]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                To
              </span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-md border border-white/15 bg-[var(--color-shell)] px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none focus:ring-1 focus:ring-[var(--color-sand)]"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleDownloadCsv()}
              disabled={!selectedOrgId || isDownloading || isLoading}
              className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2 text-sm font-semibold text-[var(--color-ice)] transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="pi pi-download mr-2 text-xs" aria-hidden="true" />
              {isDownloading ? "Downloading…" : "Download CSV"}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!report}
              className="rounded-full bg-[var(--color-sand)] px-5 py-2 text-sm font-semibold text-black transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="pi pi-print mr-2 text-xs" aria-hidden="true" />
              Print / Export PDF
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <ResourceFeedback title="Report unavailable" detail={error} />
      ) : null}

      {!error && isLoading && !report ? (
        <ResourceFeedback
          title="Loading report"
          detail={`Requesting the ${title.toLowerCase()} from the SATS reporting service.`}
          loading
        />
      ) : null}

      {!error && !isLoading && report ? (
        <ReportDocument
          report={report}
          organization={organization}
          logoUrl={logoUrl}
        />
      ) : null}
    </div>
  );
}

