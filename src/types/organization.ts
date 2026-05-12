export interface OrganizationSummary {
  id: string;
  name: string;
  domain: string;
  scope: "Platform" | "Tenant";
}
