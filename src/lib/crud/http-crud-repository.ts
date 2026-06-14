import type { CrudRepository } from "@/lib/crud/contracts";
import { getSessionData } from "@/lib/auth-tokens";

interface CrudListPayload<TApiModel> {
  items: TApiModel[];
}

export abstract class HttpCrudRepository<
  TEntity extends { id: string },
  TCreate,
  TUpdate,
  TApiModel,
> implements CrudRepository<TEntity, TCreate, TUpdate> {
  protected abstract resourcePath: string;
  protected abstract mapToEntity(apiModel: TApiModel): TEntity;
  protected abstract mapCreatePayload(input: TCreate): unknown;
  protected abstract mapUpdatePayload(input: TUpdate): unknown;
  protected abstract getBaseUrl(): string;
  protected abstract getAccessToken(): string | null;

  async list(): Promise<TEntity[]> {
    const response = await this.request(this.resourcePath, { method: "GET" });
    const payload = (await response.json()) as unknown;

    const list = this.extractList(payload);
    return list.map((item) => this.mapToEntity(item));
  }

  async getById(id: string): Promise<TEntity> {
    const response = await this.request(
      `${this.resourcePath}/${encodeURIComponent(id)}`,
      {
        method: "GET",
      },
    );
    const payload = (await response.json()) as TApiModel;

    return this.mapToEntity(payload);
  }

  async create(input: TCreate): Promise<void> {
    await this.request(this.resourcePath, {
      method: "POST",
      body: JSON.stringify(this.mapCreatePayload(input)),
    });
  }

  async update(id: string, input: TUpdate): Promise<void> {
    await this.request(`${this.resourcePath}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(this.mapUpdatePayload(input)),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request(`${this.resourcePath}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
  }

  private extractList(payload: unknown): TApiModel[] {
    if (Array.isArray(payload)) {
      return payload as TApiModel[];
    }

    if (payload && typeof payload === "object" && "items" in payload) {
      return (payload as CrudListPayload<TApiModel>).items;
    }

    return [];
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const accessToken = this.getAccessToken();
    const organizationId = getSessionData()?.user.organization_id;
    const headers = new Headers({
      Accept: "application/json",
      ...this.normalizeHeaders(init.headers),
    });

    if (init.body) {
      headers.set("Content-Type", "application/json");
    }

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    if (organizationId) {
      headers.set("organization_id", organizationId);
    }

    const response = await fetch(`${this.getBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errorMessage =
        response.status === 403
          ? `Access denied: You do not have permission to perform this action on ${this.resourcePath}. (403)`
          : response.status === 401
            ? `Authentication required: Please sign in again. (401)`
            : response.status === 404
              ? `Resource not found: The requested ${this.resourcePath} item does not exist. (404)`
              : `Request failed for ${path} with status ${response.status}`;

      throw new Error(errorMessage);
    }

    return response;
  }

  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) {
      return {};
    }

    if (headers instanceof Headers) {
      return Object.fromEntries(headers.entries());
    }

    if (Array.isArray(headers)) {
      return Object.fromEntries(headers);
    }

    return headers;
  }
}
