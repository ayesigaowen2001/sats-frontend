import type { PermissionGrant } from "@/lib/rbac";

const ACCESS_TOKEN_KEY = "sats_access_token";
const REFRESH_TOKEN_KEY = "sats_refresh_token";
const TOKEN_TYPE_KEY = "sats_token_type";
const EXPIRES_IN_KEY = "sats_expires_in";
const TOKEN_EXPIRY_TIME_KEY = "sats_token_expiry_time";
const SESSION_DATA_KEY = "sats_session_data";

export interface StoredAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface SessionData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiryTime: number; // Unix timestamp when token expires
  permissions?: PermissionGrant[];
  user: {
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
  };
  loginTime: number; // Unix timestamp when user logged in
}

function canUseStorage() {
  return typeof window !== "undefined";
}

export function setAuthTokens(
  tokens: StoredAuthTokens,
  user?: any,
  permissions?: PermissionGrant[],
) {
  if (!canUseStorage()) {
    return;
  }

  const now = Date.now();
  const expiryTime = now + tokens.expiresIn * 1000; // Convert seconds to milliseconds

  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  window.localStorage.setItem(TOKEN_TYPE_KEY, tokens.tokenType);
  window.localStorage.setItem(EXPIRES_IN_KEY, String(tokens.expiresIn));
  window.localStorage.setItem(TOKEN_EXPIRY_TIME_KEY, String(expiryTime));

  // Store comprehensive session data
  if (user) {
    const sessionData: SessionData = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresIn: tokens.expiresIn,
      expiryTime,
      permissions: permissions ?? [],
      user,
      loginTime: now,
    };
    window.localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
    console.log("Session data stored:", sessionData);
  }
}

export function setSessionPermissions(permissions: PermissionGrant[]) {
  if (!canUseStorage()) {
    return;
  }

  const sessionData = getSessionData();

  if (!sessionData) {
    return;
  }

  sessionData.permissions = permissions;
  window.localStorage.setItem(SESSION_DATA_KEY, JSON.stringify(sessionData));
}

export function getAccessToken() {
  if (!canUseStorage()) {
    return "";
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
}

export function getSessionData(): SessionData | null {
  if (!canUseStorage()) {
    return null;
  }

  const data = window.localStorage.getItem(SESSION_DATA_KEY);
  return data ? JSON.parse(data) : null;
}

export function getSessionPermissions(): PermissionGrant[] {
  return getSessionData()?.permissions ?? [];
}

export function getUserOrganizationId(): string {
  return getSessionData()?.user.organization_id ?? "";
}

export function getTokenExpiryTime(): number | null {
  if (!canUseStorage()) {
    return null;
  }

  const expiryTime = window.localStorage.getItem(TOKEN_EXPIRY_TIME_KEY);
  return expiryTime ? Number(expiryTime) : null;
}

export function isTokenExpired(): boolean {
  const expiryTime = getTokenExpiryTime();
  if (!expiryTime) return false;

  return Date.now() >= expiryTime;
}

export function clearAuthTokens() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(TOKEN_TYPE_KEY);
  window.localStorage.removeItem(EXPIRES_IN_KEY);
  window.localStorage.removeItem(TOKEN_EXPIRY_TIME_KEY);
  window.localStorage.removeItem(SESSION_DATA_KEY);
  console.log("Auth tokens and session data cleared");
}
