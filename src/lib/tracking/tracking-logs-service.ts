import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface TrackingLogApiModel {
  id: string;
  animal_id?: string;
  animal_number?: string;
  device_id?: string;
  device_number?: string;
  timestamp: string;
  location?: {
    type?: string;
    coordinates?: unknown;
  } | null;
  speed_kmh?: string | number | null;
  direction_degrees?: string | number | null;
  altitude_m?: string | number | null;
  accuracy_m?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface TrackingLogListApiResponse {
  items?: TrackingLogApiModel[];
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

export interface TrackingLogRecord {
  id: string;
  animalId: string;
  deviceId: string;
  timestamp: string;
  longitude: number;
  latitude: number;
  speedKmh: number | null;
  directionDegrees: number | null;
  altitudeM: number | null;
  accuracyM: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TrackingLogFilters {
  animal_id?: string;
  device_id?: string;
  device_number?: string;
  from_ts?: string;
  to_ts?: string;
  page?: number;
  per_page?: number;
  organization_id?: string;
}

export interface TrackingLogListResult {
  items: TrackingLogRecord[];
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

function parseNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapTrackingLog(item: TrackingLogApiModel): TrackingLogRecord | null {
  const coordinates = item.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return {
    id: item.id,
    animalId: pickText(item.animal_number, item.animal_id),
    deviceId: pickText(item.device_number, item.device_id),
    timestamp: item.timestamp,
    longitude,
    latitude,
    speedKmh: parseNumber(item.speed_kmh),
    directionDegrees: parseNumber(item.direction_degrees),
    altitudeM: parseNumber(item.altitude_m),
    accuracyM: parseNumber(item.accuracy_m),
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
    // Ignore JSON parsing errors and return fallback.
  }

  return fallback;
}

export class TrackingLogsService {
  private createHeaders() {
    const headers = new Headers({
      Accept: "application/json",
    });

    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  async listTrackingLogs(
    filters: TrackingLogFilters = {},
  ): Promise<TrackingLogListResult> {
    const query = new URLSearchParams();

    if (filters.animal_id?.trim()) {
      const animalFilter = filters.animal_id.trim();

      if (isUuidLike(animalFilter)) {
        query.set("animal_id", animalFilter);
      } else {
        query.set("animal_number", animalFilter);
      }
    }

    if (filters.device_id?.trim()) {
      const deviceFilter = filters.device_id.trim();

      if (isUuidLike(deviceFilter)) {
        query.set("device_id", deviceFilter);
      } else {
        query.set("device_number", deviceFilter);
      }
    }

    if (filters.device_number?.trim()) {
      query.set("device_number", filters.device_number.trim());
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
      `${appConfig.apiBaseUrl}/tracking?${query.toString()}`,
      {
        method: "GET",
        headers: this.createHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load tracking logs: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as TrackingLogListApiResponse;
    const mappedItems = (payload.items ?? [])
      .map(mapTrackingLog)
      .filter((item): item is TrackingLogRecord => Boolean(item));

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
      message: payload.message ?? "Tracking logs retrieved.",
    };
  }
}

export const trackingLogsService = new TrackingLogsService();
