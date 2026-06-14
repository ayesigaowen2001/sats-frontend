import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface DeviceApiModel {
  id: string | number;
  category_id: string | number;
  spec_id: string | number;
  device_serial: string;
  firmware_version: string;
  status: string;
  last_seen: string;
  organization_id?: string | null;
}

export interface DeviceRecord {
  id: string;
  categoryId: number;
  specId: number;
  deviceSerial: string;
  firmwareVersion: string;
  status: string;
  lastSeen: string;
  organizationId: string | null;
}

export interface DeviceInput {
  category_id: number;
  spec_id: number;
  device_serial: string;
  firmware_version: string;
  status: string;
  last_seen: string;
}

export interface OrganizationDeviceListFilters {
  category_id?: number;
  status?: string;
  is_assigned?: boolean;
  device_number?: string;
  page?: number;
  per_page?: number;
}

function mapDevice(item: DeviceApiModel): DeviceRecord {
  return {
    id: String(item.id),
    categoryId: Number(item.category_id),
    specId: Number(item.spec_id),
    deviceSerial: item.device_serial,
    firmwareVersion: item.firmware_version,
    status: item.status,
    lastSeen: item.last_seen,
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

export class DevicesService {
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

  async listDevices(): Promise<DeviceRecord[]> {
    const response = await fetch(`${appConfig.apiBaseUrl}/devices`, {
      method: "GET",
      headers: this.createHeaders(false),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load devices: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    return extractList<DeviceApiModel>(payload).map(mapDevice);
  }

  async getDeviceById(deviceId: string): Promise<DeviceRecord> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/devices/${encodeURIComponent(deviceId)}`,
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
          `Failed to load device: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as DeviceApiModel;
    return mapDevice(payload);
  }

  async createDevice(input: DeviceInput): Promise<void> {
    const response = await fetch(`${appConfig.apiBaseUrl}/devices`, {
      method: "POST",
      headers: this.createHeaders(),
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to create device: ${response.status}`,
        ),
      );
    }
  }

  async updateDevice(deviceId: string, input: DeviceInput): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/devices/${encodeURIComponent(deviceId)}`,
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
          `Failed to update device: ${response.status}`,
        ),
      );
    }
  }

  async deleteDevice(deviceId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/devices/${encodeURIComponent(deviceId)}`,
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete device: ${response.status}`,
        ),
      );
    }
  }

  async assignDeviceToOrganization(
    orgId: string,
    input: DeviceInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/devices`,
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
          `Failed to assign device to organization: ${response.status}`,
        ),
      );
    }
  }

  async listDevicesByOrganization(orgId: string): Promise<DeviceRecord[]> {
    return this.listDevicesByOrganizationWithFilters(orgId, {});
  }

  async reallocateDevice(
    orgId: string,
    deviceNumber: string,
    newOrganizationId: string,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/devices/${encodeURIComponent(deviceNumber)}/reallocate`,
      {
        method: "POST",
        headers: this.createHeaders(),
        body: JSON.stringify({ organization_id: newOrganizationId }),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to reallocate device: ${response.status}`,
        ),
      );
    }
  }

  async listDevicesByOrganizationWithFilters(
    orgId: string,
    filters: OrganizationDeviceListFilters,
  ): Promise<DeviceRecord[]> {
    const query = new URLSearchParams();

    if (typeof filters.category_id === "number") {
      query.set("category_id", String(filters.category_id));
    }

    if (filters.status?.trim()) {
      query.set("status", filters.status.trim());
    }

    if (typeof filters.is_assigned === "boolean") {
      query.set("is_assigned", String(filters.is_assigned));
    }

    if (filters.device_number?.trim()) {
      query.set("device_number", filters.device_number.trim());
    }

    if (typeof filters.page === "number" && filters.page > 0) {
      query.set("page", String(filters.page));
    }

    if (typeof filters.per_page === "number" && filters.per_page > 0) {
      query.set("per_page", String(filters.per_page));
    }

    const queryString = query.toString();
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/devices${queryString ? `?${queryString}` : ""}`,
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
          `Failed to load organization devices: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    return extractList<DeviceApiModel>(payload).map(mapDevice);
  }
}

export const devicesService = new DevicesService();
