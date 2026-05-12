import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface CameraApiModel {
  camera_id?: string;
  id?: string;
  device_id: string;
  camera_name: string;
  stream_url?: string;
  camera_type?: string;
  geo_coordinates?: {
    type?: "Point";
    coordinates?: number[];
  };
  gps_coordinates?: {
    latitude?: number;
    longitude?: number;
    coordinates?: number[];
  };
  is_active: boolean;
  created_by?: string | null;
  createdBy?: string | null;
  organization_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Camera {
  id: string;
  deviceId: string;
  cameraName: string;
  streamUrl: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdBy: string;
  organizationId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CameraInput {
  device_id: string;
  camera_name: string;
  stream_url: string;
  geo_coordinates?: {
    type: "Point";
    coordinates: [number, number];
  };
  is_active: boolean;
}

function mapCamera(item: CameraApiModel): Camera {
  const geoCoords = item.geo_coordinates?.coordinates;
  const gpsCoords = item.gps_coordinates?.coordinates;
  const longitudeFromPoint =
    Array.isArray(geoCoords) && geoCoords.length >= 2
      ? Number(geoCoords[0])
      : undefined;
  const latitudeFromPoint =
    Array.isArray(geoCoords) && geoCoords.length >= 2
      ? Number(geoCoords[1])
      : undefined;
  const longitudeFromGpsArray =
    Array.isArray(gpsCoords) && gpsCoords.length >= 2
      ? Number(gpsCoords[0])
      : undefined;
  const latitudeFromGpsArray =
    Array.isArray(gpsCoords) && gpsCoords.length >= 2
      ? Number(gpsCoords[1])
      : undefined;

  return {
    id: String(item.camera_id ?? item.id ?? ""),
    deviceId: item.device_id,
    cameraName: item.camera_name,
    streamUrl: item.stream_url ?? item.camera_type ?? "",
    latitude:
      latitudeFromPoint ??
      latitudeFromGpsArray ??
      item.gps_coordinates?.latitude,
    longitude:
      longitudeFromPoint ??
      longitudeFromGpsArray ??
      item.gps_coordinates?.longitude,
    isActive: item.is_active,
    createdBy: item.created_by ?? item.createdBy ?? "",
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

export class CamerasService {
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

  async listCameras(orgId: string): Promise<Camera[]> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/cameras`,
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
          `Failed to load cameras: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    return extractList<CameraApiModel>(payload).map(mapCamera);
  }

  async getCameraById(orgId: string, cameraId: string): Promise<Camera> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/cameras/${encodeURIComponent(cameraId)}`,
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
          `Failed to load camera: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as CameraApiModel;
    return mapCamera(payload);
  }

  async createCamera(orgId: string, input: CameraInput): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/cameras`,
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
          `Failed to create camera: ${response.status}`,
        ),
      );
    }
  }

  async updateCamera(
    orgId: string,
    cameraId: string,
    input: Partial<CameraInput>,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/cameras/${encodeURIComponent(cameraId)}`,
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
          `Failed to update camera: ${response.status}`,
        ),
      );
    }
  }

  async deleteCamera(orgId: string, cameraId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/cameras/${encodeURIComponent(cameraId)}`,
      {
        method: "DELETE",
        headers: this.createHeaders(false, orgId),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete camera: ${response.status}`,
        ),
      );
    }
  }
}

export const camerasService = new CamerasService();
