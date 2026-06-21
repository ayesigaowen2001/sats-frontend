"use client";

import { useEffect, useRef } from "react";

import { organizationBrandingService } from "@/lib/organizations/organization-branding-service";
import { useAuthStore } from "@/store/useAuthStore";
import { useUIStore, type BrandingCache } from "@/store/useUIStore";

/**
 * Hook that fetches and caches organization branding data.
 *
 * On mount (and when the user's organization changes), it:
 * 1. Checks if branding is already cached for the current org
 * 2. If not (or if the org changed), fetches via OrganizationBrandingService
 * 3. Caches colors/font/logo URL into useUIStore (persisted to localStorage)
 * 4. Updates systemThemeColors so ThemeProvider applies them
 */
export function useOrganizationBranding() {
  const organizationId = useAuthStore((state) => state.user.organizationId);
  const branding = useUIStore((state) => state.branding);
  const setBrandingCache = useUIStore((state) => state.setBrandingCache);
  const setBrandingLogoBlobUrl = useUIStore(
    (state) => state.setBrandingLogoBlobUrl,
  );
  const setSystemThemeColors = useUIStore(
    (state) => state.setSystemThemeColors,
  );
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      console.log("[useOrganizationBranding] No organizationId, skipping");
      return;
    }

    const cacheKey = `${organizationId}`;
    console.log(
      "[useOrganizationBranding] Running for org:",
      organizationId,
      "cacheKey:",
      cacheKey,
      "fetchedRef.current:",
      fetchedRef.current,
    );

    // Skip if we already fetched for this org
    if (fetchedRef.current === cacheKey) {
      console.log(
        "[useOrganizationBranding] Already fetched for this org, skipping",
      );
      return;
    }

    // If already cached for this org, just apply the theme colors and skip fetch
    if (branding.brandingOrgId === organizationId) {
      console.log(
        "[useOrganizationBranding] Branding already cached for org, re-fetching blob URL only",
      );

      if (
        branding.brandingPrimaryColor ||
        branding.brandingSecondaryColor ||
        branding.brandingAccentColor
      ) {
        setSystemThemeColors({
          primary: branding.brandingPrimaryColor || "#0f4c5c",
          secondary: branding.brandingSecondaryColor || "#f7f3e8",
          accent: branding.brandingAccentColor || "#d17a22",
        });
      }

      // The logo blob URL is ephemeral (not persisted to localStorage), so we
      // must always re-fetch it on page load, even when the rest of the
      // branding data is already cached. Otherwise the logo won't show after
      // a browser refresh.
      organizationBrandingService
        .getLogoUrl(organizationId)
        .then((url: string) => {
          console.log(
            "[useOrganizationBranding] Got blob URL from re-fetch:",
            url ? url.substring(0, 50) + "..." : null,
          );
          if (fetchedRef.current === cacheKey) {
            setBrandingLogoBlobUrl(url);
          }
        })
        .catch((err) => {
          console.log(
            "[useOrganizationBranding] Blob URL re-fetch failed (no logo set?):",
            err,
          );
          // No logo set — that's okay, the component will show its fallback
        });

      fetchedRef.current = cacheKey;
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [result, logoBlobUrl] = await Promise.all([
          organizationBrandingService.getBranding(organizationId),
          organizationBrandingService
            .getLogoUrl(organizationId)
            .catch(() => null),
        ]);

        if (cancelled) {
          return;
        }

        const brandingCache: BrandingCache = {
          brandingOrgId: organizationId,
          brandingPrimaryColor: result.primaryColor || "",
          brandingSecondaryColor: result.secondaryColor || "",
          brandingAccentColor: result.accentColor || "",
          brandingFontFamily: result.fontFamily || "",
          brandingLogoUrl: result.logoUrl || null,
        };

        setBrandingCache(brandingCache);
        setBrandingLogoBlobUrl(logoBlobUrl);

        if (
          result.primaryColor ||
          result.secondaryColor ||
          result.accentColor
        ) {
          setSystemThemeColors({
            primary: result.primaryColor || "#0f4c5c",
            secondary: result.secondaryColor || "#f7f3e8",
            accent: result.accentColor || "#d17a22",
          });
        }

        fetchedRef.current = cacheKey;
      } catch {
        // Branding may not be configured for this org — that's okay
        fetchedRef.current = cacheKey;
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    organizationId,
    branding.brandingOrgId,
    setBrandingCache,
    setSystemThemeColors,
    setBrandingLogoBlobUrl,
  ]);

  return {
    logoUrl:
      branding.brandingOrgId === organizationId
        ? branding.brandingLogoUrl
        : null,
    fontFamily:
      branding.brandingOrgId === organizationId
        ? branding.brandingFontFamily
        : "",
    hasBranding:
      branding.brandingOrgId === organizationId &&
      (!!branding.brandingLogoUrl ||
        !!branding.brandingPrimaryColor ||
        !!branding.brandingSecondaryColor ||
        !!branding.brandingAccentColor),
  };
}
