import type {
  NavigationGroup,
  NavigationItem,
  OrganizationOption,
  UserTier,
} from "@/types/sats-api";

export const userTierLabels: Record<UserTier, string> = {
  "system-administrator": "System Administrator",
  "organization-administrator": "Organization Administrator",
  operator: "Operational User",
};

export const navigationGroups: NavigationGroup[] = [
  {
    key: "command",
    label: "Command Apps",
    description: "Operational control, telemetry, and wildlife workspaces.",
  },
  {
    key: "operations",
    label: "Operational Apps",
    description:
      "Field services, filtering, collaboration, and media handling.",
  },
  {
    key: "governance",
    label: "Governance Apps",
    description: "Tenant administration, identities, and enterprise oversight.",
  },
  {
    key: "platform",
    label: "Platform Apps",
    description: "Global configuration, imports, and backend-level control.",
  },
];

export const organizationContextOptions: OrganizationOption[] = [
  {
    id: "platform-authority",
    name: "SATS Platform Authority",
    domain: "platform.sats.local",
    scope: "Platform",
  },
  {
    id: "org-001",
    name: "Tsavo Conservation Authority",
    domain: "tsavo.sats.local",
    scope: "Tenant",
  },
  {
    id: "org-002",
    name: "Savannah Research Institute",
    domain: "sri.sats.local",
    scope: "Tenant",
  },
  {
    id: "org-003",
    name: "Rift Valley Wildlife Enterprise",
    domain: "rift.sats.local",
    scope: "Tenant",
  },
];

