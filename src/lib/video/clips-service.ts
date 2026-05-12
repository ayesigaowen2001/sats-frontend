import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface ClipApiModel {
  clip_id?: string;
  id?: string;
  camera_id: string;
  animal_id?: string | null;
  timestamp?: string;
  video_path?: string;
  videopath?: string;
  activity_detected?: string | null;
  duration_seconds?: number | null;
  created_by?: string | null;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VideoClip {
  id: string;
  cameraId: string;
  animalId: string;
  timestamp: string;
  videoPath: string;
  activityDetected: string;
  durationSeconds: number;
  createdBy: string;
  organizationId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VideoClipInput {
  camera_id: string;
  animal_id: string;
  timestamp: string;
  video_path: string;
  activity_detected: string;
  duration_seconds: number;
}

function mapClip(item: ClipApiModel): VideoClip {
  return {
    id: String(item.clip_id ?? item.id ?? ""),
    cameraId: item.camera_id,
    animalId: item.animal_id ?? "",
    timestamp: item.timestamp ?? "",
    videoPath: item.video_path ?? item.videopath ?? "",
    activityDetected: item.activity_detected ?? "",
    durationSeconds: item.duration_seconds ?? 0,
    createdBy: item.created_by ?? "",
    organizationId: item.organization_id ?? null,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
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
  private createHeaders(includeJson = true, organizationId?: string) {
    const headers = new Headers({
      Accept: "application/json",
    });

    if (includeJson) {
      headers.set("Content-Type", "application/json");
    }

    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (organizationId) {
      headers.set("organization_id", organizationId);
    }

    return headers;
  }

  private createMultipartHeaders(organizationId?: string) {
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

  async listClips(orgId: string): Promise<VideoClip[]> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips`,
      {
        method: "GET",
        headers: this.createHeaders(false),
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
    return extractList<ClipApiModel>(payload).map(mapClip);
  }

  async getClipById(orgId: string, clipId: string): Promise<VideoClip> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips/${encodeURIComponent(clipId)}`,
      {
        method: "GET",
        headers: this.createHeaders(false),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load clip: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as ClipApiModel;
    return mapClip(payload);
  }

  async createClip(orgId: string, input: VideoClipInput): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips`,
      {
        method: "POST",
        headers: this.createHeaders(true, orgId),
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to create clip: ${response.status}`,
        ),
      );
    }
  }

  async createClipWithFile(
    orgId: string,
    input: VideoClipInput,
    file: File,
  ): Promise<void> {
    const formData = new FormData();
    formData.append("camera_id", input.camera_id);
    formData.append("animal_id", input.animal_id);
    formData.append("timestamp", input.timestamp);
    formData.append("activity_detected", input.activity_detected);
    formData.append("duration_seconds", String(input.duration_seconds));
    formData.append("video_path", input.video_path || file.name);
    formData.append("file", file, file.name);

    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips`,
      {
        method: "POST",
        headers: this.createMultipartHeaders(orgId),
        body: formData,
      },
    );

    if (response.ok) {
      return;
    }

    // Fallback to JSON payload if the backend does not accept multipart for this endpoint.
    await this.createClip(orgId, {
      ...input,
      video_path: input.video_path || file.name,
    });
  }

  async updateClip(
    orgId: string,
    clipId: string,
    input: Partial<VideoClipInput>,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips/${encodeURIComponent(clipId)}`,
      {
        method: "PATCH",
        headers: this.createHeaders(true, orgId),
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to update clip: ${response.status}`,
        ),
      );
    }
  }

  async updateClipWithFile(
    orgId: string,
    clipId: string,
    input: Partial<VideoClipInput>,
    file: File,
  ): Promise<void> {
    const formData = new FormData();

    if (input.camera_id) formData.append("camera_id", input.camera_id);
    if (typeof input.animal_id === "string")
      formData.append("animal_id", input.animal_id);
    if (typeof input.timestamp === "string")
      formData.append("timestamp", input.timestamp);
    if (typeof input.activity_detected === "string") {
      formData.append("activity_detected", input.activity_detected);
    }
    if (typeof input.duration_seconds === "number") {
      formData.append("duration_seconds", String(input.duration_seconds));
    }
    if (typeof input.video_path === "string") {
      formData.append("video_path", input.video_path);
    }

    formData.append("file", file, file.name);

    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips/${encodeURIComponent(clipId)}`,
      {
        method: "PATCH",
        headers: this.createMultipartHeaders(orgId),
        body: formData,
      },
    );

    if (response.ok) {
      return;
    }

    await this.updateClip(orgId, clipId, {
      ...input,
      video_path: input.video_path || file.name,
    });
  }

  async deleteClip(orgId: string, clipId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/clips/${encodeURIComponent(clipId)}`,
      {
        method: "DELETE",
        headers: this.createHeaders(false, orgId),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete clip: ${response.status}`,
        ),
      );
    }
  }
}

export const clipsService = new ClipsService();
