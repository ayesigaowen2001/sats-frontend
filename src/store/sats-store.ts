"use client";

import { create } from "zustand";

import {
  fetchAdministratorPage,
  fetchAnimalsPage,
  fetchDataMigrationPage,
  fetchDevicesPage,
  fetchFiltersPage,
  fetchHealthPage,
  fetchNotificationsPage,
  fetchOrganizationsPage,
  fetchOverview,
  fetchReportsPage,
  fetchSystemManagementPage,
  fetchTrackingPage,
  fetchUsersPage,
} from "@/lib/api/sats-client";
import { organizationContextOptions } from "@/lib/navigation";
import type {
  AdministratorPageResponse,
  AnimalsPageResponse,
  DataMigrationPageResponse,
  DevicesPageResponse,
  FiltersPageResponse,
  HealthPageResponse,
  ModuleResourceKey,
  NotificationsPageResponse,
  OrganizationOption,
  OrganizationsPageResponse,
  OverviewResponse,
  ReportsPageResponse,
  TrackingPageResponse,
  UserTier,
  UsersPageResponse,
  SystemManagementPageResponse,
} from "@/types/sats-api";

interface SatsStoreState {
  overview?: OverviewResponse;
  tracking?: TrackingPageResponse;
  animals?: AnimalsPageResponse;
  devices?: DevicesPageResponse;
  organizations?: OrganizationsPageResponse;
  reports?: ReportsPageResponse;
  users?: UsersPageResponse;
  administrator?: AdministratorPageResponse;
  health?: HealthPageResponse;
  notifications?: NotificationsPageResponse;
  filters?: FiltersPageResponse;
  dataMigration?: DataMigrationPageResponse;
  systemManagement?: SystemManagementPageResponse;
  currentTier: UserTier;
  currentOrganizationId: string;
  organizationOptions: OrganizationOption[];
  loading: Partial<Record<ModuleResourceKey, boolean>>;
  errors: Partial<Record<ModuleResourceKey, string>>;
  loadOverview: () => Promise<void>;
  loadTracking: () => Promise<void>;
  loadAnimals: () => Promise<void>;
  loadDevices: () => Promise<void>;
  loadOrganizations: () => Promise<void>;
  loadReports: () => Promise<void>;
  loadUsers: () => Promise<void>;
  loadAdministrator: () => Promise<void>;
  loadHealth: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadFilters: () => Promise<void>;
  loadDataMigration: () => Promise<void>;
  loadSystemManagement: () => Promise<void>;
  setCurrentTier: (tier: UserTier) => void;
  setCurrentOrganizationId: (organizationId: string) => void;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected request failure";
}

