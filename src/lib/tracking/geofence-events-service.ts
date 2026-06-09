import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

type GeofenceEventStatus = "Inside" | "Outside" | "Border" | "Breach";

interface GeofenceEventApiModel {
  id: string;
  animal_id?: string;
  animal_number?: string;
  geofence_id: string;
  tracking_log_id: string;
  timestamp: string;
  location?: {
    type?: string;
    coordinates?: unknown;
  } | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface GeofenceEventListApiResponse {
  items?: GeofenceEventApiModel[];
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

export interface GeofenceEventRecord {
  id: string;
  animalId: string;
  geofenceId: string;
  trackingLogId: string;
  timestamp: string;
  longitude: number;
  latitude: number;
  status: GeofenceEventStatus | string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface GeofenceEventFilters {
  animal_id?: string;
  geofence_id?: string;
  status?: GeofenceEventStatus;
  from_ts?: string;
  to_ts?: string;
  page?: number;
  per_page?: number;
}

export interface GeofenceEventListResult {
  items: GeofenceEventRecord[];
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

function pickText(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function mapGeofenceEvent(
  item: GeofenceEventApiModel,
): GeofenceEventRecord | null {
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
    geofenceId: item.geofence_id,
    trackingLogId: item.tracking_log_id,
    timestamp: item.timestamp,
    longitude,
    latitude,
    status: item.status ?? "Inside",
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
    // Ignore parse failures and use fallback.
  }

  return fallback;
}

export class GeofenceEventsService {
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

  async listGeofenceEvents(
    orgId: string,
    filters: GeofenceEventFilters = {},
  ): Promise<GeofenceEventListResult> {
    const query = new URLSearchParams();

    if (filters.animal_id?.trim()) {
      const animalFilter = filters.animal_id.trim();

      if (isUuidLike(animalFilter)) {
        query.set("animal_id", animalFilter);
      } else {
        query.set("animal_number", animalFilter);
      }
    }

    if (filters.geofence_id?.trim()) {
      query.set("geofence_id", filters.geofence_id.trim());
    }

    if (filters.status?.trim()) {
      query.set("status", filters.status.trim());
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
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/geofence-events?${query.toString()}`,
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
          `Failed to load geofence events: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as GeofenceEventListApiResponse;
    const mappedItems = (payload.items ?? [])
      .map(mapGeofenceEvent)
      .filter((item): item is GeofenceEventRecord => Boolean(item));

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
      message: payload.message ?? "Geofence events retrieved.",
    };
  }
}

export const geofenceEventsService = new GeofenceEventsService();
