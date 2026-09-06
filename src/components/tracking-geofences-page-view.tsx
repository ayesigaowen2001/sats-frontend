"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { MapProviderSelector } from "@/components/map-provider-selector";
import { ResourceFeedback } from "@/components/resource-feedback";
import { getSessionData } from "@/lib/auth-tokens";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  geofencesService,
  type Geofence,
  type GeofenceInput,
} from "@/lib/tracking/geofences-service";
import { useAuthStore } from "@/store/useAuthStore";
import {
  hasGoogleMapsKey,
  getGoogleMapsApi,
  loadGoogleMaps,
  type GoogleMap,
  type GooglePolygon,
  useMapProvider,
} from "@/lib/maps/map-provider";

interface OrganizationOption {
  id: string;
  name: string;
}

interface GeofenceFormValues extends Record<string, string> {
  park_name: string;
  boundary_coordinates: string;
  description: string;
  created_by: string;
}

const defaultValues: GeofenceFormValues = {
  park_name: "",
  boundary_coordinates: "",
  description: "",
  created_by: "",
};

const mapboxDrawStyles: unknown[] = [
  {
    id: "gl-draw-polygon-fill-inactive",
    type: "fill",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Polygon"],
      ["!=", "mode", "static"],
    ],
    paint: {
      "fill-color": "#3bb2d0",
      "fill-outline-color": "#3bb2d0",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-fill-active",
    type: "fill",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    paint: {
      "fill-color": "#fbb03b",
      "fill-outline-color": "#fbb03b",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-midpoint",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
    paint: {
      "circle-radius": 3,
      "circle-color": "#fbb03b",
    },
  },
  {
    id: "gl-draw-polygon-stroke-inactive",
    type: "line",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Polygon"],
      ["!=", "mode", "static"],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#3bb2d0", "line-width": 2 },
  },
  {
    id: "gl-draw-polygon-stroke-active",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#fbb03b",
      "line-dasharray": [0.2, 2],
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-line-inactive",
    type: "line",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "LineString"],
      ["!=", "mode", "static"],
    ],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#3bb2d0", "line-width": 2 },
  },
  {
    id: "gl-draw-line-active",
    type: "line",
    filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#fbb03b",
      "line-dasharray": [0.2, 2],
      "line-width": 2,
    },
  },
  // Vertex stroke (white outline)
  {
    id: "gl-draw-polygon-and-line-vertex-stroke-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "meta", "vertex"],
      ["==", "$type", "Point"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 5, "circle-color": "#fff" },
  },
  // Vertex fill
  {
    id: "gl-draw-polygon-and-line-vertex-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "meta", "vertex"],
      ["==", "$type", "Point"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 3, "circle-color": "#fbb03b" },
  },
  {
    id: "gl-draw-point-point-stroke-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 5, "circle-opacity": 1, "circle-color": "#fff" },
  },
  {
    id: "gl-draw-point-inactive",
    type: "circle",
    filter: [
      "all",
      ["==", "active", "false"],
      ["==", "$type", "Point"],
      ["==", "meta", "feature"],
      ["!=", "mode", "static"],
    ],
    paint: { "circle-radius": 3, "circle-color": "#3bb2d0" },
  },
  {
    id: "gl-draw-point-stroke-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "active", "true"],
      ["!=", "meta", "midpoint"],
    ],
    paint: { "circle-radius": 7, "circle-color": "#fff" },
  },
  {
    id: "gl-draw-point-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["!=", "meta", "midpoint"],
      ["==", "active", "true"],
    ],
    paint: { "circle-radius": 5, "circle-color": "#fbb03b" },
  },
  // Static modes
  {
    id: "gl-draw-polygon-fill-static",
    type: "fill",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    paint: {
      "fill-color": "#404040",
      "fill-outline-color": "#404040",
      "fill-opacity": 0.1,
    },
  },
  {
    id: "gl-draw-polygon-stroke-static",
    type: "line",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#404040", "line-width": 2 },
  },
  {
    id: "gl-draw-line-static",
    type: "line",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "LineString"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#404040", "line-width": 2 },
  },
  {
    id: "gl-draw-point-static",
    type: "circle",
    filter: ["all", ["==", "mode", "static"], ["==", "$type", "Point"]],
    paint: { "circle-radius": 5, "circle-color": "#404040" },
  },
];

function ensureClosedLinearRing(ring: number[][]): number[][] {
  if (ring.length === 0) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (!first || !last) {
    return ring;
  }

  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]]];
  }

  return ring;
}

function parseBoundaryCoordinates(raw: string): number[][][] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Boundary coordinates must be valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      "Boundary coordinates must be a non-empty polygon coordinates array.",
    );
  }

  const firstRing = parsed[0];

  if (!Array.isArray(firstRing) || firstRing.length < 3) {
    throw new Error("Polygon ring must include at least 3 coordinate pairs.");
  }

  const normalizedRing = firstRing.map((point) => {
    if (!Array.isArray(point) || point.length < 2) {
      throw new Error("Each polygon point must be [longitude, latitude].");
    }

    const lng = Number(point[0]);
    const lat = Number(point[1]);

    if (Number.isNaN(lng) || Number.isNaN(lat)) {
      throw new Error(
        "Polygon points must contain numeric longitude and latitude values.",
      );
    }

    return [lng, lat];
  });

  const closed = ensureClosedLinearRing(normalizedRing);

  if (closed.length < 4) {
    throw new Error(
      "Polygon must include at least 3 vertices and a closing point.",
    );
  }

  return [closed];
}

