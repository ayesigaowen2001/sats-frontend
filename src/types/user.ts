export type AppRole =
  | "System Administrator"
  | "Organization Administrator"
  | "Operator";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  organizationId: string;
}
