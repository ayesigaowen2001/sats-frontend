import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

export type ObservationType =
  | "poaching_sign"
  | "carcass"
  | "vehicle_sighting"
  | "other";
export type ObservationSeverity = "low" | "medium" | "high" | "critical";
export type ObservationStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "dismissed";

export interface ObservationDetails {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ObservationLocation {
  type: "Point";
  coordinates: [number, number];
}

export interface ObservationMedia {
  id: string;
  mediaType: string;
  contentType: string;
  sizeBytes: number;
  capturedAt: string;
  caption: string;
  fileUrl: string;
}

export interface FieldObservation {
  id: string;
  observationNumber: string;
  observationType: ObservationType;
  severity: ObservationSeverity;
  status: ObservationStatus;
  observedAt: string;
  location: ObservationLocation | null;
  locationAccuracyM: number | null;
  description: string;
  animalNumber: string;
  reportedBy: string;
  createdAt: string;
  resolvedAt: string;
  resolutionNotes: string;
  carcass: ObservationDetails | null;
  poachingSign: ObservationDetails | null;
  vehicleSighting: ObservationDetails | null;
  media: ObservationMedia[];
}

export interface ObservationInput {
  observation_type: ObservationType;
  severity: ObservationSeverity;
  observed_at: string;
  location: ObservationLocation;
  location_accuracy_m?: number | null;
  description?: string | null;
  animal_number?: string | null;
  carcass?: ObservationDetails | null;
  poaching_sign?: ObservationDetails | null;
  vehicle_sighting?: ObservationDetails | null;
}

export interface ObservationUpdateInput {
  severity?: ObservationSeverity;
  status?: ObservationStatus;
  resolution_notes?: string | null;
  observed_at?: string;
  location?: ObservationLocation;
  location_accuracy_m?: number | null;
  description?: string | null;
  animal_number?: string | null;
  carcass?: ObservationDetails | null;
  poaching_sign?: ObservationDetails | null;
  vehicle_sighting?: ObservationDetails | null;
}

export interface ObservationFilters {
  observation_type?: ObservationType | "";
  status?: ObservationStatus | "";
  severity?: ObservationSeverity | "";
  animal_number?: string;
  observed_from?: string;
  observed_to?: string;
  page?: number;
  per_page?: number;
}

export interface ObservationListResult {
  items: FieldObservation[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
}

interface ObservationApiModel {
  id?: string;
  observation_number?: string;
  observation_type?: ObservationType;
  severity?: ObservationSeverity;
  status?: ObservationStatus;
  observed_at?: string;
  location?: ObservationLocation | null;
  location_accuracy_m?: number | string | null;
  description?: string | null;
  animal_number?: string | null;
  reported_by?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  carcass?: ObservationDetails | null;
  poaching_sign?: ObservationDetails | null;
  vehicle_sighting?: ObservationDetails | null;
  media?: MediaApiModel[];
}

interface MediaApiModel {
  id?: string;
  media_type?: string;
  content_type?: string;
  size_bytes?: number;
  captured_at?: string | null;
  caption?: string | null;
  file_url?: string | null;
}

function mapMedia(item: MediaApiModel): ObservationMedia {
  return {
    id: String(item.id ?? ""),
    mediaType: item.media_type ?? "file",
    contentType: item.content_type ?? "application/octet-stream",
    sizeBytes: item.size_bytes ?? 0,
    capturedAt: item.captured_at ?? "",
    caption: item.caption ?? "",
    fileUrl: item.file_url ?? "",
  };
}

function mapObservation(item: ObservationApiModel): FieldObservation {
  return {
    id: String(item.id ?? item.observation_number ?? ""),
    observationNumber: item.observation_number ?? "",
    observationType: item.observation_type ?? "other",
    severity: item.severity ?? "medium",
    status: item.status ?? "open",
    observedAt: item.observed_at ?? "",
    location: item.location ?? null,
    locationAccuracyM:
      item.location_accuracy_m === null ||
      item.location_accuracy_m === undefined
        ? null
        : Number(item.location_accuracy_m),
    description: item.description ?? "",
    animalNumber: item.animal_number ?? "",
    reportedBy: item.reported_by ?? "",
    createdAt: item.created_at ?? "",
    resolvedAt: item.resolved_at ?? "",
    resolutionNotes: item.resolution_notes ?? "",
    carcass: item.carcass ?? null,
    poachingSign: item.poaching_sign ?? null,
    vehicleSighting: item.vehicle_sighting ?? null,
    media: (item.media ?? []).map(mapMedia),
  };
}

function extractItems(payload: unknown): ObservationApiModel[] {
  if (Array.isArray(payload)) return payload as ObservationApiModel[];
  if (payload && typeof payload === "object" && "items" in payload) {
    const items = (payload as { items?: unknown }).items;
    return Array.isArray(items) ? (items as ObservationApiModel[]) : [];
  }
  return [];
}

async function getApiErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
    if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
      return payload.detail[0].msg;
    }
  } catch {
    // Use the status fallback when the API response is not JSON.
  }
  return fallback;
}

