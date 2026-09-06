import { useSyncExternalStore } from "react";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export type MapProvider = "maptiler" | "google";

const MAP_PROVIDER_STORAGE_KEY = "sats-map-provider";
const mapProviderListeners = new Set<() => void>();
let googleMapsPromise: Promise<typeof google> | null = null;

export type GoogleMapsApi = typeof google;
export type GoogleMap = InstanceType<GoogleMapsApi["maps"]["Map"]>;
export type GoogleMarker = InstanceType<GoogleMapsApi["maps"]["Marker"]>;
export type GooglePolygon = InstanceType<GoogleMapsApi["maps"]["Polygon"]>;
export type GooglePolyline = InstanceType<GoogleMapsApi["maps"]["Polyline"]>;

export function getGoogleMapsApi(): GoogleMapsApi {
  return globalThis.google;
}

export function hasGoogleMapsKey(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
}

export function getMapProvider(): MapProvider {
  if (typeof window === "undefined") {
    return "maptiler";
  }

  return window.localStorage.getItem(MAP_PROVIDER_STORAGE_KEY) === "google"
    ? "google"
    : "maptiler";
}

export function setMapProvider(provider: MapProvider): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, provider);
  }

  mapProviderListeners.forEach((listener) => listener());
}

export function subscribeToMapProvider(listener: () => void): () => void {
  mapProviderListeners.add(listener);
  return () => mapProviderListeners.delete(listener);
}

export function useMapProvider(): MapProvider {
  return useSyncExternalStore(
    subscribeToMapProvider,
    getMapProvider,
    () => "maptiler" as MapProvider,
  );
}

export async function loadGoogleMaps(): Promise<typeof google> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new Error(
      "Google Maps is not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
    );
  }

  if (!googleMapsPromise) {
    setOptions({ key, v: "weekly" });
    googleMapsPromise = Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
    ]).then(() => globalThis.google);
  }

  return googleMapsPromise;
}
