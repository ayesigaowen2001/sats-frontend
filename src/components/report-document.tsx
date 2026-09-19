import type { ReactNode } from "react";

import { ReportBarChart, ReportDonutChart } from "@/components/report-charts";
import type { ModuleReport, ReportSection } from "@/types/report";

export interface ReportOrganizationContact {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  domain: string;
  location: string;
  country: string;
}

export type ReportFontSize = "compact" | "normal" | "large";
export type ReportFontFamily = "default" | "serif" | "sans" | "mono";

interface ReportDocumentProps {
  report: ModuleReport;
  organization: ReportOrganizationContact | null;
  logoUrl: string | null;
  accentColor?: string;
  fontSize?: ReportFontSize;
  fontFamily?: ReportFontFamily;
  showBarCharts?: boolean;
  showDonutCharts?: boolean;
}

const FONT_FAMILIES: Record<ReportFontFamily, string> = {
  default: "inherit",
  serif: "Georgia, 'Times New Roman', serif",
  sans: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  mono: "'Courier New', ui-monospace, SFMono-Regular, monospace",
};

const FONT_SIZES: Record<ReportFontSize, number> = {
  compact: 12,
  normal: 14,
  large: 16,
};

function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(clean)) {
    return hex;
  }

  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatValue(value: number | string | null) {
  if (value === null || value === "" || value === undefined) {
    return "—";
  }

  return String(value);
}