export const primaryNavigation: NavigationItem[] = [
  {
    key: "overview",
    href: "/",
    label: "Command Center",
    description: "Cross-module operational overview and platform visibility",
    group: "command",
    scope: "Cross-organization",
    status: "Live",
    tiers: ["system-administrator", "organization-administrator", "operator"],
    workspaceTitle: "Command Center",
    workspaceSubtitle:
      "Monitor telemetry, health posture, operational readiness, and cross-module activity.",
    capabilities: [
      "Global search",
      "Operational KPIs",
      "Alert queue",
      "System readiness",
    ],
    workspaceAreas: [
      {
        title: "Executive overview",
        summary:
          "Consolidated visibility for movement, health, devices, and tenant posture.",
      },
      {
        title: "Incident desk",
        summary:
          "Central queue for urgent alerts, escalations, and follow-up actions.",
      },
    ],
  },
  {
    key: "tracking",
    href: "/tracking",
    label: "Tracking",
    description: "Live telemetry, route intelligence, and geofence activity",
    group: "command",
    scope: "Organization",
    status: "Live",
    tiers: ["organization-administrator", "operator"],
    workspaceTitle: "Tracking Workspace",
    workspaceSubtitle:
      "Inspect movement streams, route history, map events, and protected-area breaches.",
    capabilities: [
      "Real-time GPS",
      "Geofence control",
      "Movement analysis",
      "Spatial events",
    ],
    workspaceAreas: [
      {
        title: "Live map operations",
        summary:
          "Watch active movement, current coordinates, and escalation-ready breaches.",
      },
      {
        title: "History and playback",
        summary:
          "Review movement paths, timestamps, and protected-area transitions.",
      },
    ],
  },
  {
    key: "animals",
    href: "/animals",
    label: "Animals",
    description: "Registry, taxonomy, device links, and conservation records",
    group: "command",
    scope: "Organization",
    status: "Live",
    tiers: ["organization-administrator", "operator"],
    workspaceTitle: "Animal Management",
    workspaceSubtitle:
      "Manage classifications, tagged animals, field records, and assigned devices.",
    capabilities: [
      "Animal registry",
      "Classification hierarchy",
      "Assignment history",
      "Conservation status",
    ],
    workspaceAreas: [
      {
        title: "Registry desk",
        summary:
          "Create, update, and review animal records and tracking associations.",
      },
      {
        title: "Taxonomy workspace",
        summary:
          "Maintain species hierarchy and conservation metadata across organizations.",
      },
    ],
  },
  {
    key: "health",
    href: "/health",
    label: "Health",
    description: "Biometrics, AI predictions, and anomaly management",
    group: "command",
    scope: "Organization",
    status: "Live",
    tiers: ["organization-administrator", "operator"],
    workspaceTitle: "Health Management",
    workspaceSubtitle:
      "Handle biometric telemetry, risk predictions, anomaly review, and veterinarian workflows.",
    capabilities: [
      "Vital sign streams",
      "AI health scoring",
      "Anomaly review",
      "Trend analysis",
    ],
    workspaceAreas: [
      {
        title: "Clinical command desk",
        summary:
          "Review critical and at-risk cases, model confidence, and intervention cues.",
      },
      {
        title: "Trend analytics",
        summary:
          "Track changes in heart rate, temperature, activity, and recovery patterns.",
      },
    ],
  },
  {
    key: "devices",
    href: "/devices",
    label: "Devices",
    description: "Hardware fleet, sensors, firmware, battery, and maintenance",
    group: "operations",
    scope: "Organization",
    status: "Live",
    tiers: ["organization-administrator", "operator"],
    workspaceTitle: "Device Management",
    workspaceSubtitle:
      "Oversee collar and tag lifecycle, sensor capabilities, firmware posture, and maintenance readiness.",
    capabilities: [
      "Device registry",
      "Sensor profiles",
      "Battery monitoring",
      "Maintenance queue",
    ],
    workspaceAreas: [
      {
        title: "Fleet operations",
        summary:
          "Monitor hardware availability, communication type, and field assignments.",
      },
      {
        title: "Service readiness",
        summary:
          "Track firmware drift, low battery, and maintenance interventions.",
      },
    ],
  },
  {
    key: "video",
    href: "/video",
    label: "Video Monitoring",
    description:
      "Streams, archived clips, camera registry, and spatial evidence",
    group: "operations",
    scope: "Organization",
    status: "Live",
    tiers: ["organization-administrator", "operator"],
    workspaceTitle: "Video Streaming and Monitoring",
    workspaceSubtitle:
      "Link field cameras, live streams, archived clips, and geospatial evidence to tracked activity.",
    capabilities: [
      "Camera registry",
      "Live streams",
      "Clip indexing",
      "Map alignment",
    ],
    workspaceAreas: [
      {
        title: "Streaming console",
        summary:
          "Monitor active feeds and correlate them with geofence or movement events.",
      },
      {
        title: "Evidence archive",
        summary:
          "Browse clips, detected activities, and time-synced incident footage.",
      },
    ],
  },
  {
    key: "notifications",
    href: "/notifications",
    label: "Notifications & Chat",
    description: "Alerts, escalations, acknowledgement, and internal messaging",
    group: "operations",
    scope: "Cross-organization",
    status: "Live",
    tiers: ["system-administrator", "organization-administrator", "operator"],
    workspaceTitle: "Notifications and Collaboration",
    workspaceSubtitle:
      "Coordinate alerting, acknowledgement, escalation, and internal operational communication.",
    capabilities: [
      "Alert center",
      "Unread queue",
      "Escalation rules",
      "Internal messaging",
    ],
    workspaceAreas: [
      {
        title: "Alert operations",
        summary:
          "Receive health, device, and geofence incidents with workflow state tracking.",
      },
      {
        title: "Team messaging",
        summary:
          "Support ranger, veterinarian, and management coordination in context.",
      },
    ],
  },
  {
    key: "filters",
    href: "/filters",
    label: "Filters",
    description: "Reusable filters, presets, and query models across modules",
    group: "operations",
    scope: "Cross-organization",
    status: "Live",
    tiers: ["system-administrator", "organization-administrator", "operator"],
    workspaceTitle: "Filters Engine",
    workspaceSubtitle:
      "Manage reusable filter presets and query models across tracking, devices, animals, and reports.",
    capabilities: [
      "Preset filters",
      "Query definitions",
      "Cross-module search",
      "Saved views",
    ],
    workspaceAreas: [
      {
        title: "Filter designer",
        summary:
          "Define and store reusable criteria by location, species, health, and device state.",
      },
      {
        title: "Applied views",
        summary:
          "Bind shared filters to workspaces, reports, and alert queues.",
      },
    ],
  },
  {
    key: "reports",
    href: "/reports",
    label: "Reports",
    description: "Exports, analytics, publication queue, and reporting runs",
    group: "operations",
    scope: "Cross-organization",
    status: "Live",
    tiers: ["system-administrator", "organization-administrator"],
    workspaceTitle: "Reports Workspace",
    workspaceSubtitle:
      "Generate exports, review analytics, and schedule movement, health, and reliability reports.",
    capabilities: [
      "Scheduled reports",
      "Export formats",
      "Analytics output",
      "Publication queue",
    ],
    workspaceAreas: [
      {
        title: "Reporting queue",
        summary:
          "Manage report generation, review status, and publish operational outputs.",
      },
      {
        title: "Analytics library",
        summary:
          "Organize movement, health, device, and compliance reporting artifacts.",
      },
    ],
  },
  {
    key: "organizations",
    href: "/organizations",
    label: "Organizations",
    description: "Tenant registry, subscriptions, branding, and local nodes",
    group: "governance",
    scope: "Cross-organization",
    status: "Live",
    tiers: ["system-administrator", "organization-administrator"],
    workspaceTitle: "Organization Workspace",
    workspaceSubtitle:
      "Coordinate subscriptions, tenant operations, local nodes, and enterprise-scale organization management.",
    capabilities: [
      "Tenant registry",
      "Subscriptions",
      "Branding and domains",
      "Local node visibility",
    ],
    workspaceAreas: [
      {
        title: "Tenant administration",
        summary:
          "Manage organizations, ownership, subscriptions, and operational scale.",
      },
      {
        title: "Edge infrastructure",
        summary:
          "Monitor local nodes, sync posture, and control room services by tenant.",
      },
    ],
  },
  {
    key: "users",
    href: "/users",
    label: "Users",
    description: "RBAC, memberships, roles, and account administration",
    group: "governance",
    scope: "Cross-organization",
    status: "Live",
    tiers: ["system-administrator", "organization-administrator"],
    workspaceTitle: "User Management",
    workspaceSubtitle:
      "Handle multi-level user accounts, role assignments, and organization-bound access control.",
    capabilities: [
      "User directory",
      "Roles and permissions",
      "Access isolation",
      "Account states",
    ],
    workspaceAreas: [
      {
        title: "Identity operations",
        summary:
          "Create and manage system users, organizational users, and account lifecycle states.",
      },
      {
        title: "RBAC designer",
        summary:
          "Map permissions, roles, and approval flows across system and tenant boundaries.",
      },
    ],
  },
  {
    key: "administrator",
    href: "/administrator",
    label: "Administrator",
    description:
      "Global enterprise oversight, domains, and backend access control",
    group: "governance",
    scope: "System",
    status: "Live",
    tiers: ["system-administrator"],
    workspaceTitle: "Administrator Console",
    workspaceSubtitle:
      "Run global platform administration, tenant onboarding, domain control, and enterprise support operations.",
    capabilities: [
      "Domain mapping",
      "Enterprise onboarding",
      "Global support",
      "Platform oversight",
    ],
    workspaceAreas: [
      {
        title: "Enterprise onboarding",
        summary:
          "Configure new organizations, domains, backend access, and rollout readiness.",
      },
      {
        title: "Platform support desk",
        summary:
          "Assist tenants and supervise system-wide health from a global administrator viewpoint.",
      },
    ],
  },
  {
    key: "migration",
    href: "/data-migration",
    label: "Data Migration",
    description:
      "Bulk import, export, template validation, and exchange workflows",
    group: "platform",
    scope: "Cross-organization",
    status: "Live",
    tiers: ["system-administrator", "organization-administrator"],
    workspaceTitle: "Data Migration",
    workspaceSubtitle:
      "Operate bulk imports, exports, validation queues, and structured exchange with external systems.",
    capabilities: [
      "Import jobs",
      "Export jobs",
      "Template validation",
      "Error resolution",
    ],
    workspaceAreas: [
      {
        title: "Import operations",
        summary:
          "Load animals, devices, historical tracking data, and users with validation visibility.",
      },
      {
        title: "Export and backup",
        summary:
          "Generate compliant extracts, archival outputs, and external data handoff packages.",
      },
    ],
  },
  {
    key: "system-management",
    href: "/system-management",
    label: "System Management",
    description:
      "Security policy, configuration, branding, and runtime controls",
    group: "platform",
    scope: "System",
    status: "Scaffolded",
    tiers: ["system-administrator"],
    workspaceTitle: "System Management",
    workspaceSubtitle:
      "Administer authentication, security policy, branding defaults, and runtime configuration.",
    capabilities: [
      "Security policy",
      "Authentication settings",
      "Branding defaults",
      "Runtime controls",
    ],
    workspaceAreas: [
      {
        title: "Security and auth",
        summary:
          "Control 2FA, session policy, login methods, and environment security posture.",
      },
      {
        title: "Platform configuration",
        summary:
          "Manage UI defaults, sync cadence, backups, and tenant-ready global settings.",
      },
    ],
  },
];

export function getNavigationItem(pathname: string) {
  return (
    primaryNavigation.find((item) => item.href === pathname) ??
    primaryNavigation[0]
  );
}

export function getVisibleNavigationItems(tier: UserTier) {
  return primaryNavigation.filter((item) => item.tiers.includes(tier));
}
