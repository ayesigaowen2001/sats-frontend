import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

interface GeofenceApiModel {
  geofence_id?: string | number;
  id?: string | number;
  park_name: string;
  boundary: GeoJsonPolygon;
  description?: string | null;
  created_by?: string | null;
  createdBy?: string | null;
  organization_id?: string | null;
}

export interface Geofence {
  id: string;
  parkName: string;
  boundary: GeoJsonPolygon;
  description: string;
  createdBy: string;
  organizationId: string | null;
}

export interface GeofenceInput {
  park_name: string;
  boundary: GeoJsonPolygon;
  description: string;
  created_by: string;
}

function mapGeofence(item: GeofenceApiModel): Geofence {
  return {
    id: String(item.geofence_id ?? item.id ?? ""),
    parkName: item.park_name,
    boundary: item.boundary,
    description: item.description ?? "",
    createdBy: item.created_by ?? item.createdBy ?? "",
    organizationId: item.organization_id ?? null,
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

export class GeofencesService {
  private createHeaders(includeJson = true) {
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

    return headers;
  }

  async listGeofences(orgId: string): Promise<Geofence[]> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/geofences`,
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
          `Failed to load geofences: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    return extractList<GeofenceApiModel>(payload).map(mapGeofence);
  }

  async getGeofenceById(orgId: string, geofenceId: string): Promise<Geofence> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/geofences/${encodeURIComponent(geofenceId)}`,
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
          `Failed to load geofence: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as GeofenceApiModel;
    return mapGeofence(payload);
  }

  async createGeofence(orgId: string, input: GeofenceInput): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/geofences`,
      {
        method: "POST",
        headers: this.createHeaders(),
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to create geofence: ${response.status}`,
        ),
      );
    }
  }

  async updateGeofence(
    orgId: string,
    geofenceId: string,
    input: GeofenceInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/geofences/${encodeURIComponent(geofenceId)}`,
      {
        method: "PATCH",
        headers: this.createHeaders(),
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to update geofence: ${response.status}`,
        ),
      );
    }
  }

  async deleteGeofence(orgId: string, geofenceId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/geofences/${encodeURIComponent(geofenceId)}`,
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete geofence: ${response.status}`,
        ),
      );
    }
  }
}

export const geofencesService = new GeofencesService();