function SectionTable({
  section,
  accentColor,
}: {
  section: ReportSection;
  accentColor: string;
}) {
  const hasValue = section.rows.some((row) => row.value !== null);
  const hasUnit = section.rows.some((row) => row.unit !== null);
  const hasPercentage = section.rows.some((row) => row.percentage !== null);

  if (section.rows.length === 0) {
    return (
      <p className="text-sm italic text-slate-400">
        No records for this period.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
          <th className="px-3 py-2 font-semibold">Label</th>
          <th className="px-3 py-2 text-right font-semibold">Count</th>
          {hasValue ? (
            <th className="px-3 py-2 text-right font-semibold">Value</th>
          ) : null}
          {hasUnit ? (
            <th className="px-3 py-2 font-semibold">Unit</th>
          ) : null}
          {hasPercentage ? (
            <th className="px-3 py-2 text-right font-semibold">%</th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {section.rows.map((row) => (
          <tr
            key={row.label}
            className="border-b border-slate-100 last:border-0"
          >
            <td className="px-3 py-2 font-medium text-slate-800">{row.label}</td>
            <td className="px-3 py-2 text-right tabular-nums text-slate-700">
              {row.count}
            </td>
            {hasValue ? (
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {formatValue(row.value)}
              </td>
            ) : null}
            {hasUnit ? (
              <td className="px-3 py-2 text-slate-700">{row.unit ?? "—"}</td>
            ) : null}
            {hasPercentage ? (
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {row.percentage === null ? "—" : `${row.percentage}%`}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td className="px-3 py-2 font-semibold text-slate-800">Total</td>
          <td
            className="px-3 py-2 text-right font-semibold tabular-nums"
            style={{ color: accentColor }}
          >
            {section.total}
          </td>
          {hasValue ? <td /> : null}
          {hasUnit ? <td /> : null}
          {hasPercentage ? <td /> : null}
        </tr>
      </tfoot>
    </table>
  );
}

function LogoMark({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="h-12 w-12 rounded-full border border-slate-200 object-cover"
      />
    );
  }

  const initial = (name || "O").charAt(0).toUpperCase();

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg font-bold text-slate-600">
      {initial}
    </div>
  );
}

/**
 * Generic, print-ready report document.
 *
 * Layout follows the agreed report template:
 *  - Header (centered): organisation logo, organisation name, report title.
 *  - Body (justified): report description, summary and section details, with an
 *    organisation watermark behind the content.
 *  - Footer (centered): organisation contact details.
 */
export function ReportDocument({
  report,
  organization,
  logoUrl,
  accentColor = "#d17a22",
  fontSize = "normal",
  fontFamily = "default",
  showBarCharts = true,
  showDonutCharts = true,
}: ReportDocumentProps) {
  const organizationName =
    organization?.name || report.meta.organization_name || "Organisation";
  const generatedAt = report.meta.generated_at
    ? new Date(report.meta.generated_at).toLocaleString()
    : "—";
  const accent = accentColor || "#d17a22";

  const contactLines: ReactNode[] = [];

  if (organization?.contactPerson) {
    contactLines.push(`Contact: ${organization.contactPerson}`);
  }
  if (organization?.email) {
    contactLines.push(organization.email);
  }
  if (organization?.phone) {
    contactLines.push(organization.phone);
  }
  if (organization?.domain) {
    contactLines.push(organization.domain);
  }
  if (organization?.location || organization?.country) {
    contactLines.push(
      [organization?.location, organization?.country]
        .filter(Boolean)
        .join(", "),
    );
  }

  return (
    <article
      className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.35)] print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:shadow-none"
      style={{
        fontFamily: FONT_FAMILIES[fontFamily] ?? FONT_FAMILIES.default,
        fontSize: FONT_SIZES[fontSize] ?? FONT_SIZES.normal,
      }}
    >
      {/* Watermark (screen only — absolute spans break print pagination) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden print:hidden"
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-80 w-80 rounded-full object-contain opacity-[0.06]"
          />
        ) : (
          <span className="select-none text-[8rem] font-bold uppercase leading-none text-slate-900/[0.05]">
            {(organizationName || "O").charAt(0)}
          </span>
        )}
      </div>

      <div className="relative">
        {/* Header */}
        <header
          className="grid grid-cols-1 gap-4 border-b-4 px-8 py-6 sm:grid-cols-2"
          style={{ borderColor: accent }}
        >
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <LogoMark logoUrl={logoUrl} name={organizationName} />
            <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
              {organizationName}
            </h1>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <h2
              className="text-2xl font-bold leading-tight tracking-tight"
              style={{ color: accent }}
            >
              {report.title}
            </h2>
            <p className="text-xs text-slate-500">
              Reporting period: {report.meta.date_from} → {report.meta.date_to}
            </p>
          </div>
        </header>

        {/* Body */}
        <div className="space-y-8 px-8 py-8">
          {report.description ? (
            <p className="text-justify text-sm leading-7 text-slate-600">
              {report.description}
            </p>
          ) : null}

          {report.summary.length ? (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <span
                  className="inline-block h-4 w-1 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Summary
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {report.summary.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    style={{ borderTopColor: accent, borderTopWidth: 3 }}
                  >
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      {item.label}
                    </p>
                    <p
                      className="mt-2 text-2xl font-semibold tabular-nums"
                      style={{ color: accent }}
                    >
                      {formatValue(item.value)}
                      {item.unit ? (
                        <span className="ml-1 text-sm font-normal text-slate-500">
                          {item.unit}
                        </span>
                      ) : null}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-6">
            {report.sections.map((section) => {
              const hasRows = section.rows.length > 0;
              const hasPercentage = section.rows.some(
                (row) => row.percentage !== null,
              );
              const showDonut = hasRows && hasPercentage && showDonutCharts;
              const showBar = hasRows && !showDonut && showBarCharts;

              return (
                <div
                  key={section.key}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <div
                    className="border-l-4 px-4 py-3"
                    style={{
                      borderColor: accent,
                      backgroundColor: withAlpha(accent, 0.07),
                    }}
                  >
                    <h2 className="text-sm font-semibold text-slate-800">
                      {section.title}
                    </h2>
                    {section.note ? (
                      <p className="mt-1 text-xs italic text-slate-500">
                        {section.note}
                      </p>
                    ) : null}
                  </div>
                  <div className="px-4 py-3">
                    {showDonut ? (
                      <div className="mb-4">
                        <ReportDonutChart
                          rows={section.rows}
                          accentColor={accent}
                        />
                      </div>
                    ) : null}
                    {showBar ? (
                      <div className="mb-4">
                        <ReportBarChart
                          rows={section.rows}
                          accentColor={accent}
                        />
                      </div>
                    ) : null}
                    <SectionTable section={section} accentColor={accent} />
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Footer */}
        <footer
          className="grid grid-cols-1 gap-4 border-t-4 px-8 py-6 sm:grid-cols-2"
          style={{ borderColor: accent }}
        >
          <div className="flex flex-col items-center justify-center gap-1 text-center text-xs text-slate-600">
            {contactLines.length
              ? contactLines.map((line, index) => (
                  <span key={index}>{line}</span>
                ))
              : (
                  <span>{organizationName}</span>
                )}
          </div>
          <div className="flex flex-col items-center justify-center gap-1 text-center text-[11px] text-slate-400">
            <span>Generated on {generatedAt}</span>
            <span>{report.report_type} report</span>
          </div>
        </footer>
      </div>
    </article>
  );
}

