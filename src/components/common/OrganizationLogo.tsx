"use client";

import { useState, type ComponentPropsWithoutRef } from "react";

import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";

/** Platform logo shown for system administrator accounts that aren't tied to an organisation. */
const SYSTEM_ADMIN_LOGO_URL = "/images/wildlife-conservation.jpg";

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
  const role = useAuthStore((state) => state.user.role);
  const [imgError, setImgError] = useState(false);

  // System administrators aren't tied to any organisation, so they use the
  // platform's default wildlife-conservation logo instead of org branding.
  const isSystemAdmin =
    role === "System Administrator" || organizationId === "platform-authority";

  const orgMatches = branding.brandingOrgId === organizationId;
  // Use the actual blob URL if available, otherwise use the logo_file name
  const orgLogoUrl = orgMatches
    ? brandingLogoBlobUrl || branding.brandingLogoUrl || null
    : null;
  // Prefer organisation branding; fall back to the platform logo for system admins.
  const logoUrl = orgLogoUrl || (isSystemAdmin ? SYSTEM_ADMIN_LOGO_URL : null);
  const hasLogo = !!logoUrl && !imgError;

  // 🐛 DEBUG: trace logo resolution
  console.log("[OrganizationLogo] Resolving logo:", {
    organizationId,
    role,
    isSystemAdmin,
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
      alt={isSystemAdmin ? "SATS platform logo" : "Organization logo"}
      className={`object-contain ${className}`}
      style={{ maxHeight }}
      onError={() => setImgError(true)}
      {...imgProps}
    />
  );
}
