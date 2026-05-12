import { getAccessToken, getUserOrganizationId } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface UserApiModel {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  organization_id: string;
  is_system_admin: boolean;
  is_node: boolean;
  granted_by: string | null;
  granted_at: string | null;
  admin_notes: string | null;
  last_login: string | null;
}

interface UserListApiResponse {
  items: UserApiModel[];
  pagination?: {
    total?: number;
    pages?: number;
    page?: number;
    per_page?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  organizationId: string;
  isSystemAdmin: boolean;
  isNode: boolean;
  grantedBy: string | null;
  grantedAt: string | null;
  adminNotes: string | null;
  lastLogin: string | null;
}

export interface UserListResult {
  items: UserRecord[];
  total: number;
  page: number;
  perPage: number;
}

export interface UserListFilters {
  organization_id?: string;
  is_system_admin?: boolean;
  is_node?: boolean;
  status?: string;
}

export interface CreateOrganizationUserInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  status: string;
}

export interface CreateSystemAdminInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  status: string;
  granted_by: string;
  granted_at: string;
  admin_notes: string;
  is_system_admin: true;
  is_node: false;
  organization_id: null;
}

export interface UpdateNodeAccountInput {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
  admin_notes?: string;
}

function mapUser(item: UserApiModel): UserRecord {
  return {
    id: item.id,
    name: item.name,
    email: item.email,
    phone: item.phone,
    status: item.status,
    organizationId: item.organization_id,
    isSystemAdmin: item.is_system_admin,
    isNode: item.is_node,
    grantedBy: item.granted_by,
    grantedAt: item.granted_at,
    adminNotes: item.admin_notes,
    lastLogin: item.last_login,
  };
}

export class UserService {
  private buildHeaders(includeContentType = true): Headers {
    const accessToken = getAccessToken();
    const organizationId = getUserOrganizationId();
    const headers = new Headers({
      Accept: "application/json",
    });

    if (includeContentType) {
      headers.set("Content-Type", "application/json");
    }

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (organizationId) {
      headers.set("organization_id", organizationId);
    }

    return headers;
  }

  async listUsers(
    page = 1,
    perPage = 20,
    filters: UserListFilters = {},
  ): Promise<UserListResult> {
    const headers = this.buildHeaders(true);

    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("per_page", String(perPage));

    if (filters.organization_id) {
      query.set("organization_id", filters.organization_id);
    }

    if (typeof filters.is_system_admin === "boolean") {
      query.set("is_system_admin", String(filters.is_system_admin));
    }

    if (typeof filters.is_node === "boolean") {
      query.set("is_node", String(filters.is_node));
    }

    if (filters.status) {
      query.set("status", filters.status);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/users?${query.toString()}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load users: ${response.status}`);
    }

    const payload = (await response.json()) as UserListApiResponse;

    return {
      items: payload.items.map(mapUser),
      total: payload.pagination?.total ?? payload.items.length,
      page: payload.pagination?.page ?? page,
      perPage: payload.pagination?.per_page ?? perPage,
    };
  }

  async createOrganizationUser(
    orgId: string,
    input: CreateOrganizationUserInput,
  ): Promise<void> {
    const headers = this.buildHeaders(true);

    const response = await fetch(
      `${appConfig.apiBaseUrl}/users/organisations/${encodeURIComponent(orgId)}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.status}`);
    }
  }

  async createSystemAdmin(input: CreateSystemAdminInput): Promise<void> {
    const headers = this.buildHeaders(true);

    const response = await fetch(`${appConfig.apiBaseUrl}/users/admin`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create system administrator: ${response.status}`,
      );
    }
  }

  async updateNodeAccount(
    userId: string,
    input: UpdateNodeAccountInput,
  ): Promise<void> {
    const headers = this.buildHeaders(true);

    const response = await fetch(
      `${appConfig.apiBaseUrl}/users/nodes/${encodeURIComponent(userId)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.status}`);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const headers = this.buildHeaders(false);

    const response = await fetch(
      `${appConfig.apiBaseUrl}/users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`);
    }
  }
}

export const userService = new UserService();
