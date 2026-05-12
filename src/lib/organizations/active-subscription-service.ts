import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ActiveSubscriptionApiModel {
  id: string;
  organization_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string;
  current_period_start: string;
  current_period_end: string;
  created_by: string;
}

export interface ActiveSubscription {
  id: string;
  organizationId: string;
  planId: string;
  status: string;
  trialEndsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  createdBy: string;
}

export interface AssignSubscriptionInput {
  organization_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string;
  current_period_start: string;
  current_period_end: string;
  created_by: string;
}

function mapActiveSubscription(
  item: ActiveSubscriptionApiModel,
): ActiveSubscription {
  return {
    id: item.id,
    organizationId: item.organization_id,
    planId: item.plan_id,
    status: item.status,
    trialEndsAt: item.trial_ends_at,
    currentPeriodStart: item.current_period_start,
    currentPeriodEnd: item.current_period_end,
    createdBy: item.created_by,
  };
}

export class ActiveSubscriptionService {
  async getOrganizationSubscription(
    orgId: string,
  ): Promise<ActiveSubscription> {
    const accessToken = getAccessToken();
    const headers = new Headers({
      Accept: "application/json",
      "Content-Type": "application/json",
    });

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/subscription`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load active subscription: ${response.status}`);
    }

    const payload = (await response.json()) as ActiveSubscriptionApiModel;
    return mapActiveSubscription(payload);
  }

  async assignSubscription(
    orgId: string,
    input: AssignSubscriptionInput,
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
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/subscription`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to assign subscription: ${response.status}`);
    }
  }
}

export const activeSubscriptionService = new ActiveSubscriptionService();
