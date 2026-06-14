import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface BatteryLogApiModel {
  id: string;
  device_number: string;
  timestamp: string;
  battery_percentage?: number | string | null;
  battery_voltage?: number | string | null;
  power_consumption_rate?: number | string | null;
  low_battery_alert?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface BatteryLogListApiResponse {
  items?: BatteryLogApiModel[];
  pagination?: {
    total?: number;
    pages?: number;
    page?: number;
    per_page?: number;
    has_next?: boolean;
    has_prev?: boolean;
    next_page?: number | null;
    prev_page?: number | null;
  };
  message?: string;
}

export interface BatteryLogRecord {
  id: string;
  deviceNumber: string;
  timestamp: string;
  batteryPercentage: string | null;
  batteryVoltage: string | null;
  powerConsumptionRate: string | null;
  lowBatteryAlert: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BatteryLogFilters {
  organization_id?: string;
  device_number?: string;
  alert_only?: boolean;
  from_ts?: string;
  to_ts?: string;
  page?: number;
  per_page?: number;
}

export interface BatteryLogListResult {
  items: BatteryLogRecord[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    perPage: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
  message: string;
}

function toDisplayValue(
  value: number | string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function mapBatteryLog(item: BatteryLogApiModel): BatteryLogRecord {
  return {
    id: item.id,
    deviceNumber: item.device_number,
    timestamp: item.timestamp,
    batteryPercentage: toDisplayValue(item.battery_percentage),
    batteryVoltage: toDisplayValue(item.battery_voltage),
    powerConsumptionRate: toDisplayValue(item.power_consumption_rate),
    lowBatteryAlert: Boolean(item.low_battery_alert),
    createdAt: item.created_at ?? null,
    updatedAt: item.updated_at ?? null,
  };
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

    if (Array.isArray(payload.errors) && payload.errors.length > 0) {
      const firstError = payload.errors[0]?.message;
      if (firstError && firstError.trim()) {
        return firstError;
      }
    }
  } catch {
    // Ignore parse errors and return fallback.
  }

  return fallback;
}

export class BatteryLogsService {
  private createHeaders(organizationId?: string) {
    const headers = new Headers({
      Accept: "application/json",
    });

    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (organizationId) {
      headers.set("organization_id", organizationId);
    }

    return headers;
  }

  async listBatteryLogs(
    filters: BatteryLogFilters = {},
  ): Promise<BatteryLogListResult> {
    const query = new URLSearchParams();

    if (filters.device_number?.trim()) {
      query.set("device_number", filters.device_number.trim());
    }

    if (typeof filters.alert_only === "boolean") {
      query.set("alert_only", String(filters.alert_only));
    }

    if (filters.from_ts?.trim()) {
      query.set("from_ts", filters.from_ts.trim());
    }

    if (filters.to_ts?.trim()) {
      query.set("to_ts", filters.to_ts.trim());
    }

    query.set(
      "page",
      String(filters.page && filters.page > 0 ? filters.page : 1),
    );
    query.set(
      "per_page",
      String(filters.per_page && filters.per_page > 0 ? filters.per_page : 50),
    );

    const response = await fetch(
      `${appConfig.apiBaseUrl}/battery-logs?${query.toString()}`,
      {
        method: "GET",
        headers: this.createHeaders(filters.organization_id),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load battery logs: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as BatteryLogListApiResponse;
    const mappedItems = (payload.items ?? []).map(mapBatteryLog);

    const fallbackPage = filters.page && filters.page > 0 ? filters.page : 1;
    const fallbackPerPage =
      filters.per_page && filters.per_page > 0 ? filters.per_page : 50;

    return {
      items: mappedItems,
      pagination: {
        total: payload.pagination?.total ?? mappedItems.length,
        pages: payload.pagination?.pages ?? 1,
        page: payload.pagination?.page ?? fallbackPage,
        perPage: payload.pagination?.per_page ?? fallbackPerPage,
        hasNext: payload.pagination?.has_next ?? false,
        hasPrev: payload.pagination?.has_prev ?? false,
        nextPage:
          typeof payload.pagination?.next_page === "number"
            ? payload.pagination.next_page
            : null,
        prevPage:
          typeof payload.pagination?.prev_page === "number"
            ? payload.pagination.prev_page
            : null,
      },
      message: payload.message ?? "Battery logs retrieved.",
    };
  }
}

export const batteryLogsService = new BatteryLogsService();
