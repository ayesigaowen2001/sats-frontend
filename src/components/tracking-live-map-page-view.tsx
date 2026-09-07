"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Marker as MapLibreMarker } from "maplibre-gl";

import { PageNumbers } from "@/components/common/pagination";
import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { MapProviderSelector } from "@/components/map-provider-selector";
import { getSessionData } from "@/lib/auth-tokens";
import { animalsService } from "@/lib/animals/animals-service";
import { devicesService } from "@/lib/devices/devices-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  trackingLogsService,
  type TrackingLogRecord,
} from "@/lib/tracking/tracking-logs-service";
import {
  getGoogleMapsApi,
  type GoogleMap,
  type GoogleMarker,
  hasGoogleMapsKey,
  loadGoogleMaps,
  type GooglePolyline,
  useMapProvider,
} from "@/lib/maps/map-provider";

interface TrackingFilterValues {
  organization_id: string;
  animal_id: string;
  device_number: string;
  from_ts: string;
  to_ts: string;
  page: string;
}

interface TrackingPagination {
  total: number;
  pages: number;
  page: number;
  perPage: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

interface OrganizationOption {
  id: string;
  name: string;
}

interface AnimalOption {
  id: string;
  animalNumber: string;
  commonName: string;
  gender: string;
  age: number;
  weightKg: number;
}

interface DeviceOption {
  id: string;
  deviceNumber: string;
  deviceSerial: string;
}

interface PathGroup {
  animalId: string;
  points: TrackingLogRecord[];
}

interface PlaybackPoint {
  longitude: number;
  latitude: number;
}

type MapViewMode = "streets" | "satellite";

const defaultFilters: TrackingFilterValues = {
  organization_id: "",
  animal_id: "",
  device_number: "",
  from_ts: "",
  to_ts: "",
  page: "1",
};

const pathColors = ["#f97316", "#22c55e", "#3b82f6", "#eab308", "#a855f7"];

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function toIsoTimestamp(value: string): string {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString();
}

function buildPopupHtml(
  log: TrackingLogRecord,
  animal: AnimalOption | null,
  device: DeviceOption | null,
) {
  const speed = log.speedKmh === null ? "-" : `${log.speedKmh.toFixed(2)} km/h`;
  const direction =
    log.directionDegrees === null
      ? "-"
      : `${log.directionDegrees.toFixed(2)} deg`;

  const animalTitle = animal
    ? `${animal.animalNumber} - ${animal.commonName}`
    : log.animalId;
  const gender = animal?.gender || "-";
  const age = typeof animal?.age === "number" ? `${animal.age} yrs` : "-";
  const weight =
    typeof animal?.weightKg === "number"
      ? `${animal.weightKg.toFixed(1)} kg`
      : "-";
  const deviceValue = device?.deviceSerial || log.deviceId;

  return `
    <div style="min-width: 220px; color: #0f172a; font-family: system-ui, sans-serif;">
      <div style="font-weight: 700; margin-bottom: 6px;">Tracking Point</div>
      <div><strong>Animal:</strong> ${animalTitle}</div>
      <div><strong>Gender:</strong> ${gender}</div>
      <div><strong>Age:</strong> ${age}</div>
      <div><strong>Weight:</strong> ${weight}</div>
      <div><strong>Device:</strong> ${deviceValue}</div>
      <div><strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString()}</div>
      <div><strong>Speed:</strong> ${speed}</div>
      <div><strong>Direction:</strong> ${direction}</div>
    </div>
  `;
}

function normalizeFilterValues(
  values: TrackingFilterValues,
): TrackingFilterValues {
  return {
    organization_id: values.organization_id.trim(),
    animal_id: values.animal_id.trim(),
    device_number: values.device_number.trim(),
    from_ts: values.from_ts,
    to_ts: values.to_ts,
    page: String(Math.max(1, Number(values.page) || 1)),
  };
}

export function TrackingLiveMapPageView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const googleMarkerRefs = useRef<GoogleMarker[]>([]);
  const googlePolylineRefs = useRef<GooglePolyline[]>([]);
  const googleRoutePointRefs = useRef<GoogleMarker[]>([]);
  const playbackAnimationFrameRef = useRef<number | null>(null);
  const playbackProgressRef = useRef(0);
  const playbackMapLibreMarkerRef = useRef<MapLibreMarker | null>(null);
  const playbackGoogleMarkerRef = useRef<GoogleMarker | null>(null);
  const activeMapStyleRef = useRef<MapViewMode>("streets");
  const markerRefs = useRef<any[]>([]);
  const lineLayerIdsRef = useRef<string[]>([]);
  const lineSourceIdsRef = useRef<string[]>([]);
  const routePointLayerIdsRef = useRef<string[]>([]);
  const routePointSourceIdsRef = useRef<string[]>([]);

  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [sessionOrganizationId, setSessionOrganizationId] = useState("");

  const [organizationOptions, setOrganizationOptions] = useState<
    OrganizationOption[]
  >([]);

  const [filters, setFilters] = useState<TrackingFilterValues>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<TrackingFilterValues>(defaultFilters);

  const [showFilters, setShowFilters] = useState(false);

  const [deviceSearch, setDeviceSearch] = useState("");

