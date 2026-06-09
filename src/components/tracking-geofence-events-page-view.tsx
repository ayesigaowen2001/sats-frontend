"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

import { DataPanel } from "@/components/data-panel";
import { DataTable } from "@/components/data-table";
import { getSessionData } from "@/lib/auth-tokens";
import { animalsService } from "@/lib/animals/animals-service";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  geofenceEventsService,
  type GeofenceEventFilters,
  type GeofenceEventListResult,
  type GeofenceEventRecord,
} from "@/lib/tracking/geofence-events-service";
import {
  geofencesService,
  type Geofence,
} from "@/lib/tracking/geofences-service";

interface GeofenceEventsFilterValues {
  organization_id: string;
  animal_id: string;
  geofence_id: string;
  status: "" | GeofenceEventStatus;
  from_ts: string;
  to_ts: string;
  page: string;
}

interface GeofenceEventPagination {
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
}

type GeofenceEventStatus = "Inside" | "Outside" | "Border" | "Breach";

const geofenceEventStatuses: GeofenceEventStatus[] = [
  "Inside",
  "Outside",
  "Border",
  "Breach",
];

const defaultFilters: GeofenceEventsFilterValues = {
  organization_id: "",
  animal_id: "",
  geofence_id: "",
  status: "",
  from_ts: "",
  to_ts: "",
  page: "1",
};

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

function normalizeFilterValues(
  values: GeofenceEventsFilterValues,
): GeofenceEventsFilterValues {
  return {
    organization_id: values.organization_id.trim(),
    animal_id: values.animal_id.trim(),
    geofence_id: values.geofence_id.trim(),
    status: values.status,
    from_ts: values.from_ts,
    to_ts: values.to_ts,
    page: String(Math.max(1, Number(values.page) || 1)),
  };
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Inside":
      return "#22c55e";
    case "Border":
      return "#eab308";
    case "Outside":
      return "#f97316";
    case "Breach":
      return "#ef4444";
    default:
      return "#38bdf8";
  }
}

function buildPopupHtml(event: GeofenceEventRecord) {
  return `
    <div style="min-width: 220px; color: #0f172a; font-family: system-ui, sans-serif;">
      <div style="font-weight: 700; margin-bottom: 6px;">Geofence Event</div>
      <div><strong>Status:</strong> ${event.status}</div>
      <div><strong>Animal:</strong> ${event.animalId}</div>
      <div><strong>Geofence:</strong> ${event.geofenceId}</div>
      <div><strong>Tracking Log:</strong> ${event.trackingLogId}</div>
      <div><strong>Timestamp:</strong> ${new Date(event.timestamp).toLocaleString()}</div>
      <div><strong>Coordinates:</strong> ${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}</div>
    </div>
  `;
}