function toPayload(
  values: GeofenceFormValues,
  currentUserId: string,
): GeofenceInput {
  if (!values.park_name.trim()) {
    throw new Error("Park name is required.");
  }

  if (!values.boundary_coordinates.trim()) {
    throw new Error("Boundary coordinates are required.");
  }

  if (!values.description.trim()) {
    throw new Error("Description is required.");
  }

  if (!currentUserId.trim()) {
    throw new Error("Created by is required.");
  }

  if (!isUuid(currentUserId)) {
    throw new Error("Created by must be a valid UUID.");
  }

  const coordinates = parseBoundaryCoordinates(values.boundary_coordinates);

  return {
    park_name: values.park_name.trim(),
    boundary: {
      type: "Polygon",
      coordinates,
    },
    description: values.description.trim(),
    created_by: currentUserId.trim(),
  };
}

function fromGeofence(
  geofence: Geofence,
  fallbackCreatedBy: string,
): GeofenceFormValues {
  return {
    park_name: geofence.parkName,
    boundary_coordinates: JSON.stringify(
      geofence.boundary.coordinates,
      null,
      2,
    ),
    description: geofence.description,
    created_by: geofence.createdBy || fallbackCreatedBy,
  };
}

interface DrawFeatureGeometry {
  type?: string;
  coordinates?: unknown;
}

interface DrawFeature {
  id?: string | number;
  type?: string;
  properties?: Record<string, unknown>;
  geometry?: DrawFeatureGeometry;
}

interface DrawCollection {
  type?: string;
  features?: DrawFeature[];
}

type MapViewMode = "streets" | "satellite";

interface GoogleDrawingController {
  setDrawingMode: (mode: "polygon" | null) => void;
  setMap: (map: GoogleMap | null) => void;
  dispose: () => void;
}

interface GoogleLatLngLiteral {
  lat: number;
  lng: number;
}

interface GoogleEventListener {
  remove: () => void;
}

interface GoogleMapMouseEvent {
  latLng: { toJSON: () => GoogleLatLngLiteral } | null;
}

interface DrawEvent {
  features?: DrawFeature[];
}

type MapInstance = {
  addControl: (control: unknown, position?: string) => void;
  removeControl: (control: unknown) => void;
  addSource: (id: string, source: unknown) => void;
  getSource: (id: string) => unknown;
  removeSource: (id: string) => void;
  addLayer: (layer: unknown, beforeId?: string) => void;
  getLayer: (id: string) => unknown;
  removeLayer: (id: string) => void;
  setStyle: (style: string) => void;
  on: (eventName: string, callback: (event?: DrawEvent) => void) => void;
  off: (eventName: string, callback: (event?: DrawEvent) => void) => void;
  doubleClickZoom?: {
    disable: () => void;
  };
  remove: () => void;
};

type DrawInstance = {
  getAll: () => DrawCollection;
  deleteAll: () => void;
  add: (feature: unknown) => void;
  changeMode: (mode: string, options?: Record<string, unknown>) => void;
  getMode?: () => string;
};

type DrawControlsConfig = {
  point: boolean;
  line_string: boolean;
  polygon: boolean;
  trash: boolean;
  combine_features: boolean;
  uncombine_features: boolean;
};

type DrawConstructor = new (options: {
  displayControlsDefault: boolean;
  controls: DrawControlsConfig;
  styles: unknown[];
}) => DrawInstance;

const drawControls: DrawControlsConfig = {
  point: false,
  line_string: false,
  polygon: true,
  trash: true,
  combine_features: false,
  uncombine_features: false,
};

