import type { ReactNode } from "react";

export interface DashboardNavItem {
  label: string;
  href: string;
  description: string;
}

export interface DashboardModuleDefinition {
  key: string;
  label: string;
  shortLabel: string;
  href: string;
  category: "Operations" | "Governance" | "Platform";
  description: string;
  heroTitle: string;
  heroDescription: string;
  highlights: string[];
  accent: string;
  showInHub: boolean;
  items: DashboardNavItem[];
}

export const dashboardModules: DashboardModuleDefinition[] = [
  {
    key: "hub",
    label: "Module Hub",
    shortLabel: "MH",
    href: "/",
    category: "Operations",
    description:
      "Select the SATS workspace that matches the current operational task.",
    heroTitle: "Operational module hub",
    heroDescription:
      "Move between tracking, health, wildlife administration, and governance workspaces from a single command surface.",
    highlights: ["Cross-module launchpad", "Command metrics", "Unread alerts"],
    accent: "from-[#d3a45d]/30 via-[#0f2f43] to-[#071923]",
    showInHub: false,
    items: [
      {
        label: "Module Hub",
        href: "/",
        description: "Launch operational, governance, and admin modules.",
      },
    ],
  },
  {
    key: "organization",
    label: "Organization Management",
    shortLabel: "OM",
    href: "/organization",
    category: "Governance",
    description:
      "Manage tenants, subscriptions, branding posture, local nodes, and organization audits.",
    heroTitle: "Organization management dashboard",
    heroDescription:
      "Coordinate tenant setup, commercial plans, field-edge infrastructure, and audit visibility across the SATS platform.",
    highlights: ["Subscriptions", "Branding", "Local nodes"],
    accent: "from-[#ca7c52]/30 via-[#1b3145] to-[#081924]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/organization",
        description: "Organization command summary and tenant health.",
      },
      {
        label: "All Organizations",
        href: "/organization/all-organizations",
        description: "Browse and review every onboarded organization.",
      },
      {
        label: "Subscription Plans",
        href: "/organization/subscriptions",
        description: "Compare plans, tiers, and service entitlements.",
      },
      {
        label: "Active Subscriptions",
        href: "/organization/active-subscriptions",
        description: "Inspect currently provisioned commercial subscriptions.",
      },
      {
        label: "Organization Branding",
        href: "/organization/branding",
        description: "Manage logos, domains, and tenant-specific appearance.",
      },
      {
        label: "Local Nodes",
        href: "/organization/local-nodes",
        description:
          "Track edge nodes, sync posture, and control-room services.",
      },
      {
        label: "Audit Logs",
        href: "/organization/audit-log",
        description: "Review change history and administrative actions.",
      },
      {
        label: "System Settings",
        href: "/organization/system-settings",
        description: "Adjust tenant-level defaults and operational policies.",
      },
    ],
  },
  {
    key: "device",
    label: "Device Management",
    shortLabel: "DM",
    href: "/device",
    category: "Operations",
    description:
      "Control field hardware, sensor libraries, assignments, power posture, and maintenance readiness.",
    heroTitle: "Device operations dashboard",
    heroDescription:
      "Oversee collars, tags, implantables, and sensor payloads across the complete device lifecycle.",
    highlights: ["Fleet map", "Sensor library", "Battery status"],
    accent: "from-[#6fc2b0]/25 via-[#16364a] to-[#071923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/device",
        description: "View fleet status and assignment readiness.",
      },
      {
        label: "All Devices",
        href: "/device/all-devices",
        description: "Inspect every device and deployment status.",
      },
      {
        label: "Categories",
        href: "/device/categories",
        description: "Manage device classes and hardware families.",
      },
      {
        label: "Specifications",
        href: "/device/specifications",
        description: "Review firmware, radios, and sensor capabilities.",
      },
      {
        label: "Sensor Library",
        href: "/device/sensor-library",
        description: "Maintain supported biometric and telemetry sensors.",
      },
      {
        label: "Device Assignments",
        href: "/device/assignments",
        description: "Manage device-to-animal assignment records.",
      },
      {
        label: "Battery & Power Status",
        href: "/device/power-status",
        description: "Monitor battery, charging, and uptime posture.",
      },
      {
        label: "Maintenance Logs",
        href: "/device/maintenance-logs",
        description: "Track repairs, calibrations, and field service work.",
      },
    ],
  },
  {
    key: "users",
    label: "User Management",
    shortLabel: "UM",
    href: "/users",
    category: "Governance",
    description:
      "Manage user accounts, administrators, role design, invitations, and audit visibility.",
    heroTitle: "User management dashboard",
    heroDescription:
      "Control system-wide and tenant-bound access with clear RBAC structure and account lifecycle workflows.",
    highlights: ["RBAC", "Administrators", "Invitations"],
    accent: "from-[#d5b264]/25 via-[#20334c] to-[#071923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/users",
        description: "View account posture and role distribution.",
      },
      {
        label: "All Users",
        href: "/users/all",
        description: "Inspect the full user directory.",
      },
      {
        label: "System Administrators",
        href: "/users/administrators",
        description: "Review elevated accounts and ownership.",
      },
      {
        label: "Roles",
        href: "/users/roles",
        description: "Design and manage RBAC role definitions.",
      },
      {
        label: "Permissions",
        href: "/users/permissions",
        description: "View permissions and assign them to roles.",
      },
      {
        label: "User Activity Log",
        href: "/users/activity-log",
        description: "Audit recent user actions and sign-ins.",
      },
      {
        label: "Invite New User",
        href: "/users/invite",
        description: "Send account invitations and onboarding access.",
      },
    ],
  },
  {
    key: "animal",
    label: "Animal Management",
    shortLabel: "AM",
    href: "/animal",
    category: "Operations",
    description:
      "Manage animal registration, taxonomy, tagging history, groups, and spatial visibility.",
    heroTitle: "Animal operations dashboard",
    heroDescription:
      "Maintain wildlife records, taxonomic classifications, device associations, and grouping strategies in one place.",
    highlights: ["Animal registry", "Taxonomy", "Tagging records"],
    accent: "from-[#a5c86c]/25 via-[#173242] to-[#071923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/animal",
        description: "Animal portfolio summary and status visibility.",
      },
      {
        label: "All Animals",
        href: "/animal/all",
        description: "Review every animal record and assignment.",
      },
      {
        label: "Animal Map View",
        href: "/animal/map",
        description: "Explore animal positions and protected areas.",
      },
      {
        label: "Classifications / Taxonomy",
        href: "/animal/classifications",
        description: "Manage species and hierarchy definitions.",
      },
      {
        label: "Add New Animal",
        href: "/animal/create",
        description: "Register a new tracked animal.",
      },
      {
        label: "Tagging Records",
        href: "/animal/tagging-records",
        description: "Inspect historical tagging and device events.",
      },
      {
        label: "Animal Groups",
        href: "/animal/groups",
        description: "Organize herds, pods, packs, and cohorts.",
      },
    ],
  },
  {
    key: "health",
    label: "Health Management",
    shortLabel: "HM",
    href: "/health",
    category: "Operations",
    description:
      "Monitor wildlife biometrics, predictive health scoring, anomaly alerts, and trend analysis.",
    heroTitle: "Health intelligence dashboard",
    heroDescription:
      "Review live telemetry, veterinarian workflows, AI predictions, and health analytics from a dedicated clinical command view.",
    highlights: ["Live monitoring", "Predictions", "Analytics"],
    accent: "from-[#db806c]/25 via-[#21344b] to-[#081923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/health",
        description: "Health overview and risk posture.",
      },
      {
        label: "Live Health Monitoring",
        href: "/health/live",
        description: "Watch current biometrics and live readings.",
      },
      {
        label: "Health Logs",
        href: "/health/logs",
        description: "Review recorded health events and interventions.",
      },
      {
        label: "AI Health Predictions",
        href: "/health/predictions",
        description: "Inspect model output and risk scoring.",
      },
      {
        label: "Health Analytics",
        href: "/health/analytics",
        description: "Analyze long-term health and cohort patterns.",
      },
      {
        label: "Anomaly Alerts",
        href: "/health/anomaly-alerts",
        description: "Prioritize cases that need intervention.",
      },
      {
        label: "Vital Trends",
        href: "/health/vital-trends",
        description: "Explore trajectories across biometric channels.",
      },
    ],
  },
  {
    key: "tracking",
    label: "Tracking",
    shortLabel: "TR",
    href: "/tracking",
    category: "Operations",
    description:
      "Run live telemetry, map views, movement history, geofence enforcement, and tracking reports.",
    heroTitle: "Tracking command dashboard",
    heroDescription:
      "Coordinate live map operations, movement playback, spatial alerts, and protected-area activity from the core SATS module.",
    highlights: ["Live map", "Geofences", "Movement history"],
    accent: "from-[#5fa8e6]/25 via-[#143247] to-[#081923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/tracking",
        description: "Tracking summary, active movement, and event posture.",
      },
      {
        label: "Live Tracking Map",
        href: "/tracking/map",
        description: "Open the live operational map view.",
      },
      {
        label: "Geofences",
        href: "/tracking/geofences",
        description: "Create and manage geofenced areas.",
      },
      {
        label: "Geofence Events / Breaches",
        href: "/tracking/geofence-events",
        description: "Monitor entries, exits, and violations.",
      },
    ],
  },
  {
    key: "video",
    label: "Video Monitoring",
    shortLabel: "VM",
    href: "/video",
    category: "Operations",
    description:
      "Supervise live cameras, archived footage, map overlays, activity detections, and capture settings.",
    heroTitle: "Video monitoring dashboard",
    heroDescription:
      "Link field cameras and archived video evidence to live movement and health incidents across the protected area network.",
    highlights: ["Live cameras", "Archive", "Detections"],
    accent: "from-[#b891e5]/25 via-[#1c2e49] to-[#081923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/video",
        description: "Video command overview and stream health.",
      },
      {
        label: "Live Stream",
        href: "/video/live",
        description: "Stream active camera feeds and tune live view settings.",
      },
      {
        label: "Video Archive",
        href: "/video/archive",
        description: "Browse recorded clips and evidence.",
      },
      {
        label: "Camera Map View",
        href: "/video/map",
        description: "Visualize camera positions on the operational map.",
      },
      {
        label: "Activity Detections",
        href: "/video/activity-detections",
        description: "Review automated detections and flagged events.",
      },
      {
        label: "Video Settings",
        href: "/video/settings",
        description: "Manage retention and stream behavior.",
      },
      {
        label: "Camera Management",
        href: "/video/cameras",
        description: "Create, update, and manage field cameras.",
      },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    shortLabel: "RP",
    href: "/reports",
    category: "Operations",
    description:
      "Generate operational, health, device, and geofence reporting outputs for conservation teams.",
    heroTitle: "Reports and export dashboard",
    heroDescription:
      "Publish ready-to-share reports from movement, health, device performance, and compliance datasets.",
    highlights: ["Generate", "Custom reports", "History"],
    accent: "from-[#e1bb76]/25 via-[#243346] to-[#081923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/reports",
        description: "Reporting queues and export health.",
      },
    ],
  },
  {
    key: "notifications",
    label: "Notifications & Chat",
    shortLabel: "NT",
    href: "/notifications",
    category: "Operations",
    description:
      "Centralize alerts, acknowledgement flows, notification history, and future chat collaboration.",
    heroTitle: "Notification operations dashboard",
    heroDescription:
      "Coordinate cross-team alerts, active incidents, history, settings, and the future collaboration surface for SATS users.",
    highlights: ["Alerts", "History", "Settings"],
    accent: "from-[#f28f86]/25 via-[#28334a] to-[#071923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/notifications",
        description: "Notification status and active escalation overview.",
      },
    ],
  },
  {
    key: "system-management",
    label: "System Management",
    shortLabel: "SM",
    href: "/system-management",
    category: "Platform",
    description:
      "Manage authentication, security posture, backups, retention, and global platform settings.",
    heroTitle: "System management dashboard",
    heroDescription:
      "Handle platform-wide security, recovery, retention, and runtime configuration from a single administrator workspace.",
    highlights: ["Security", "Backups", "Retention"],
    accent: "from-[#d1c470]/25 via-[#253148] to-[#081923]",
    showInHub: true,
    items: [
      {
        label: "Dashboard",
        href: "/system-management",
        description: "Platform settings and compliance posture.",
      },
    ],
  },
  {
    key: "administrator",
    label: "Administrator Console",
    shortLabel: "AD",
    href: "/administrator",
    category: "Platform",
    description:
      "Legacy enterprise administration surface for platform operators.",
    heroTitle: "Administrator console",
    heroDescription:
      "Retained as a dedicated route for global platform oversight and enterprise support operations.",
    highlights: ["Platform oversight", "Tenant onboarding", "Global support"],
    accent: "from-[#d7a56f]/25 via-[#223345] to-[#071923]",
    showInHub: false,
    items: [
      {
        label: "Dashboard",
        href: "/administrator",
        description: "Global administrator oversight workspace.",
      },
    ],
  },
  {
    key: "filters",
    label: "Filters Engine",
    shortLabel: "FE",
    href: "/filters",
    category: "Platform",
    description:
      "Legacy shared filtering and preset route retained for cross-module workflows.",
    heroTitle: "Filters engine",
    heroDescription:
      "Preserve reusable filter definitions and cross-workspace criteria until the broader module refactor is complete.",
    highlights: ["Presets", "Query models", "Saved views"],
    accent: "from-[#79b5d2]/25 via-[#183247] to-[#081923]",
    showInHub: false,
    items: [
      {
        label: "Dashboard",
        href: "/filters",
        description: "Cross-module filter configuration.",
      },
    ],
  },
  {
    key: "data-migration",
    label: "Data Migration",
    shortLabel: "DX",
    href: "/data-migration",
    category: "Platform",
    description:
      "Legacy import-export workspace for validated bulk exchange workflows.",
    heroTitle: "Data migration workspace",
    heroDescription:
      "Retained to support import, export, and validation flows while the main dashboard structure evolves.",
    highlights: ["Imports", "Exports", "Validation"],
    accent: "from-[#7ec3a0]/25 via-[#183246] to-[#081923]",
    showInHub: false,
    items: [
      {
        label: "Dashboard",
        href: "/data-migration",
        description: "Bulk import and export operations.",
      },
    ],
  },
];

