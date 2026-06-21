"use client";

import { create } from "zustand";

import { loginWithApi } from "@/lib/api/auth-client";
import {
  clearAuthTokens,
  getAccessToken,
  setAuthTokens,
  setSessionPermissions,
} from "@/lib/auth-tokens";
import { roleService } from "@/lib/users/role-service";
import { organizationBrandingService } from "@/lib/organizations/organization-branding-service";
import { useUIStore, type BrandingCache } from "@/store/useUIStore";
import type { AppRole, AppUser } from "@/types";

interface AuthState {
  isAuthenticated: boolean;
  user: AppUser;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  setRole: (role: AppRole) => void;
}

const defaultUser: AppUser = {
  id: "user-001",
  name: "SATS User",
  email: "",
  role: "System Administrator",
  organizationId: "platform-authority",
};

function resolveRole(isSystemAdmin: boolean): AppRole {
  return isSystemAdmin ? "System Administrator" : "Operator";
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: Boolean(getAccessToken()),
  user: defaultUser,
  login: async (credentials) => {
    const response = await loginWithApi(credentials);

    setAuthTokens(
      {
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
        expiresIn: response.expires_in,
      },
      response.user, // Pass user data for comprehensive session storage
    );

    try {
      const permissions = await roleService.getMyPermissions();
      setSessionPermissions(permissions);
    } catch (error) {
      clearAuthTokens();
      throw error instanceof Error
        ? error
        : new Error("Unable to load permissions for the signed-in user.");
    }

    const organizationId =
      response.user.organization_id ??
      (response.user.is_system_admin ? "platform-authority" : "");

    set({
      isAuthenticated: true,
      user: {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: resolveRole(response.user.is_system_admin),
        organizationId,
      },
    });

    // Fire-and-forget: pre-fetch organization branding immediately after login
    // so it's available on auth pages (login, forgot-password, reset-password)
    // without waiting for the dashboard to load.
    console.log(
      "[useAuthStore] Login complete, fetching branding for org:",
      organizationId,
    );
    Promise.all([
      organizationBrandingService.getBranding(organizationId),
      organizationBrandingService.getLogoUrl(organizationId).catch((err) => {
        console.log(
          "[useAuthStore] Logo URL fetch failed (may not exist):",
          err,
        );
        return null;
      }),
    ])
      .then(([branding, logoBlobUrl]) => {
        console.log("[useAuthStore] Branding fetched:", {
          hasLogoUrl: !!branding.logoUrl,
          hasPrimary: !!branding.primaryColor,
          hasBlobUrl: !!logoBlobUrl,
          blobUrlPrefix: logoBlobUrl
            ? logoBlobUrl.substring(0, 50) + "..."
            : null,
        });

        const brandingCache: BrandingCache = {
          brandingOrgId: organizationId,
          brandingPrimaryColor: branding.primaryColor || "",
          brandingSecondaryColor: branding.secondaryColor || "",
          brandingAccentColor: branding.accentColor || "",
          brandingFontFamily: branding.fontFamily || "",
          brandingLogoUrl: branding.logoUrl || null,
        };
        useUIStore.getState().setBrandingCache(brandingCache);
        if (logoBlobUrl) {
          useUIStore.getState().setBrandingLogoBlobUrl(logoBlobUrl);
        }

        if (
          branding.primaryColor ||
          branding.secondaryColor ||
          branding.accentColor
        ) {
          useUIStore.getState().setSystemThemeColors({
            primary: branding.primaryColor || "#0f4c5c",
            secondary: branding.secondaryColor || "#f7f3e8",
            accent: branding.accentColor || "#d17a22",
          });
        }
      })
      .catch((err) => {
        console.log(
          "[useAuthStore] Branding fetch failed (may not be configured):",
          err,
        );
        // Branding may not be configured for this org — that's okay
      });
  },
  logout: () => {
    clearAuthTokens();
    set({ isAuthenticated: false, user: defaultUser });
  },
  setRole: (role) =>
    set((state) => ({
      user: {
        ...state.user,
        role,
      },
    })),
}));