export class ObservationsService {
  private headers(includeJson = true) {
    const headers = new Headers({ Accept: "application/json" });
    if (includeJson) headers.set("Content-Type", "application/json");
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  private path(orgId: string, suffix = "") {
    return `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/observations${suffix}`;
  }

  async listObservations(
    orgId: string,
    filters: ObservationFilters = {},
  ): Promise<ObservationListResult> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
    query.set("page", String(filters.page ?? 1));
    query.set("per_page", String(Math.min(filters.per_page ?? 20, 100)));

    const response = await fetch(`${this.path(orgId)}?${query}`, {
      headers: this.headers(false),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load observations: ${response.status}`,
        ),
      );
    }
    const payload = (await response.json()) as {
      pagination?: Record<string, unknown>;
    };
    const pagination = payload.pagination ?? {};
    return {
      items: extractItems(payload).map(mapObservation),
      pagination: {
        total: Number(pagination.total ?? 0),
        pages: Number(pagination.pages ?? 1),
        page: Number(pagination.page ?? filters.page ?? 1),
        hasNext: pagination.has_next === true,
        hasPrev: pagination.has_prev === true,
      },
    };
  }

  async createObservation(orgId: string, input: ObservationInput) {
    return this.requestObservation(orgId, "", "POST", input);
  }

  async updateObservation(
    orgId: string,
    number: string,
    input: ObservationUpdateInput,
  ) {
    return this.requestObservation(
      orgId,
      `/${encodeURIComponent(number)}`,
      "PATCH",
      input,
    );
  }

  private async requestObservation(
    orgId: string,
    suffix: string,
    method: "POST" | "PATCH",
    input: ObservationInput | ObservationUpdateInput,
  ) {
    const response = await fetch(this.path(orgId, suffix), {
      method,
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to save observation: ${response.status}`,
        ),
      );
    }
    return mapObservation((await response.json()) as ObservationApiModel);
  }

  async deleteObservation(orgId: string, number: string) {
    const response = await fetch(
      this.path(orgId, `/${encodeURIComponent(number)}`),
      {
        method: "DELETE",
        headers: this.headers(false),
      },
    );
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete observation: ${response.status}`,
        ),
      );
    }
  }

  async uploadMedia(
    orgId: string,
    number: string,
    file: File,
    caption?: string,
  ) {
    const formData = new FormData();
    formData.append("file", file, file.name);
    if (caption?.trim()) formData.append("caption", caption.trim());
    const response = await fetch(
      this.path(orgId, `/${encodeURIComponent(number)}/media`),
      {
        method: "POST",
        headers: this.headers(false),
        body: formData,
      },
    );
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to upload evidence: ${response.status}`,
        ),
      );
    }
    return mapMedia((await response.json()) as MediaApiModel);
  }

  async getMediaBlobUrl(orgId: string, number: string, mediaId: string) {
    const response = await fetch(
      this.path(
        orgId,
        `/${encodeURIComponent(number)}/media/${encodeURIComponent(mediaId)}/file`,
      ),
      { headers: this.headers(false), cache: "no-store" },
    );
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to stream evidence: ${response.status}`,
        ),
      );
    }
    return URL.createObjectURL(await response.blob());
  }

  async deleteMedia(orgId: string, number: string, mediaId: string) {
    const response = await fetch(
      this.path(
        orgId,
        `/${encodeURIComponent(number)}/media/${encodeURIComponent(mediaId)}`,
      ),
      { method: "DELETE", headers: this.headers(false) },
    );
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete evidence: ${response.status}`,
        ),
      );
    }
  }
}

export const observationsService = new ObservationsService();
