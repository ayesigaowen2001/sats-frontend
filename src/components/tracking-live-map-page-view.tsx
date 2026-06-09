"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { getSessionData } from "@/lib/auth-tokens";
import { animalsService } from "@/lib/animals/animals-service";
import { devicesService } from "@/lib/devices/devices-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  trackingLogsService,
  type TrackingLogRecord,
} from "@/lib/tracking/tracking-logs-service";

interface TrackingFilterValues {
  organization_id: string;
  animal_id: string;
  device_id: string;
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
  deviceSerial: string;
}

interface PathGroup {
  animalId: string;
  points: TrackingLogRecord[];
}

type MapViewMode = "streets" | "satellite";

const defaultFilters: TrackingFilterValues = {
  organization_id: "",
  animal_id: "",
  device_id: "",
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
    device_id: values.device_id.trim(),
    from_ts: values.from_ts,
    to_ts: values.to_ts,
    page: String(Math.max(1, Number(values.page) || 1)),
  };
}

export function TrackingLiveMapPageView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const activeMapStyleRef = useRef<MapViewMode>("streets");
  const markerRefs = useRef<any[]>([]);
  const lineLayerIdsRef = useRef<string[]>([]);
  const lineSourceIdsRef = useRef<string[]>([]);

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
        option.deviceSerial.toLowerCase().includes(query) ||
        option.id.toLowerCase().includes(query),
    );
  }, [deviceSearch, organizationDeviceOptions]);

  const isMovementMode = useMemo(
    () =>
      Boolean(
        appliedFilters.animal_id.trim() || appliedFilters.device_id.trim(),
      ),
    [appliedFilters.animal_id, appliedFilters.device_id],
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

  const clearPathLayers = useCallback(() => {
    const map = mapRef.current;

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

    lineLayerIdsRef.current = [];
    lineSourceIdsRef.current = [];
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
        device_id: appliedFilters.device_id,
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

          animalOptions = animals
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
              deviceSerial: device.deviceSerial,
            }))
            .sort((a, b) => a.deviceSerial.localeCompare(b.deviceSerial));

          setOrganizationAnimalOptions(animalOptions);
          setOrganizationDeviceOptions(deviceOptions);
        }

        const organizationAnimalKeySet = new Set(
          animalOptions.flatMap((animal) => [animal.id, animal.animalNumber]),
        );
        const organizationDeviceKeySet = new Set(
          deviceOptions.flatMap((device) => [device.id, device.deviceSerial]),
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

        setOrganizationAnimalOptions(
          animals
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
              deviceSerial: device.deviceSerial,
            }))
            .sort((a, b) => a.deviceSerial.localeCompare(b.deviceSerial)),
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

      clearPathLayers();

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clearPathLayers, mapStyleConfig.streets]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
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
      setMapStyleReadyTick((current) => current + 1);
    });
    map.setStyle(nextStyle);
  }, [mapStyleConfig, mapViewMode]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];
    clearPathLayers();

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
              "line-width": 3,
              "line-opacity": 0.9,
            },
          });

          lineSourceIdsRef.current.push(sourceId);
          lineLayerIdsRef.current.push(layerId);
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
    deviceById,
    isMovementMode,
    mapStyleReadyTick,
    mapRows,
    pathGroups,
  ]);

  const rotateMap = () => {
    const map = mapRef.current;

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
                    device_id: "",
                    page: "1",
                  }));
                  setDeviceSearch("");
                }}
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none"
              >
                <option value="" className="text-black">
                  Select organization
                </option>
                {organizationOptions.map((option) => (
                  <option
                    key={option.id}
                    value={option.id}
                    className="text-black"
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
                <option value="" className="text-black">
                  Select animal
                </option>
                {organizationAnimalOptions.map((animal) => (
                  <option
                    key={animal.id}
                    value={animal.animalNumber}
                    className="text-black"
                  >
                    {animal.animalNumber} - {animal.commonName}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 min-w-[10rem] max-w-[14rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Device ID
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
                      option.deviceSerial.toLowerCase() ===
                        nextValue.trim().toLowerCase(),
                  );

                  setDeviceSearch(nextValue);
                  setFilters((current) => ({
                    ...current,
                    device_id: matched?.deviceSerial ?? "",
                    page: "1",
                  }));
                }}
                placeholder="Search device"
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
              />
              <datalist id="tracking-device-options">
                {filteredDeviceOptions.map((device) => (
                  <option
                    key={device.id}
                    value={device.deviceSerial}
                    label={device.id}
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
              disabled={!mapStyleConfig.hasSatellite}
              onClick={() => setMapViewMode("satellite")}
              className={`flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                mapViewMode === "satellite"
                  ? "bg-[var(--color-sand)]/24 text-[var(--color-ice)]"
                  : "text-[var(--color-mist)] hover:bg-white/10"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              title={
                mapStyleConfig.hasSatellite
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
          </div>

          <div ref={mapContainerRef} className="h-[35rem] w-full" />
        </div>
      </div>

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

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isLoading || !pagination?.hasPrev}
              onClick={() => {
                const nextPage = String(Math.max(1, currentPage - 1));
                const nextFilters = { ...filters, page: nextPage };
                applyFilters(nextFilters);
              }}
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-[var(--color-ice)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous page
            </button>
            <button
              type="button"
              disabled={isLoading || !pagination?.hasNext}
              onClick={() => {
                const nextPage = String(currentPage + 1);
                const nextFilters = { ...filters, page: nextPage };
                applyFilters(nextFilters);
              }}
              className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-[var(--color-ice)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next page
            </button>
          </div>
        </DataPanel>
      )}
    </main>
  );
}
