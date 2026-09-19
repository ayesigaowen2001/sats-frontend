import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";
import type { ModuleReport } from "@/types/report";

export interface ReportQuery {
  dateFrom?: string;
  dateTo?: string;
  format?: "json" | "csv";
}

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
}

async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }

    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      const firstDetail = payload.detail[0]?.msg;
      if (firstDetail && firstDetail.trim()) {
        return firstDetail;
      }
    }
  } catch {
    // Response body may not be JSON; use the fallback below.
  }

  return fallback;
}

function buildReportUrl(
  orgId: string,
  module: string,
  subjectId: string | undefined,
  query: ReportQuery,
  format: "json" | "csv",
) {
  const params = new URLSearchParams();

  if (query.dateFrom) {
    params.set("date_from", query.dateFrom);
  }

  if (query.dateTo) {
    params.set("date_to", query.dateTo);
  }

  params.set("format", format);

  const queryString = params.toString();
  const subjectPath = subjectId ? `/${encodeURIComponent(subjectId)}` : "";

  return `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(
    orgId,
  )}/reports/${encodeURIComponent(module)}${subjectPath}${queryString ? `?${queryString}` : ""}`;
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) {
    return fallback;
  }

  const utfMatch = header.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
}

/**
 * Generic client for the per-module report endpoints:
 *   GET /organisations/{org_id}/reports/{module}?format=json|csv&date_from=&date_to=
 *
 * Each module (animals, devices, health, tracking, ...) exposes its own report
 * under the same path shape, so the querying and download logic is shared here.
 */
export class ModuleReportsService {
  private createHeaders(accept: string) {
    const headers = new Headers({ Accept: accept });
    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  async getModuleReport(
    orgId: string,
    module: string,
    query: ReportQuery = {},
    subjectId?: string,
  ): Promise<ModuleReport> {
    const url = buildReportUrl(orgId, module, subjectId, query, "json");
    const response = await fetch(url, {
      method: "GET",
      headers: this.createHeaders("application/json"),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load ${module} report (status ${response.status})`,
        ),
      );
    }

    return (await response.json()) as ModuleReport;
  }

  async downloadModuleReportCsv(
    orgId: string,
    module: string,
    query: ReportQuery = {},
    subjectId?: string,
  ): Promise<void> {
    const url = buildReportUrl(orgId, module, subjectId, query, "csv");
    const response = await fetch(url, {
      method: "GET",
      headers: this.createHeaders("text/csv"),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to download ${module} report (status ${response.status})`,
        ),
      );
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const subjectSegment = subjectId ? `-${subjectId}` : "";
    const fallbackName = `${module}-report${subjectSegment}-${query.dateFrom ?? "start"}-to-${
      query.dateTo ?? "end"
    }.csv`;
    const filename = filenameFromDisposition(
      response.headers.get("content-disposition"),
      fallbackName,
    );

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }
}

export const moduleReportsService = new ModuleReportsService();
