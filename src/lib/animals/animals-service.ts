import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ msg?: string }>;
  errors?: Array<{ message?: string }>;
}

interface AnimalApiModel {
  animal_id?: string | number;
  id?: string | number;
  animal_number: string;
  classification_id: number;
  device_id?: string | null;
  common_name: string;
  gender: string;
  age: number;
  weight_kg: number;
  date_tagged: string;
  location_tagged?: [number | null, number | null] | null;
  organization_id?: string | null;
}

export interface Animal {
  id: string;
  animalNumber: string;
  classificationId: number;
  deviceId: string | null;
  commonName: string;
  gender: string;
  age: number;
  weightKg: number;
  dateTagged: string;
  locationTagged: [number | null, number | null] | null;
  organizationId: string | null;
}

export interface AnimalInput {
  classification_id: number;
  device_id?: string | null;
  common_name: string;
  gender: string;
  age: number;
  weight_kg: number;
  date_tagged: string;
  location_tagged?: [number | null, number | null] | null;
}

export interface AnimalListFilters {
  classification_id?: number;
  gender?: string;
  animal_number?: string;
  page?: number;
  per_page?: number;
}

export interface PaginationInfo {
  total: number;
  pages: number;
  page: number;
  per_page: number;
  has_next: boolean;
  has_prev: boolean;
  next_page: number | null;
  prev_page: number | null;
}

export interface AnimalListResponse {
  items: Animal[];
  pagination: PaginationInfo;
}

function mapAnimal(item: AnimalApiModel): Animal {
  return {
    id: String(item.animal_id ?? item.id ?? ""),
    animalNumber: item.animal_number,
    classificationId: item.classification_id,
    deviceId: item.device_id ?? null,
    commonName: item.common_name,
    gender: item.gender,
    age: item.age,
    weightKg: item.weight_kg,
    dateTagged: item.date_tagged,
    locationTagged: item.location_tagged ?? null,
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

function extractPagination(payload: unknown): PaginationInfo | null {
  if (payload && typeof payload === "object" && "pagination" in payload) {
    const pagination = (payload as { pagination: unknown }).pagination;
    if (pagination && typeof pagination === "object") {
      const p = pagination as Record<string, unknown>;
      if (typeof p.total === "number" && typeof p.pages === "number") {
        return {
          total: p.total as number,
          pages: p.pages as number,
          page: (p.page as number) ?? 1,
          per_page: (p.per_page as number) ?? 20,
          has_next: p.has_next === true,
          has_prev: p.has_prev === true,
          next_page: (p.next_page as number | null) ?? null,
          prev_page: (p.prev_page as number | null) ?? null,
        };
      }
    }
  }
  return null;
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

export class AnimalsService {
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

  async listAnimals(
    orgId: string,
    filters: AnimalListFilters = {},
  ): Promise<AnimalListResponse> {
    const query = new URLSearchParams();

    if (typeof filters.classification_id === "number") {
      query.set("classification_id", String(filters.classification_id));
    }

    if (filters.gender?.trim()) {
      query.set("gender", filters.gender.trim());
    }

    if (filters.animal_number?.trim()) {
      query.set("animal_number", filters.animal_number.trim());
    }

    if (typeof filters.page === "number" && filters.page > 0) {
      query.set("page", String(filters.page));
    }

    if (typeof filters.per_page === "number" && filters.per_page > 0) {
      query.set("per_page", String(filters.per_page));
    }

    const queryString = query.toString();
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/animals${queryString ? `?${queryString}` : ""}`,
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
          `Failed to load animals: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as unknown;
    const items = extractList<AnimalApiModel>(payload).map(mapAnimal);
    const pagination = extractPagination(payload);
    return {
      items,
      pagination: pagination ?? {
        total: items.length,
        pages: 1,
        page: 1,
        per_page: items.length || 20,
        has_next: false,
        has_prev: false,
        next_page: null,
        prev_page: null,
      },
    };
  }

  async getAnimalById(orgId: string, animalId: string): Promise<Animal> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/animals/${encodeURIComponent(animalId)}`,
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
          `Failed to load animal: ${response.status}`,
        ),
      );
    }

    const payload = (await response.json()) as AnimalApiModel;
    return mapAnimal(payload);
  }

  async registerAnimal(orgId: string, input: AnimalInput): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/animals`,
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
          `Failed to register animal: ${response.status}`,
        ),
      );
    }
  }

  async updateAnimal(
    orgId: string,
    animalId: string,
    input: AnimalInput,
  ): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/animals/${encodeURIComponent(animalId)}`,
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
          `Failed to update animal: ${response.status}`,
        ),
      );
    }
  }

  async deleteAnimal(orgId: string, animalId: string): Promise<void> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/animals/${encodeURIComponent(animalId)}`,
      {
        method: "DELETE",
        headers: this.createHeaders(false),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          `Failed to delete animal: ${response.status}`,
        ),
      );
    }
  }
}

export const animalsService = new AnimalsService();
