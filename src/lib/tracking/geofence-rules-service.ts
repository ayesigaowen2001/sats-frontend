import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

export type GeofenceRestriction = "keep_in" | "keep_out";
export type GeofenceRuleTarget = "animal_group" | "classification" | "animal";

export interface GeofenceRule {
  id: string;
  organizationId: string;
  geofenceId: string;
  restriction: GeofenceRestriction;
  targetType: GeofenceRuleTarget | "all_animals";
  isMainRule: boolean;
  animalGroupId: string | null;
  classificationId: number | null;
  animalNumber: string | null;
  borderDistanceM: number;
  description: string;
  isActive: boolean;
}

export interface GeofenceRuleInput {
  restriction: GeofenceRestriction;
  target_type: GeofenceRuleTarget;
  animal_group_id?: string | null;
  classification_id?: number | null;
  animal_number?: string | null;
  border_distance_m?: number;
  description?: string | null;
  is_active?: boolean;
}

export interface GeofenceRuleUpdateInput {
  restriction?: GeofenceRestriction;
  border_distance_m?: number;
  description?: string | null;
  is_active?: boolean;
}

export interface GeofenceRuleFilters {
  restriction?: GeofenceRestriction | "";
  target_type?: GeofenceRuleTarget | "";
  is_active?: boolean;
  page?: number;
  per_page?: number;
}

interface RuleApiModel {
  id?: string;
  organization_id?: string;
  geofence_id?: string;
  restriction?: GeofenceRestriction;
  target_type?: GeofenceRuleTarget | "all_animals";
  is_main_rule?: boolean;
  animal_group_id?: string | null;
  classification_id?: number | null;
  animal_number?: string | null;
  border_distance_m?: number | string;
  description?: string | null;
  is_active?: boolean;
}

interface ErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
}

function mapRule(item: RuleApiModel): GeofenceRule {
  return {
    id: String(item.id ?? ""),
    organizationId: item.organization_id ?? "",
    geofenceId: item.geofence_id ?? "",
    restriction: item.restriction ?? "keep_in",
    targetType: item.target_type ?? "animal",
    isMainRule: item.is_main_rule === true,
    animalGroupId: item.animal_group_id ?? null,
    classificationId: item.classification_id ?? null,
    animalNumber: item.animal_number ?? null,
    borderDistanceM: Number(item.border_distance_m ?? 10),
    description: item.description ?? "",
    isActive: item.is_active !== false,
  };
}

async function apiError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as ErrorPayload;
    if (typeof payload.message === "string" && payload.message.trim())
      return payload.message;
    if (typeof payload.detail === "string" && payload.detail.trim())
      return payload.detail;
    if (Array.isArray(payload.detail) && payload.detail[0]?.msg)
      return payload.detail[0].msg;
  } catch {
    // Use the fallback for non-JSON responses.
  }
  return fallback;
}

export class GeofenceRulesService {
  private headers(includeJson = true) {
    const headers = new Headers({ Accept: "application/json" });
    if (includeJson) headers.set("Content-Type", "application/json");
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }

  private path(orgId: string, geofenceId: string, suffix = "") {
    return `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/geofences/${encodeURIComponent(geofenceId)}/rules${suffix}`;
  }

  async listRules(
    orgId: string,
    geofenceId: string,
    filters: GeofenceRuleFilters = {},
  ) {
    const query = new URLSearchParams();
    if (filters.restriction) query.set("restriction", filters.restriction);
    if (filters.target_type) query.set("target_type", filters.target_type);
    if (filters.is_active !== undefined)
      query.set("is_active", String(filters.is_active));
    query.set("page", String(filters.page ?? 1));
    query.set("per_page", String(Math.min(filters.per_page ?? 50, 100)));
    const response = await fetch(`${this.path(orgId, geofenceId)}?${query}`, {
      headers: this.headers(false),
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        await apiError(
          response,
          `Failed to load geofence rules: ${response.status}`,
        ),
      );
    const payload = (await response.json()) as {
      items?: RuleApiModel[];
      pagination?: Record<string, unknown>;
    };
    const items = (payload.items ?? []).map(mapRule);
    const pagination = payload.pagination ?? {};
    return {
      items,
      pagination: {
        total: Number(pagination.total ?? items.length),
        pages: Number(pagination.pages ?? 1),
        page: Number(pagination.page ?? filters.page ?? 1),
      },
    };
  }

  async createRule(
    orgId: string,
    geofenceId: string,
    input: GeofenceRuleInput,
  ) {
    return this.request(orgId, geofenceId, "", "POST", input);
  }

  async updateRule(
    orgId: string,
    geofenceId: string,
    ruleId: string,
    input: GeofenceRuleUpdateInput,
  ) {
    return this.request(
      orgId,
      geofenceId,
      `/${encodeURIComponent(ruleId)}`,
      "PATCH",
      input,
    );
  }

  private async request(
    orgId: string,
    geofenceId: string,
    suffix: string,
    method: "POST" | "PATCH",
    input: GeofenceRuleInput | GeofenceRuleUpdateInput,
  ) {
    const response = await fetch(this.path(orgId, geofenceId, suffix), {
      method,
      headers: this.headers(),
      body: JSON.stringify(input),
    });
    if (!response.ok)
      throw new Error(
        await apiError(
          response,
          `Failed to save geofence rule: ${response.status}`,
        ),
      );
    return mapRule((await response.json()) as RuleApiModel);
  }

  async deleteRule(orgId: string, geofenceId: string, ruleId: string) {
    const response = await fetch(
      this.path(orgId, geofenceId, `/${encodeURIComponent(ruleId)}`),
      { method: "DELETE", headers: this.headers(false) },
    );
    if (!response.ok)
      throw new Error(
        await apiError(
          response,
          `Failed to delete geofence rule: ${response.status}`,
        ),
      );
  }
}

export const geofenceRulesService = new GeofenceRulesService();
