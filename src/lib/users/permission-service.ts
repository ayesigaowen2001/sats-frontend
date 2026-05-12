import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface PermissionApiModel {
  id: number;
  module_name: string;
  action: string;
  description: string;
}

interface PermissionListApiResponse {
  items: PermissionApiModel[];
  pagination?: {
    total?: number;
    page?: number;
    per_page?: number;
    pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
  message?: string;
}

export interface PermissionRecord {
  id: number;
  moduleName: string;
  action: string;
  description: string;
}

export interface PermissionListResult {
  items: PermissionRecord[];
  total: number;
  page: number;
  perPage: number;
  message: string;
}

export interface CreatePermissionInput {
  module_name: string;
  action: string;
  description: string;
}

export interface UpdatePermissionInput {
  module_name: string;
  action: string;
  description: string;
}

function mapPermission(item: PermissionApiModel): PermissionRecord {
  return {
    id: item.id,
    moduleName: item.module_name,
    action: item.action,
    description: item.description,
  };
}

export class PermissionService {
  async listPermissions(
    page = 1,
    perPage = 200,
    moduleName?: string,
  ): Promise<PermissionListResult> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const query = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    if (moduleName) {
      query.set("module_name", moduleName);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/permissions?${query.toString()}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load permissions: ${response.status}`);
    }

    const payload = (await response.json()) as PermissionListApiResponse;

    return {
      items: payload.items.map(mapPermission),
      total: payload.pagination?.total ?? payload.items.length,
      page: payload.pagination?.page ?? page,
      perPage: payload.pagination?.per_page ?? perPage,
      message: payload.message ?? "Permissions loaded successfully.",
    };
  }

  async createPermission(input: CreatePermissionInput): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${appConfig.apiBaseUrl}/permissions`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to create permission: ${response.status}`);
    }
  }

  async updatePermission(
    permissionId: number,
    input: UpdatePermissionInput,
  ): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/permissions/${encodeURIComponent(String(permissionId))}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update permission: ${response.status}`);
    }
  }

  async deletePermission(permissionId: number): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/permissions/${encodeURIComponent(String(permissionId))}`,
      {
        method: "DELETE",
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete permission: ${response.status}`);
    }
  }
}

export const permissionService = new PermissionService();