export function getDashboardModule(pathname: string) {
  const sortedModules = [...dashboardModules].sort(
    (left, right) => right.href.length - left.href.length,
  );

  return (
    sortedModules.find((dashboardModule) => {
      if (dashboardModule.href === "/") {
        return pathname === "/";
      }

      return (
        pathname === dashboardModule.href ||
        pathname.startsWith(`${dashboardModule.href}/`)
      );
    }) ?? dashboardModules[0]
  );
}

export function getDashboardItem(pathname: string) {
  const activeModule = getDashboardModule(pathname);

  return (
    activeModule.items.find((item) => item.href === pathname) ??
    activeModule.items[0]
  );
}

export function getDefaultSidebarItem(pathname: string) {
  const activeModule = getDashboardModule(pathname);

  return (
    activeModule.items.find(
      (item) => item.label.trim().toLowerCase() !== "dashboard",
    ) ?? activeModule.items[0]
  );
}

export function getModuleSectionSlugs(moduleKey: string) {
  const activeModule = dashboardModules.find((item) => item.key === moduleKey);

  return (activeModule?.items ?? [])
    .filter((item) => item.href !== activeModule?.href)
    .map((item) => item.href.replace(`${activeModule?.href}/`, ""));
}

export function hasModuleSection(moduleKey: string, slug: string) {
  return getModuleSectionSlugs(moduleKey).includes(slug);
}

export function groupDashboardModules() {
  return dashboardModules
    .filter((dashboardModule) => dashboardModule.showInHub)
    .reduce((groups, dashboardModule) => {
      const current = groups.get(dashboardModule.category) ?? [];
      current.push(dashboardModule);
      groups.set(dashboardModule.category, current);
      return groups;
    }, new Map<DashboardModuleDefinition["category"], DashboardModuleDefinition[]>());
}

export function getDashboardModuleMetadata(pathname: string) {
  const activeModule = getDashboardModule(pathname);
  const item = getDashboardItem(pathname);

  return {
    module: activeModule,
    item,
    breadcrumbs: [
      { label: "Module Hub", href: "/" },
      ...(activeModule.href === "/"
        ? []
        : [{ label: activeModule.label, href: activeModule.href }]),
      ...(item.href !== activeModule.href
        ? [{ label: item.label, href: item.href }]
        : []),
    ],
  };
}

export function renderInitials(label: string): ReactNode {
  return label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
