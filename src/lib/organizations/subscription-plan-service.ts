import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface SubscriptionPlanApiModel {
  id: string;
  plan_name: string;
  max_animals: number;
  max_devices: number;
  max_users: number;
  max_nodes: number;
  data_retention_months: number;
  video_enabled: boolean;
  ai_level: string;
}

interface SubscriptionPlansApiResponse {
  items: SubscriptionPlanApiModel[];
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

export interface SubscriptionPlan {
  id: string;
  planName: string;
  maxAnimals: number;
  maxDevices: number;
  maxUsers: number;
  maxNodes: number;
  dataRetentionMonths: number;
  videoEnabled: boolean;
  aiLevel: string;
}

export interface SubscriptionPlanListResult {
  items: SubscriptionPlan[];
  total: number;
  page: number;
  perPage: number;
  message: string;
}

export interface CreateSubscriptionPlanInput {
  plan_name: string;
  max_animals: number;
  max_devices: number;
  max_users: number;
  max_nodes: number;
  data_retention_months: number;
  video_enabled: boolean;
  ai_level: string;
}

export class SubscriptionPlanService {
  async listPlans(page = 1, perPage = 20): Promise<SubscriptionPlanListResult> {
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

    const response = await fetch(
      `${appConfig.apiBaseUrl}/subscription-plans?${query.toString()}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load subscription plans: ${response.status}`);
    }

    const payload = (await response.json()) as SubscriptionPlansApiResponse;

    return {
      items: payload.items.map((item) => ({
        id: item.id,
        planName: item.plan_name,
        maxAnimals: item.max_animals,
        maxDevices: item.max_devices,
        maxUsers: item.max_users,
        maxNodes: item.max_nodes,
        dataRetentionMonths: item.data_retention_months,
        videoEnabled: item.video_enabled,
        aiLevel: item.ai_level,
      })),
      total: payload.pagination?.total ?? payload.items.length,
      page: payload.pagination?.page ?? page,
      perPage: payload.pagination?.per_page ?? perPage,
      message: payload.message ?? "Subscription plans loaded.",
    };
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/subscription-plans/${encodeURIComponent(planId)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load subscription plan: ${response.status}`);
    }

    const item = (await response.json()) as SubscriptionPlanApiModel;

    return {
      id: item.id,
      planName: item.plan_name,
      maxAnimals: item.max_animals,
      maxDevices: item.max_devices,
      maxUsers: item.max_users,
      maxNodes: item.max_nodes,
      dataRetentionMonths: item.data_retention_months,
      videoEnabled: item.video_enabled,
      aiLevel: item.ai_level,
    };
  }

  async createPlan(input: CreateSubscriptionPlanInput): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(`${appConfig.apiBaseUrl}/subscription-plans`, {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Failed to create subscription plan: ${response.status}`);
    }
  }

  async updatePlan(
    planId: string,
    input: CreateSubscriptionPlanInput,
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
      `${appConfig.apiBaseUrl}/subscription-plans/${encodeURIComponent(planId)}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to update subscription plan: ${response.status}`);
    }
  }

  async deletePlan(planId: string): Promise<void> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/subscription-plans/${encodeURIComponent(planId)}`,
      {
        method: "DELETE",
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to delete subscription plan: ${response.status}`);
    }
  }
}

export const subscriptionPlanService = new SubscriptionPlanService();
