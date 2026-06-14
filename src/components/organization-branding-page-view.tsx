"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EntityForm,
  type EntityFormField,
} from "@/components/common/entity-form";
import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import {
  organizationBrandingService,
  type OrganizationBranding,
  type OrganizationBrandingInput,
} from "@/lib/organizations/organization-branding-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";

interface OrganizationOption {
  id: string;
  name: string;
}

interface BrandingFormValues extends Record<string, string> {
  organization_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  font_family: string;
}

const fontFamilyOptions = [
  "Inter",
  "Poppins",
  "Montserrat",
  "Open Sans",
  "Lato",
  "Nunito",
  "Merriweather",
  "Source Sans Pro",
];

function normalizeColor(value: string, fallback: string) {
  const trimmed = value.trim();
  const isHex = /^#[0-9a-fA-F]{6}$/.test(trimmed);
  return isHex ? trimmed : fallback;
}

function ensureHexColor(value: string, label: string) {
  const normalized = normalizeColor(value, "");

  if (!normalized) {
    throw new Error(
      `${label} must be in the format #rrggbb (example: #1f2937).`,
    );
  }

  return normalized;
}

function ensureRequiredText(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

const defaultBrandingValues: BrandingFormValues = {
  organization_id: "",
  primary_color: "#1f2937",
  secondary_color: "#334155",
  accent_color: "#d97706",
  logo_url: "",
  font_family: "Inter",
};

export function OrganizationBrandingPageView() {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [values, setValues] = useState<BrandingFormValues>(
    defaultBrandingValues,
  );
  const [currentBranding, setCurrentBranding] =
    useState<OrganizationBranding | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogoSubmitting, setIsLogoSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const formFields = useMemo<EntityFormField<BrandingFormValues>[]>(
    () => [
      {
        name: "organization_id",
        label: "Organization",
        type: "select",
        required: true,
        options: organizations.map((item) => ({
          value: item.id,
          label: item.name,
        })),
        colSpan: 2,
      },
      {
        name: "primary_color",
        label: "Primary color",
        type: "color",
        required: true,
      },
      {
        name: "secondary_color",
        label: "Secondary color",
        type: "color",
        required: true,
      },
      {
        name: "accent_color",
        label: "Accent color",
        type: "color",
        required: true,
      },
      {
        name: "font_family",
        label: "Font family",
        type: "select",
        required: true,
        options: fontFamilyOptions.map((font) => ({
          value: font,
          label: font,
        })),
      },
      {
        name: "logo_url",
        label: "Logo",
        type: "file",
        accept: "image/png,image/jpeg,image/svg+xml,image/webp",
        colSpan: 2,
      },
    ],
    [organizations],
  );

  const applyBrandingToForm = useCallback(
    (branding: OrganizationBranding, fallbackOrgId: string) => {
      setValues((current) => ({
        ...current,
        organization_id: branding.organizationId || fallbackOrgId,
        primary_color: normalizeColor(branding.primaryColor, "#1f2937"),
        secondary_color: normalizeColor(branding.secondaryColor, "#334155"),
        accent_color: normalizeColor(branding.accentColor, "#d97706"),
        logo_url: branding.logoUrl,
        font_family:
          fontFamilyOptions.find((font) => font === branding.fontFamily) ??
          "Inter",
      }));
    },
    [],
  );

  const loadOrganizations = useCallback(async () => {
    const items = await organizationCrudService.listOrganizations();
    return items.map((item) => ({ id: item.id, name: item.organization_name }));
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const options = await loadOrganizations();

        if (!isMounted) {
          return;
        }

        setOrganizations(options);
        setValues((current) => ({
          ...current,
          organization_id: current.organization_id || options[0]?.id || "",
        }));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load organizations",
        );
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadOrganizations]);

  // Auto-load branding when organization selection changes
  useEffect(() => {
    const orgId = values.organization_id;

    if (!orgId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setActionError("");
      setActionSuccess("");

      try {
        const branding = await organizationBrandingService.getBranding(orgId);
        if (!cancelled) {
          setCurrentBranding(branding);
          applyBrandingToForm(branding, orgId);
          setActionSuccess("Organization branding loaded.");
        }
      } catch {
        // Branding may not exist yet for a new org — that's okay
        if (!cancelled) {
          setCurrentBranding(null);
          setValues((current) => ({
            ...current,
            primary_color: "#1f2937",
            secondary_color: "#334155",
            accent_color: "#d97706",
            logo_url: "",
            font_family: "Inter",
          }));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [values.organization_id, applyBrandingToForm]);

  const buildPayload = (): OrganizationBrandingInput => {
    const payload: OrganizationBrandingInput = {
      primary_color: ensureHexColor(values.primary_color, "Primary color"),
      secondary_color: ensureHexColor(
        values.secondary_color,
        "Secondary color",
      ),
      accent_color: ensureHexColor(values.accent_color, "Accent color"),
      font_family: ensureRequiredText(values.font_family, "Font family"),
    };

    return payload;
  };

  const loadBranding = useCallback(async () => {
    const orgId = values.organization_id;

    if (!orgId) {
      throw new Error("Please select an organization.");
    }

    setIsLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const branding = await organizationBrandingService.getBranding(orgId);
      setCurrentBranding(branding);
      applyBrandingToForm(branding, orgId);
      setActionSuccess("Organization branding loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [applyBrandingToForm, values.organization_id]);

  const runMutation = async (mode: "create" | "update" | "upsert") => {
    const orgId = values.organization_id;

    if (!orgId) {
      throw new Error("Please select an organization.");
    }

    const payload = buildPayload();

    if (mode === "create") {
      await organizationBrandingService.createBranding(orgId, payload);
      return "Organization branding created successfully.";
    }

    if (mode === "update") {
      await organizationBrandingService.updateBranding(orgId, payload);
      return "Organization branding updated successfully.";
    }

    await organizationBrandingService.upsertBranding(orgId, payload);
    return "Organization branding upserted successfully.";
  };

  const handleCreateBranding = async () => {
    setActionError("");
    setActionSuccess("");
    setIsSubmitting(true);

    try {
      const successMessage = await runMutation("create");
      setActionSuccess(successMessage);
      await loadBranding();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create organization branding",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBranding = async () => {
    setActionError("");
    setActionSuccess("");
    setIsSubmitting(true);

    try {
      const successMessage = await runMutation("update");
      setActionSuccess(successMessage);
      await loadBranding();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update organization branding",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpsertBranding = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setActionError("");
    setActionSuccess("");
    setIsSubmitting(true);

    try {
      const mode = currentBranding ? "update" : "create";
      const successMessage = await runMutation(mode);
      setActionSuccess(successMessage);
      await loadBranding();
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save organization branding",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewLogo = async () => {
    const orgId = values.organization_id;

    if (!orgId) {
      setActionError("Please select an organization.");
      return;
    }

    setActionError("");
    setActionSuccess("");
    setIsLogoSubmitting(true);

    try {
      // Revoke previous blob URL to avoid memory leaks
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }

      const url = await organizationBrandingService.getLogoUrl(orgId);
      setLogoPreviewUrl(url);
      setActionSuccess("Logo preview loaded.");
    } catch (requestError) {
      setLogoPreviewUrl(null);
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load organization logo",
      );
    } finally {
      setIsLogoSubmitting(false);
    }
  };

  const handleDeleteLogo = async () => {
    const orgId = values.organization_id;

    if (!orgId) {
      setActionError("Please select an organization.");
      return;
    }

    const shouldDelete = window.confirm(
      "Delete organization logo? This will remove the uploaded logo from storage.",
    );

    if (!shouldDelete) {
      return;
    }

    setActionError("");
    setActionSuccess("");
    setIsLogoSubmitting(true);

    try {
      await organizationBrandingService.deleteLogo(orgId);
      setValues((current) => ({ ...current, logo_url: "" }));
      setActionSuccess("Organization logo deleted successfully.");
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete organization logo",
      );
    } finally {
      setIsLogoSubmitting(false);
    }
  };

  const handleUploadLogo = async () => {
    const orgId = values.organization_id;

    if (!orgId) {
      setActionError("Please select an organization.");
      return;
    }

    if (!logoFile) {
      setActionError("Please select a logo file to upload.");
      return;
    }

    setActionError("");
    setActionSuccess("");
    setIsLogoSubmitting(true);

    try {
      const logoUrl = await organizationBrandingService.uploadLogo(
        orgId,
        logoFile,
      );
      setValues((current) => ({ ...current, logo_url: logoUrl }));
      setLogoFile(null);
      setActionSuccess("Organization logo uploaded successfully.");
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to upload organization logo",
      );
    } finally {
      setIsLogoSubmitting(false);
    }
  };

  const handleDeleteBranding = async () => {
    const orgId = values.organization_id;

    if (!orgId) {
      setActionError("Please select an organization.");
      return;
    }

    const shouldDelete = window.confirm(
      "Delete organization branding? This action cannot be undone.",
    );

    if (!shouldDelete) {
      return;
    }

    setActionError("");
    setActionSuccess("");
    setIsSubmitting(true);

    try {
      await organizationBrandingService.deleteBranding(orgId);
      setCurrentBranding(null);
      setLogoFile(null);
      setValues((current) => ({
        ...current,
        primary_color: "#1f2937",
        secondary_color: "#334155",
        accent_color: "#d97706",
        logo_url: "",
        font_family: "Inter",
      }));
      setActionSuccess("Organization branding deleted successfully.");
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete organization branding",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (name: keyof BrandingFormValues, value: string) => {
    setValues((current) => {
      if (name === "primary_color") {
        return {
          ...current,
          primary_color: normalizeColor(value, current.primary_color),
        };
      }

      if (name === "secondary_color") {
        return {
          ...current,
          secondary_color: normalizeColor(value, current.secondary_color),
        };
      }

      if (name === "accent_color") {
        return {
          ...current,
          accent_color: normalizeColor(value, current.accent_color),
        };
      }

      return { ...current, [name]: value };
    });
    setActionError("");
    setActionSuccess("");
  };

  const handleFileSelect = (
    name: keyof BrandingFormValues,
    file: File | null,
  ) => {
    setLogoFile(file);
    setActionError("");
    setActionSuccess("");
  };

  if (error) {
    return (
      <ResourceFeedback
        title="Organization branding unavailable"
        detail={error}
      />
    );
  }

  if (!organizations.length) {
    return (
      <ResourceFeedback
        title="Loading organizations"
        detail="Fetching organization options for branding operations."
      />
    );
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Organization branding
          </h2>
          <button
            type="button"
            onClick={() => {
              void loadBranding().catch((requestError: unknown) => {
                setActionError(
                  requestError instanceof Error
                    ? requestError.message
                    : "Failed to load organization branding",
                );
              });
            }}
            disabled={isLoading || isSubmitting}
            className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Loading..." : "Load branding"}
          </button>
          {currentBranding ? null : (
            <button
              type="button"
              onClick={() => {
                void handleCreateBranding();
              }}
              disabled={isSubmitting || isLoading}
              className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Create branding
            </button>
          )}
        </div>

        <EntityForm
          title="Manage organization branding"
          fields={formFields}
          values={values}
          errorMessage={actionError}
          submitLabel={currentBranding ? "Update branding" : "Create branding"}
          submitLoadingLabel="Saving..."
          isSubmitting={isSubmitting}
          onSubmit={handleUpsertBranding}
          onChange={handleChange}
          onFileSelect={handleFileSelect}
        />

        <div className="rounded-2xl border border-[var(--color-shell-border)] p-4">
          <h3 className="mb-3 text-base font-semibold text-[var(--color-ice)]">
            Logo management
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void handleUploadLogo();
              }}
              disabled={
                isLogoSubmitting ||
                isSubmitting ||
                !logoFile ||
                !values.organization_id
              }
              className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLogoSubmitting ? "Uploading..." : "Upload logo"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleViewLogo();
              }}
              disabled={
                isLogoSubmitting || isSubmitting || !values.organization_id
              }
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLogoSubmitting ? "Loading..." : "View logo"}
            </button>
            <button
              type="button"
              onClick={() => {
                void handleDeleteLogo();
              }}
              disabled={isLogoSubmitting || isSubmitting || !values.logo_url}
              className="rounded-full border border-rose-300/40 bg-rose-500/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-100 transition-colors hover:bg-rose-500/28 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLogoSubmitting ? "Deleting..." : "Delete logo"}
            </button>
          </div>
          {logoPreviewUrl ? (
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoPreviewUrl}
                alt="Organization logo preview"
                className="max-h-48 max-w-xs rounded-lg border border-[var(--color-shell-border)] object-contain"
              />
            </div>
          ) : null}
        </div>

        {actionSuccess ? (
          <p className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
            {actionSuccess}
          </p>
        ) : null}

        {currentBranding ? (
          <DataTable
            rows={[currentBranding]}
            horizontalScroll
            columns={[
              {
                header: "Organization ID",
                render: (row) => row.organizationId || values.organization_id,
              },
              {
                header: "Primary",
                render: (row) => (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded-sm border border-white/20"
                      style={{ backgroundColor: row.primaryColor }}
                    />
                    {row.primaryColor}
                  </span>
                ),
              },
              {
                header: "Secondary",
                render: (row) => (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded-sm border border-white/20"
                      style={{ backgroundColor: row.secondaryColor }}
                    />
                    {row.secondaryColor}
                  </span>
                ),
              },
              {
                header: "Accent",
                render: (row) => (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-4 w-4 rounded-sm border border-white/20"
                      style={{ backgroundColor: row.accentColor }}
                    />
                    {row.accentColor}
                  </span>
                ),
              },
              {
                header: "Font",
                render: (row) => row.fontFamily,
              },
              {
                header: "Logo",
                render: (row) => row.logoUrl,
              },
              {
                header: "Actions",
                render: (row) => (
                  <ResourceRowActions
                    onEdit={() =>
                      applyBrandingToForm(row, values.organization_id)
                    }
                    onDelete={() => {
                      void handleDeleteBranding();
                    }}
                    isDeleting={isSubmitting}
                  />
                ),
              },
            ]}
          />
        ) : (
          <ResourceFeedback
            title="No branding loaded"
            detail="Select an organization and click Load branding, or submit the form to create/upsert branding."
          />
        )}
      </section>
    </main>
  );
}
