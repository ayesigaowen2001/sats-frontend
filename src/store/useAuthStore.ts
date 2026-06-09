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

    set({
      isAuthenticated: true,
      user: {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: resolveRole(response.user.is_system_admin),
        organizationId:
          response.user.organization_id ??
          (response.user.is_system_admin ? "platform-authority" : ""),
      },
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
