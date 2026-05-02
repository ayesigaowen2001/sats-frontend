import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface OrganizationBrandingApiModel {
  id: string;
  organization_id?: string;
  org_id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  logo_url_64: string;
  logo_url_128: string;
  favicon_url: string;
  font_family: string;
}

interface OrganizationBrandingApiResponse {
  item?: OrganizationBrandingApiModel;
  branding?: OrganizationBrandingApiModel;
}

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

export interface OrganizationBranding {
  id: string;
  organizationId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  logoUrl64: string;
  logoUrl128: string;
  faviconUrl: string;
  fontFamily: string;
}

export interface OrganizationBrandingInput {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  logo_url_64: string;
  logo_url_128: string;
  favicon_url: string;
  font_family: string;
}

function mapBranding(item: OrganizationBrandingApiModel): OrganizationBranding {
  return {
    id: item.id,
    organizationId: item.organization_id ?? item.org_id ?? "",
    primaryColor: item.primary_color,
    secondaryColor: item.secondary_color,
    accentColor: item.accent_color,
    logoUrl: item.logo_url,
    logoUrl64: item.logo_url_64,
    logoUrl128: item.logo_url_128,
    faviconUrl: item.favicon_url,
    fontFamily: item.font_family,
  };
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
    // Response body may not be JSON; return fallback below.
  }

  return fallback;
}

export class OrganizationBrandingService {
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

  async getBranding(orgId: string): Promise<OrganizationBranding> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding`,
      {
        method: "GET",
        headers: this.createHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to load organization branding: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as
      | OrganizationBrandingApiModel
      | OrganizationBrandingApiResponse;

    const item = "id" in payload ? payload : (payload.item ?? payload.branding);

    if (!item) {
      throw new Error("Branding response was empty.");
    }

    return mapBranding(item);
  }

  async createBranding(
    orgId: string,
    input: OrganizationBrandingInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding`,
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
          `Failed to create organization branding: ${response.status}`,
        ),
      );
    }
  }

  async updateBranding(
    orgId: string,
    input: OrganizationBrandingInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding`,
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
          `Failed to update organization branding: ${response.status}`,
        ),
      );
    }
  }

  async upsertBranding(
    orgId: string,
    input: OrganizationBrandingInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding`,
      {
        method: "PUT",
        headers: this.createHeaders(),
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to upsert organization branding: ${response.status}`,
        ),
      );
    }
  }

  async deleteBranding(orgId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding`,
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete organization branding: ${response.status}`,
        ),
      );
    }
  }
}

export const organizationBrandingService = new OrganizationBrandingService();
