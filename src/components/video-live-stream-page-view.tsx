"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

/**
 * If the stream URL is HTTP (not HTTPS), route it through the Next.js proxy
 * to avoid Mixed Content blocking when the frontend is served over HTTPS.
 *
 * Also normalises bare IP Webcam root URLs (e.g. http://192.168.0.119:8080)
 * to the actual MJPEG endpoint (/video).
 *
 * When NEXT_PUBLIC_CAMERA_RELAY_TUNNEL is set (deployed environment), URLs
 * pointing to the local relay server (localhost:8080 or LAN:8080) are
 * rewritten to the Cloudflare Tunnel public URL so remote users can reach
 * the on-site camera relay.
 */
function resolveStreamUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  if (rawUrl.startsWith("https://") || rawUrl.startsWith("/")) return rawUrl;

  let url = rawUrl;
  try {
    const parsed = new URL(rawUrl);

    // Normalise bare IP Webcam root URLs (port 8080, no path) → /video
    if (
      (parsed.port === "8080" || parsed.port === "") &&
      (parsed.pathname === "/" || parsed.pathname === "") &&
      !parsed.search
    ) {
      parsed.pathname = "/video";
      url = parsed.toString();
    }

    // Remote deployment: rewrite local relay URLs to Cloudflare Tunnel.
    // The relay serves cameras at http://localhost:8080/video/{id} (and
    // LAN variants). Cloudflare Tunnel exposes the same paths — just the
    // origin changes from http://localhost:8080 → https://tunnel.domain.
    const tunnelBase = process.env.NEXT_PUBLIC_CAMERA_RELAY_TUNNEL;
    if (tunnelBase && parsed.port === "8080") {
      const isLocalRelay =
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        /^(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/.test(
          parsed.hostname,
        );
      if (isLocalRelay) {
        // Replace the origin with the tunnel, keeping the path intact.
        // e.g. http://localhost:8080/video/webcam → https://cameras.example.com/video/webcam
        return `${tunnelBase.replace(/\/+$/, "")}${parsed.pathname}`;
      }
    }
  } catch {
    // fall back to raw string
  }

  // Local dev (no tunnel env var): proxy through Next.js API route
  return `/api/video-proxy?url=${encodeURIComponent(url)}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function VideoLiveStreamPageView(): React.JSX.Element {
  const { user } = useAuthStore();

  const [hasHydrated, setHasHydrated] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [cameras, setCameras] = useState<Camera[] | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [loadError, setLoadError] = useState("");

  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);

  // ---- Recording state ---------------------------------------------------
  const imgRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

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

      if (!isMounted) return;

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

        if (!isMounted) return;

        setCameras(rows);

        if (rows.some((camera) => camera.id === selectedCameraId)) return;

        setSelectedCameraId(rows[0]?.id ?? "");
      } catch (requestError) {
        if (!isMounted) return;

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

  const isMjpegStream = selectedCamera?.streamUrl
    ? (() => {
        const url = selectedCamera.streamUrl;
        if (
          /\/video(\?|$)/.test(url) ||
          /\/mjpeg/.test(url) ||
          /mjpg/.test(url) ||
          /cgi-bin/.test(url) ||
          /snapshot\.cgi/.test(url) ||
          /videostream\.cgi/.test(url) ||
          /\.mjpg/.test(url)
        ) {
          return true;
        }

        try {
          const parsed = new URL(url);
          if (
            parsed.port === "8080" &&
            (parsed.pathname === "/" || parsed.pathname === "") &&
            !parsed.search
          ) {
            return true;
          }
        } catch {
          // ignore
        }

        return false;
      })()
    : false;

  const isRtspStream = selectedCamera?.streamUrl
    ? selectedCamera.streamUrl.startsWith("rtsp://")
    : false;

  // ---- IP Camera settings sync -------------------------------------------
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [apiSettingsApplied, setApiSettingsApplied] = useState(false);

  const cameraConfigBase = useMemo(() => {
    if (!selectedCamera?.streamUrl) return "";
    try {
      const url = new URL(selectedCamera.streamUrl);
      return url.origin;
    } catch {
      return "";
    }
  }, [selectedCamera?.streamUrl]);

  useEffect(() => {
    if (!cameraConfigBase) return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${cameraConfigBase}/api/settings`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const remote = await res.json();
        setSettings({
          zoom: 1,
          brightness: Math.round(((remote.brightness ?? 1) / 3) * 200),
          contrast: Math.round(((remote.contrast ?? 1) / 3) * 200),
          saturation: Math.round(((remote.saturation ?? 1) / 3) * 200),
          blur: remote.blur ?? 0,
        });
        setApiSettingsApplied(true);
      } catch {
        setApiSettingsApplied(false);
      }
    })();

    return () => controller.abort();
  }, [cameraConfigBase]);

  const syncToCamera = useCallback(
    (next: DisplaySettings) => {
      if (!cameraConfigBase) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

      syncTimerRef.current = setTimeout(async () => {
        try {
          await fetch(`${cameraConfigBase}/api/settings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brightness: (next.brightness / 200) * 3,
              contrast: (next.contrast / 200) * 3,
              saturation: (next.saturation / 200) * 3,
              blur: next.blur,
            }),
          });
        } catch {
          // Silently ignore
        }
      }, 150);
    },
    [cameraConfigBase],
  );

  const updateSetting = useCallback(
    (key: keyof DisplaySettings, value: number) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        if (apiSettingsApplied) syncToCamera(next);
        return next;
      });
    },
    [apiSettingsApplied, syncToCamera],
  );

  const handleResetSettings = useCallback(() => {
    setSettings(defaultSettings);
    if (apiSettingsApplied) syncToCamera(defaultSettings);
  }, [apiSettingsApplied, syncToCamera]);

  // ---- Recording handlers (after all derived state) ----------------------
  const handleStartRecording = useCallback(() => {
    const cam = selectedCamera;
    if (!cam) return;

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : undefined;

    if (!mimeType) {
      setLoadError("Recording is not supported in this browser.");
      return;
    }

    chunksRef.current = [];

    if (isMjpegStream) {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img) return;

      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const drawFrame = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        rafIdRef.current = requestAnimationFrame(drawFrame);
      };
      drawFrame();

      const canvasStream = canvas.captureStream(30);
      const recorder = new MediaRecorder(canvasStream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cam.cameraName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
    } else {
      const video = videoRef.current;
      if (!video) return;

      const videoStream = (
        video as HTMLVideoElement & { captureStream(fps?: number): MediaStream }
      ).captureStream(30);

      if (!videoStream) {
        setLoadError("Cannot capture video stream from this source.");
        return;
      }

      const recorder = new MediaRecorder(videoStream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cam.cameraName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);
    }

    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }, [selectedCamera, isMjpegStream, setLoadError]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // Stop recording when switching cameras
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setRecordingSeconds(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [selectedCameraId]);
  // -----------------------------------------------------------------------

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
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
                Stream Player
              </h3>

              {/* Record button — only if not recording or to stop */}
              {selectedCamera?.streamUrl ? (
                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <>
                      <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300">
                        <span className="inline-block h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                        {formatTime(recordingSeconds)}
                      </span>
                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
                      >
                        Stop
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/12 px-3 py-1.5 text-xs font-semibold text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/22"
                    >
                      <span className="inline-block h-2 w-2 rounded-full bg-rose-400" />
                      Record
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {/* Hidden canvas used for MJPEG → MediaStream capture */}
            <canvas ref={canvasRef} className="hidden" aria-hidden />

            {selectedCamera?.streamUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-black/40">
                {isMjpegStream ? (
                  <img
                    ref={imgRef}
                    key={selectedCamera.id}
                    src={resolveStreamUrl(selectedCamera.streamUrl)}
                    className="aspect-video w-full bg-black object-contain"
                    style={{
                      filter: streamFilter,
                      transform: `scale(${settings.zoom})`,
                      transformOrigin: "center center",
                    }}
                    alt={`Live stream from ${selectedCamera.cameraName}`}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    key={selectedCamera.id}
                    src={resolveStreamUrl(selectedCamera.streamUrl)}
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
                )}
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
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--color-ice)]">
                    Camera Settings
                  </h4>
                  {apiSettingsApplied ? (
                    <span className="text-xs text-emerald-400/70">
                      ● synced to camera
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleResetSettings}
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
                      updateSetting("zoom", Number(event.target.value))
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
                      updateSetting("brightness", Number(event.target.value))
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
                      updateSetting("contrast", Number(event.target.value))
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
                      updateSetting("saturation", Number(event.target.value))
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
                      updateSetting("blur", Number(event.target.value))
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
