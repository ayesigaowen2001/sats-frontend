import type {
  AlertItem,
  SatsModule,
  SchemaSection,
  StrategicPoint,
  SystemMetric,
  WorkflowPhase,
} from "@/types/sats";

export const systemMetrics: SystemMetric[] = [
  {
    label: "Managed organizations",
    value: "24",
    change: "+3 onboarding this quarter",
    tone: "positive",
  },
  {
    label: "Active tracked animals",
    value: "18,240",
    change: "96% telemetry freshness",
    tone: "stable",
  },
  {
    label: "Field device uptime",
    value: "99.2%",
    change: "LoRa primary, GSM fallback",
    tone: "positive",
  },
  {
    label: "Open critical alerts",
    value: "07",
    change: "2 need veterinarian review",
    tone: "warning",
  },
];

export const modules: SatsModule[] = [
  {
    name: "Tracking Module",
    purpose:
      "Live GPS telemetry, movement history, route analysis, and geofence enforcement.",
    highlights: [
      "Map playback",
      "Geofence status",
      "Movement anomaly detection",
    ],
    integrations: ["Notifications", "Video", "Reports"],
    status: "Core",
  },
  {
    name: "Health Management",
    purpose:
      "Real-time biometric monitoring with AI-backed risk scoring for wildlife health.",
    highlights: [
      "Heart rate streams",
      "Temperature trends",
      "AI health predictions",
    ],
    integrations: ["Tracking", "Notifications", "Reports"],
    status: "Core",
  },
  {
    name: "Animal Management",
    purpose:
      "Taxonomy, registration, tagging records, and device association for each animal.",
    highlights: ["Classification hierarchy", "Tag history", "Animal dossiers"],
    integrations: ["Devices", "Tracking", "Health"],
    status: "Core",
  },
  {
    name: "Device Management",
    purpose:
      "Lifecycle control for collars, implantables, tags, and their sensor payloads.",
    highlights: ["Firmware status", "Battery telemetry", "Assignment history"],
    integrations: ["Tracking", "Health", "Notifications"],
    status: "Core",
  },
  {
    name: "Organization Management",
    purpose:
      "Multi-tenant administration for subscriptions, branding, local nodes, and audit trails.",
    highlights: ["Subscription plans", "Node visibility", "Audit logging"],
    integrations: ["Administrator", "Users", "System settings"],
    status: "Operational",
  },
  {
    name: "User Management",
    purpose:
      "RBAC across global admins, park managers, rangers, veterinarians, and analysts.",
    highlights: ["Role templates", "Permission matrix", "Org isolation"],
    integrations: ["System management", "Audit logging", "Chat"],
    status: "Operational",
  },
  {
    name: "Data Migration",
    purpose:
      "Validated import and export pipelines for animals, devices, tracking history, and user data.",
    highlights: ["CSV templates", "Bulk validation", "Export workflows"],
    integrations: ["Animals", "Devices", "Reports"],
    status: "Operational",
  },
  {
    name: "Video Monitoring",
    purpose:
      "Live and archived camera streams aligned with spatial events and tracked animals.",
    highlights: ["Geo-tagged clips", "Activity correlation", "Camera registry"],
    integrations: ["Tracking", "AI roadmap", "Filters"],
    status: "Operational",
  },
  {
    name: "Notifications & Chat",
    purpose:
      "Operational alerts and internal collaboration between field teams and command staff.",
    highlights: ["Health alerts", "Low battery warnings", "Incident messaging"],
    integrations: ["Health", "Tracking", "Geofencing"],
    status: "Operational",
  },
  {
    name: "Reports Module",
    purpose:
      "Decision support through exports, dashboards, trend analysis, and incident reporting.",
    highlights: [
      "Movement patterns",
      "Reliability analytics",
      "Custom exports",
    ],
    integrations: ["All major modules"],
    status: "Operational",
  },
  {
    name: "Filters Engine",
    purpose:
      "Cross-module filtering for species, health status, location, battery, and organization.",
    highlights: [
      "Compound criteria",
      "Shared filter presets",
      "API-aligned definitions",
    ],
    integrations: ["Dashboard", "Tracking", "Reports"],
    status: "Planned",
  },
  {
    name: "System Management",
    purpose:
      "Security policy, branding, authentication mode, backup, and session configuration.",
    highlights: ["2FA controls", "Theme settings", "Sync intervals"],
    integrations: ["Authentication", "Organization branding"],
    status: "Operational",
  },
];

