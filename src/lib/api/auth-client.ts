import { appConfig } from "@/lib/config";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginApiUser {
  id: string;
  name: string;
  email: string;
  status: string;
  is_system_admin: boolean;
  is_node: boolean;
  phone?: string | null;
  organization_id?: string | null;
  granted_by?: string | null;
  granted_at?: string | null;
  admin_notes?: string | null;
  last_login?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: LoginApiUser;
}

async function fetchCurrentUser(accessToken: string): Promise<LoginApiUser> {
  const response = await fetch(`${appConfig.apiBaseUrl}/users/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch current user with status ${response.status}`,
    );
  }

  return (await response.json()) as LoginApiUser;
}

export async function loginWithApi(payload: LoginRequest) {
  const response = await fetch(`${appConfig.apiBaseUrl}/users/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (response.status !== 200) {
    const message =
      response.status === 401
        ? "Invalid email or password"
        : `Login failed with status ${response.status}`;

    throw new Error(message);
  }

  const data = (await response.json()) as LoginResponse;

  if (!data.user.is_system_admin) {
    data.user = await fetchCurrentUser(data.access_token);
  }

  console.log("Login response:", data);
  return data;
}
