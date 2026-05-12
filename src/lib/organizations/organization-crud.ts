import { getAccessToken, getSessionData } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";
import type { CrudRepository } from "@/lib/crud/contracts";
import { HttpCrudRepository } from "@/lib/crud/http-crud-repository";

export interface Organization {
  id: string;
  organization_name: string;
  location: string;
  country: string;
  domain: string;
  contact_person: string;
  email: string;
  phone: string;
  subscription_status: string;
  subscription_expiry: string;
}

export type OrganizationInput = Omit<Organization, "id">;

interface OrganizationApiModel {
  id: string;
  organization_name: string;
  location: string;
  country: string;
  domain: string;
  contact_person: string;
  email: string;
  phone: string;
  subscription_status: string;
  subscription_expiry: string;
}

class OrganizationRepository extends HttpCrudRepository<
  Organization,
  OrganizationInput,
  OrganizationInput,
  OrganizationApiModel
> {
  protected resourcePath = "/organisations";

  protected mapToEntity(apiModel: OrganizationApiModel): Organization {
    return {
      id: apiModel.id,
      organization_name: apiModel.organization_name,
      location: apiModel.location,
      country: apiModel.country,
      domain: apiModel.domain,
      contact_person: apiModel.contact_person,
      email: apiModel.email,
      phone: apiModel.phone,
      subscription_status: apiModel.subscription_status,
      subscription_expiry: apiModel.subscription_expiry,
    };
  }

  protected mapCreatePayload(input: OrganizationInput): unknown {
    return input;
  }

  protected mapUpdatePayload(input: OrganizationInput): unknown {
    return input;
  }

  protected getBaseUrl(): string {
    return appConfig.apiBaseUrl;
  }

  protected getAccessToken(): string | null {
    return getAccessToken();
  }
}

export class OrganizationCrudService {
  constructor(
    private readonly repository: CrudRepository<
      Organization,
      OrganizationInput,
      OrganizationInput
    >,
  ) {}

  async listOrganizations() {
    const sessionData = getSessionData();
    const isSystemAdmin = Boolean(sessionData?.user.is_system_admin);
    const accessToken = getAccessToken();

    if (isSystemAdmin || !accessToken) {
      return this.repository.list();
    }

    const response = await fetch(`${appConfig.apiBaseUrl}/organisations/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load organization: ${response.status}`);
    }

    const item = (await response.json()) as OrganizationApiModel;
    return [
      {
        id: item.id,
        organization_name: item.organization_name,
        location: item.location,
        country: item.country,
        domain: item.domain,
        contact_person: item.contact_person,
        email: item.email,
        phone: item.phone,
        subscription_status: item.subscription_status,
        subscription_expiry: item.subscription_expiry,
      },
    ];
  }

  getOrganizationById(id: string) {
    return this.repository.getById(id);
  }

  createOrganization(input: OrganizationInput) {
    return this.repository.create(input);
  }

  updateOrganization(id: string, input: OrganizationInput) {
    return this.repository.update(id, input);
  }

  deleteOrganization(id: string) {
    return this.repository.delete(id);
  }
}

export const defaultOrganizationInput: OrganizationInput = {
  organization_name: "",
  location: "",
  country: "",
  domain: "",
  contact_person: "",
  email: "",
  phone: "",
  subscription_status: "Active",
  subscription_expiry: "",
};

export const organizationCrudService = new OrganizationCrudService(
  new OrganizationRepository(),
);
