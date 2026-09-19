import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
}

interface AnimalGroupApiModel {
  id?: string;
  organization_id?: string;
  group_name: string;
  description?: string | null;
  member_count?: number;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  members?: AnimalGroupMemberApiModel[];
}

interface AnimalGroupMemberApiModel {
  animal_number: string;
  common_name?: string | null;
  added_by?: string | null;
  added_at?: string | null;
}

export interface AnimalGroupMember {
  animalNumber: string;
  commonName: string;
  addedBy: string;
  addedAt: string;
}

export interface AnimalGroup {
  id: string;
  organizationId: string;
  groupName: string;
  description: string;
  memberCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: AnimalGroupMember[];
}

export interface AnimalGroupInput {
  group_name: string;
  description?: string | null;
  animal_numbers?: string[];
}

export interface AnimalGroupUpdateInput {
  group_name?: string;
  description?: string | null;
}

export interface AnimalGroupFilters {
  search?: string;
  animal_number?: string;
  page?: number;
  per_page?: number;
}

export interface AnimalGroupListResult {
  items: AnimalGroup[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

function mapGroupMember(item: AnimalGroupMemberApiModel): AnimalGroupMember {
  return {
    animalNumber: item.animal_number,
    commonName: item.common_name ?? "",
    addedBy: item.added_by ?? "",
    addedAt: item.added_at ?? "",
  };
}

function mapGroup(item: AnimalGroupApiModel): AnimalGroup {
  return {
    id: String(item.id ?? ""),
    organizationId: item.organization_id ?? "",
    groupName: item.group_name,
    description: item.description ?? "",
    memberCount: item.member_count ?? item.members?.length ?? 0,
    createdBy: item.created_by ?? "",
    createdAt: item.created_at ?? "",
    updatedAt: item.updated_at ?? "",
    members: (item.members ?? []).map(mapGroupMember),
  };
}

function extractItems(payload: unknown): AnimalGroupApiModel[] {
  if (Array.isArray(payload)) return payload as AnimalGroupApiModel[];
  if (payload && typeof payload === "object" && "items" in payload) {
    const items = (payload as { items?: unknown }).items;
    return Array.isArray(items) ? (items as AnimalGroupApiModel[]) : [];
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
    if (Array.isArray(payload.detail) && payload.detail[0]?.msg) {
      return payload.detail[0].msg;
    }
  } catch {
    // Use the status fallback when the response is not JSON.
  }
  return fallback;
}

export class AnimalGroupsService {
  private createHeaders(includeJson = true): Headers {
    const headers = new Headers({ Accept: "application/json" });
    if (includeJson) headers.set("Content-Type", "application/json");
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  private path(orgId: string, suffix = "") {
    return `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/animal-groups${suffix}`;
  }

  async listGroups(
    orgId: string,
    filters: AnimalGroupFilters = {},
  ): Promise<AnimalGroupListResult> {
    const query = new URLSearchParams();
    if (filters.search?.trim()) query.set("search", filters.search.trim());
    if (filters.animal_number?.trim()) {
      query.set("animal_number", filters.animal_number.trim());
    }
    query.set(
      "page",
      String(filters.page && filters.page > 0 ? filters.page : 1),
    );
    query.set(
      "per_page",
      String(
        Math.min(
          filters.per_page && filters.per_page > 0 ? filters.per_page : 20,
          100,
        ),
      ),
    );

    const response = await fetch(`${this.path(orgId)}?${query.toString()}`, {
      method: "GET",
      headers: this.createHeaders(false),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load animal groups: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as {
      pagination?: Record<string, unknown>;
    };
    const pagination = payload.pagination ?? {};
    const items = extractItems(payload).map(mapGroup);
    return {
      items,
      pagination: {
        total: Number(pagination.total ?? items.length),
        pages: Number(pagination.pages ?? 1),
        page: Number(pagination.page ?? filters.page ?? 1),
        hasNext: pagination.has_next === true,
        hasPrev: pagination.has_prev === true,
      },
    };
  }

  async getGroup(orgId: string, groupId: string): Promise<AnimalGroup> {
    const response = await fetch(
      this.path(orgId, `/${encodeURIComponent(groupId)}`),
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
          `Failed to load animal group: ${response.status}`,
        ),
      );
    }
    return mapGroup((await response.json()) as AnimalGroupApiModel);
  }

  async createGroup(
    orgId: string,
    input: AnimalGroupInput,
  ): Promise<AnimalGroup> {
    return this.requestGroup(orgId, "", "POST", input);
  }

  async updateGroup(
    orgId: string,
    groupId: string,
    input: AnimalGroupUpdateInput,
  ): Promise<AnimalGroup> {
    return this.requestGroup(
      orgId,
      `/${encodeURIComponent(groupId)}`,
      "PATCH",
      input,
    );
  }

  private async requestGroup(
    orgId: string,
    suffix: string,
    method: "POST" | "PATCH",
    input: AnimalGroupInput | AnimalGroupUpdateInput,
  ): Promise<AnimalGroup> {
    const response = await fetch(this.path(orgId, suffix), {
      method,
      headers: this.createHeaders(),
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to save animal group: ${response.status}`,
        ),
      );
    }
    return mapGroup((await response.json()) as AnimalGroupApiModel);
  }

  async deleteGroup(orgId: string, groupId: string): Promise<void> {
    const response = await fetch(
      this.path(orgId, `/${encodeURIComponent(groupId)}`),
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete animal group: ${response.status}`,
        ),
      );
    }
  }

  async addMembers(
    orgId: string,
    groupId: string,
    animalNumbers: string[],
  ): Promise<void> {
    const response = await fetch(
      this.path(orgId, `/${encodeURIComponent(groupId)}/members`),
      {
        method: "POST",
        headers: this.createHeaders(),
        body: JSON.stringify({ animal_numbers: animalNumbers }),
      },
    );
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to add animals: ${response.status}`,
        ),
      );
    }
  }

  async removeMember(
    orgId: string,
    groupId: string,
    animalNumber: string,
  ): Promise<void> {
    const response = await fetch(
      this.path(
        orgId,
        `/${encodeURIComponent(groupId)}/members/${encodeURIComponent(animalNumber)}`,
      ),
      { method: "DELETE", headers: this.createHeaders(false) },
    );
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to remove animal: ${response.status}`,
        ),
      );
    }
  }
}

export const animalGroupsService = new AnimalGroupsService();
