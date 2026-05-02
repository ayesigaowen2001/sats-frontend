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
  animal_number: string;
  classification_id: number;
  device_id?: string | null;
  common_name: string;
  gender: string;
  age: number;
  weight_kg: number;
  date_tagged: string;
  location_tagged?: [number | null, number | null] | null;
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

  async listAnimals(orgId: string): Promise<Animal[]> {
    const response = await fetch(
      `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}/animals`,
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
    return extractList<AnimalApiModel>(payload).map(mapAnimal);
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
