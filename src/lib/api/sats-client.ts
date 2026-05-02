import type {
  AdministratorPageResponse,
  AnimalsPageResponse,
  DataMigrationPageResponse,
  DevicesPageResponse,
  FiltersPageResponse,
  HealthPageResponse,
  NotificationsPageResponse,
  OrganizationRecord,
  OrganizationsPageResponse,
  OverviewResponse,
  ReportsPageResponse,
  SystemManagementPageResponse,
  TrackingPageResponse,
  UsersPageResponse,
} from "@/types/sats-api";

interface OrganizationApiItem {
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

interface OrganizationsApiResponse {
  items: OrganizationApiItem[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    per_page: number;
    has_next: boolean;
    has_prev: boolean;
    next_page: number | null;
    prev_page: number | null;
  };
  message: string;
}
import { getAccessToken } from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

async function requestJson<T>(path: string): Promise<T> {
  const accessToken = getAccessToken();
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
    console.log(
      `[API Request] ${path} - Bearer token included in Authorization header`,
    );
  } else {
    console.warn(`[API Request] ${path} - No access token found`);
  }

  const requestUrl = path.startsWith("/api/")
    ? path
    : `${appConfig.apiBaseUrl}${path}`;

  const response = await fetch(requestUrl, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    console.error(
      `[API Error] ${path} - Status: ${response.status}`,
      await response
        .clone()
        .json()
        .catch(() => response.statusText),
    );
    throw new Error(
      `Request failed for ${path} with status ${response.status}`,
    );
  }

  const data = (await response.json()) as T;
  console.log(`[API Success] ${path}`, data);
  return data;
}

export function fetchOverview() {
  return requestJson<OverviewResponse>("/api/sats/overview");
}

export function fetchTrackingPage() {
  return requestJson<TrackingPageResponse>("/api/sats/tracking");
}

export function fetchAnimalsPage() {
  return requestJson<AnimalsPageResponse>("/api/sats/animals");
}

export function fetchDevicesPage() {
  return requestJson<DevicesPageResponse>("/api/sats/devices");
}

export async function fetchOrganizationById(
  orgId: string,
): Promise<OrganizationRecord> {
  const accessToken = getAccessToken();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(
    `${appConfig.apiBaseUrl}/organisations/${encodeURIComponent(orgId)}`,
    { cache: "no-store", headers },
  );

  if (!response.ok) {
    throw new Error(`Organisation not found (status ${response.status})`);
  }

  const item = (await response.json()) as OrganizationApiItem;
  return {
    id: item.id,
    organizationName: item.organization_name,
    location: item.location,
    domain: item.domain,
    subscriptionStatus: item.subscription_status,
    activeAnimals: 0,
    activeDevices: 0,
    contactPerson: item.contact_person,
  };
}

export async function fetchOrganizationsPage(): Promise<OrganizationsPageResponse> {
  const data = await requestJson<OrganizationsApiResponse>("/organisations");

  return {
    hero: { title: "Organizations", subtitle: data.message },
    metrics: [],
    organizations: data.items.map((item) => ({
      id: item.id,
      organizationName: item.organization_name,
      location: item.location,
      domain: item.domain,
      subscriptionStatus: item.subscription_status,
      activeAnimals: 0,
      activeDevices: 0,
      contactPerson: item.contact_person,
    })),
    subscriptions: [],
    nodes: [],
    generatedAt: new Date().toISOString(),
  };
}

export function fetchReportsPage() {
  return requestJson<ReportsPageResponse>("/api/sats/reports");
}

export function fetchUsersPage() {
  return requestJson<UsersPageResponse>("/api/sats/users");
}

export function fetchAdministratorPage() {
  return requestJson<AdministratorPageResponse>("/api/sats/administrator");
}

export function fetchHealthPage() {
  return requestJson<HealthPageResponse>("/api/sats/health");
}

export function fetchNotificationsPage() {
  return requestJson<NotificationsPageResponse>("/api/sats/notifications");
}

export function fetchFiltersPage() {
  return requestJson<FiltersPageResponse>("/api/sats/filters");
}

export function fetchDataMigrationPage() {
  return requestJson<DataMigrationPageResponse>("/api/sats/data-migration");
}

export function fetchSystemManagementPage() {
  return requestJson<SystemManagementPageResponse>(
    "/api/sats/system-management",
  );
}
