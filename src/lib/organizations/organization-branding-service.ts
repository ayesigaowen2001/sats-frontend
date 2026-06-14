import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface OrganizationBrandingApiModel {
  id: string;
  organization_id?: string;
  org_id?: string;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  logo_file: string | null;
  font_family: string | null;
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
  fontFamily: string;
}

export interface OrganizationBrandingInput {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
}

function mapBranding(item: OrganizationBrandingApiModel): OrganizationBranding {
  return {
    id: item.id,
    organizationId: item.organization_id ?? item.org_id ?? "",
    primaryColor: item.primary_color ?? "",
    secondaryColor: item.secondary_color ?? "",
    accentColor: item.accent_color ?? "",
    logoUrl: item.logo_file ?? "",
    fontFamily: item.font_family ?? "",
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
        headers: this.createHeaders(true),
        body: JSON.stringify({
          primary_color: input.primary_color,
          secondary_color: input.secondary_color,
          accent_color: input.accent_color,
          font_family: input.font_family,
        }),
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
        headers: this.createHeaders(true),
        body: JSON.stringify({
          primary_color: input.primary_color,
          secondary_color: input.secondary_color,
          accent_color: input.accent_color,
          font_family: input.font_family,
        }),
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
        headers: this.createHeaders(true),
        body: JSON.stringify({
          primary_color: input.primary_color,
          secondary_color: input.secondary_color,
          accent_color: input.accent_color,
          font_family: input.font_family,
        }),
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

  async uploadLogo(orgId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append("logo", file);

    const headers = new Headers({
      Accept: "application/json",
    });

    const accessToken = getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding/logo`,
      {
        method: "POST",
        headers,
        body: formData,
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to upload logo: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as { logo_file?: string };

    return payload.logo_file ?? "";
  }

  async getLogoUrl(orgId: string): Promise<string> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding/logo`,
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
          response.status === 404
            ? "No logo is set for this organization."
            : `Failed to load organization logo: ${response.status}`,
        ),
      );
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  async deleteLogo(orgId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/branding/logo`,
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete organization logo: ${response.status}`,
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
