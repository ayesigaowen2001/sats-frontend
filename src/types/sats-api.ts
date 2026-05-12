import type {
  AlertItem,
  SatsModule,
  SchemaSection,
  StrategicPoint,
  SystemMetric,
  WorkflowPhase,
} from "@/types/sats";

export type ModuleResourceKey =
  | "overview"
  | "tracking"
  | "animals"
  | "devices"
  | "organizations"
  | "reports"
  | "users"
  | "administrator"
  | "health"
  | "notifications"
  | "filters"
  | "dataMigration"
  | "systemManagement";

export type HealthStatus = "Normal" | "At Risk" | "Critical";
export type GeofenceStatus = "Inside" | "Outside" | "Border" | "Breach";

export interface HeroContent {
  eyebrow: string;
  title: string;
  description: string;
}

export type UserTier =
  | "system-administrator"
  | "organization-administrator"
  | "operator";

export type ModuleGroupKey =
  | "command"
  | "operations"
  | "governance"
  | "platform";

export type ModuleScope = "Cross-organization" | "Organization" | "System";

export type ModuleLifecycle = "Live" | "Scaffolded";

export interface ModuleWorkspaceArea {
  title: string;
  summary: string;
}

export interface OrganizationOption {
  id: string;
  name: string;
  domain: string;
  scope: "Platform" | "Tenant";
}

export interface NavigationGroup {
  key: ModuleGroupKey;
  label: string;
  description: string;
}

export interface NavigationItem {
  key: string;
  href: string;
  label: string;
  description: string;
  group: ModuleGroupKey;
  scope: ModuleScope;
  status: ModuleLifecycle;
  tiers: UserTier[];
  workspaceTitle: string;
  workspaceSubtitle: string;
  capabilities: string[];
  workspaceAreas: ModuleWorkspaceArea[];
}

export interface TrackingAsset {
  id: string;
  animalName: string;
  species: string;
  deviceSerial: string;
  region: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  geofenceStatus: GeofenceStatus;
  heartRateBpm: number;
  healthStatus: HealthStatus;
  updatedAt: string;
}

export interface GeofenceEventItem {
  id: string;
  parkName: string;
  animalName: string;
  status: GeofenceStatus;
  region: string;
  timestamp: string;
}

export interface AnimalRecord {
  id: string;
  animalNumber: string;
  commonName: string;
  species: string;
  conservationStatus: string;
  assignedDevice: string;
  healthStatus: HealthStatus;
  location: string;
}

export interface ClassificationSummary {
  id: string;
  commonName: string;
  species: string;
  conservationStatus: string;
  trackedCount: number;
}

export interface DeviceRecord {
  id: string;
  serial: string;
  category: string;
  communicationType: string;
  firmwareVersion: string;
  batteryPercentage: number;
  status: string;
  assignedAnimal: string;
}

export interface SensorCapability {
  id: string;
  sensorName: string;
  unit: string;
  description: string;
}

export interface OrganizationRecord {
  id: string;
  organizationName: string;
  location: string;
  domain: string;
  subscriptionStatus: string;
  activeAnimals: number;
  activeDevices: number;
  contactPerson: string;
}

export interface SubscriptionSnapshot {
  id: string;
  organizationName: string;
  planName: string;
  aiLevel: string;
  videoEnabled: boolean;
  retentionMonths: number;
}

export interface LocalNodeRecord {
  id: string;
  organizationName: string;
  nodeName: string;
  status: string;
  softwareVersion: string;
  lastSeenAt: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  reportType: string;
  format: string;
  period: string;
  generatedAt: string;
  status: string;
}

export interface OverviewResponse {
  hero: HeroContent;
  quickStats: string[];
  metrics: SystemMetric[];
  modules: SatsModule[];
  workflow: WorkflowPhase[];
  schemaSections: SchemaSection[];
  alerts: AlertItem[];
  strategicPoints: StrategicPoint[];
  generatedAt: string;
}

export interface TrackingPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  channels: string[];
  trackedAnimals: TrackingAsset[];
  geofenceEvents: GeofenceEventItem[];
  generatedAt: string;
}