function isValidFeatureId(id: unknown): id is string | number {
  if (typeof id === "string") {
    return id.trim().length > 0;
  }

  if (typeof id === "number") {
    return Number.isFinite(id);
  }

  return false;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function TrackingGeofencesPageView(): React.JSX.Element {
  const { user } = useAuthStore();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const drawSyncDebounceTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const DrawConstructorRef = useRef<DrawConstructor | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const googlePolygonRef = useRef<GooglePolygon | null>(null);
  const googleDrawingManagerRef = useRef<GoogleDrawingController | null>(null);
  const activeMapStyleRef = useRef<MapViewMode>("streets");
  const drawRef = useRef<DrawInstance | null>(null);
  const geofenceSourceIdRef = useRef("geofence-polygons-source");
  const geofenceFillLayerIdRef = useRef("geofence-polygons-fill");
  const geofenceLineLayerIdRef = useRef("geofence-polygons-line");
  const [mapReadyTick, setMapReadyTick] = useState(0);

  const [rows, setRows] = useState<Geofence[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValues, setCreateValues] =
    useState<GeofenceFormValues>(defaultValues);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [updateValues, setUpdateValues] =
    useState<GeofenceFormValues>(defaultValues);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingGeofenceId, setDeletingGeofenceId] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [testAreaOutput, setTestAreaOutput] = useState("");
  const [canEditPolygon, setCanEditPolygon] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("streets");
  const mapProvider = useMapProvider();

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

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  );

  const currentUserId = useMemo(() => {
    const sessionUserId = getSessionData()?.user.id ?? "";
    if (isUuid(sessionUserId)) {
      return sessionUserId;
    }

    if (isUuid(user.id)) {
      return user.id;
    }

    return "";
  }, [user.id]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    // The session user ID must populate the form after authentication resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCreateValues((prev) =>
      !prev.created_by || !isUuid(prev.created_by)
        ? { ...prev, created_by: currentUserId }
        : prev,
    );
    setUpdateValues((prev) =>
      !prev.created_by || !isUuid(prev.created_by)
        ? { ...prev, created_by: currentUserId }
        : prev,
    );
  }, [currentUserId]);

  const clearActionMessages = () => {
    setCreateError("");
    setCreateSuccess("");
    setUpdateError("");
    setUpdateSuccess("");
    setDeleteError("");
    setDeleteSuccess("");
  };

  const loadGeofences = useCallback(async (orgId: string) => {
    if (!orgId) {
      setRows([]);
      return [];
    }

    const listedGeofences = await geofencesService.listGeofences(orgId);

    if (!listedGeofences.length) {
      return [];
    }

    const detailedGeofences = await Promise.all(
      listedGeofences.map(async (geofence) => {
        try {
          return await geofencesService.getGeofenceById(orgId, geofence.id);
        } catch {
          return geofence;
        }
      }),
    );

    return detailedGeofences;
  }, []);

  const clearGeofencePolygonLayers = useCallback(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const fillLayerId = geofenceFillLayerIdRef.current;
    const lineLayerId = geofenceLineLayerIdRef.current;
    const sourceId = geofenceSourceIdRef.current;

    if (map.getLayer(fillLayerId)) {
      map.removeLayer(fillLayerId);
    }

    if (map.getLayer(lineLayerId)) {
      map.removeLayer(lineLayerId);
    }

    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
  }, []);

  const applyDrawCoordinatesToActiveForm = useCallback(
    (coordinatesJson: string) => {
      if (editingGeofence) {
        setUpdateValues((prev) =>
          prev.boundary_coordinates === coordinatesJson
            ? prev
            : {
                ...prev,
                boundary_coordinates: coordinatesJson,
              },
        );
        return;
      }

      setCreateValues((prev) =>
        prev.boundary_coordinates === coordinatesJson
          ? prev
          : {
              ...prev,
              boundary_coordinates: coordinatesJson,
            },
      );
    },
    [editingGeofence],
  );

  const getDrawnPolygonCoordinates = useCallback((): number[][][] | null => {
    const googlePolygon = googlePolygonRef.current;
    if (googlePolygon) {
      const path = googlePolygon.getPath();
      const ring: number[][] = [];
      for (let index = 0; index < path.getLength(); index += 1) {
        const point = path.getAt(index);
        ring.push([point.lng(), point.lat()]);
      }

      if (ring.length >= 3) {
        return [ensureClosedLinearRing(ring)];
      }
    }

    const draw = drawRef.current;
    console.log(
      "[geofences] getDrawnPolygonCoordinates called, draw ref:",
      draw,
    );

    if (!draw) {
      console.warn("[geofences] getDrawnPolygonCoordinates: drawRef is null");
      return null;
    }

    const allFeatures = draw.getAll();
    console.log("[geofences] draw.getAll():", JSON.stringify(allFeatures));

    const polygonFeature = allFeatures.features
      ?.filter((feature) => feature.geometry?.type === "Polygon")
      .at(-1);

    console.log("[geofences] polygonFeature:", JSON.stringify(polygonFeature));

    if (!polygonFeature?.geometry?.coordinates) {
      console.warn(
        "[geofences] getDrawnPolygonCoordinates: no polygon geometry/coordinates",
      );
      return null;
    }

    const polygonCoordinates = polygonFeature.geometry.coordinates;

    if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
      console.warn(
        "[geofences] getDrawnPolygonCoordinates: polygonCoordinates is empty or not an array",
        polygonCoordinates,
      );
      return null;
    }

    const ring = polygonCoordinates[0];
    if (!Array.isArray(ring)) {
      console.warn(
        "[geofences] getDrawnPolygonCoordinates: ring is not an array",
        ring,
      );
      return null;
    }

    const normalizedRing = ring
      .map((point) => {
        if (!Array.isArray(point) || point.length < 2) {
          return null;
        }

        const lng = Number(point[0]);
        const lat = Number(point[1]);

        if (Number.isNaN(lng) || Number.isNaN(lat)) {
          return null;
        }

        return [lng, lat];
      })
      .filter((point): point is number[] => Array.isArray(point));

    console.log(
      "[geofences] normalizedRing length:",
      normalizedRing.length,
      "points:",
      normalizedRing,
    );

    if (normalizedRing.length < 3) {
      console.warn(
        "[geofences] getDrawnPolygonCoordinates: not enough vertices (",
        normalizedRing.length,
        ")",
      );
      return null;
    }

    const result = [ensureClosedLinearRing(normalizedRing)];
    console.log(
      "[geofences] getDrawnPolygonCoordinates result:",
      JSON.stringify(result),
    );
    return result;
  }, []);

  const loadPolygonIntoDraw = useCallback((coordinates: number[][][]) => {
    if (googleMapRef.current) {
      googlePolygonRef.current?.setMap(null);
      const googleMaps = getGoogleMapsApi();
      googlePolygonRef.current = new googleMaps.maps.Polygon({
        paths: coordinates[0]?.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: "#3bb2d0",
        strokeWeight: 2,
        fillColor: "#3bb2d0",
        fillOpacity: 0.1,
        editable: false,
        map: googleMapRef.current,
      });
      setCanEditPolygon(true);
      return;
    }

    const draw = drawRef.current;
    console.log(
      "[geofences] loadPolygonIntoDraw called, draw ref:",
      draw,
      "coordinates:",
      JSON.stringify(coordinates),
    );

    if (!draw) {
      console.warn(
        "[geofences] loadPolygonIntoDraw: drawRef is null – map may not be ready yet",
      );
      return;
    }

    draw.deleteAll();
    draw.add({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates,
      },
    });
    console.log(
      "[geofences] loadPolygonIntoDraw: feature added, draw.getAll():",
      JSON.stringify(draw.getAll()),
    );
    setCanEditPolygon(true);
  }, []);

  const handleDrawSync = useCallback(() => {
    console.log("[geofences] handleDrawSync fired");
    const coordinates = getDrawnPolygonCoordinates();

    if (!coordinates) {
      console.warn(
        "[geofences] handleDrawSync: no valid polygon found, clearing form",
      );
      setCanEditPolygon(false);
      applyDrawCoordinatesToActiveForm("");
      return;
    }

    console.log(
      "[geofences] handleDrawSync: valid polygon found, coordinates:",
      JSON.stringify(coordinates),
    );
    setCanEditPolygon(true);
  }, [applyDrawCoordinatesToActiveForm, getDrawnPolygonCoordinates]);

  const handleExtractCoordinates = useCallback(() => {
    const coordinates = getDrawnPolygonCoordinates();

    if (!coordinates) {
      const errorText =
        "Draw a polygon on the map first, then click Extract Coordinates.";
      setTestAreaOutput("");
      if (editingGeofence) {
        setUpdateError(errorText);
      } else {
        setCreateError(errorText);
      }
      return;
    }

    const coordinatesJson = JSON.stringify(coordinates, null, 2);
    const featureCollectionJson = JSON.stringify(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates,
            },
          },
        ],
      },
      null,
      2,
    );

    setTestAreaOutput((prev) =>
      prev === featureCollectionJson ? prev : featureCollectionJson,
    );
    applyDrawCoordinatesToActiveForm(coordinatesJson);

    if (editingGeofence) {
      setUpdateError("");
    } else {
      setCreateError("");
    }
  }, [
    applyDrawCoordinatesToActiveForm,
    editingGeofence,
    getDrawnPolygonCoordinates,
  ]);

  const handleEditPolygon = useCallback(() => {
    if (googlePolygonRef.current) {
      googlePolygonRef.current.setEditable(true);
      if (editingGeofence) {
        setUpdateError("");
      } else {
        setCreateError("");
      }
      return;
    }

    const draw = drawRef.current;

    if (!draw) {
      return;
    }

    const polygonFeature = draw
      .getAll()
      .features?.filter((feature) => feature.geometry?.type === "Polygon")
      .at(-1);

    if (!polygonFeature) {
      const errorText =
        "Draw or load a polygon first, then click Edit Polygon.";
      if (editingGeofence) {
        setUpdateError(errorText);
      } else {
        setCreateError(errorText);
      }
      return;
    }

    if (!isValidFeatureId(polygonFeature.id)) {
      draw.changeMode("simple_select");
      const errorText =
        "Unable to enter direct edit mode for this shape. Draw or reload the polygon and try again.";
      if (editingGeofence) {
        setUpdateError(errorText);
      } else {
        setCreateError(errorText);
      }
      return;
    }

    try {
      draw.changeMode("direct_select", {
        featureId: polygonFeature.id,
      });
      if (editingGeofence) {
        setUpdateError("");
      } else {
        setCreateError("");
      }
    } catch {
      draw.changeMode("simple_select");
      const errorText =
        "Unable to enter direct edit mode for this shape. Draw or reload the polygon and try again.";
      if (editingGeofence) {
        setUpdateError(errorText);
      } else {
        setCreateError(errorText);
      }
    }
  }, [editingGeofence]);

  const handleStartPolygonDraw = useCallback(() => {
    if (googleDrawingManagerRef.current) {
      googlePolygonRef.current?.setMap(null);
      googlePolygonRef.current = null;
      googleDrawingManagerRef.current.setDrawingMode("polygon");
      if (editingGeofence) {
        setUpdateError("");
      } else {
        setCreateError("");
      }
      return;
    }

    const draw = drawRef.current;

    if (!draw) {
      console.warn("[geofences] handleStartPolygonDraw: drawRef is null");
      return;
    }

    try {
      draw.changeMode("draw_polygon");
      if (editingGeofence) {
        setUpdateError("");
      } else {
        setCreateError("");
      }
      console.log("[geofences] switched to draw_polygon mode");
    } catch (error) {
      console.error(
        "[geofences] failed to switch to draw_polygon mode:",
        error,
      );
      const errorText =
        "Unable to enter polygon draw mode. Refresh the page and try again.";
      if (editingGeofence) {
        setUpdateError(errorText);
      } else {
        setCreateError(errorText);
      }
    }
  }, [editingGeofence]);

  const ensureMapToolbarButtons = useCallback(() => {
    const topLeft = mapContainerRef.current?.querySelector(
      ".maplibregl-ctrl-top-left",
    ) as HTMLDivElement | null;

    if (!topLeft) {
      return;
    }

    let toolbar = topLeft.querySelector(
      ".sats-geofence-map-toolbar",
    ) as HTMLDivElement | null;

    if (!toolbar) {
      toolbar = document.createElement("div");
      toolbar.className =
        "sats-geofence-map-toolbar maplibregl-ctrl maplibregl-ctrl-group";
      toolbar.style.display = "flex";
      toolbar.style.flexDirection = "column";
      toolbar.style.gap = "4px";
      toolbar.style.padding = "4px";
      toolbar.style.borderRadius = "8px";
      toolbar.style.background = "rgba(15, 23, 42, 0.65)";
      topLeft.appendChild(toolbar);
    }

    const defaultButtons = topLeft.querySelectorAll(
      ".mapbox-gl-draw_polygon, .mapboxgl-draw_polygon, .mapbox-gl-draw_trash, .mapboxgl-draw_trash",
    );
    defaultButtons.forEach((button) => {
      const htmlButton = button as HTMLElement;
      htmlButton.style.display = "none";
    });

    const buildButton = (
      label: string,
      iconSvg: string,
      onClick: () => void,
      disabled: boolean,
      actionName: string,
    ) => {
      let button = toolbar!.querySelector(
        `[data-geofence-action="${actionName}"]`,
      ) as HTMLButtonElement | null;

      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.title = label;
        button.setAttribute("aria-label", label);
        button.dataset.geofenceAction = actionName;
        button.className = "maplibregl-ctrl-icon";
        button.style.width = "29px";
        button.style.height = "29px";
        button.style.display = "flex";
        button.style.alignItems = "center";
        button.style.justifyContent = "center";
        button.style.border = "1px solid rgba(148, 163, 184, 0.8)";
        button.style.borderRadius = "6px";
        button.style.background = disabled
          ? "rgba(71, 85, 105, 0.7)"
          : "rgba(15, 23, 42, 0.96)";
        button.style.color = "#f8fafc";
        button.style.boxShadow = "0 2px 8px rgba(15, 23, 42, 0.35)";
        button.style.cursor = disabled ? "not-allowed" : "pointer";
        button.style.opacity = disabled ? "0.6" : "1";
        button.innerHTML = `<span aria-hidden="true" style="display:flex; width:16px; height:16px; align-items:center; justify-content:center; color:inherit;">${iconSvg}</span>`;
        button.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        };
        button.onpointerdown = (event) => {
          event.preventDefault();
          event.stopPropagation();
        };
        toolbar!.appendChild(button);
      }

      button.disabled = disabled;
      button.style.background = disabled
        ? "rgba(71, 85, 105, 0.7)"
        : "rgba(15, 23, 42, 0.96)";
      button.style.cursor = disabled ? "not-allowed" : "pointer";
      button.style.opacity = disabled ? "0.6" : "1";
    };

    buildButton(
      "Draw polygon",
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h9.2l4.3 4.3v7.2A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9zm2.5-.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V9.8L15.8 7.5H6.5zm1.5 3.5h7v1.5h-7V10.5zm0 3h7v1.5h-7v-1.5z" fill="currentColor"/></svg>',
      () => handleStartPolygonDraw(),
      false,
      "draw-polygon",
    );

    buildButton(
      "Edit polygon",
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-9.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.34 1.34 3.75 3.75 1.34-1.34z" fill="currentColor"/></svg>',
      () => handleEditPolygon(),
      !canEditPolygon,
      "edit-polygon",
    );

    buildButton(
      mapViewMode === "satellite" ? "Streets view" : "Satellite view",
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13zm2 .5v4h4V6H6zm6 0v4h6V6h-6zM6 12v6h4v-6H6zm6 0v6h6v-6h-6z" fill="currentColor"/></svg>',
      () =>
        setMapViewMode((current) =>
          current === "satellite" ? "streets" : "satellite",
        ),
      mapProvider === "maptiler"
        ? !mapStyleConfig.hasSatellite
        : !hasGoogleMapsKey(),
      "map-style",
    );
  }, [
    canEditPolygon,
    handleEditPolygon,
    handleStartPolygonDraw,
    mapProvider,
    mapStyleConfig.hasSatellite,
    mapViewMode,
  ]);

  useEffect(() => {
    if (mapReadyTick > 0) {
      ensureMapToolbarButtons();
    }
  }, [ensureMapToolbarButtons, mapReadyTick]);

  useEffect(() => {
    let active = true;

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      const maplibregl = (await import("maplibre-gl")).default;
      const MapboxDrawModule = await import("@mapbox/mapbox-gl-draw");
      const MapboxDraw = MapboxDrawModule.default;
      DrawConstructorRef.current = MapboxDraw as unknown as DrawConstructor;

      const drawWithConstants = MapboxDraw as unknown as {
        constants?: {
          classes?: Record<string, string>;
        };
      };

      const existingConstants = drawWithConstants.constants ?? {};
      const existingClasses = existingConstants.classes ?? {};

      drawWithConstants.constants = {
        ...existingConstants,
        classes: {
          ...existingClasses,
          CANVAS: "maplibregl-canvas",
          CONTROL_BASE: "maplibregl-ctrl",
          CONTROL_PREFIX: "maplibregl-ctrl-",
          CONTROL_GROUP: "maplibregl-ctrl-group",
          ATTRIBUTION: "maplibregl-ctrl-attrib",
        },
      };

      if (!active || !mapContainerRef.current || !DrawConstructorRef.current) {
        return;
      }

      if (mapProvider === "google") {
        try {
          const googleMaps = await loadGoogleMaps();

          if (!active || !mapContainerRef.current) {
            return;
          }

          const googleMap = new googleMaps.maps.Map(mapContainerRef.current, {
            center: { lat: -1.2921, lng: 36.8219 },
            zoom: 5,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
          });
          googleMapRef.current = googleMap;

          let drawingMode: "polygon" | null = null;
          let points: GoogleLatLngLiteral[] = [];
          let previewPolygon: GooglePolygon | null = null;
          let clickListener: GoogleEventListener | null = null;
          let doubleClickListener: GoogleEventListener | null = null;

          const finishPolygon = () => {
            if (points.length < 3) {
              return;
            }

            previewPolygon?.setMap(null);
            previewPolygon = null;
            googlePolygonRef.current?.setMap(null);
            googlePolygonRef.current = new googleMaps.maps.Polygon({
              paths: points,
              strokeColor: "#3bb2d0",
              strokeWeight: 2,
              fillColor: "#3bb2d0",
              fillOpacity: 0.1,
              editable: false,
              map: googleMap,
            });
            drawingMode = null;
            points = [];
            setCanEditPolygon(true);
            handleDrawSync();
          };

          const drawingController: GoogleDrawingController = {
            setDrawingMode: (mode) => {
              drawingMode = mode;
              points = [];
              previewPolygon?.setMap(null);
              previewPolygon = null;
            },
            setMap: (nextMap) => {
              googleMap.setOptions({
                disableDoubleClickZoom: nextMap !== null,
              });
            },
            dispose: () => {
              clickListener?.remove();
              doubleClickListener?.remove();
              previewPolygon?.setMap(null);
            },
          };

          clickListener = googleMaps.maps.event.addListener(
            googleMap,
            "click",
            (event: GoogleMapMouseEvent) => {
              if (drawingMode !== "polygon" || !event.latLng) {
                return;
              }
              points = [...points, event.latLng.toJSON()];
              previewPolygon?.setMap(null);
              previewPolygon = new googleMaps.maps.Polygon({
                paths: points,
                strokeColor: "#fbb03b",
                strokeWeight: 2,
                fillColor: "#fbb03b",
                fillOpacity: 0.08,
                map: googleMap,
              });
            },
          );
          doubleClickListener = googleMaps.maps.event.addListener(
            googleMap,
            "dblclick",
            finishPolygon,
          );
          drawingController.setMap(googleMap);
          googleDrawingManagerRef.current = drawingController;
          setMapReadyTick((current) => current + 1);
          return;
        } catch (requestError) {
          setCreateError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load Google Maps.",
          );
          return;
        }
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: mapStyleConfig.streets,
        center: [36.8219, -1.2921],
        zoom: 5,
        maxZoom: 20,
      });

      const draw = new DrawConstructorRef.current({
        displayControlsDefault: false,
        controls: drawControls,
        styles: mapboxDrawStyles,
      });

      const onDrawCreate = () => {
        handleDrawSync();
      };

      const onDrawUpdate = () => {
        if (drawSyncDebounceTimeoutRef.current) {
          clearTimeout(drawSyncDebounceTimeoutRef.current);
        }

        drawSyncDebounceTimeoutRef.current = setTimeout(() => {
          handleDrawSync();
        }, 200);
      };

      const onDrawDelete = () => {
        if (drawSyncDebounceTimeoutRef.current) {
          clearTimeout(drawSyncDebounceTimeoutRef.current);
          drawSyncDebounceTimeoutRef.current = null;
        }

        handleDrawSync();
      };

      const onStyleLoad = () => {
        setMapReadyTick((current) => current + 1);
      };

      map.on("load", () => {
        if (!active) {
          return;
        }

        map.doubleClickZoom?.disable();
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        const originalAddLayer = map.addLayer.bind(map) as typeof map.addLayer;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).addLayer = (layer: any, ...args: any[]) => {
          if (map.getLayer(layer.id)) return map;
          return originalAddLayer(layer, ...args);
        };

        try {
          map.addControl(draw as never, "top-left");
        } catch {
          // ignored: the draw control is optional if the map is not ready yet
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (map as any).addLayer = originalAddLayer;

        const topLeft = map
          .getContainer()
          .querySelector(".maplibregl-ctrl-top-left") as HTMLDivElement | null;
        if (topLeft) {
          ensureMapToolbarButtons();
        }

        setMapReadyTick((current) => current + 1);
      });

      map.on("draw.create", onDrawCreate);
      map.on("draw.update", onDrawUpdate);
      map.on("draw.delete", onDrawDelete);
      map.on("style.load", onStyleLoad);

      mapRef.current = map as unknown as MapInstance;
      drawRef.current = draw;

      return () => {
        map.off("draw.create", onDrawCreate);
        map.off("draw.update", onDrawUpdate);
        map.off("draw.delete", onDrawDelete);
        map.off("style.load", onStyleLoad);
      };
    };

    let mapCleanup: (() => void) | undefined;

    void initMap().then((cleanup) => {
      mapCleanup = cleanup;
    });

    return () => {
      active = false;

      if (mapCleanup) {
        mapCleanup();
      }

      if (drawSyncDebounceTimeoutRef.current) {
        clearTimeout(drawSyncDebounceTimeoutRef.current);
        drawSyncDebounceTimeoutRef.current = null;
      }

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      drawRef.current = null;
      DrawConstructorRef.current = null;
      googleDrawingManagerRef.current?.dispose();
      googleDrawingManagerRef.current?.setMap(null);
      googleDrawingManagerRef.current = null;
      googlePolygonRef.current?.setMap(null);
      googlePolygonRef.current = null;
      googleMapRef.current = null;
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = "";
      }
    };
  }, [
    ensureMapToolbarButtons,
    handleDrawSync,
    mapProvider,
    mapStyleConfig.streets,
  ]);

  useEffect(() => {
    if (googleMapRef.current) {
      googleMapRef.current.setMapTypeId(
        mapViewMode === "satellite" ? "hybrid" : "roadmap",
      );
      return;
    }

    if (
      !mapRef.current ||
      mapProvider === "google" ||
      !mapStyleConfig.hasSatellite ||
      activeMapStyleRef.current === mapViewMode
    ) {
      return;
    }

    const nextStyle =
      mapViewMode === "satellite"
        ? mapStyleConfig.satellite
        : mapStyleConfig.streets;

    activeMapStyleRef.current = mapViewMode;
    mapRef.current.setStyle(nextStyle);
  }, [mapProvider, mapStyleConfig, mapViewMode]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    clearGeofencePolygonLayers();

    if (!rows || !rows.length) {
      return;
    }

    const sourceId = geofenceSourceIdRef.current;
    const fillLayerId = geofenceFillLayerIdRef.current;
    const lineLayerId = geofenceLineLayerIdRef.current;

    const features = rows
      .filter((geofence) => {
        const firstRing = geofence.boundary.coordinates?.[0];
        return Array.isArray(firstRing) && firstRing.length >= 4;
      })
      .map((geofence) => ({
        type: "Feature",
        properties: {
          id: geofence.id,
          park_name: geofence.parkName,
        },
        geometry: {
          type: "Polygon",
          coordinates: geofence.boundary.coordinates,
        },
      }));

    if (!features.length) {
      return;
    }

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features,
      },
    });

    map.addLayer({
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": "#22d3ee",
        "fill-opacity": 0.12,
      },
    });

    map.addLayer({
      id: lineLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": "#06b6d4",
        "line-width": 2.5,
      },
    });

    return () => {
      clearGeofencePolygonLayers();
    };
  }, [clearGeofencePolygonLayers, mapReadyTick, rows, selectedOrgId]);

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
          name: org.organization_name,
        }));

        setOrganizations(options);

        if (options[0]) {
          setSelectedOrgId(options[0].id);
        }
      } else {
        setOrganizations([]);
        setLoadError("Failed to load organizations.");
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrgId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRows([]);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setRows(null);
      setLoadError("");

      try {
        const geofences = await loadGeofences(selectedOrgId);

        if (isMounted) {
          setRows(geofences);
        }
      } catch (requestError) {
        if (isMounted) {
          setRows([]);
          setLoadError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to load geofences",
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [loadGeofences, selectedOrgId]);

  useEffect(() => {
    if (!selectedOrganization) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCreateValues((prev) =>
      prev.park_name === selectedOrganization.name
        ? prev
        : {
            ...prev,
            park_name: selectedOrganization.name,
          },
    );
  }, [selectedOrganization]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrgId) {
      setCreateError("Organization is required.");
      return;
    }

    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    if (!currentUserId) {
      setCreateError(
        "Current user ID is missing or invalid. Please sign in again.",
      );
      setIsCreating(false);
      return;
    }

    try {
      await geofencesService.createGeofence(
        selectedOrgId,
        toPayload(createValues, currentUserId),
      );

      const refreshed = await loadGeofences(selectedOrgId);
      setRows(refreshed);
      setCreateValues({
        ...defaultValues,
        created_by: currentUserId,
      });
      drawRef.current?.deleteAll();
      setTestAreaOutput("");
      setCanEditPolygon(false);
      setCreateSuccess("Geofence created successfully.");
      setShowCreateForm(false);
    } catch (requestError) {
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create geofence",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (geofence: Geofence) => {
    clearActionMessages();
    setShowCreateForm(false);
    setEditingGeofence(geofence);

    const values = fromGeofence(geofence, currentUserId);
    setUpdateValues(values);
    loadPolygonIntoDraw(geofence.boundary.coordinates);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrgId || !editingGeofence) {
      return;
    }

    setUpdateError("");
    setUpdateSuccess("");
    setIsUpdating(true);

    if (!currentUserId) {
      setUpdateError(
        "Current user ID is missing or invalid. Please sign in again.",
      );
      setIsUpdating(false);
      return;
    }

    try {
      await geofencesService.updateGeofence(
        selectedOrgId,
        editingGeofence.id,
        toPayload(updateValues, currentUserId),
      );

      const refreshed = await loadGeofences(selectedOrgId);
      setRows(refreshed);
      setEditingGeofence(null);
      drawRef.current?.deleteAll();
      setTestAreaOutput("");
      setCanEditPolygon(false);
      setUpdateSuccess("Geofence updated successfully.");
    } catch (requestError) {
      setUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update geofence",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (geofence: Geofence) => {
    if (!selectedOrgId) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete geofence "${geofence.parkName}"? This action cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeleteError("");
    setDeleteSuccess("");
    setDeletingGeofenceId(geofence.id);

    try {
      await geofencesService.deleteGeofence(selectedOrgId, geofence.id);
      const refreshed = await loadGeofences(selectedOrgId);
      setRows(refreshed);

      if (editingGeofence?.id === geofence.id) {
        setEditingGeofence(null);
      }

      setDeleteSuccess("Geofence deleted successfully.");
    } catch (requestError) {
      setDeleteError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to delete geofence",
      );
    } finally {
      setDeletingGeofenceId("");
    }
  };

  const activeValues = useMemo(
    () => (editingGeofence ? updateValues : createValues),
    [createValues, editingGeofence, updateValues],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-[var(--color-ice)]">
          Geofences
        </h2>
        {selectedOrgId ? (
          <button
            type="button"
            onClick={() => {
              clearActionMessages();
              setEditingGeofence(null);
              setCreateValues({
                ...defaultValues,
                created_by: currentUserId,
                park_name: selectedOrganization?.name ?? "",
              });
              setTestAreaOutput("");
              setCanEditPolygon(false);
              drawRef.current?.deleteAll();
              setShowCreateForm(true);
            }}
            className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ice)] transition-colors hover:bg-[var(--color-sand)]/28"
          >
            Create geofence
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="geofence-org"
          className="text-sm text-[var(--color-mist)]"
        >
          Organization
        </label>
        <select
          id="geofence-org"
          value={selectedOrgId}
          onChange={(event) => {
            setSelectedOrgId(event.target.value);
            setEditingGeofence(null);
            setShowCreateForm(false);
            clearActionMessages();
            setTestAreaOutput("");
            setCanEditPolygon(false);
            drawRef.current?.deleteAll();
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

      {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-black/15 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--color-mist)]">
            Geofence Map Drawing
          </h3>
          <button
            type="button"
            onClick={handleExtractCoordinates}
            className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-cyan-100"
          >
            Extract Coordinates
          </button>
          <MapProviderSelector />
        </div>

        <div className="relative">
          {mapProvider === "google" ? (
            <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 rounded-lg border border-slate-300/70 bg-slate-950/90 p-2 shadow-lg">
              <button
                type="button"
                onClick={handleStartPolygonDraw}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-400/70 text-slate-100 hover:bg-slate-700"
                title="Draw polygon"
                aria-label="Draw polygon"
              >
                <span className="pi pi-pencil" aria-hidden="true" />
              </button>
              <button
                type="button"
                disabled={!canEditPolygon}
                onClick={handleEditPolygon}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-400/70 text-slate-100 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Edit polygon"
                aria-label="Edit polygon"
              >
                <span className="pi pi-file-edit" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setMapViewMode((current) =>
                    current === "satellite" ? "streets" : "satellite",
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-400/70 text-slate-100 hover:bg-slate-700"
                title={
                  mapViewMode === "satellite"
                    ? "Streets view"
                    : "Satellite view"
                }
                aria-label={
                  mapViewMode === "satellite"
                    ? "Streets view"
                    : "Satellite view"
                }
              >
                <span className="pi pi-image" aria-hidden="true" />
              </button>
            </div>
          ) : null}
          <div
            ref={mapContainerRef}
            className="geofence-map-container h-[22rem] w-full overflow-hidden rounded-xl border border-white/15"
          />
        </div>

        <p className="mt-2 text-xs text-[var(--color-fog)]">
          Draw a polygon on the map, optionally edit vertices, then extract the
          boundary JSON into the active form.
        </p>

        <fieldset className="mt-4 rounded-xl border border-white/10 p-3">
          <legend className="px-2 text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
            Extracted output
          </legend>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
            Drawn shapes output
            <textarea
              readOnly
              value={testAreaOutput}
              placeholder="Extracted drawn shape JSON will appear here."
              rows={10}
              className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-xs"
            />
          </label>
        </fieldset>
      </section>

      {showCreateForm ? (
        <form
          onSubmit={handleCreate}
          className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ice)]">
              Create geofence
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                clearActionMessages();
              }}
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Cancel
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Park name
            </span>
            <input
              required
              value={createValues.park_name}
              readOnly
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <div className="hidden sm:block" />

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Description
            </span>
            <textarea
              required
              rows={3}
              value={createValues.description}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Created by (User ID)
            </span>
            <input
              required
              value={createValues.created_by}
              readOnly
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Boundary coordinates (JSON)
            </span>
            <textarea
              required
              rows={8}
              value={createValues.boundary_coordinates}
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  boundary_coordinates: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-xs"
            />
          </label>

          {createError ? (
            <p className="sm:col-span-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {createError}
            </p>
          ) : null}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating ? "Creating..." : "Create geofence"}
            </button>
          </div>
        </form>
      ) : null}

      {editingGeofence ? (
        <form
          onSubmit={handleUpdate}
          className="grid gap-4 rounded-2xl border border-[var(--color-shell-border)] p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-[var(--color-ice)]">
              Edit geofence {editingGeofence.parkName}
            </h3>
            <button
              type="button"
              onClick={() => {
                setEditingGeofence(null);
                clearActionMessages();
                setCanEditPolygon(false);
                drawRef.current?.deleteAll();
              }}
              className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
            >
              Cancel
            </button>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Park name
            </span>
            <input
              required
              value={updateValues.park_name}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  park_name: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <div className="hidden sm:block" />

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Description
            </span>
            <textarea
              required
              rows={3}
              value={updateValues.description}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-sm"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Created by (User ID)
            </span>
            <input
              required
              value={updateValues.created_by}
              readOnly
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-[var(--color-ice)]">
              Boundary coordinates (JSON)
            </span>
            <textarea
              required
              rows={8}
              value={updateValues.boundary_coordinates}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  boundary_coordinates: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-[var(--color-shell-border)] bg-transparent px-3 py-2 text-xs"
            />
          </label>

          {updateError ? (
            <p className="sm:col-span-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              {updateError}
            </p>
          ) : null}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="rounded-full border border-[var(--color-sand)]/40 bg-[var(--color-sand)]/18 px-5 py-2 text-sm font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-[var(--color-sand)]/28 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isUpdating ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      ) : null}

      {createSuccess ? (
        <p className="text-sm text-emerald-300">{createSuccess}</p>
      ) : null}
      {updateSuccess ? (
        <p className="text-sm text-emerald-300">{updateSuccess}</p>
      ) : null}
      {deleteSuccess ? (
        <p className="text-sm text-emerald-300">{deleteSuccess}</p>
      ) : null}
      {deleteError ? (
        <p className="text-sm text-rose-300">{deleteError}</p>
      ) : null}

      {!selectedOrgId ? (
        <p className="text-sm text-[var(--color-mist)]">
          Select an organization to view and manage geofences.
        </p>
      ) : rows === null ? (
        <ResourceFeedback
          title="Loading geofences"
          detail="Fetching geofences for the selected organization."
          loading
        />
      ) : rows.length === 0 ? (
        <ResourceFeedback
          title="No geofences found"
          detail="Create a geofence by drawing a polygon on the map and extracting coordinates."
        />
      ) : (
        <DataTable
          rows={rows}
          horizontalScroll
          columns={[
            { header: "Park", render: (row) => row.parkName },
            {
              header: "Vertices",
              render: (row) =>
                String(
                  Math.max((row.boundary.coordinates?.[0]?.length ?? 1) - 1, 0),
                ),
            },
            {
              header: "Preview",
              render: (row) => (
                <span className="font-mono text-xs text-[var(--color-fog)]">
                  {JSON.stringify(row.boundary.coordinates?.[0] ?? []).slice(
                    0,
                    80,
                  )}
                  ...
                </span>
              ),
            },
            {
              header: "Actions",
              render: (row) => (
                <ResourceRowActions
                  onEdit={() => handleStartEdit(row)}
                  onDelete={() => {
                    void handleDelete(row);
                  }}
                  isDeleting={deletingGeofenceId === row.id}
                />
              ),
            },
          ]}
        />
      )}

      <div className="rounded-2xl border border-white/10 bg-black/10 p-3 text-xs text-[var(--color-fog)]">
        Active form boundary size: {activeValues.boundary_coordinates.length}{" "}
        characters
      </div>
    </div>
  );
}