export function TrackingGeofenceEventsPageView(): React.JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<MapLibreMarker[]>([]);
  const geofenceSourceIdRef = useRef("geofence-events-polygons-source");
  const geofenceFillLayerIdRef = useRef("geofence-events-polygons-fill");
  const geofenceLineLayerIdRef = useRef("geofence-events-polygons-line");

  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [sessionOrganizationId, setSessionOrganizationId] = useState("");

  const [organizationOptions, setOrganizationOptions] = useState<
    OrganizationOption[]
  >([]);
  const [organizationSearch, setOrganizationSearch] = useState("");

  const [animalOptions, setAnimalOptions] = useState<AnimalOption[]>([]);
  const [geofenceOptions, setGeofenceOptions] = useState<Geofence[]>([]);
  const [animalSearch, setAnimalSearch] = useState("");
  const [geofenceSearch, setGeofenceSearch] = useState("");

  const [filters, setFilters] =
    useState<GeofenceEventsFilterValues>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<GeofenceEventsFilterValues>(defaultFilters);

  const [showFilters, setShowFilters] = useState(false);

  const [rows, setRows] = useState<GeofenceEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pagination, setPagination] = useState<GeofenceEventPagination | null>(
    null,
  );
  const [mapReadyTick, setMapReadyTick] = useState(0);

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

  const filteredOrganizationOptions = useMemo(() => {
    const query = organizationSearch.trim().toLowerCase();

    if (!query) {
      return organizationOptions;
    }

    return organizationOptions.filter((option) =>
      option.name.toLowerCase().includes(query),
    );
  }, [organizationOptions, organizationSearch]);

  const filteredAnimalOptions = useMemo(() => {
    const query = animalSearch.trim().toLowerCase();

    if (!query) {
      return animalOptions;
    }

    return animalOptions.filter(
      (option) =>
        option.animalNumber.toLowerCase().includes(query) ||
        option.id.toLowerCase().includes(query),
    );
  }, [animalOptions, animalSearch]);

  const filteredGeofenceOptions = useMemo(() => {
    const query = geofenceSearch.trim().toLowerCase();

    if (!query) {
      return geofenceOptions;
    }

    return geofenceOptions.filter(
      (option) =>
        option.parkName.toLowerCase().includes(query) ||
        option.id.toLowerCase().includes(query),
    );
  }, [geofenceOptions, geofenceSearch]);

  const loadGeofenceEvents = useCallback(async () => {
    if (!appliedFilters.organization_id) {
      setRows([]);
      setPagination(null);
      setSuccessMessage("");
      setError("Select an organization first.");
      return;
    }

    setIsLoading(true);
    setError("");

    const requestFilters: GeofenceEventFilters = {
      animal_id: appliedFilters.animal_id,
      geofence_id: appliedFilters.geofence_id,
      from_ts: toIsoTimestamp(appliedFilters.from_ts),
      to_ts: toIsoTimestamp(appliedFilters.to_ts),
      page: Number(appliedFilters.page),
      per_page: 50,
    };

    if (appliedFilters.status) {
      requestFilters.status = appliedFilters.status;
    }

    try {
      const response: GeofenceEventListResult =
        await geofenceEventsService.listGeofenceEvents(
          appliedFilters.organization_id,
          requestFilters,
        );

      setRows(response.items);
      setPagination(response.pagination);
      setSuccessMessage(response.message);
    } catch (requestError) {
      setRows([]);
      setPagination(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load geofence events.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

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
          setOrganizationSearch("");
          return;
        }

        const fallbackId = options[0]?.id ?? "";
        const selectedId = sessionOrganizationId || fallbackId;
        const selectedName =
          options.find((option) => option.id === selectedId)?.name ?? "";

        setFilters((current) => ({
          ...current,
          organization_id: selectedId,
        }));
        setAppliedFilters((current) => ({
          ...current,
          organization_id: selectedId,
        }));
        setOrganizationSearch(selectedName);
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
      setAnimalOptions([]);
      setGeofenceOptions([]);
      setAnimalSearch("");
      setGeofenceSearch("");
      return;
    }

    let isMounted = true;

    const loadOrganizationEntities = async () => {
      try {
        const [animals, listedGeofences] = await Promise.all([
          animalsService.listAnimals(organizationId, {
            page: 1,
            per_page: 100,
          }),
          geofencesService.listGeofences(organizationId),
        ]);

        const detailedGeofences = await Promise.all(
          listedGeofences.map(async (geofence) => {
            try {
              return await geofencesService.getGeofenceById(
                organizationId,
                geofence.id,
              );
            } catch {
              return geofence;
            }
          }),
        );

        if (!isMounted) {
          return;
        }

        setAnimalOptions(
          animals
            .map((animal) => ({
              id: animal.id,
              animalNumber: animal.animalNumber,
            }))
            .sort((a, b) => a.animalNumber.localeCompare(b.animalNumber)),
        );

        setGeofenceOptions(
          detailedGeofences.sort((a, b) =>
            a.parkName.localeCompare(b.parkName),
          ),
        );
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setAnimalOptions([]);
        setGeofenceOptions([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Failed to load animals and geofences.",
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
      const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
      const styleUrl = mapTilerKey
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
        : "https://demotiles.maplibre.org/style.json";

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
        setMapReadyTick((current) => current + 1);
      });

      mapRef.current = map;
    };

    void initMap();

    return () => {
      active = false;

      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    void loadGeofenceEvents();
  }, [loadGeofenceEvents]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const sourceId = geofenceSourceIdRef.current;
    const fillLayerId = geofenceFillLayerIdRef.current;
    const lineLayerId = geofenceLineLayerIdRef.current;

    if (map.getLayer(fillLayerId)) {
      map.removeLayer(fillLayerId);
    }

    if (map.getLayer(lineLayerId)) {
      map.removeLayer(lineLayerId);
    }

    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }

    if (!geofenceOptions.length) {
      return;
    }

    const polygonFeatures = geofenceOptions
      .filter((geofence) => {
        const firstRing = geofence.boundary.coordinates?.[0];
        return Array.isArray(firstRing) && firstRing.length >= 4;
      })
      .map((geofence) => ({
        type: "Feature" as const,
        properties: {
          id: geofence.id,
          parkName: geofence.parkName,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: geofence.boundary.coordinates,
        },
      }));

    if (!polygonFeatures.length) {
      return;
    }

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection" as const,
        features: polygonFeatures,
      },
    });

    map.addLayer({
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#06b6d4",
        "fill-opacity": 0.1,
      },
    });

    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#22d3ee",
        "line-width": 2,
      },
    });

    return () => {
      if (map.getLayer(fillLayerId)) {
        map.removeLayer(fillLayerId);
      }

      if (map.getLayer(lineLayerId)) {
        map.removeLayer(lineLayerId);
      }

      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [geofenceOptions, mapReadyTick]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    if (!rows.length) {
      return;
    }

    let cancelled = false;

    const renderMarkers = async () => {
      const maplibregl = (await import("maplibre-gl")).default;

      if (cancelled || !mapRef.current) {
        return;
      }

      const bounds: [[number, number], [number, number]] = [
        [rows[0].longitude, rows[0].latitude],
        [rows[0].longitude, rows[0].latitude],
      ];

      const createdMarkers: MapLibreMarker[] = [];

      rows.forEach((eventItem) => {
        const element = document.createElement("div");
        element.className =
          "h-3.5 w-3.5 rounded-full border border-white/90 shadow";
        element.style.backgroundColor = getStatusColor(eventItem.status);

        const popup = new maplibregl.Popup({ offset: 16 }).setHTML(
          buildPopupHtml(eventItem),
        );

        const marker = new maplibregl.Marker({ element })
          .setLngLat([eventItem.longitude, eventItem.latitude])
          .setPopup(popup)
          .addTo(map);

        createdMarkers.push(marker);

        bounds[0][0] = Math.min(bounds[0][0], eventItem.longitude);
        bounds[0][1] = Math.min(bounds[0][1], eventItem.latitude);
        bounds[1][0] = Math.max(bounds[1][0], eventItem.longitude);
        bounds[1][1] = Math.max(bounds[1][1], eventItem.latitude);
      });

      markerRefs.current = createdMarkers;
      map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    };

    void renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [rows]);

  const applyFilters = (nextFilters: GeofenceEventsFilterValues) => {
    const normalized = normalizeFilterValues(nextFilters);

    setFilters(normalized);
    setAppliedFilters(normalized);
    setError("");
  };

  const handleSubmitFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!filters.organization_id.trim()) {
      setError("Select an organization before loading geofence events.");
      return;
    }

    applyFilters(filters);
  };

  const handleResetFilters = () => {
    const reset: GeofenceEventsFilterValues = {
      ...defaultFilters,
      organization_id: filters.organization_id,
      page: "1",
    };

    setSuccessMessage("");
    setAnimalSearch("");
    setGeofenceSearch("");
    applyFilters(reset);
  };

  const currentPage = pagination?.page ?? 1;
  const canEditFilters = !isSystemAdmin || Boolean(filters.organization_id);

  return (
    <main className="flex w-full flex-1 flex-col gap-5 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-7">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <form onSubmit={handleSubmitFilters}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[12rem] max-w-[16rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Organization
              </span>
              <input
                list="geofence-events-org-options"
                value={organizationSearch}
                disabled={!isSystemAdmin}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const matched = organizationOptions.find(
                    (option) =>
                      option.name.toLowerCase() ===
                      nextValue.trim().toLowerCase(),
                  );

                  setOrganizationSearch(nextValue);
                  setFilters((current) => ({
                    ...current,
                    organization_id: matched?.id ?? "",
                    animal_id: "",
                    geofence_id: "",
                    page: "1",
                  }));
                  setAnimalSearch("");
                  setGeofenceSearch("");
                }}
                placeholder="Search organization"
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
              />
              <datalist id="geofence-events-org-options">
                {filteredOrganizationOptions.map((option) => (
                  <option key={option.id} value={option.name} />
                ))}
              </datalist>
            </label>

            <label className="flex-1 min-w-[10rem] max-w-[14rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Animal
              </span>
              <input
                list="geofence-events-animal-options"
                value={animalSearch}
                disabled={!canEditFilters}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const matched = animalOptions.find(
                    (option) =>
                      option.animalNumber.toLowerCase() ===
                        nextValue.trim().toLowerCase() ||
                      option.id.toLowerCase() ===
                        nextValue.trim().toLowerCase(),
                  );

                  setAnimalSearch(nextValue);
                  setFilters((current) => ({
                    ...current,
                    animal_id: matched?.id ?? "",
                    page: "1",
                  }));
                }}
                placeholder="Search animal"
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
              />
              <datalist id="geofence-events-animal-options">
                {filteredAnimalOptions.map((animal) => (
                  <option
                    key={animal.id}
                    value={animal.animalNumber}
                    label={animal.id}
                  />
                ))}
              </datalist>
            </label>

            <label className="flex-1 min-w-[10rem] max-w-[14rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Geofence
              </span>
              <input
                list="geofence-events-geofence-options"
                value={geofenceSearch}
                disabled={!canEditFilters}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  const matched = geofenceOptions.find(
                    (option) =>
                      option.parkName.toLowerCase() ===
                        nextValue.trim().toLowerCase() ||
                      option.id.toLowerCase() ===
                        nextValue.trim().toLowerCase(),
                  );

                  setGeofenceSearch(nextValue);
                  setFilters((current) => ({
                    ...current,
                    geofence_id: matched?.id ?? "",
                    page: "1",
                  }));
                }}
                placeholder="Search geofence"
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none disabled:opacity-60"
              />
              <datalist id="geofence-events-geofence-options">
                {filteredGeofenceOptions.map((geofence) => (
                  <option
                    key={geofence.id}
                    value={geofence.parkName}
                    label={geofence.id}
                  />
                ))}
              </datalist>
            </label>

            <label className="w-[9rem]">
              <span className="text-xs font-medium text-[var(--color-ice)]">
                Status
              </span>
              <select
                value={filters.status}
                disabled={!canEditFilters}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    status: event.target.value as "" | GeofenceEventStatus,
                    page: "1",
                  }))
                }
                className="mt-1 w-full rounded-lg border border-[var(--color-shell-border)] bg-transparent px-2.5 py-1.5 text-sm text-[var(--color-ice)] outline-none [&_option]:bg-slate-900 [&_option]:text-white disabled:opacity-60"
              >
                <option value="">All</option>
                {geofenceEventStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={isLoading || !filters.organization_id}
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

            <button
              type="button"
              onClick={() => setShowFilters((value) => !value)}
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

          {showFilters ? (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-shell-border)] p-3">
              <label className="block flex-1 min-w-[12rem]">
                <span className="text-xs font-medium text-[var(--color-ice)]">
                  From timestamp
                </span>
                <input
                  type="datetime-local"
                  value={filters.from_ts}
                  disabled={!canEditFilters}
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
                  disabled={!canEditFilters}
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
                  disabled={!canEditFilters}
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
          ) : null}
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

      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-mist)]">
          {geofenceEventStatuses.map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              {status}
            </span>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <div ref={mapContainerRef} className="h-[35rem] w-full" />
        </div>
      </div>

      {!rows.length ? (
        <DataPanel
          eyebrow="Geofence events"
          title="No geofence events found"
          description="Adjust your filters and load events to visualize boundary transitions on the map."
        >
          <p className="text-sm text-[var(--color-mist)]">
            Event markers appear in status colors: Inside, Border, Outside, and
            Breach.
          </p>
        </DataPanel>
      ) : (
        <DataPanel
          eyebrow="Geofence events"
          title="Geofence event feed"
          description="Results returned by GET /organisations/{org_id}/geofence-events with your selected filters."
        >
          <DataTable
            rows={rows}
            horizontalScroll
            minColumnWidthRem={10}
            columns={[
              {
                header: "Status",
                render: (row) => (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/20 px-2.5 py-1 text-xs font-semibold">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getStatusColor(row.status) }}
                    />
                    {row.status}
                  </span>
                ),
              },
              {
                header: "Animal",
                render: (row) => row.animalId,
              },
              {
                header: "Geofence",
                render: (row) => row.geofenceId,
              },
              {
                header: "Tracking Log",
                render: (row) => row.trackingLogId,
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
                header: "Created",
                render: (row) => formatDateTime(row.createdAt),
              },
              {
                header: "Updated",
                render: (row) => formatDateTime(row.updatedAt),
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
