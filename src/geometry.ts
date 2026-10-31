export type ExtendedShapeKind =
  | "triangle"
  | "rightTriangle"
  | "pentagon"
  | "hexagon"
  | "trapezoid"
  | "parallelogram"
  | "star"
  | "chevron"
  | "speechBubble"
  | "plus"
  | "pie"
  | "cube"
  | "leftArrow"
  | "rightArrow"
  | "doubleArrow"
  | "decision"
  | "process"
  | "internalStorage"
  | "offPageConnector"
  | "card";

type Point = [number, number];

type LinePart = {
  type: "line";
  points: Point[];
  closed?: boolean;
  round?: boolean;
};

type EllipsePart = {
  type: "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
};

type ShapePart = LinePart | EllipsePart;

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

const polygon = (points: [Point, ...Point[]], round = false): LinePart => ({
  type: "line",
  points: [...points, points[0]],
  closed: true,
  round,
});

const line = (points: Point[], round = false): LinePart => ({
  type: "line",
  points,
  round,
});

const SHAPE_PARTS: Record<ExtendedShapeKind, ShapePart[]> = {
  triangle: [polygon([[90, 0], [180, 180], [0, 180]])],
  rightTriangle: [polygon([[0, 0], [180, 180], [0, 180]])],
  pentagon: [polygon([[90, 0], [180, 69], [146, 180], [34, 180], [0, 69]])],
  hexagon: [polygon([[45, 0], [135, 0], [180, 90], [135, 180], [45, 180], [0, 90]])],
  trapezoid: [polygon([[45, 0], [135, 0], [180, 180], [0, 180]])],
  parallelogram: [polygon([[45, 0], [180, 0], [135, 180], [0, 180]])],
  star: [polygon([[90, 0], [111, 62], [176, 62], [123, 101], [144, 164], [90, 126], [36, 164], [57, 101], [4, 62], [69, 62]])],
  chevron: [polygon([[0, 0], [110, 0], [180, 90], [110, 180], [0, 180], [70, 90]])],
  speechBubble: [polygon([[25, 15], [155, 15], [175, 35], [175, 115], [155, 135], [105, 135], [80, 170], [68, 135], [25, 135], [5, 115], [5, 35]], true)],
  plus: [polygon([[60, 0], [120, 0], [120, 60], [180, 60], [180, 120], [120, 120], [120, 180], [60, 180], [60, 120], [0, 120], [0, 60], [60, 60]])],
  pie: [
    { type: "ellipse", x: 0, y: 0, width: 180, height: 180 },
    line([[90, 90], [90, 0]]),
    line([[90, 90], [180, 90]]),
  ],
  cube: [
    polygon([[0, 45], [125, 45], [125, 180], [0, 180]]),
    polygon([[0, 45], [55, 0], [180, 0], [125, 45]]),
    polygon([[125, 45], [180, 0], [180, 135], [125, 180]]),
  ],
  leftArrow: [polygon([[0, 90], [70, 20], [70, 60], [180, 60], [180, 120], [70, 120], [70, 160]])],
  rightArrow: [polygon([[180, 90], [110, 20], [110, 60], [0, 60], [0, 120], [110, 120], [110, 160]])],
  doubleArrow: [polygon([[0, 90], [55, 25], [55, 60], [125, 60], [125, 25], [180, 90], [125, 155], [125, 120], [55, 120], [55, 155]])],
  decision: [polygon([[90, 0], [180, 90], [90, 180], [0, 90]])],
  process: [
    polygon([[0, 0], [180, 0], [180, 180], [0, 180]]),
    line([[35, 0], [35, 180]]),
    line([[145, 0], [145, 180]]),
  ],
  internalStorage: [
    polygon([[0, 0], [180, 0], [180, 180], [0, 180]]),
    line([[35, 0], [35, 180]]),
    line([[0, 35], [180, 35]]),
  ],
  offPageConnector: [polygon([[0, 0], [180, 0], [180, 120], [90, 180], [0, 120]])],
  card: [
    polygon([[0, 0], [135, 0], [180, 45], [180, 180], [0, 180]]),
    line([[135, 0], [135, 45], [180, 45]]),
  ],
};

function randomId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20);
}

function randomPositiveInteger(): number {
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

function getBaseElement(appState: ExcalidrawAppState, groupIds: string[]): Record<string, unknown> {
  return {
    id: randomId(), angle: 0,
    strokeColor: appState.currentItemStrokeColor ?? "#1e1e1e",
    fillStyle: appState.currentItemFillStyle ?? "solid",
    strokeWidth: appState.currentItemStrokeWidth ?? 2,
    strokeStyle: appState.currentItemStrokeStyle ?? "solid",
    roughness: appState.currentItemRoughness ?? 1,
    opacity: appState.currentItemOpacity ?? 100,
    groupIds, frameId: null, seed: randomPositiveInteger(), version: 1,
    versionNonce: randomPositiveInteger(), isDeleted: false, boundElements: [],
    updated: Date.now(), created: Date.now(), link: null, locked: false,
  };
}

function createLineElement(part: LinePart, appState: ExcalidrawAppState, width: number, height: number, groupIds: string[]): Record<string, unknown> {
  const minX = Math.min(...part.points.map(([x]) => x));
  const minY = Math.min(...part.points.map(([, y]) => y));
  const maxX = Math.max(...part.points.map(([x]) => x));
  const maxY = Math.max(...part.points.map(([, y]) => y));
  const points = part.points.map(([pointX, pointY]) => [((pointX - minX) / SHAPE_SIZE) * width, ((pointY - minY) / SHAPE_SIZE) * height] as Point);
  return {
    ...getBaseElement(appState, groupIds), type: "line",
    x: (minX / SHAPE_SIZE) * width, y: (minY / SHAPE_SIZE) * height,
    width: ((maxX - minX) / SHAPE_SIZE) * width,
    height: ((maxY - minY) / SHAPE_SIZE) * height,
    backgroundColor: part.closed ? (appState.currentItemBackgroundColor ?? "transparent") : "transparent",
    roundness: part.round ? { type: 2 } : null, points,
    lastCommittedPoint: null, startBinding: null, endBinding: null,
    startArrowhead: null, endArrowhead: null, elbowed: false,
    polygon: part.closed === true,
  };
}

function createEllipseElement(part: EllipsePart, appState: ExcalidrawAppState, width: number, height: number, groupIds: string[]): Record<string, unknown> {
  return {
    ...getBaseElement(appState, groupIds), type: "ellipse",
    x: (part.x / SHAPE_SIZE) * width, y: (part.y / SHAPE_SIZE) * height,
    width: (part.width / SHAPE_SIZE) * width,
    height: (part.height / SHAPE_SIZE) * height,
    backgroundColor: appState.currentItemBackgroundColor ?? "transparent",
    roundness: null,
  };
}

export function createExtendedShapeElements(kind: ExtendedShapeKind, appState: ExcalidrawAppState, width: number, height: number): Record<string, unknown>[] {
  const normalizedWidth = Math.max(1, width);
  const normalizedHeight = Math.max(1, height);
  const parts = SHAPE_PARTS[kind];
  const groupIds = parts.length > 1 ? [randomId()] : [];
  return parts.map((part) => part.type === "ellipse"
    ? createEllipseElement(part, appState, normalizedWidth, normalizedHeight, groupIds)
    : createLineElement(part, appState, normalizedWidth, normalizedHeight, groupIds));
}
