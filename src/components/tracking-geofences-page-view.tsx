"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ResourceRowActions } from "@/components/common/resource-row-actions";
import { DataTable } from "@/components/data-table";
import { ResourceFeedback } from "@/components/resource-feedback";
import { organizationCrudService } from "@/lib/organizations/organization-crud";
import {
  geofencesService,
  type Geofence,
  type GeofenceInput,
} from "@/lib/tracking/geofences-service";
import { useAuthStore } from "@/store/useAuthStore";

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
      "fill-opacity": 0.15,
    },
  },
  {
    id: "gl-draw-polygon-fill-active",
    type: "fill",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    paint: {
      "fill-color": "#fbbf24",
      "fill-outline-color": "#f59e0b",
      "fill-opacity": 0.2,
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
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3bb2d0",
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-polygon-stroke-active",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "Polygon"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#f59e0b",
      "line-width": 2,
    },
  },
  {
    id: "gl-draw-lines-inactive",
    type: "line",
    filter: ["all", ["==", "active", "false"], ["==", "$type", "LineString"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#3bb2d0",
      "line-width": 2,
      "line-dasharray": ["literal", [2, 1]],
    },
  },
  {
    id: "gl-draw-lines-active",
    type: "line",
    filter: ["all", ["==", "active", "true"], ["==", "$type", "LineString"]],
    layout: {
      "line-cap": "round",
      "line-join": "round",
    },
    paint: {
      "line-color": "#f59e0b",
      "line-width": 2,
      "line-dasharray": ["literal", [1, 1]],
    },
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
    paint: {
      "circle-radius": 4,
      "circle-color": "#3bb2d0",
    },
  },
  {
    id: "gl-draw-point-active",
    type: "circle",
    filter: [
      "all",
      ["==", "$type", "Point"],
      ["==", "active", "true"],
      ["==", "meta", "feature"],
    ],
    paint: {
      "circle-radius": 6,
      "circle-color": "#f59e0b",
    },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-halo-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
    paint: {
      "circle-radius": 8,
      "circle-color": "#ffffff",
    },
  },
  {
    id: "gl-draw-polygon-and-line-vertex-active",
    type: "circle",
    filter: ["all", ["==", "meta", "vertex"], ["==", "$type", "Point"]],
    paint: {
      "circle-radius": 5,
      "circle-color": "#f59e0b",
    },
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

function toPayload(values: GeofenceFormValues): GeofenceInput {
  if (!values.park_name.trim()) {
    throw new Error("Park name is required.");
  }

  if (!values.boundary_coordinates.trim()) {
    throw new Error("Boundary coordinates are required.");
  }

  if (!values.description.trim()) {
    throw new Error("Description is required.");
  }

  if (!values.created_by.trim()) {
    throw new Error("Created by is required.");
  }

  const coordinates = parseBoundaryCoordinates(values.boundary_coordinates);

  return {
    park_name: values.park_name.trim(),
    boundary: {
      type: "Polygon",
      coordinates,
    },
    description: values.description.trim(),
    created_by: values.created_by.trim(),
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

interface DrawEvent {
  features?: DrawFeature[];
}

type DrawControlPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "non-fixed";

type ToolbarStyle = "light" | "dark";

type ToolbarButtonOption =
  | "draw-point"
  | "draw-line"
  | "draw-polygon"
  | "trash"
  | "combine-features"
  | "uncombine-features";

type ToolbarNumColumns = 1 | 2 | 3 | 4 | 5 | "Infinity";

type DrawControlsConfig = {
  point: boolean;
  line_string: boolean;
  polygon: boolean;
  trash: boolean;
  combine_features: boolean;
  uncombine_features: boolean;
};

type MapInstance = {
  addControl: (control: unknown, position?: string) => void;
  removeControl: (control: unknown) => void;
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
  set: (featureCollection: DrawCollection) => void;
  changeMode: (mode: string, options?: Record<string, unknown>) => void;
};

type DrawConstructor = new (options: {
  displayControlsDefault: boolean;
  controls: DrawControlsConfig;
  styles: unknown[];
}) => DrawInstance;

const defaultToolbarButtons: ToolbarButtonOption[] = [
  "draw-point",
  "draw-line",
  "draw-polygon",
  "trash",
  "combine-features",
  "uncombine-features",
];

function toDrawControls(buttons: ToolbarButtonOption[]): DrawControlsConfig {
  const selected = new Set(buttons);

  return {
    point: selected.has("draw-point"),
    line_string: selected.has("draw-line"),
    polygon: selected.has("draw-polygon"),
    trash: selected.has("trash"),
    combine_features: selected.has("combine-features"),
    uncombine_features: selected.has("uncombine-features"),
  };
}

function isValidFeatureId(id: unknown): id is string | number {
  if (typeof id === "string") {
    return id.trim().length > 0;
  }

  if (typeof id === "number") {
    return Number.isFinite(id);
  }

  return false;
}

export default function TrackingGeofencesPageView(): React.JSX.Element {
  const { user } = useAuthStore();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const inlineToolbarContainerRef = useRef<HTMLDivElement | null>(null);
  const testToolbarContainerRef = useRef<HTMLDivElement | null>(null);
  const drawToolbarRef = useRef<HTMLDivElement | null>(null);
  const editToolbarButtonRef = useRef<HTMLButtonElement | null>(null);
  const isSwitchingToLineModeRef = useRef(false);
  const DrawConstructorRef = useRef<DrawConstructor | null>(null);
  const isMapLoadedRef = useRef(false);
  const mapRef = useRef<MapInstance | null>(null);
  const drawRef = useRef<DrawInstance | null>(null);

  // Stable refs for callbacks — updated every render so map/toolbar event
  // listeners always invoke the latest version without causing the map to
  // be destroyed and recreated whenever state changes.
  const handleDrawCreateRef = useRef<(event?: DrawEvent) => void>(() => {});
  const handleDrawSyncRef = useRef<() => void>(() => {});
  const recreateDrawToolbarRef = useRef<() => void>(() => {});
  const ensureEditToolbarButtonRef = useRef<() => void>(() => {});
  const refreshToolbarPlacementRef = useRef<() => void>(() => {});

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

  const [toolbarButtons, setToolbarButtons] = useState<ToolbarButtonOption[]>(
    defaultToolbarButtons,
  );
  const [toolbarNumColumns, setToolbarNumColumns] =
    useState<ToolbarNumColumns>("Infinity");
  const [toolbarPosition, setToolbarPosition] =
    useState<DrawControlPosition>("non-fixed");
  const [toolbarStyle, setToolbarStyle] = useState<ToolbarStyle>("light");
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [showToolbarInTestArea, setShowToolbarInTestArea] = useState(false);
  const [testAreaOutput, setTestAreaOutput] = useState("");
  const [canEditPolygon, setCanEditPolygon] = useState(false);

  useEffect(() => {
    if (!user.id) {
      return;
    }

    setCreateValues((prev) =>
      prev.created_by ? prev : { ...prev, created_by: user.id },
    );
    setUpdateValues((prev) =>
      prev.created_by ? prev : { ...prev, created_by: user.id },
    );
  }, [user.id]);

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

    return geofencesService.listGeofences(orgId);
  }, []);

  const applyDrawCoordinatesToActiveForm = useCallback(
    (coordinatesJson: string) => {
      if (editingGeofence) {
        setUpdateValues((prev) => ({
          ...prev,
          boundary_coordinates: coordinatesJson,
        }));
        return;
      }

      setCreateValues((prev) => ({
        ...prev,
        boundary_coordinates: coordinatesJson,
      }));
    },
    [editingGeofence],
  );

  const toFeatureCollectionJson = useCallback((coordinates: number[][][]) => {
    return JSON.stringify(
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
  }, []);

  const normalizeRingCoordinates = useCallback(
    (rawRing: unknown): number[][] | null => {
      if (!Array.isArray(rawRing)) {
        return null;
      }

      const normalizedRing = rawRing
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

      if (normalizedRing.length < 3) {
        return null;
      }

      return ensureClosedLinearRing(normalizedRing);
    },
    [],
  );

  const getDrawnPolygonCoordinates = useCallback((): number[][][] | null => {
    const draw = drawRef.current;

    if (!draw) {
      return null;
    }

    const allFeatures = draw.getAll();
    const polygonFeature = allFeatures.features
      ?.filter((feature) => feature.geometry?.type === "Polygon")
      .at(-1);

    if (polygonFeature?.geometry?.coordinates) {
      const polygonCoordinates = polygonFeature.geometry.coordinates;

      if (Array.isArray(polygonCoordinates) && polygonCoordinates.length > 0) {
        const ring = normalizeRingCoordinates(polygonCoordinates[0]);
        if (ring) {
          return [ring];
        }
      }
    }

    const lineFeature = allFeatures.features
      ?.filter((feature) => feature.geometry?.type === "LineString")
      .at(-1);

    if (!lineFeature?.geometry?.coordinates) {
      return null;
    }

    const ringFromLine = normalizeRingCoordinates(
      lineFeature.geometry.coordinates,
    );

    if (!ringFromLine || ringFromLine.length < 4) {
      return null;
    }

    return [ringFromLine];
  }, [normalizeRingCoordinates]);

  const loadPolygonIntoDraw = useCallback((coordinates: number[][][]) => {
    const draw = drawRef.current;

    if (!draw) {
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
    setCanEditPolygon(true);
  }, []);

  const handleEditPolygon = useCallback(() => {
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
    } else {
      try {
        draw.changeMode("direct_select", {
          featureId: polygonFeature.id,
        });
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
    }

    if (editingGeofence) {
      setUpdateError("");
    } else {
      setCreateError("");
    }
  }, [editingGeofence]);

  const ensureEditToolbarButton = useCallback(() => {
    const toolbar = drawToolbarRef.current;

    if (!toolbar) {
      return;
    }

    let editButton = toolbar.querySelector<HTMLButtonElement>(
      ".sats-draw-edit-btn",
    );

    if (!editButton) {
      editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "mapbox-gl-draw_ctrl-draw-btn sats-draw-edit-btn";
      editButton.title = "Edit polygon";
      editButton.setAttribute("aria-label", "Edit polygon");
      editButton.textContent = "E";
      editButton.style.fontSize = "0.7rem";
      editButton.style.fontWeight = "700";

      const polygonButton = toolbar.querySelector<HTMLButtonElement>(
        ".mapbox-gl-draw_polygon",
      );
      const lineButton = toolbar.querySelector<HTMLButtonElement>(
        ".mapbox-gl-draw_line",
      );
      const insertAfter = polygonButton ?? lineButton;

      if (insertAfter?.parentElement === toolbar && insertAfter.nextSibling) {
        toolbar.insertBefore(editButton, insertAfter.nextSibling);
      } else {
        toolbar.appendChild(editButton);
      }
    }

    editButton.onclick = () => {
      handleEditPolygon();
    };
    editButton.disabled = !canEditPolygon;

    editToolbarButtonRef.current = editButton;
  }, [canEditPolygon, handleEditPolygon]);

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

    const formatted = JSON.stringify(coordinates, null, 2);
    setTestAreaOutput(toFeatureCollectionJson(coordinates));
    applyDrawCoordinatesToActiveForm(formatted);

    if (editingGeofence) {
      setUpdateError("");
    } else {
      setCreateError("");
    }
  }, [
    applyDrawCoordinatesToActiveForm,
    editingGeofence,
    getDrawnPolygonCoordinates,
    toFeatureCollectionJson,
  ]);

  const handleDrawSync = useCallback(() => {
    const coordinates = getDrawnPolygonCoordinates();

    if (!coordinates) {
      setTestAreaOutput("");
      setCanEditPolygon(false);
      applyDrawCoordinatesToActiveForm("");
      return;
    }

    setTestAreaOutput(toFeatureCollectionJson(coordinates));
    setCanEditPolygon(true);
    applyDrawCoordinatesToActiveForm(JSON.stringify(coordinates, null, 2));
  }, [
    applyDrawCoordinatesToActiveForm,
    getDrawnPolygonCoordinates,
    toFeatureCollectionJson,
  ]);

  const handleDrawCreate = useCallback(
    (event?: DrawEvent) => {
      handleDrawSync();

      const draw = drawRef.current;
      if (!draw) {
        return;
      }

      const createdFeature = event?.features?.[0];

      if (createdFeature?.geometry?.type === "Polygon") {
        const createdId =
          createdFeature.id ??
          draw
            .getAll()
            .features
            ?.filter((feature) => feature.geometry?.type === "Polygon")
            .at(-1)
            ?.id;

        if (isValidFeatureId(createdId)) {
          try {
            draw.changeMode("direct_select", { featureId: createdId });
          } catch {
            draw.changeMode("simple_select");
          }
        }
        return;
      }

      if (createdFeature?.geometry?.type === "LineString") {
        if (isSwitchingToLineModeRef.current) {
          return;
        }

        isSwitchingToLineModeRef.current = true;
        setTimeout(() => {
          try {
            draw.changeMode("draw_line_string");
          } finally {
            isSwitchingToLineModeRef.current = false;
          }
        }, 0);
      }
    },
    [handleDrawSync],
  );

  const refreshToolbarPlacement = useCallback(() => {
    const toolbar = drawToolbarRef.current;

    if (!toolbar) {
      return;
    }

    if (!toolbarVisible) {
      toolbar.style.display = "none";
      return;
    }

    if (toolbarNumColumns === "Infinity") {
      toolbar.style.display = "flex";
      toolbar.style.gridTemplateColumns = "";
      toolbar.style.flexWrap = "nowrap";
    } else {
      toolbar.style.display = "grid";
      toolbar.style.gridTemplateColumns = `repeat(${toolbarNumColumns}, minmax(0, 1fr))`;
      toolbar.style.flexWrap = "";
    }

    toolbar.classList.toggle("sats-draw-toolbar-dark", toolbarStyle === "dark");

    const mapContainer = mapContainerRef.current;
    if (!mapContainer) {
      return;
    }

    let target: HTMLDivElement | null = null;

    if (showToolbarInTestArea) {
      target = testToolbarContainerRef.current;
    } else if (toolbarPosition === "non-fixed") {
      target = inlineToolbarContainerRef.current;
    } else {
      target = mapContainer.querySelector<HTMLDivElement>(
        `.maplibregl-ctrl-${toolbarPosition}`,
      );
    }

    if (target && toolbar.parentElement !== target) {
      target.appendChild(toolbar);
    }

    ensureEditToolbarButtonRef.current();
  }, [
    showToolbarInTestArea,
    toolbarNumColumns,
    toolbarPosition,
    toolbarStyle,
    toolbarVisible,
  ]);

  const recreateDrawToolbar = useCallback(() => {
    const map = mapRef.current;
    const DrawCtor = DrawConstructorRef.current;

    if (!map || !DrawCtor || !isMapLoadedRef.current) {
      return;
    }

    const previous = drawRef.current;
    const previousFeatures = previous?.getAll();

    if (previous) {
      map.removeControl(previous);
    }

    const nextDraw = new DrawCtor({
      displayControlsDefault: false,
      controls: toDrawControls(toolbarButtons),
      styles: mapboxDrawStyles,
    });

    map.addControl(nextDraw, "top-left");

    if (previousFeatures?.features?.length) {
      nextDraw.set(previousFeatures);
    }

    drawRef.current = nextDraw;
    drawToolbarRef.current =
      mapContainerRef.current?.querySelector<HTMLDivElement>(
        ".mapboxgl-ctrl-group.mapboxgl-ctrl",
      ) ?? null;

    ensureEditToolbarButtonRef.current();
    refreshToolbarPlacementRef.current();
  }, [toolbarButtons]);

  // Assign all callbacks to their refs every render so the stable map event
  // listeners always call the current version without needing to be re-registered.
  handleDrawCreateRef.current = handleDrawCreate;
  handleDrawSyncRef.current = handleDrawSync;
  recreateDrawToolbarRef.current = recreateDrawToolbar;
  ensureEditToolbarButtonRef.current = ensureEditToolbarButton;
  refreshToolbarPlacementRef.current = refreshToolbarPlacement;

  useEffect(() => {
    let active = true;

    // Stable wrappers — these function identities never change so the map
    // doesn't need to be torn down and re-created when callbacks update.
    const onDrawCreate = (event?: DrawEvent) =>
      handleDrawCreateRef.current(event);
    const onDrawSync = () => handleDrawSyncRef.current();

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) {
        return;
      }

      const maplibregl = (await import("maplibre-gl")).default;
      const MapboxDrawModule = await import("@mapbox/mapbox-gl-draw");
      const MapboxDraw = MapboxDrawModule.default;
      DrawConstructorRef.current = MapboxDraw as unknown as DrawConstructor;

      // Mapbox Draw defaults to mapboxgl CSS/control class names.
      // Override to maplibregl classes so controls and interactions behave correctly.
      (
        MapboxDraw as unknown as {
          constants?: {
            classes?: {
              CANVAS?: string;
              CONTROL_BASE?: string;
              CONTROL_PREFIX?: string;
              CONTROL_GROUP?: string;
              ATTRIBUTION?: string;
            };
          };
        }
      ).constants = {
        ...((MapboxDraw as unknown as { constants?: object }).constants ?? {}),
        classes: {
          CANVAS: "maplibregl-canvas",
          CONTROL_BASE: "maplibregl-ctrl",
          CONTROL_PREFIX: "maplibregl-ctrl-",
          CONTROL_GROUP: "maplibregl-ctrl-group",
          ATTRIBUTION: "maplibregl-ctrl-attrib",
        },
      };

      if (!active || !mapContainerRef.current) {
        return;
      }

      const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
      const styleUrl = mapTilerKey
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${mapTilerKey}`
        : "https://demotiles.maplibre.org/style.json";

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: styleUrl,
        center: [36.8219, -1.2921],
        zoom: 5,
        maxZoom: 20,
      });

      map.on("load", () => {
        isMapLoadedRef.current = true;
        map.doubleClickZoom?.disable();
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        recreateDrawToolbarRef.current();
      });

      map.on("draw.create", onDrawCreate);
      map.on("draw.update", onDrawSync);
      map.on("draw.delete", onDrawSync);

      mapRef.current = map as unknown as MapInstance;
    };

    void initMap();

    return () => {
      active = false;

      if (mapRef.current) {
        mapRef.current.off("draw.create", onDrawCreate);
        mapRef.current.off("draw.update", onDrawSync);
        mapRef.current.off("draw.delete", onDrawSync);
        mapRef.current.remove();
        mapRef.current = null;
        drawRef.current = null;
        drawToolbarRef.current = null;
        editToolbarButtonRef.current = null;
        DrawConstructorRef.current = null;
        isMapLoadedRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    recreateDrawToolbar();
  }, [recreateDrawToolbar]);

  useEffect(() => {
    ensureEditToolbarButton();
  }, [ensureEditToolbarButton]);

  useEffect(() => {
    refreshToolbarPlacement();
  }, [refreshToolbarPlacement]);

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

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrgId) {
      setCreateError("Organization is required.");
      return;
    }

    setCreateError("");
    setCreateSuccess("");
    setIsCreating(true);

    try {
      await geofencesService.createGeofence(
        selectedOrgId,
        toPayload(createValues),
      );
      const refreshed = await loadGeofences(selectedOrgId);
      setRows(refreshed);
      setCreateValues({ ...defaultValues, created_by: user.id });
      drawRef.current?.deleteAll();
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

    const values = fromGeofence(geofence, user.id);
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

    try {
      await geofencesService.updateGeofence(
        selectedOrgId,
        editingGeofence.id,
        toPayload(updateValues),
      );
      const refreshed = await loadGeofences(selectedOrgId);
      setRows(refreshed);
      setEditingGeofence(null);
      drawRef.current?.deleteAll();
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
              setCreateValues({ ...defaultValues, created_by: user.id });
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
        </div>
        <div className="mb-4 grid gap-4 rounded-xl border border-white/10 bg-black/20 p-3 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
              Buttons
              <select
                value={toolbarButtons}
                onChange={(event) => {
                  const selected = Array.from(
                    event.target.selectedOptions,
                    (option) => option.value as ToolbarButtonOption,
                  );
                  setToolbarButtons(selected);
                }}
                multiple
                className="mt-2 h-28 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs"
              >
                <option value="draw-point">draw-point</option>
                <option value="draw-line">draw-line</option>
                <option value="draw-polygon">draw-polygon</option>
                <option value="trash">trash</option>
                <option value="combine-features">combine-features</option>
                <option value="uncombine-features">uncombine-features</option>
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
              Num columns
              <select
                value={String(toolbarNumColumns)}
                onChange={(event) => {
                  const next = event.target.value;
                  setToolbarNumColumns(
                    next === "Infinity"
                      ? "Infinity"
                      : (Number(next) as ToolbarNumColumns),
                  );
                }}
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs"
              >
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="Infinity">Infinity</option>
              </select>
            </label>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
              Position
              <select
                value={toolbarPosition}
                onChange={(event) =>
                  setToolbarPosition(event.target.value as DrawControlPosition)
                }
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs"
              >
                <option value="bottom-left">bottom-left</option>
                <option value="bottom-right">bottom-right</option>
                <option value="non-fixed">non-fixed</option>
                <option value="top-left">top-left</option>
                <option value="top-right">top-right</option>
              </select>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
              Style
              <select
                value={toolbarStyle}
                onChange={(event) =>
                  setToolbarStyle(event.target.value as ToolbarStyle)
                }
                className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-2 py-2 text-xs"
              >
                <option value="dark">dark</option>
                <option value="light">light</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs text-[var(--color-fog)]">
              <input
                type="checkbox"
                checked={toolbarVisible}
                onChange={(event) => setToolbarVisible(event.target.checked)}
              />
              Visible
            </label>

            <label className="flex items-center gap-2 text-xs text-[var(--color-fog)]">
              <input
                type="checkbox"
                checked={showToolbarInTestArea}
                onChange={(event) =>
                  setShowToolbarInTestArea(event.target.checked)
                }
              />
              Container ID (show in test area)
            </label>
          </div>
        </div>

        <div
          ref={inlineToolbarContainerRef}
          className="mb-3 min-h-9 rounded-lg border border-dashed border-white/15 bg-black/10 p-2"
        />
        <div
          ref={mapContainerRef}
          className="geofence-map-container h-[22rem] w-full overflow-hidden rounded-xl border border-white/15"
        />
        <p className="mt-2 text-xs text-[var(--color-fog)]">
          Use the polygon tool on the map to draw a boundary, then click Extract
          Coordinates.
        </p>

        <fieldset className="mt-4 rounded-xl border border-white/10 p-3">
          <legend className="px-2 text-xs uppercase tracking-[0.12em] text-[var(--color-fog)]">
            Test area
          </legend>
          <div
            ref={testToolbarContainerRef}
            className="min-h-9 rounded-lg border border-dashed border-white/15 bg-black/10 p-2"
          />
          <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-fog)]">
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
              onChange={(event) =>
                setCreateValues((prev) => ({
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
              onChange={(event) =>
                setCreateValues((prev) => ({
                  ...prev,
                  created_by: event.target.value,
                }))
              }
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
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  created_by: event.target.value,
                }))
              }
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
