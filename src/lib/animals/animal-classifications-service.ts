import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface AnimalClassificationApiModel {
  id?: string | number;
  class_id?: string | number;
  kingdom: string;
  phylum: string;
  class_name: string;
  order_name: string;
  family: string;
  genus: string;
  species: string;
  common_name: string;
  conservation_status: string;
  organization_id?: string | null;
}

export interface AnimalClassification {
  id: string;
  kingdom: string;
  phylum: string;
  className: string;
  orderName: string;
  family: string;
  genus: string;
  species: string;
  commonName: string;
  conservationStatus: string;
  organizationId: string | null;
}

export interface AnimalClassificationInput {
  kingdom: string;
  phylum: string;
  class_name: string;
  order_name: string;
  family: string;
  genus: string;
  species: string;
  common_name: string;
  conservation_status: string;
  organization_id?: string | null;
}

function mapClassification(
  item: AnimalClassificationApiModel,
): AnimalClassification {
  return {
    id: String(item.id ?? item.class_id ?? ""),
    kingdom: item.kingdom,
    phylum: item.phylum,
    className: item.class_name,
    orderName: item.order_name,
    family: item.family,
    genus: item.genus,
    species: item.species,
    commonName: item.common_name,
    conservationStatus: item.conservation_status,
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

export class AnimalClassificationsService {
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

  async listClassifications(): Promise<AnimalClassification[]> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/animal-classifications`,
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
          `Failed to load animal classifications: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    return extractList<AnimalClassificationApiModel>(payload).map(
      mapClassification,
    );
  }

  async getClassificationById(classId: string): Promise<AnimalClassification> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/animal-classifications/${encodeURIComponent(classId)}`,
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
          `Failed to load animal classification: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as AnimalClassificationApiModel;
    return mapClassification(payload);
  }

  async createClassification(input: AnimalClassificationInput): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/animal-classifications`,
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
          `Failed to create animal classification: ${response.status}`,
        ),
      );
    }
  }

  async updateClassification(
    classId: string,
    input: AnimalClassificationInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/animal-classifications/${encodeURIComponent(classId)}`,
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
          `Failed to update animal classification: ${response.status}`,
        ),
      );
    }
  }

  async deleteClassification(classId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/animal-classifications/${encodeURIComponent(classId)}`,
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete animal classification: ${response.status}`,
        ),
      );
    }
  }
}

export const animalClassificationsService = new AnimalClassificationsService();