export interface AnimalsPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  animals: AnimalRecord[];
  classifications: ClassificationSummary[];
  generatedAt: string;
}

export interface DevicesPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  devices: DeviceRecord[];
  sensors: SensorCapability[];
  generatedAt: string;
}

export interface OrganizationsPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  organizations: OrganizationRecord[];
  subscriptions: SubscriptionSnapshot[];
  nodes: LocalNodeRecord[];
  generatedAt: string;
}

export interface ReportsPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  reports: ReportRecord[];
  exportFormats: string[];
  generatedAt: string;
}

export interface UserAccountRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  organizationName: string;
  tier: UserTier;
  lastLogin: string;
  roles: string[];
}

export interface RoleRecord {
  id: string;
  name: string;
  scope: ModuleScope;
  isGlobal: boolean;
  memberCount: number;
  organizationName: string;
  description: string;
}

export interface PermissionRecord {
  id: string;
  moduleName: string;
  action: string;
  scope: ModuleScope;
  assignedRoles: string[];
}

export interface UsersPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  users: UserAccountRecord[];
  roles: RoleRecord[];
  permissions: PermissionRecord[];
  generatedAt: string;
}

export interface DomainMappingRecord {
  id: string;
  organizationName: string;
  domain: string;
  status: string;
  sslStatus: string;
  lastCheckedAt: string;
}

export interface OnboardingQueueRecord {
  id: string;
  organizationName: string;
  stage: string;
  owner: string;
  requestedAt: string;
  notes: string;
}

export interface AdministratorPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  domains: DomainMappingRecord[];
  onboardingQueue: OnboardingQueueRecord[];
  generatedAt: string;
}

export interface HealthCaseRecord {
  id: string;
  animalName: string;
  organizationName: string;
  healthStatus: HealthStatus;
  detectedIssue: string;
  confidenceScore: number;
  lastReadingAt: string;
  assignedVeterinarian: string;
}

export interface HealthTrendRecord {
  id: string;
  metric: string;
  window: string;
  baseline: string;
  current: string;
  trend: string;
}

export interface HealthPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  cases: HealthCaseRecord[];
  trends: HealthTrendRecord[];
  generatedAt: string;
}

export interface NotificationRecord {
  id: string;
  type: string;
  severity: "Critical" | "Warning" | "Info";
  status: "Unread" | "Acknowledged" | "Resolved";
  moduleName: string;
  organizationName: string;
  recipient: string;
  message: string;
  createdAt: string;
}

export interface ChatThreadRecord {
  id: string;
  channelName: string;
  participants: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
}

export interface NotificationsPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  notifications: NotificationRecord[];
  threads: ChatThreadRecord[];
  generatedAt: string;
}

export interface FilterPresetRecord {
  id: string;
  name: string;
  targetModule: string;
  criteriaCount: number;
  scope: ModuleScope;
  owner: string;
  lastUsedAt: string;
}

export interface QueryDefinitionRecord {
  id: string;
  name: string;
  target: string;
  expression: string;
  status: string;
}

export interface FiltersPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  presets: FilterPresetRecord[];
  queryDefinitions: QueryDefinitionRecord[];
  generatedAt: string;
}

export interface ImportJobRecord {
  id: string;
  entityType: string;
  fileName: string;
  status: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  createdAt: string;
}

export interface ExportJobRecord {
  id: string;
  name: string;
  format: string;
  status: string;
  requestedBy: string;
  createdAt: string;
}

export interface DataMigrationPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  imports: ImportJobRecord[];
  exports: ExportJobRecord[];
  generatedAt: string;
}

export interface ConfigSettingRecord {
  id: string;
  category: string;
  name: string;
  value: string;
  scope: ModuleScope;
  lastUpdatedAt: string;
}

export interface SecurityPolicyRecord {
  id: string;
  policyName: string;
  status: string;
  enforcementLevel: string;
  lastUpdatedAt: string;
}

export interface SystemManagementPageResponse {
  hero: HeroContent;
  metrics: SystemMetric[];
  settings: ConfigSettingRecord[];
  policies: SecurityPolicyRecord[];
  generatedAt: string;
}
