import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface DeviceSpecificationApiModel {
  id: string | number;
  category_id: string | number;
  gps_model: string;
  communication_type: string;
  battery_type: string;
  camera_enabled: boolean;
  description: string;
}

interface SpecificationSensorApiModel {
  id: string | number;
  sensor_name: string;
  unit: string;
}

export interface DeviceSpecification {
  id: string;
  category_id: number;
  gps_model: string;
  communication_type: string;
  battery_type: string;
  camera_enabled: boolean;
  description: string;
}

export interface DeviceSpecificationInput {
  category_id: number;
  gps_model: string;
  communication_type: string;
  battery_type: string;
  camera_enabled: boolean;
  description: string;
}

export interface SpecificationSensor {
  id: string;
  sensor_name: string;
  unit: string;
}

export interface SpecificationSensorsInput {
  sensor_ids: number[];
}

function mapSpecification(
  item: DeviceSpecificationApiModel,
): DeviceSpecification {
  return {
    id: String(item.id),
    category_id: Number(item.category_id),
    gps_model: item.gps_model,
    communication_type: item.communication_type,
    battery_type: item.battery_type,
    camera_enabled: Boolean(item.camera_enabled),
    description: item.description,
  };
}

function mapSpecificationSensor(
  item: SpecificationSensorApiModel,
): SpecificationSensor {
  return {
    id: String(item.id),
    sensor_name: item.sensor_name,
    unit: item.unit,
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

export class DeviceSpecificationsService {
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

  async listSpecifications(): Promise<DeviceSpecification[]> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications`,
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
          `Failed to load device specifications: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    return extractList<DeviceSpecificationApiModel>(payload).map(
      mapSpecification,
    );
  }

  async getSpecificationById(specId: string): Promise<DeviceSpecification> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications/${encodeURIComponent(specId)}`,
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
          `Failed to load device specification: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as DeviceSpecificationApiModel;
    return mapSpecification(payload);
  }

  async createSpecification(input: DeviceSpecificationInput): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications`,
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
          `Failed to create device specification: ${response.status}`,
        ),
      );
    }
  }

  async updateSpecification(
    specId: string,
    input: DeviceSpecificationInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications/${encodeURIComponent(specId)}`,
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
          `Failed to update device specification: ${response.status}`,
        ),
      );
    }
  }

  async deleteSpecification(specId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications/${encodeURIComponent(specId)}`,
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete device specification: ${response.status}`,
        ),
      );
    }
  }

  async getSpecificationSensors(
    specId: string,
  ): Promise<SpecificationSensor[]> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications/${encodeURIComponent(specId)}/sensors`,
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
          `Failed to load specification sensors: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    return extractList<SpecificationSensorApiModel>(payload).map(
      mapSpecificationSensor,
    );
  }

  async assignSensorsToSpecification(
    specId: string,
    input: SpecificationSensorsInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications/${encodeURIComponent(specId)}/sensors`,
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
          `Failed to assign sensors to specification: ${response.status}`,
        ),
      );
    }
  }

  async removeSensorsFromSpecification(
    specId: string,
    input: SpecificationSensorsInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/device-specifications/${encodeURIComponent(specId)}/sensors`,
      {
        method: "DELETE",
        headers: this.createHeaders(),
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to remove sensors from specification: ${response.status}`,
        ),
      );
    }
  }
}

export const deviceSpecificationsService = new DeviceSpecificationsService();
