import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface RoleApiModel {
  id: string | number;
  organization_id: string | null;
  role_name: string;
  description: string;
  is_global: boolean;
}

interface RolePermissionApiModel {
  id: number;
  module_name: string;
  action: string;
  description: string;
}

interface RoleListApiResponse {
  items: RoleApiModel[];
  pagination?: {
    total?: number;
    pages?: number;
    page?: number;
    per_page?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
  message?: string;
}

interface RolePermissionsApiResponse {
  items?: RolePermissionApiModel[];
  permissions?: RolePermissionApiModel[];
  message?: string;
}

interface RoleApiResponse {
  item?: RoleApiModel;
  role?: RoleApiModel;
}

interface UserRolesApiResponse {
  items?: RoleApiModel[];
  roles?: RoleApiModel[];
  message?: string;
}

export interface RoleRecord {
  id: string;
  organizationId: string | null;
  roleName: string;
  description: string;
  isGlobal: boolean;
}

export interface RoleListResult {
  items: RoleRecord[];
  total: number;
  page: number;
  perPage: number;
  message: string;
}

export interface CreateRoleInput {
  organization_id: string | null;
  role_name: string;
  description: string;
  is_global: boolean;
}

export interface AssignPermissionsInput {
  permission_ids: number[];
}

export interface AssignRolesToUserInput {
  role_ids: Array<number | string>;
}

export interface RolePermissionRecord {
  id: number;
  moduleName: string;
  action: string;
  description: string;
}

function mapRole(item: RoleApiModel): RoleRecord {
  return {
    id: String(item.id),
    organizationId: item.organization_id,
    roleName: item.role_name,
    description: item.description,
    isGlobal: item.is_global,
  };
}

function mapRolePermission(item: RolePermissionApiModel): RolePermissionRecord {
  return {
    id: item.id,
    moduleName: item.module_name,
    action: item.action,
    description: item.description,
  };
}

export class RoleService {
  async listRoles(
    page = 1,
    perPage = 50,
    organizationId?: string,
  ): Promise<RoleListResult> {
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

    if (organizationId) {
      query.set("organization_id", organizationId);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/roles?${query.toString()}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load roles: ${response.status}`);
    }

    const payload = (await response.json()) as RoleListApiResponse;

    return {
      items: payload.items.map(mapRole),
      total: payload.pagination?.total ?? payload.items.length,
      page: payload.pagination?.page ?? page,
      perPage: payload.pagination?.per_page ?? perPage,
      message: payload.message ?? "Roles loaded successfully.",
    };
  }

  async createRole(input: CreateRoleInput): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${appConfig.apiBaseUrl}/roles`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to create role: ${response.status}`);
    }
  }

  async getRoleById(roleId: string): Promise<RoleRecord> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/roles/${encodeURIComponent(roleId)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load role: ${response.status}`);
    }

    const payload = (await response.json()) as RoleApiModel | RoleApiResponse;

    const item =
      "id" in payload ? payload : (payload.item ?? payload.role ?? null);

    if (!item) {
      throw new Error("Role payload is missing role data.");
    }

    return mapRole(item);
  }

  async updateRole(roleId: string, input: CreateRoleInput): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/roles/${encodeURIComponent(roleId)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update role: ${response.status}`);
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/roles/${encodeURIComponent(roleId)}`,
      {
        method: "DELETE",
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete role: ${response.status}`);
    }
  }

  async assignPermissionsToRole(
    roleId: string,
    input: AssignPermissionsInput,
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
      `${appConfig.apiBaseUrl}/roles/${encodeURIComponent(roleId)}/permissions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to assign permissions: ${response.status}`);
    }
  }

  async getRolePermissions(roleId: string): Promise<RolePermissionRecord[]> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/roles/${encodeURIComponent(roleId)}/permissions`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load role permissions: ${response.status}`);
    }

    const payload = (await response.json()) as
      | RolePermissionsApiResponse
      | RolePermissionApiModel[];

    const items = Array.isArray(payload)
      ? payload
      : (payload.items ?? payload.permissions ?? []);

    return items.map(mapRolePermission);
  }

  async removePermissionsFromRole(
    roleId: string,
    input: AssignPermissionsInput,
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
      `${appConfig.apiBaseUrl}/roles/${encodeURIComponent(roleId)}/permissions`,
      {
        method: "DELETE",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to remove permissions: ${response.status}`);
    }
  }

  async getMyPermissions(): Promise<RolePermissionRecord[]> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/roles/my-permissions`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load my permissions: ${response.status}`);
    }

    const payload = (await response.json()) as
      | RolePermissionsApiResponse
      | RolePermissionApiModel[];

    const items = Array.isArray(payload)
      ? payload
      : (payload.items ?? payload.permissions ?? []);

    return items.map(mapRolePermission);
  }

  async getUserRoles(userId: string): Promise<RoleRecord[]> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/roles/users/${encodeURIComponent(userId)}/roles`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load user roles: ${response.status}`);
    }

    const payload = (await response.json()) as
      | UserRolesApiResponse
      | RoleApiModel[];

    const items = Array.isArray(payload)
      ? payload
      : (payload.items ?? payload.roles ?? []);

    return items.map(mapRole);
  }

  async assignRolesToUser(
    userId: string,
    input: AssignRolesToUserInput,
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
      `${appConfig.apiBaseUrl}/roles/users/${encodeURIComponent(userId)}/roles`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to assign roles to user: ${response.status}`);
    }
  }
}

export const roleService = new RoleService();
