export type ExtendedShapeKind =
  | "triangle"
  | "rightTriangle"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "trapezoid"
  | "parallelogram"
  | "star";

type Point = [number, number];

type ExcalidrawAppState = Record<string, unknown> & {
  currentItemBackgroundColor?: string;
  currentItemFillStyle?: string;
  currentItemOpacity?: number;
  currentItemRoughness?: number;
  currentItemStrokeColor?: string;
  currentItemStrokeStyle?: string;
  currentItemStrokeWidth?: number;
  scrollX?: number;
  scrollY?: number;
  zoom?: number | { value?: number };
};

const SHAPE_SIZE = 180;

const SHAPE_POINTS: Record<ExtendedShapeKind, Point[]> = {
  triangle: [
    [90, 0],
    [180, 180],
    [0, 180],
    [90, 0],
  ],
  rightTriangle: [
    [0, 0],
    [180, 180],
    [0, 180],
    [0, 0],
  ],
  pentagon: [
    [90, 0],
    [180, 69],
    [146, 180],
    [34, 180],
    [0, 69],
    [90, 0],
  ],
  hexagon: [
    [45, 0],
    [135, 0],
    [180, 90],
    [135, 180],
    [45, 180],
    [0, 90],
    [45, 0],
  ],
  octagon: [
    [53, 0],
    [127, 0],
    [180, 53],
    [180, 127],
    [127, 180],
    [53, 180],
    [0, 127],
    [0, 53],
    [53, 0],
  ],
  trapezoid: [
    [45, 0],
    [135, 0],
    [180, 180],
    [0, 180],
    [45, 0],
  ],
  parallelogram: [
    [45, 0],
    [180, 0],
    [135, 180],
    [0, 180],
    [45, 0],
  ],
  star: [
    [90, 0],
    [111, 62],
    [176, 62],
    [123, 101],
    [144, 164],
    [90, 126],
    [36, 164],
    [57, 101],
    [4, 62],
    [69, 62],
    [90, 0],
  ],
};

function randomId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

function randomPositiveInteger(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

function getZoom(appState: ExcalidrawAppState): number {
  const zoom = appState.zoom;
  if (typeof zoom === "number" && zoom > 0) return zoom;
  if (zoom && typeof zoom === "object" && typeof zoom.value === "number") {
    return zoom.value > 0 ? zoom.value : 1;
  }
  return 1;
}

export function createExtendedShapeElement(
  kind: ExtendedShapeKind,
  appState: ExcalidrawAppState,
): Record<string, unknown> {
  const zoom = getZoom(appState);
  const scrollX = typeof appState.scrollX === "number" ? appState.scrollX : 0;
  const scrollY = typeof appState.scrollY === "number" ? appState.scrollY : 0;
  const x = (window.innerWidth / 2 - scrollX) / zoom - SHAPE_SIZE / 2;
  const y = (window.innerHeight / 2 - scrollY) / zoom - SHAPE_SIZE / 2;

  return {
    id: randomId(),
    type: "line",
    x,
    y,
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    angle: 0,
    strokeColor: appState.currentItemStrokeColor ?? "#1e1e1e",
    backgroundColor: appState.currentItemBackgroundColor ?? "transparent",
    fillStyle: appState.currentItemFillStyle ?? "solid",
    strokeWidth: appState.currentItemStrokeWidth ?? 2,
    strokeStyle: appState.currentItemStrokeStyle ?? "solid",
    roughness: appState.currentItemRoughness ?? 1,
    opacity: appState.currentItemOpacity ?? 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: randomPositiveInteger(),
    version: 1,
    versionNonce: randomPositiveInteger(),
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    created: Date.now(),
    link: null,
    locked: false,
    points: SHAPE_POINTS[kind],
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    elbowed: false,
    polygon: true,
  };
}
