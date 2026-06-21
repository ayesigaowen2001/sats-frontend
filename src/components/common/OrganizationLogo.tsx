"use client";

import { useState, type ComponentPropsWithoutRef } from "react";

import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";

interface OrganizationLogoProps extends Omit<
  ComponentPropsWithoutRef<"img">,
  "src" | "alt"
> {
  /**
   * Fallback to show when no logo URL is cached.
   * - "initials": Shows the first letter of the organization name (default)
   * - "none": Renders nothing when no logo
   * - a React node: Custom fallback content
   */
  fallback?: "initials" | "none" | React.ReactNode;
  /**
   * Maximum height of the logo image in pixels.
   * @default 48
   */
  maxHeight?: number;
}

/**
 * Displays the cached organization logo from branding.
 *
 * This component reads the branding cache from useUIStore (persisted to
 * localStorage) and renders the logo image if one has been uploaded. It
 * also provides a fallback display when no logo is available.
 *
 * The component is safe to use on auth pages (login, forgot-password,
 * reset-password) where the logo will appear if the user has logged in
 * before on this device (branding data gets cached after first login).
 *
 * The actual logo image data is stored as a session-only blob URL
 * (fetched via GET /organisations/:id/branding/logo → blob) so it
 * works immediately even on auth pages right after login.
 */
export function OrganizationLogo({
  fallback = "initials",
  maxHeight = 48,
  className = "",
  ...imgProps
}: OrganizationLogoProps) {
  const branding = useUIStore((state) => state.branding);
  const brandingLogoBlobUrl = useUIStore((state) => state.brandingLogoBlobUrl);
  const organizationId = useAuthStore((state) => state.user.organizationId);
  const [imgError, setImgError] = useState(false);

  const orgMatches = branding.brandingOrgId === organizationId;
  // Use the actual blob URL if available, otherwise use the logo_file name
  const logoUrl = orgMatches
    ? brandingLogoBlobUrl || branding.brandingLogoUrl || null
    : null;
  const hasLogo = !!logoUrl && !imgError;

  // 🐛 DEBUG: trace logo resolution
  console.log("[OrganizationLogo] Resolving logo:", {
    organizationId,
    brandingOrgId: branding.brandingOrgId,
    orgMatches,
    brandingLogoUrl: branding.brandingLogoUrl,
    brandingLogoBlobUrl,
    resolvedLogoUrl: logoUrl,
    hasLogo,
    imgError,
  });

  if (!hasLogo) {
    if (fallback === "none") {
      return null;
    }

    if (fallback === "initials") {
      const initial = organizationId
        ? organizationId.charAt(0).toUpperCase()
        : "O";

      return (
        <div
          className={`flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-sm font-bold text-[var(--color-mist)] ${className}`}
          style={{
            width: maxHeight,
            height: maxHeight,
          }}
          aria-label="Organization logo placeholder"
        >
          {initial}
        </div>
      );
    }

    return <>{fallback}</>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt="Organization logo"
      className={`object-contain ${className}`}
      style={{ maxHeight }}
      onError={() => setImgError(true)}
      {...imgProps}
    />
  );
}
