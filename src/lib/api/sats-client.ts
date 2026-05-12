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

interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

interface GeofenceApiModel {
  geofence_id?: string | number;
  id?: string | number;
  park_name: string;
  boundary: GeoJsonPolygon;
  description?: string | null;
  created_by?: string | null;
  createdBy?: string | null;
  organization_id?: string | null;
}
import {
  getAccessToken,
  getSessionData,
  getUserOrganizationId,
} from "@/lib/auth-tokens";
import { appConfig } from "@/lib/config";

async function requestJson<T>(path: string): Promise<T> {
  const accessToken = getAccessToken();
  const organizationId = getUserOrganizationId();
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

  if (organizationId) {
    headers.set("organization_id", organizationId);
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
  return fetchTrackingFromApi();
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

async function fetchTrackingFromApi(): Promise<TrackingPageResponse> {
  const organizationId = getUserOrganizationId();

  if (!organizationId) {
    return {
      hero: {
        eyebrow: "Tracking module",
        title: "Live location intelligence",
        description:
          "No organization context is available for this session. Please sign in again or select an organization.",
      },
      metrics: [
        {
          label: "Tracked animals online",
          value: "0",
          change: "No telemetry feed connected",
          tone: "warning",
        },
        {
          label: "Active geofences",
          value: "0",
          change: "Organization context missing",
          tone: "warning",
        },
        {
          label: "Telemetry cadence",
          value: "N/A",
          change: "Awaiting backend stream",
          tone: "stable",
        },
      ],
      channels: ["API"],
      trackedAnimals: [],
      geofenceEvents: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const payload = await requestJson<unknown>(
    `/organisations/${encodeURIComponent(organizationId)}/geofences`,
  );

  const geofences = extractList<GeofenceApiModel>(payload);

  return {
    hero: {
      eyebrow: "Tracking module",
      title: "Live location intelligence",
      description:
        "Tracking workspace is now backed by live organization geofence records from the API.",
    },
    metrics: [
      {
        label: "Tracked animals online",
        value: "0",
        change: "Telemetry endpoint not yet mapped",
        tone: "warning",
      },
      {
        label: "Active geofences",
        value: String(geofences.length),
        change: "Loaded from backend",
        tone: "positive",
      },
      {
        label: "Telemetry cadence",
        value: "N/A",
        change: "Awaiting tracking telemetry integration",
        tone: "stable",
      },
    ],
    channels: ["Geofence API"],
    trackedAnimals: [],
    geofenceEvents: geofences.map((item) => ({
      id: String(item.geofence_id ?? item.id ?? ""),
      parkName: item.park_name,
      animalName: "Not linked",
      status: "Inside",
      region: item.park_name,
      timestamp: new Date().toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  };
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
  const organizationId = getUserOrganizationId();
  const headers = new Headers({ "Content-Type": "application/json" });
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  if (organizationId) {
    headers.set("organization_id", organizationId);
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
  const isSystemAdmin = Boolean(getSessionData()?.user.is_system_admin);

  if (!isSystemAdmin) {
    const item = await requestJson<OrganizationApiItem>("/organisations/me");

    return {
      hero: {
        eyebrow: "My Organization",
        title: "My Organization",
        description: "Organization details scoped to your account.",
      },
      metrics: [],
      organizations: [
        {
          id: item.id,
          organizationName: item.organization_name,
          location: item.location,
          domain: item.domain,
          subscriptionStatus: item.subscription_status,
          activeAnimals: 0,
          activeDevices: 0,
          contactPerson: item.contact_person,
        },
      ],
      subscriptions: [],
      nodes: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const data = await requestJson<OrganizationsApiResponse>("/organisations");

  return {
    hero: {
      eyebrow: "Organization Directory",
      title: "Organizations",
      description: data.message,
    },
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