export const workflow: WorkflowPhase[] = [
  {
    title: "1. Initialize",
    summary:
      "Onboard organizations, register devices, load classifications, and assign animals.",
  },
  {
    title: "2. Collect",
    summary:
      "Field devices gather GPS, biometric, battery, and camera data streams.",
  },
  {
    title: "3. Transmit",
    summary:
      "LoRa handles primary telemetry, with GSM or satellite as remote-area failover.",
  },
  {
    title: "4. Ingest",
    summary:
      "Cloud pipelines validate payloads, persist events, and prepare analytics-ready records.",
  },
  {
    title: "5. Detect",
    summary:
      "Geofencing, device monitoring, and AI health models identify emerging risks.",
  },
  {
    title: "6. Respond",
    summary:
      "Rangers and veterinarians work from alerts, maps, and video evidence in one workspace.",
  },
  {
    title: "7. Improve",
    summary:
      "Reports and longitudinal trends guide conservation strategy and operational tuning.",
  },
];

export const schemaSections: SchemaSection[] = [
  {
    title: "Organizations and access",
    description:
      "Multi-tenant foundations, subscriptions, branding, audit trails, and RBAC.",
    rows: [
      {
        name: "organizations",
        fields: [
          "organization_id",
          "organization_name",
          "domain",
          "subscription_status",
        ],
      },
      {
        name: "users / system_admin_users",
        fields: ["user_id", "organization_id", "email", "status", "last_login"],
      },
      {
        name: "roles / permissions",
        fields: ["role_name", "module_name", "action", "is_global"],
      },
    ],
  },
  {
    title: "Animals and devices",
    description:
      "Taxonomy, hardware capabilities, sensor configuration, and assignment lifecycle.",
    rows: [
      {
        name: "animal_classifications",
        fields: [
          "kingdom",
          "class_name",
          "species",
          "common_name",
          "conservation_status",
        ],
      },
      {
        name: "animals",
        fields: [
          "animal_id",
          "animal_number",
          "classification_id",
          "device_id",
          "location_tagged",
        ],
      },
      {
        name: "devices / device_specifications",
        fields: [
          "device_serial",
          "communication_type",
          "firmware_version",
          "camera_enabled",
        ],
      },
    ],
  },
  {
    title: "Telemetry and intelligence",
    description:
      "Partitioned tracking and health logs support scalable analytics and near-real-time alerts.",
    rows: [
      {
        name: "tracking_logs",
        fields: [
          "animal_id",
          "timestamp",
          "location",
          "speed_kmh",
          "accuracy_m",
        ],
      },
      {
        name: "health_logs",
        fields: [
          "heart_rate_bpm",
          "body_temperature_c",
          "oxygen_level_spo2",
          "activity_level",
        ],
      },
      {
        name: "ai_health_predictions",
        fields: [
          "health_status",
          "confidence_score",
          "detected_issue",
          "model_version",
        ],
      },
    ],
  },
  {
    title: "Events and operations",
    description:
      "Geofences, video clips, notifications, and reports tie field events to action.",
    rows: [
      {
        name: "geofences / geofence_events",
        fields: ["park_name", "boundary", "status", "timestamp"],
      },
      {
        name: "cameras / video_clips",
        fields: [
          "stream_url",
          "geo_coordinates",
          "activity_detected",
          "duration_seconds",
        ],
      },
      {
        name: "notifications / reports",
        fields: ["type", "message", "status", "report_type", "format"],
      },
    ],
  },
];

export const liveAlerts: AlertItem[] = [
  {
    title: "Elephant herd approaching boundary",
    severity: "Critical",
    module: "Tracking Module",
    detail:
      "Geofence event triggered in Northern Corridor with 3 linked collars.",
  },
  {
    title: "Collar SATS-LO-442 battery degradation",
    severity: "Warning",
    module: "Device Management",
    detail:
      "Battery dropped to 14% with abnormal discharge over the last 6 hours.",
  },
  {
    title: "Lioness body temperature spike",
    severity: "Critical",
    module: "Health Management",
    detail:
      "AI model flagged At Risk with 0.91 confidence and injury suspicion.",
  },
  {
    title: "Three new organizations in onboarding",
    severity: "Info",
    module: "Organization Management",
    detail:
      "Branding sync and trial subscription setup pending administrator approval.",
  },
];

export const strategicPoints: StrategicPoint[] = [
  {
    title: "Hybrid telemetry stack",
    summary:
      "LoRa-first communication keeps operating costs down while GSM and satellite cover remote recovery paths.",
  },
  {
    title: "Multi-tenant governance",
    summary:
      "Organizations, domains, subscriptions, branding, and audit records are modeled as first-class system concerns.",
  },
  {
    title: "AI-backed conservation",
    summary:
      "Health predictions and movement anomalies turn raw sensor data into operational intervention windows.",
  },
  {
    title: "Future-ready expansion",
    summary:
      "The schema and UI structure leave space for chat, richer filters, and deeper video analytics without rework.",
  },
];