  const [rows, setRows] = useState<TrackingLogRecord[]>([]);
  const [organizationAnimalOptions, setOrganizationAnimalOptions] = useState<
    AnimalOption[]
  >([]);
  const [organizationDeviceOptions, setOrganizationDeviceOptions] = useState<
    DeviceOption[]
  >([]);

  const animalById = useMemo(() => {
    const byAnyKey = new Map<string, AnimalOption>();

    organizationAnimalOptions.forEach((animal) => {
      byAnyKey.set(animal.id, animal);
      byAnyKey.set(animal.animalNumber, animal);
    });

    return byAnyKey;
  }, [organizationAnimalOptions]);

  const deviceById = useMemo(() => {
    const byAnyKey = new Map<string, DeviceOption>();

    organizationDeviceOptions.forEach((device) => {
      byAnyKey.set(device.id, device);
      byAnyKey.set(device.deviceNumber, device);
      byAnyKey.set(device.deviceSerial, device);
    });

    return byAnyKey;
  }, [organizationDeviceOptions]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pagination, setPagination] = useState<TrackingPagination | null>(null);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("streets");
  const [mapStyleReadyTick, setMapStyleReadyTick] = useState(0);
  const mapProvider = useMapProvider();
  const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackAnimalId, setPlaybackAnimalId] = useState("");
  const [navigationOrigin, setNavigationOrigin] = useState("");
  const [navigationError, setNavigationError] = useState("");

  const mapStyleConfig = useMemo(() => {
    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

    if (mapTilerKey) {
      return {
        streets: `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`,
        satellite: `https://api.maptiler.com/maps/hybrid/style.json?key=${mapTilerKey}`,
        hasSatellite: true,
      };
    }

    return {
      streets: "https://demotiles.maplibre.org/style.json",
      satellite: "https://demotiles.maplibre.org/style.json",
      hasSatellite: false,
    };
  }, []);

  useEffect(() => {
    const sessionData = getSessionData();
    setIsSystemAdmin(Boolean(sessionData?.user.is_system_admin));
    setSessionOrganizationId(sessionData?.user.organization_id ?? "");
  }, []);

  const selectedOrganization = useMemo(
    () =>
      organizationOptions.find(
        (option) => option.id === filters.organization_id,
      ) ?? null,
    [filters.organization_id, organizationOptions],
  );

  const filteredDeviceOptions = useMemo(() => {
    const query = deviceSearch.trim().toLowerCase();

    return organizationDeviceOptions.filter(
      (option) =>
        option.deviceNumber.toLowerCase().includes(query) ||
        option.deviceSerial.toLowerCase().includes(query) ||
        option.id.toLowerCase().includes(query),
    );
  }, [deviceSearch, organizationDeviceOptions]);

  const isMovementMode = useMemo(
    () =>
      Boolean(
        appliedFilters.animal_id.trim() || appliedFilters.device_number.trim(),
      ),
    [appliedFilters.animal_id, appliedFilters.device_number],
  );

  const mapRows = useMemo(() => {
    if (!rows.length) {
      return [] as TrackingLogRecord[];
    }

    if (isMovementMode) {
      return [...rows].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    }

    const latestByAnimal = new Map<string, TrackingLogRecord>();

    rows.forEach((row) => {
      const current = latestByAnimal.get(row.animalId);

      if (!current) {
        latestByAnimal.set(row.animalId, row);
        return;
      }

      if (
        new Date(row.timestamp).getTime() >
        new Date(current.timestamp).getTime()
      ) {
        latestByAnimal.set(row.animalId, row);
      }
    });

    return Array.from(latestByAnimal.values());
  }, [isMovementMode, rows]);

  const pathGroups = useMemo(() => {
    if (!isMovementMode || !rows.length) {
      return [] as PathGroup[];
    }

    const grouped = new Map<string, TrackingLogRecord[]>();

    rows.forEach((row) => {
      const existing = grouped.get(row.animalId) ?? [];
      existing.push(row);
      grouped.set(row.animalId, existing);
    });

    return Array.from(grouped.entries())
      .map(([animalId, points]) => ({
        animalId,
        points: [...points].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        ),
      }))
      .filter((group) => group.points.length > 1);
  }, [isMovementMode, rows]);

  const playbackGroup = useMemo(() => {
    const selected = pathGroups.find(
      (group) => group.animalId === playbackAnimalId,
    );
    return selected ?? pathGroups[0] ?? null;
  }, [pathGroups, playbackAnimalId]);

  const latestLocations = useMemo(() => {
    const latestByAnimal = new Map<string, TrackingLogRecord>();
    rows.forEach((row) => {
      const current = latestByAnimal.get(row.animalId);
      if (
        !current ||
        new Date(row.timestamp).getTime() >
          new Date(current.timestamp).getTime()
      ) {
        latestByAnimal.set(row.animalId, row);
      }
    });
    return Array.from(latestByAnimal.values());
  }, [rows]);

  const selectedNavigationLocation = useMemo(() => {
    const selected = playbackAnimalId
      ? latestLocations.find((row) => row.animalId === playbackAnimalId)
      : undefined;
    return selected ?? latestLocations[0] ?? null;
  }, [latestLocations, playbackAnimalId]);

  const clearPathLayers = useCallback(() => {
    const map = mapRef.current;

    googlePolylineRefs.current.forEach((polyline) => polyline.setMap(null));
    googlePolylineRefs.current = [];
    googleRoutePointRefs.current.forEach((marker) => marker.setMap(null));
    googleRoutePointRefs.current = [];

    if (!map) {
      return;
    }

    lineLayerIdsRef.current.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });

    lineSourceIdsRef.current.forEach((sourceId) => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    routePointLayerIdsRef.current.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    });

    routePointSourceIdsRef.current.forEach((sourceId) => {
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    });

    lineLayerIdsRef.current = [];
    lineSourceIdsRef.current = [];
    routePointLayerIdsRef.current = [];
    routePointSourceIdsRef.current = [];
  }, []);

  const loadTracking = useCallback(async () => {
    if (isSystemAdmin && !appliedFilters.organization_id) {
      setRows([]);
      setPagination(null);
      setSuccessMessage("");
      setError("Select an organization first.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await trackingLogsService.listTrackingLogs({
        animal_id: appliedFilters.animal_id,
        device_number: appliedFilters.device_number,
        from_ts: toIsoTimestamp(appliedFilters.from_ts),
        to_ts: toIsoTimestamp(appliedFilters.to_ts),
        page: Number(appliedFilters.page),
        per_page: 50,
      });

      const selectedOrganizationId = appliedFilters.organization_id.trim();
      let scopedItems = response.items;
      let scopedPagination = response.pagination;

      if (selectedOrganizationId) {
        let animalOptions = organizationAnimalOptions;
        let deviceOptions = organizationDeviceOptions;

        if (!animalOptions.length && !deviceOptions.length) {
          const [animals, devices] = await Promise.all([
            animalsService.listAnimals(selectedOrganizationId, {
              page: 1,
              per_page: 100,
            }),
            devicesService.listDevicesByOrganizationWithFilters(
              selectedOrganizationId,
              {
                page: 1,
                per_page: 100,
              },
            ),
          ]);

          const animalListResponse = animals;
          animalOptions = (animalListResponse.items ?? [])
            .map((animal) => ({
              id: animal.id,
              animalNumber: animal.animalNumber,
              commonName: animal.commonName,
              gender: animal.gender,
              age: animal.age,
              weightKg: animal.weightKg,
            }))
            .sort((a, b) => a.animalNumber.localeCompare(b.animalNumber));

          deviceOptions = devices
            .map((device) => ({
              id: device.id,
              deviceNumber: device.deviceNumber,
              deviceSerial: device.deviceSerial,
            }))
            .sort((a, b) => a.deviceNumber.localeCompare(b.deviceNumber));

          setOrganizationAnimalOptions(animalOptions);
          setOrganizationDeviceOptions(deviceOptions);
        }

        const organizationAnimalKeySet = new Set(
          animalOptions.flatMap((animal) => [animal.id, animal.animalNumber]),
        );
        const organizationDeviceKeySet = new Set(
          deviceOptions.flatMap((device) => [
            device.id,
            device.deviceNumber,
            device.deviceSerial,
          ]),
        );

        scopedItems = response.items.filter(
          (item) =>
            organizationAnimalKeySet.has(item.animalId) ||
            organizationDeviceKeySet.has(item.deviceId),
        );

        scopedPagination = {
          ...response.pagination,
          total: scopedItems.length,
          pages: 1,
          hasNext: false,
          hasPrev: false,
          nextPage: null,
          prevPage: null,
        };
      }

      setRows(scopedItems);
      setPagination(scopedPagination);
      setSuccessMessage(response.message);
    } catch (requestError) {
      setRows([]);
      setPagination(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load tracking logs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, isSystemAdmin]);

  useEffect(() => {
    let isMounted = true;

    const loadOrganizations = async () => {
      try {
        const organizations = await organizationCrudService.listOrganizations();

        if (!isMounted) {
          return;
        }

        const options = organizations
          .map((item) => ({ id: item.id, name: item.organization_name }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setOrganizationOptions(options);

        if (isSystemAdmin) {
          setFilters((current) => ({
            ...current,
            organization_id: "",
          }));
          setAppliedFilters((current) => ({
            ...current,
            organization_id: "",
          }));
          setRows([]);
          return;
        }

        const fallbackId = options[0]?.id ?? "";
        const selectedId = sessionOrganizationId || fallbackId;
        setFilters((current) => ({
          ...current,
          organization_id: selectedId,
        }));
        setAppliedFilters((current) => ({
          ...current,
          organization_id: selectedId,
        }));
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load organizations.",
        );
      }
    };

    void loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, [isSystemAdmin, sessionOrganizationId]);

  useEffect(() => {
    const organizationId = filters.organization_id.trim();

    if (!organizationId) {
      setOrganizationAnimalOptions([]);
      setOrganizationDeviceOptions([]);
      setDeviceSearch("");
      return;
    }

    let isMounted = true;

    const loadOrganizationEntities = async () => {
      try {
        const [animals, devices] = await Promise.all([
          animalsService.listAnimals(organizationId, {
            page: 1,
            per_page: 100,
          }),
          devicesService.listDevicesByOrganizationWithFilters(organizationId, {
            page: 1,
            per_page: 100,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        const animalEntitiesResponse = animals;
        setOrganizationAnimalOptions(
          (animalEntitiesResponse.items ?? [])
            .map((animal) => ({
              id: animal.id,
              animalNumber: animal.animalNumber,
              commonName: animal.commonName,
              gender: animal.gender,
              age: animal.age,
              weightKg: animal.weightKg,
            }))
            .sort((a, b) => a.animalNumber.localeCompare(b.animalNumber)),
        );

        setOrganizationDeviceOptions(
          devices
            .map((device) => ({
              id: device.id,
              deviceNumber: device.deviceNumber,
              deviceSerial: device.deviceSerial,
            }))
            .sort((a, b) => a.deviceNumber.localeCompare(b.deviceNumber)),
        );
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setOrganizationAnimalOptions([]);
        setOrganizationDeviceOptions([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load organization animals/devices.",
        );
      }
    };

    void loadOrganizationEntities();

    return () => {
      isMounted = false;
    };
  }, [filters.organization_id]);

  useEffect(() => {
    let active = true;

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      if (mapProvider === "google") {
        try {
          const googleMaps = await loadGoogleMaps();
          if (!active || !mapContainerRef.current) {
            return;
          }
          googleMapRef.current = new googleMaps.maps.Map(
            mapContainerRef.current,
            {
              center: { lat: 0.3482, lng: 32.5831 },
              zoom: 7,
              mapTypeControl: true,
              streetViewControl: false,
              fullscreenControl: true,
            },
          );
          activeMapStyleRef.current = "streets";
          setMapStyleReadyTick((current) => current + 1);
          return;
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load Google Maps.",
          );
          return;
        }
      }

      const maplibregl = (await import("maplibre-gl")).default;
      const styleUrl = mapStyleConfig.streets;

      if (!active || !mapContainerRef.current) {
        return;
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [32.5831, 0.3482],
        zoom: 7,
        maxZoom: 20,
      });

      map.on("load", () => {
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        setMapStyleReadyTick((current) => current + 1);
      });

      mapRef.current = map;
      activeMapStyleRef.current = "streets";
    };

    void initMap();

    return () => {
      active = false;

      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      googleMarkerRefs.current.forEach((marker) => marker.setMap(null));
      googleMarkerRefs.current = [];

      clearPathLayers();

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      googleMapRef.current = null;
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = "";
      }
    };
  }, [clearPathLayers, mapProvider, mapStyleConfig.streets]);

  useEffect(() => {
    const map = mapRef.current;

    if (googleMapRef.current) {
      if (
        mapViewMode === "satellite" &&
        (!hasGoogleMapsKey() || mapProvider !== "google")
      ) {
        return;
      }
      googleMapRef.current.setMapTypeId(
        mapViewMode === "satellite" ? "hybrid" : "roadmap",
      );
      return;
    }

    if (!map || mapProvider === "google") {
      return;
    }

    if (mapViewMode === "satellite" && !mapStyleConfig.hasSatellite) {
      return;
    }

    if (activeMapStyleRef.current === mapViewMode) {
      return;
    }

    const nextStyle =
      mapViewMode === "satellite"
        ? mapStyleConfig.satellite
        : mapStyleConfig.streets;

    activeMapStyleRef.current = mapViewMode;
    map.once("style.load", () => {
      // Use nearest-neighbour resampling for raster tiles so satellite imagery
      // stays sharp instead of blurring when zoomed out to lower zoom levels.
      const style = map.getStyle();
      if (style && style.layers) {
        style.layers.forEach((layer: any) => {
          if (layer.type === "raster") {
            map.setPaintProperty(layer.id, "raster-resampling", "nearest");
          }
        });
      }
      setMapStyleReadyTick((current) => current + 1);
    });
    map.setStyle(nextStyle);
  }, [mapProvider, mapStyleConfig, mapViewMode]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  useEffect(() => {
    const map = mapRef.current;

    googleMarkerRefs.current.forEach((marker) => marker.setMap(null));
    googleMarkerRefs.current = [];
    clearPathLayers();

    if (!map && googleMapRef.current) {
      if (!mapRows.length) {
        return;
      }

      const googleMaps = getGoogleMapsApi();
      const bounds = new googleMaps.maps.LatLngBounds();
      if (isMovementMode) {
        pathGroups.forEach((group, index) => {
          const polyline = new googleMaps.maps.Polyline({
            path: group.points.map((point) => ({
              lat: point.latitude,
              lng: point.longitude,
            })),
            geodesic: true,
            strokeColor: pathColors[index % pathColors.length],
            strokeOpacity: 0.75,
            strokeWeight: 2,
            map: googleMapRef.current,
          });
          googlePolylineRefs.current.push(polyline);

          group.points.forEach((point, pointIndex) => {
            const marker = new googleMaps.maps.Marker({
              position: { lat: point.latitude, lng: point.longitude },
              map: googleMapRef.current,
              title: `Movement point ${pointIndex + 1}`,
              icon: {
                path: googleMaps.maps.SymbolPath.CIRCLE,
                scale: 3.5,
                fillColor: pathColors[index % pathColors.length],
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 1,
              },
            });
            googleRoutePointRefs.current.push(marker);
          });
        });
      }

      const latestId = mapRows[mapRows.length - 1]?.id ?? "";
      mapRows.forEach((log) => {
        const marker = new googleMaps.maps.Marker({
          position: { lat: log.latitude, lng: log.longitude },
          map: googleMapRef.current,
          title: log.id === latestId ? "Latest position" : "Tracking position",
        });
        marker.addListener("click", () => {
          const animal = animalById.get(log.animalId) ?? null;
          const device = deviceById.get(log.deviceId) ?? null;
          const infoWindow = new googleMaps.maps.InfoWindow({
            content: buildPopupHtml(log, animal, device),
          });
          infoWindow.open({ map: googleMapRef.current!, anchor: marker });
        });
        googleMarkerRefs.current.push(marker);
        bounds.extend(marker.getPosition()!);
      });
      googleMapRef.current.fitBounds(bounds, 60);
      return;
    }

    if (!map) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    if (!mapRows.length) {
      return;
    }

    let cancelled = false;

    const renderMapData = async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      if (cancelled || !mapRef.current) {
        return;
      }

      if (isMovementMode) {
        pathGroups.forEach((group, index) => {
          const sourceId = `tracking-path-source-${index}`;
          const layerId = `tracking-path-layer-${index}`;

          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: group.points.map((point) => [
                  point.longitude,
                  point.latitude,
                ]),
              },
              properties: {
                animalId: group.animalId,
              },
            },
          });

          map.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": pathColors[index % pathColors.length],
              "line-width": 2,
              "line-opacity": 0.75,
              "line-dasharray": [0.5, 2],
            },
          });

          const pointSourceId = `tracking-route-points-source-${index}`;
          const pointLayerId = `tracking-route-points-layer-${index}`;
          map.addSource(pointSourceId, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: group.points.map((point) => ({
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: [point.longitude, point.latitude],
                },
              })),
            },
          });
          map.addLayer({
            id: pointLayerId,
            type: "circle",
            source: pointSourceId,
            paint: {
              "circle-radius": 4,
              "circle-color": pathColors[index % pathColors.length],
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1,
            },
          });

          lineSourceIdsRef.current.push(sourceId);
          lineLayerIdsRef.current.push(layerId);
          routePointSourceIdsRef.current.push(pointSourceId);
          routePointLayerIdsRef.current.push(pointLayerId);
        });
      }

      const bounds: [[number, number], [number, number]] = [
        [mapRows[0].longitude, mapRows[0].latitude],
        [mapRows[0].longitude, mapRows[0].latitude],
      ];

      const latestId = mapRows[mapRows.length - 1]?.id ?? "";
      const createdMarkers: any[] = [];

      mapRows.forEach((log) => {
        const animal = animalById.get(log.animalId) ?? null;
        const device = deviceById.get(log.deviceId) ?? null;
        const element = document.createElement("div");
        element.className =
          "h-3.5 w-3.5 rounded-full border border-white/90 shadow";
        element.style.backgroundColor =
          log.id === latestId ? "#f97316" : "#22c55e";

        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
          buildPopupHtml(log, animal, device),
        );

        const marker = new maplibregl.Marker({ element })
          .setLngLat([log.longitude, log.latitude])
          .setPopup(popup)
          .addTo(map);

        createdMarkers.push(marker);

        bounds[0][0] = Math.min(bounds[0][0], log.longitude);
        bounds[0][1] = Math.min(bounds[0][1], log.latitude);
        bounds[1][0] = Math.max(bounds[1][0], log.longitude);
        bounds[1][1] = Math.max(bounds[1][1], log.latitude);
      });

      markerRefs.current = createdMarkers;
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    };

    void renderMapData();

    return () => {
      cancelled = true;
    };
  }, [
    animalById,
    clearPathLayers,
    mapProvider,
    deviceById,
    isMovementMode,
    mapStyleReadyTick,
    mapRows,
    pathGroups,
  ]);

  useEffect(() => {
    if (playbackAnimationFrameRef.current !== null) {
      cancelAnimationFrame(playbackAnimationFrameRef.current);
      playbackAnimationFrameRef.current = null;
    }

    if (!playbackGroup || playbackGroup.points.length < 2) {
      playbackMapLibreMarkerRef.current?.remove();
      playbackMapLibreMarkerRef.current = null;
      playbackGoogleMarkerRef.current?.setMap(null);
      playbackGoogleMarkerRef.current = null;
      return;
    }

    const points: PlaybackPoint[] = playbackGroup.points.map((point) => ({
      longitude: point.longitude,
      latitude: point.latitude,
    }));
    const setPosition = (position: PlaybackPoint) => {
      if (mapProvider === "google" && playbackGoogleMarkerRef.current) {
        playbackGoogleMarkerRef.current.setPosition({
          lat: position.latitude,
          lng: position.longitude,
        });
      } else if (playbackMapLibreMarkerRef.current) {
        playbackMapLibreMarkerRef.current.setLngLat([
          position.longitude,
          position.latitude,
        ]);
      }
    };

    const createMarker = async () => {
      if (mapProvider === "google" && googleMapRef.current) {
        const googleMaps = getGoogleMapsApi();
        playbackGoogleMarkerRef.current?.setMap(null);
        playbackGoogleMarkerRef.current = new googleMaps.maps.Marker({
          map: googleMapRef.current,
          position: { lat: points[0].latitude, lng: points[0].longitude },
          title: "Movement playback",
          icon: {
            path: googleMaps.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#f97316",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
      } else if (mapRef.current) {
        const maplibregl = await import("maplibre-gl");
        playbackMapLibreMarkerRef.current?.remove();
        const element = document.createElement("div");
        element.className =
          "h-5 w-5 rounded-full border-2 border-white bg-orange-500 shadow-[0_0_0_6px_rgba(249,115,22,0.25)]";
        playbackMapLibreMarkerRef.current = new maplibregl.default.Marker({
          element,
        })
          .setLngLat([points[0].longitude, points[0].latitude])
          .addTo(mapRef.current);
      }

      setPosition(
        points[
          Math.min(
            points.length - 1,
            Math.floor(playbackProgressRef.current * points.length),
          )
        ] ?? points[0],
      );
    };

    void createMarker();

    if (!isPlaybackPlaying) {
      return () => {
        if (playbackAnimationFrameRef.current !== null) {
          cancelAnimationFrame(playbackAnimationFrameRef.current);
        }
      };
    }

    const duration = 12000;
    const startedAt =
      performance.now() - playbackProgressRef.current * duration;
    const animate = (now: number) => {
      const elapsed = Math.max(0, now - startedAt);
      const progress = (elapsed % duration) / duration;
      const scaled = progress * (points.length - 1);
      const segment = Math.min(
        points.length - 2,
        Math.max(0, Math.floor(scaled)),
      );
      const segmentProgress = scaled - segment;
      const start = points[segment];
      const end = points[segment + 1];

      if (!start || !end) {
        playbackAnimationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      playbackProgressRef.current = progress;
      setPlaybackProgress(progress);
      setPosition({
        longitude:
          start.longitude + (end.longitude - start.longitude) * segmentProgress,
        latitude:
          start.latitude + (end.latitude - start.latitude) * segmentProgress,
      });

      playbackAnimationFrameRef.current = requestAnimationFrame(animate);
    };

    playbackAnimationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (playbackAnimationFrameRef.current !== null) {
        cancelAnimationFrame(playbackAnimationFrameRef.current);
        playbackAnimationFrameRef.current = null;
      }
    };
  }, [isPlaybackPlaying, mapProvider, mapStyleReadyTick, playbackGroup]);

  const openNavigationToLatest = (origin: string) => {
    if (!selectedNavigationLocation) {
      setNavigationError("No latest animal location is available.");
      return;
    }

    const destination = `${selectedNavigationLocation.latitude},${selectedNavigationLocation.longitude}`;
    const openDirections = (resolvedOrigin: string) => {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(resolvedOrigin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      window.open(url, "_blank", "noopener,noreferrer");
    };

    if (origin === "current") {
      if (!navigator.geolocation) {
        setNavigationError(
          "This browser does not provide your current location.",
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNavigationError("");
          openDirections(
            `${position.coords.latitude},${position.coords.longitude}`,
          );
        },
        () => setNavigationError("Location permission was not granted."),
        { enableHighAccuracy: true, timeout: 10000 },
      );
      return;
    }

    const coordinates = origin.split(",").map(Number);
    if (
      coordinates.length !== 2 ||
      coordinates.some((coordinate) => Number.isNaN(coordinate)) ||
      coordinates[0] < -90 ||
      coordinates[0] > 90 ||
      coordinates[1] < -180 ||
      coordinates[1] > 180
    ) {
      setNavigationError("Enter the origin as latitude, longitude.");
      return;
    }

    setNavigationError("");
    openDirections(origin.trim());
  };

  const rotateMap = () => {
    const map = mapRef.current;

    if (googleMapRef.current) {
      googleMapRef.current.setHeading(
        ((googleMapRef.current.getHeading() ?? 0) + 45) % 360,
      );
      return;
    }

    if (!map) {
      return;
    }

    const nextBearing = (map.getBearing() + 45) % 360;
    map.easeTo({ bearing: nextBearing, duration: 400 });
  };

  const applyFilters = (nextFilters: TrackingFilterValues) => {
    const normalized = normalizeFilterValues(nextFilters);

    setFilters(normalized);
    setAppliedFilters(normalized);
    setError("");
  };

  const handleSubmitFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSystemAdmin && !filters.organization_id.trim()) {
      setError("Select an organization before loading tracking logs.");
      return;
    }

    applyFilters(filters);
  };

  const handleResetFilters = () => {
    const reset: TrackingFilterValues = {
      ...defaultFilters,
      organization_id: filters.organization_id,
      page: "1",
    };

    setSuccessMessage("");
    setDeviceSearch("");
    applyFilters(reset);
  };

  const currentPage = pagination?.page ?? 1;
  const canEditTrackingFilters =
    !isSystemAdmin || Boolean(filters.organization_id);

  return (
    <main className="flex w-full flex-1 flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      {/* ── Compact, collapsible filter bar ── */}
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <form onSubmit={handleSubmitFilters}>
          {/* Always-visible row: org, animal, device, actions */}
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[12rem] max-w-[16rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Organization
              </span>
              <select
                value={filters.organization_id}
                onChange={(event) => {
                  const selectedOrganizationId = event.target.value;
                  setFilters((current) => ({
                    ...current,
                    organization_id: selectedOrganizationId,
                    animal_id: "",
                    device_number: "",
                    page: "1",
                  }));
                  setDeviceSearch("");
                }}
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none"
              >
                <option value="" className="bg-slate-900 text-white">
                  Select organization
                </option>
                {organizationOptions.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    className="bg-slate-900 text-white"
                  >
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 min-w-[10rem] max-w-[14rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Animal number
              </span>
              <select
                value={filters.animal_id}
                disabled={!canEditTrackingFilters}
                onChange={(event) => {
                  setFilters((current) => ({
                    ...current,
                    animal_id: event.target.value,
                    page: "1",
                  }));
                }}
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
              >
                <option value="" className="bg-slate-900 text-white">
                  Select animal
                </option>
                {organizationAnimalOptions.map((animal) => (
                  <option
                    key={animal.id}
                    value={animal.animalNumber}
                    className="bg-slate-900 text-white"
                  >
                    {animal.animalNumber} - {animal.commonName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 min-w-[10rem] max-w-[14rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Device number
              </span>
              <input
                list="tracking-device-options"
                value={deviceSearch}
                disabled={!canEditTrackingFilters}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const matched = organizationDeviceOptions.find(
                    (option) =>
                      option.id.toLowerCase() ===
                        nextValue.trim().toLowerCase() ||
                      option.deviceNumber.toLowerCase() ===
                        nextValue.trim().toLowerCase() ||
                      option.deviceSerial.toLowerCase() ===
                        nextValue.trim().toLowerCase(),
                  );

                  setDeviceSearch(nextValue);
                  setFilters((current) => ({
                    ...current,
                    device_number: matched?.deviceNumber ?? nextValue,
                    page: "1",
                  }));
                }}
                placeholder="Search device number"
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
              />
              <datalist id="tracking-device-options">
                {filteredDeviceOptions.map((device) => (
                  <option
                    key={device.id}
                    value={device.deviceNumber}
                    label={`${device.deviceSerial} (${device.id})`}
                  />
                ))}
              </datalist>
            </label>

            <button
              type="submit"
              disabled={
                isLoading || (isSystemAdmin && !filters.organization_id)
              }
              className="rounded-lg border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Loading..." : "Apply"}
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)]"
            >
              Reset
            </button>

            {/* Toggle time/page extras */}
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-mist)] transition-colors hover:border-white/30 hover:text-[var(--color-ice)]"
            >
              <span
                className={`inline-block transition-transform duration-200 ${showFilters ? "rotate-90" : ""}`}
              >
                &#9654;
              </span>
              Time
            </button>

            {pagination ? (
              <span className="text-xs text-[var(--color-mist)] whitespace-nowrap">
                Pg {pagination.page}/{pagination.pages} &bull;{" "}
                {pagination.total} total
              </span>
            ) : null}
          </div>

          {/* Collapsible: time range + page */}
          {showFilters && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-shell-border)] p-3">
              <label className="block flex-1 min-w-[12rem]">
                <span className="text-xs font-medium text-[var(--color-ice)]">
                  From timestamp
                </span>
                <input
                  type="datetime-local"
                  value={filters.from_ts}
                  disabled={!canEditTrackingFilters}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      from_ts: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
                />
              </label>

              <label className="block flex-1 min-w-[12rem]">
                <span className="text-xs font-medium text-[var(--color-ice)]">
                  To timestamp
                </span>
                <input
                  type="datetime-local"
                  value={filters.to_ts}
                  disabled={!canEditTrackingFilters}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      to_ts: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
                />
              </label>

              <label className="block w-20">
                <span className="text-xs font-medium text-[var(--color-ice)]">
                  Page
                </span>
                <input
                  type="number"
                  min={1}
                  value={filters.page}
                  disabled={!canEditTrackingFilters}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      page: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
                />
              </label>
            </div>
          )}
        </form>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-300/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">
            {successMessage}
          </p>
        ) : null}

        {selectedOrganization ? (
          <p className="mt-2 text-[11px] text-[var(--color-mist)]">
            Org: {selectedOrganization.name} ({selectedOrganization.id})
          </p>
        ) : null}
      </div>

      {/* ── Map ── */}
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-xl border border-white/20 bg-[rgba(7,22,32,0.72)] p-2 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setMapViewMode("streets")}
              className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                mapViewMode === "streets"
                  ? "bg-[var(--color-sand)]/24 text-[var(--color-ice)]"
                  : "text-[var(--color-mist)] hover:bg-white/10"
              }`}
              aria-label="Streets view"
              title="Streets view"
            >
              <span className="pi pi-map text-sm" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={
                mapProvider === "google"
                  ? !hasGoogleMapsKey()
                  : !mapStyleConfig.hasSatellite
              }
              onClick={() => setMapViewMode("satellite")}
              className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                mapViewMode === "satellite"
                  ? "bg-[var(--color-sand)]/24 text-[var(--color-ice)]"
                  : "text-[var(--color-mist)] hover:bg-white/10"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              title={
                mapProvider === "google"
                  ? "Satellite view with Google hybrid imagery"
                  : mapStyleConfig.hasSatellite
                    ? "Satellite view with labels"
                    : "Satellite view requires NEXT_PUBLIC_MAPTILER_API_KEY"
              }
              aria-label="Satellite view"
            >
              <span className="pi pi-image text-sm" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={rotateMap}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-[var(--color-ice)] transition-colors hover:bg-white/10"
              title="Rotate map"
              aria-label="Rotate map 45 degrees"
            >
              <span className="pi pi-refresh text-sm" aria-hidden="true" />
            </button>
            <MapProviderSelector className="ml-1" />
          </div>

          {isMovementMode && playbackGroup ? (
            <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-white/20 bg-[rgba(7,22,32,0.82)] p-3 text-xs backdrop-blur-sm">
              <label className="flex items-center gap-2 text-[var(--color-mist)]">
                <span>Playback</span>
                <select
                  value={playbackGroup.animalId}
                  onChange={(event) => {
                    setPlaybackAnimalId(event.target.value);
                    playbackProgressRef.current = 0;
                    setPlaybackProgress(0);
                    setIsPlaybackPlaying(false);
                  }}
                  className="rounded-md border border-white/15 bg-black/40 px-2 py-1 text-[var(--color-ice)]"
                  aria-label="Animal movement playback"
                >
                  {pathGroups.map((group) => (
                    <option key={group.animalId} value={group.animalId}>
                      {animalById.get(group.animalId)?.animalNumber ??
                        group.animalId}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  if (playbackProgress >= 1) {
                    playbackProgressRef.current = 0;
                    setPlaybackProgress(0);
                  }
                  setIsPlaybackPlaying((playing) => !playing);
                }}
                className="rounded-md border border-orange-300/40 bg-orange-500/20 px-3 py-1.5 font-semibold text-orange-100 hover:bg-orange-500/30"
              >
                {isPlaybackPlaying
                  ? "Pause"
                  : playbackProgress >= 1
                    ? "Replay"
                    : "Play movement"}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={playbackProgress}
                onChange={(event) => {
                  const nextProgress = Number(event.target.value);
                  playbackProgressRef.current = nextProgress;
                  setPlaybackProgress(nextProgress);
                }}
                className="min-w-[9rem] flex-1 accent-orange-400"
                aria-label="Movement playback position"
              />
              <span className="text-[var(--color-fog)]">Animated path</span>
            </div>
          ) : null}

          <div ref={mapContainerRef} className="h-[35rem] w-full" />
        </div>
      </div>

      <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1 text-xs text-[var(--color-mist)]">
            <span className="mb-1 block font-semibold uppercase tracking-[0.1em]">
              Navigate to latest animal location
            </span>
            <select
              value={playbackAnimalId}
              onChange={(event) => setPlaybackAnimalId(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--color-ice)]"
              aria-label="Animal latest location"
            >
              <option value="">Latest available animal</option>
              {latestLocations.map((location) => (
                <option key={location.animalId} value={location.animalId}>
                  {animalById.get(location.animalId)?.animalNumber ??
                    location.animalId}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => openNavigationToLatest("current")}
            className="rounded-lg border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            Use my location
          </button>
          <input
            value={navigationOrigin}
            onChange={(event) => setNavigationOrigin(event.target.value)}
            placeholder="Origin latitude, longitude"
            className="min-w-[13rem] flex-1 rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--color-ice)] placeholder:text-[var(--color-fog)]"
            aria-label="Navigation origin coordinates"
          />
          <button
            type="button"
            onClick={() => openNavigationToLatest(navigationOrigin)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-[var(--color-ice)] hover:bg-white/15"
          >
            Use origin
          </button>
        </div>
        {navigationError ? (
          <p className="mt-2 text-xs text-rose-300">{navigationError}</p>
        ) : (
          <p className="mt-2 text-xs text-[var(--color-fog)]">
            Opens turn-by-turn directions in Google Maps to the selected
            animal&apos;s latest position.
          </p>
        )}
      </section>

      {!rows.length ? (
        <DataPanel
          eyebrow="Tracking records"
          title="No tracking logs found"
          description="Adjust your filters and load tracking logs to visualize pushpins and movement paths."
        >
          <p className="text-sm text-[var(--color-mist)]">
            The map is ready and updates immediately when records are returned.
          </p>
        </DataPanel>
      ) : (
        <DataPanel
          eyebrow="Tracking records"
          title="Tracking logs"
          description="Results returned by GET /tracking with your selected filters."
        >
          <DataTable
            rows={rows}
            pagination={false}
            horizontalScroll
            minColumnWidthRem={10}
            columns={[
              {
                header: "Animal",
                render: (row) => {
                  const animal = animalById.get(row.animalId);

                  if (!animal) {
                    return row.animalId;
                  }

                  return `${animal.animalNumber} - ${animal.commonName}`;
                },
              },
              {
                header: "Device",
                render: (row) => row.deviceId,
              },
              {
                header: "Timestamp",
                render: (row) => formatDateTime(row.timestamp),
              },
              {
                header: "Coordinates",
                render: (row) =>
                  `${row.latitude.toFixed(5)}, ${row.longitude.toFixed(5)}`,
              },
              {
                header: "Speed (km/h)",
                render: (row) =>
                  row.speedKmh === null ? "-" : row.speedKmh.toFixed(2),
              },
              {
                header: "Direction",
                render: (row) =>
                  row.directionDegrees === null
                    ? "-"
                    : `${row.directionDegrees.toFixed(2)} deg`,
              },
              {
                header: "Altitude (m)",
                render: (row) =>
                  row.altitudeM === null ? "-" : row.altitudeM.toFixed(2),
              },
            ]}
          />

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <PageNumbers
              currentPage={currentPage}
              totalPages={pagination?.pages ?? 1}
              disabled={isLoading}
              onPageChange={(nextPage) =>
                applyFilters({ ...filters, page: String(nextPage) })
              }
            />
            {pagination ? (
              <span className="text-xs text-[var(--color-mist)]">
                {pagination.total} total
              </span>
            ) : null}
          </div>
        </DataPanel>
      )}
    </main>
  );
}
