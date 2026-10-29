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

export function createExtendedShapeElement(
  kind: ExtendedShapeKind,
  appState: ExcalidrawAppState,
  width: number,
  height: number,
): Record<string, unknown> {
  const normalizedWidth = Math.max(1, width);
  const normalizedHeight = Math.max(1, height);
  const points = SHAPE_POINTS[kind].map(
    ([pointX, pointY]) =>
      [
        (pointX / SHAPE_SIZE) * normalizedWidth,
        (pointY / SHAPE_SIZE) * normalizedHeight,
      ] as Point,
  );

  return {
    id: randomId(),
    type: "line",
    x: 0,
    y: 0,
    width: normalizedWidth,
    height: normalizedHeight,
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
    points,
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    elbowed: false,
    polygon: true,
  };
}
