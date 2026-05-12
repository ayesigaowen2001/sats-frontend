"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ResourceFeedback } from "@/components/resource-feedback";
import { getSessionData } from "@/lib/auth-tokens";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import { camerasService, type Camera } from "@/lib/video/cameras-service";
import { useAuthStore } from "@/store/useAuthStore";

interface OrganizationOption {
  id: string;
  name: string;
}

interface DisplaySettings {
  zoom: number;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

const defaultSettings: DisplaySettings = {
  zoom: 1,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
};

export function VideoLiveStreamPageView(): React.JSX.Element {
  const { user } = useAuthStore();

  const [hasHydrated, setHasHydrated] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [cameras, setCameras] = useState<Camera[] | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [loadError, setLoadError] = useState("");

  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);

  const isSystemAdmin = useMemo(() => {
    if (!hasHydrated) return false;
    const sessionData = getSessionData();
    return sessionData?.user?.is_system_admin ?? false;
  }, [hasHydrated]);

  const activeOrgId = useMemo(() => {
    if (!isSystemAdmin && user?.organizationId) {
      return user.organizationId;
    }

    return selectedOrgId;
  }, [isSystemAdmin, selectedOrgId, user?.organizationId]);

  const selectedCamera = useMemo(
    () => cameras?.find((camera) => camera.id === selectedCameraId) ?? null,
    [cameras, selectedCameraId],
  );

  const loadCameras = useCallback(async (orgId: string) => {
    if (!orgId) {
      setCameras([]);
      return [];
    }

    return camerasService.listCameras(orgId);
  }, []);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const [orgsResult] = await Promise.allSettled([
        organizationCrudService.listOrganizations(),
      ]);

      if (!isMounted) {
        return;
      }

      if (orgsResult.status === "fulfilled") {
        const options = orgsResult.value.map((org) => ({
          id: org.id,
          name: org.organization_name ?? `Organization ${org.id}`,
        }));

        setOrganizations(options);

        if (!isSystemAdmin && user?.organizationId) {
          setSelectedOrgId(user.organizationId);
        }
      } else {
        setOrganizations([]);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isSystemAdmin, user?.organizationId]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!activeOrgId) {
        setCameras([]);
        setSelectedCameraId("");
        setLoadError("");
        return;
      }

      setLoadError("");
      setCameras(null);

      try {
        const rows = await loadCameras(activeOrgId);

        if (!isMounted) {
          return;
        }

        setCameras(rows);

        if (rows.some((camera) => camera.id === selectedCameraId)) {
          return;
        }

        setSelectedCameraId(rows[0]?.id ?? "");
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setCameras([]);
        setSelectedCameraId("");
        setLoadError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load organization cameras.",
        );
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [activeOrgId, loadCameras, selectedCameraId]);

  const streamFilter = `brightness(${settings.brightness}%) contrast(${settings.contrast}%) saturate(${settings.saturation}%) blur(${settings.blur}px)`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ice)]">
            Live Stream
          </h2>
          <p className="text-sm text-[var(--color-mist)]">
            Monitor live camera stream URLs and tune display controls.
          </p>
        </div>
      </div>

      {!hasHydrated || !isSystemAdmin ? null : (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
          <label
            htmlFor="live-stream-org"
            className="text-sm text-[var(--color-mist)]"
          >
            Organization
          </label>
          <select
            id="live-stream-org"
            value={selectedOrgId}
            onChange={(event) => {
              setSelectedOrgId(event.target.value);
            }}
            className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm"
          >
            <option value="">-- Select organization --</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}

      {!activeOrgId ? (
        <p className="text-sm text-[var(--color-mist)]">
          Select an organization to view live camera streams.
        </p>
      ) : cameras === null ? (
        <ResourceFeedback
          title="Loading camera streams"
          detail="Fetching active cameras for live streaming."
        />
      ) : cameras.length === 0 ? (
        <ResourceFeedback
          title="No cameras available"
          detail="Add cameras in Camera Management to start streaming."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
              Camera Sources
            </h3>
            <div className="mt-3 space-y-2">
              {cameras.map((camera) => {
                const isActive = camera.id === selectedCameraId;
                return (
                  <button
                    key={camera.id}
                    type="button"
                    onClick={() => setSelectedCameraId(camera.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      isActive
                        ? "border-[var(--color-sand)]/45 bg-[var(--color-sand)]/15"
                        : "border-white/10 bg-black/20 hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--color-ice)]">
                      {camera.cameraName}
                    </p>
                    <p className="mt-1 break-all text-xs text-[var(--color-fog)]">
                      {camera.streamUrl || "No stream URL"}
                    </p>
                    <p
                      className={`mt-2 text-xs font-semibold ${
                        camera.isActive ? "text-emerald-300" : "text-orange-300"
                      }`}
                    >
                      {camera.isActive ? "Active" : "Inactive"}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
              Stream Player
            </h3>

            {selectedCamera?.streamUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-black/40">
                <video
                  key={selectedCamera.id}
                  src={selectedCamera.streamUrl}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="aspect-video w-full bg-black"
                  style={{
                    filter: streamFilter,
                    transform: `scale(${settings.zoom})`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                The selected camera has no stream URL configured.
              </div>
            )}

            {selectedCamera?.streamUrl ? (
              <a
                href={selectedCamera.streamUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs font-semibold text-[var(--color-sand)] hover:underline"
              >
                Open stream URL directly
              </a>
            ) : null}

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--color-ice)]">
                  Camera Settings
                </h4>
                <button
                  type="button"
                  onClick={() => setSettings(defaultSettings)}
                  className="text-xs font-semibold text-[var(--color-sand)] hover:underline"
                >
                  Reset
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
                    Zoom ({settings.zoom.toFixed(1)}x)
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={settings.zoom}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        zoom: Number(event.target.value),
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
                    Brightness ({settings.brightness}%)
                  </span>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={1}
                    value={settings.brightness}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        brightness: Number(event.target.value),
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
                    Contrast ({settings.contrast}%)
                  </span>
                  <input
                    type="range"
                    min={50}
                    max={170}
                    step={1}
                    value={settings.contrast}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        contrast: Number(event.target.value),
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block">
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
                    Saturation ({settings.saturation}%)
                  </span>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={1}
                    value={settings.saturation}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        saturation: Number(event.target.value),
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
                    Blur ({settings.blur.toFixed(1)}px)
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={settings.blur}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        blur: Number(event.target.value),
                      }))
                    }
                    className="mt-2 w-full"
                  />
                </label>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
