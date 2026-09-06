"use client";

import {
  hasGoogleMapsKey,
  setMapProvider,
  type MapProvider,
  useMapProvider,
} from "@/lib/maps/map-provider";

interface MapProviderSelectorProps {
  className?: string;
}

export function MapProviderSelector({
  className = "",
}: MapProviderSelectorProps): React.JSX.Element {
  const provider = useMapProvider();
  const googleConfigured = hasGoogleMapsKey();

  return (
    <label className={`flex items-center gap-2 text-xs ${className}`}>
      <span className="font-semibold uppercase tracking-[0.1em] text-[var(--color-fog)]">
        Map provider
      </span>
      <select
        value={provider}
        onChange={(event) => {
          const nextProvider = event.target.value as MapProvider;
          if (nextProvider === "google" && !googleConfigured) {
            return;
          }
          setMapProvider(nextProvider);
        }}
        className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-[var(--color-ice)]"
        aria-label="Map provider"
      >
        <option value="maptiler">MapTiler</option>
        <option value="google" disabled={!googleConfigured}>
          Google Maps{googleConfigured ? "" : " (not configured)"}
        </option>
      </select>
    </label>
  );
}