export const useSatsStore = create<SatsStoreState>((set) => ({
  currentTier: "system-administrator",
  currentOrganizationId: "platform-authority",
  organizationOptions: organizationContextOptions,
  loading: {},
  errors: {},
  setCurrentTier: (tier) =>
    set((state) => {
      const tenantFallback =
        state.organizationOptions.find((option) => option.scope === "Tenant")?.id ??
        state.currentOrganizationId;
      const nextOrganizationId =
        tier === "system-administrator" ? state.currentOrganizationId : tenantFallback;

      return {
        currentTier: tier,
        currentOrganizationId: nextOrganizationId,
      };
    }),
  setCurrentOrganizationId: (organizationId) =>
    set({ currentOrganizationId: organizationId }),
  loadOverview: async () => {
    set((state) => ({
      loading: { ...state.loading, overview: true },
      errors: { ...state.errors, overview: undefined },
    }));

    try {
      const overview = await fetchOverview();

      set((state) => ({
        overview,
        loading: { ...state.loading, overview: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, overview: false },
        errors: { ...state.errors, overview: getErrorMessage(error) },
      }));
    }
  },
  loadTracking: async () => {
    set((state) => ({
      loading: { ...state.loading, tracking: true },
      errors: { ...state.errors, tracking: undefined },
    }));

    try {
      const tracking = await fetchTrackingPage();

      set((state) => ({
        tracking,
        loading: { ...state.loading, tracking: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, tracking: false },
        errors: { ...state.errors, tracking: getErrorMessage(error) },
      }));
    }
  },
  loadAnimals: async () => {
    set((state) => ({
      loading: { ...state.loading, animals: true },
      errors: { ...state.errors, animals: undefined },
    }));

    try {
      const animals = await fetchAnimalsPage();

      set((state) => ({
        animals,
        loading: { ...state.loading, animals: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, animals: false },
        errors: { ...state.errors, animals: getErrorMessage(error) },
      }));
    }
  },
  loadDevices: async () => {
    set((state) => ({
      loading: { ...state.loading, devices: true },
      errors: { ...state.errors, devices: undefined },
    }));

    try {
      const devices = await fetchDevicesPage();

      set((state) => ({
        devices,
        loading: { ...state.loading, devices: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, devices: false },
        errors: { ...state.errors, devices: getErrorMessage(error) },
      }));
    }
  },
  loadOrganizations: async () => {
    set((state) => ({
      loading: { ...state.loading, organizations: true },
      errors: { ...state.errors, organizations: undefined },
    }));

    try {
      const organizations = await fetchOrganizationsPage();

      set((state) => ({
        organizations,
        loading: { ...state.loading, organizations: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, organizations: false },
        errors: {
          ...state.errors,
          organizations: getErrorMessage(error),
        },
      }));
    }
  },
  loadReports: async () => {
    set((state) => ({
      loading: { ...state.loading, reports: true },
      errors: { ...state.errors, reports: undefined },
    }));

    try {
      const reports = await fetchReportsPage();

      set((state) => ({
        reports,
        loading: { ...state.loading, reports: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, reports: false },
        errors: { ...state.errors, reports: getErrorMessage(error) },
      }));
    }
  },
  loadUsers: async () => {
    set((state) => ({
      loading: { ...state.loading, users: true },
      errors: { ...state.errors, users: undefined },
    }));

    try {
      const users = await fetchUsersPage();

      set((state) => ({
        users,
        loading: { ...state.loading, users: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, users: false },
        errors: { ...state.errors, users: getErrorMessage(error) },
      }));
    }
  },
  loadAdministrator: async () => {
    set((state) => ({
      loading: { ...state.loading, administrator: true },
      errors: { ...state.errors, administrator: undefined },
    }));

    try {
      const administrator = await fetchAdministratorPage();

      set((state) => ({
        administrator,
        loading: { ...state.loading, administrator: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, administrator: false },
        errors: { ...state.errors, administrator: getErrorMessage(error) },
      }));
    }
  },
  loadHealth: async () => {
    set((state) => ({
      loading: { ...state.loading, health: true },
      errors: { ...state.errors, health: undefined },
    }));

    try {
      const health = await fetchHealthPage();

      set((state) => ({
        health,
        loading: { ...state.loading, health: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, health: false },
        errors: { ...state.errors, health: getErrorMessage(error) },
      }));
    }
  },
  loadNotifications: async () => {
    set((state) => ({
      loading: { ...state.loading, notifications: true },
      errors: { ...state.errors, notifications: undefined },
    }));

    try {
      const notifications = await fetchNotificationsPage();

      set((state) => ({
        notifications,
        loading: { ...state.loading, notifications: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, notifications: false },
        errors: {
          ...state.errors,
          notifications: getErrorMessage(error),
        },
      }));
    }
  },
  loadFilters: async () => {
    set((state) => ({
      loading: { ...state.loading, filters: true },
      errors: { ...state.errors, filters: undefined },
    }));

    try {
      const filters = await fetchFiltersPage();

      set((state) => ({
        filters,
        loading: { ...state.loading, filters: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, filters: false },
        errors: { ...state.errors, filters: getErrorMessage(error) },
      }));
    }
  },
  loadDataMigration: async () => {
    set((state) => ({
      loading: { ...state.loading, dataMigration: true },
      errors: { ...state.errors, dataMigration: undefined },
    }));

    try {
      const dataMigration = await fetchDataMigrationPage();

      set((state) => ({
        dataMigration,
        loading: { ...state.loading, dataMigration: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, dataMigration: false },
        errors: {
          ...state.errors,
          dataMigration: getErrorMessage(error),
        },
      }));
    }
  },
  loadSystemManagement: async () => {
    set((state) => ({
      loading: { ...state.loading, systemManagement: true },
      errors: { ...state.errors, systemManagement: undefined },
    }));

    try {
      const systemManagement = await fetchSystemManagementPage();

      set((state) => ({
        systemManagement,
        loading: { ...state.loading, systemManagement: false },
      }));
    } catch (error) {
      set((state) => ({
        loading: { ...state.loading, systemManagement: false },
        errors: {
          ...state.errors,
          systemManagement: getErrorMessage(error),
        },
      }));
    }
  },
}));
