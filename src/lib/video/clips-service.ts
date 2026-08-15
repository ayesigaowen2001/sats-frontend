import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface ClipApiModel {
  id?: string;
  clip_id?: string;
  device_number?: string;
  animal_number?: string | null;
  recording_started_at?: string;
  recording_ended_at?: string;
  duration_seconds?: number | null;
  video_url?: string;
  activity_detected?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VideoClip {
  id: string;
  deviceNumber: string;
  animalNumber: string;
  recordingStartedAt: string;
  recordingEndedAt: string;
  durationSeconds: number;
  videoUrl: string;
  activityDetected: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClipUploadInput {
  device_number: string;
  recording_started_at: string;
  recording_ended_at: string;
  animal_number?: string | null;
  activity_detected?: string | null;
}

export interface ClipListFilters {
  device_number?: string | null;
  animal_number?: string | null;
  activity?: string | null;
  recorded_from?: string | null;
  recorded_to?: string | null;
  page?: number;
  per_page?: number;
}

export interface ClipPagination {
  total: number;
  pages: number;
  page: number;
  perPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface ClipListResult {
  items: VideoClip[];
  pagination: ClipPagination;
  message: string;
}

function mapClip(item: ClipApiModel): VideoClip {
  return {
    id: String(item.id ?? item.clip_id ?? ""),
    deviceNumber: item.device_number ?? "",
    animalNumber: item.animal_number ?? "",
    recordingStartedAt: item.recording_started_at ?? "",
    recordingEndedAt: item.recording_ended_at ?? "",
    durationSeconds: item.duration_seconds ?? 0,
    videoUrl: item.video_url ?? "",
    activityDetected: item.activity_detected ?? "",
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
  };
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && "items" in payload) {
    const items = (payload as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }

  return [];
}

function extractPagination(payload: unknown): ClipPagination | null {
  if (payload && typeof payload === "object" && "pagination" in payload) {
    const pagination = (payload as { pagination: unknown }).pagination;
    if (pagination && typeof pagination === "object") {
      const p = pagination as Record<string, unknown>;
      if (typeof p.total === "number" && typeof p.pages === "number") {
        return {
          total: p.total,
          pages: p.pages,
          page: typeof p.page === "number" ? p.page : 1,
          perPage: typeof p.per_page === "number" ? p.per_page : 20,
          hasNext: p.has_next === true,
          hasPrev: p.has_prev === true,
          nextPage: typeof p.next_page === "number" ? p.next_page : null,
          prevPage: typeof p.prev_page === "number" ? p.prev_page : null,
        };
      }
    }
  }

  return null;
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

export class ClipsService {
  private createMultipartHeaders() {
    const headers = new Headers({
      Accept: "application/json",
    });

    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

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

  async listClips(
    orgId: string,
    filters: ClipListFilters = {},
  ): Promise<ClipListResult> {
    const query = new URLSearchParams();

    if (filters.device_number?.trim()) {
      query.set("device_number", filters.device_number.trim());
    }

    if (filters.animal_number?.trim()) {
      query.set("animal_number", filters.animal_number.trim());
    }

    if (filters.activity?.trim()) {
      query.set("activity", filters.activity.trim());
    }

    if (filters.recorded_from?.trim()) {
      query.set("recorded_from", filters.recorded_from.trim());
    }

    if (filters.recorded_to?.trim()) {
      query.set("recorded_to", filters.recorded_to.trim());
    }

    query.set(
      "page",
      String(filters.page && filters.page > 0 ? filters.page : 1),
    );
    query.set(
      "per_page",
      String(
        filters.per_page && filters.per_page > 0
          ? Math.min(filters.per_page, 100)
          : 20,
      ),
    );

    const queryString = query.toString();
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips?${queryString}`,
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
          `Failed to load clips: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    const items = extractList<ClipApiModel>(payload).map(mapClip);
    const pagination = extractPagination(payload);
    const fallbackPage = filters.page && filters.page > 0 ? filters.page : 1;
    const fallbackPerPage =
      filters.per_page && filters.per_page > 0
        ? Math.min(filters.per_page, 100)
        : 20;
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message ?? "")
        : "";

    return {
      items,
      pagination: pagination ?? {
        total: items.length,
        pages: 1,
        page: fallbackPage,
        perPage: fallbackPerPage,
        hasNext: false,
        hasPrev: false,
        nextPage: null,
        prevPage: null,
      },
      message,
    };
  }

  async uploadClip(
    orgId: string,
    input: ClipUploadInput,
    file: File,
  ): Promise<VideoClip> {
    const formData = new FormData();
    formData.append("device_number", input.device_number);
    formData.append("recording_started_at", input.recording_started_at);
    formData.append("recording_ended_at", input.recording_ended_at);

    if (input.animal_number?.trim()) {
      formData.append("animal_number", input.animal_number.trim());
    }

    if (input.activity_detected?.trim()) {
      formData.append("activity_detected", input.activity_detected.trim());
    }

    formData.append("file", file, file.name);

    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips`,
      {
        method: "POST",
        headers: this.createMultipartHeaders(),
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to upload clip: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as ClipApiModel;
    return mapClip(payload);
  }
}

export const clipsService = new ClipsService();
