import type { MessageResponse, WorkspaceMessage } from "./messages";
import {
  createExtendedShapeElements,
  type ExtendedShapeKind,
} from "./geometry";
import { t } from "./i18n";
import {
  installPageUi,
  type DrawnShapeBounds,
  type SelectionOperation,
} from "./page-ui";

const EXCALIDRAW_ROOT_SELECTOR = ".excalidraw";
const FILES_DATABASE_NAME = "files-db";
const FILES_STORE_CANDIDATES = ["files-store", "files", "binaryFiles"];
const SAVE_OVERLAY_ID = "better-excalidraw-save-overlay";
const SAVE_STYLE_ID = "better-excalidraw-save-style";
const EXCALIDRAW_CLIPBOARD_MIME = "application/vnd.excalidraw.clipboard+json";

type SceneElement = {
  angle?: number;
  containerId?: string | null;
  elbowed?: boolean;
  height: number;
  id: string;
  isDeleted?: boolean;
  locked?: boolean;
  type: string;
  width: number;
  x: number;
  y: number;
};

type SelectionClipboardData = {
  allElements: SceneElement[];
  files: Record<string, unknown>;
  selectedElements: SceneElement[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isExcalidrawDocument(value: unknown): value is {
  elements: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
} {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { elements?: unknown }).elements);
}

async function loadCanvas(fileName: string, content: string): Promise<string> {
  const parsed = JSON.parse(content) as unknown;
  if (!isExcalidrawDocument(parsed)) {
    throw new Error(t("invalidExcalidrawFile"));
  }

  const root = document.querySelector<HTMLElement>(EXCALIDRAW_ROOT_SELECTOR);
  if (!root) {
    throw new Error(t("excalidrawCanvasNotFoundRefresh"));
  }

  const file = new File([content], fileName, {
    type: "application/json",
    lastModified: Date.now(),
  });
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  for (const type of ["dragenter", "dragover", "drop"] as const) {
    root.dispatchEvent(
      new DragEvent(type, {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }),
    );
  }

  await new Promise((resolve) => window.setTimeout(resolve, 350));
  return captureCanvas();
}

function openFilesDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(FILES_DATABASE_NAME);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve(null);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function readBinaryFiles(
  referencedFileIds: Set<string>,
): Promise<Record<string, unknown>> {
  if (referencedFileIds.size === 0) return {};
  const database = await openFilesDatabase();
  if (!database) return {};

  const storeName = FILES_STORE_CANDIDATES.find((candidate) =>
    database.objectStoreNames.contains(candidate),
  );
  if (!storeName) {
    database.close();
    return {};
  }

  try {
    return await new Promise<Record<string, unknown>>((resolve, reject) => {
      const files: Record<string, unknown> = {};
      const transaction = database.transaction(storeName, "readonly");
      const cursorRequest = transaction.objectStore(storeName).openCursor();

      cursorRequest.onerror = () => reject(cursorRequest.error);
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        const key = String(cursor.key);
        if (referencedFileIds.has(key)) {
          files[key] = cursor.value;
        }
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(files);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

function getReferencedFileIds(elements: unknown[]): Set<string> {
  const fileIds = new Set<string>();
  for (const element of elements) {
    if (!element || typeof element !== "object") continue;
    const fileId = (element as { fileId?: unknown }).fileId;
    if (typeof fileId === "string" && fileId) fileIds.add(fileId);
  }
  return fileIds;
}

function setSaveStatus(visible: boolean, text = t("savingCurrent")): void {
  document.getElementById(SAVE_OVERLAY_ID)?.remove();
  if (!visible) return;

  if (!document.getElementById(SAVE_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = SAVE_STYLE_ID;
    style.textContent = `
      @keyframes better-excalidraw-spin {
        to { transform: rotate(360deg); }
      }
      #${SAVE_OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        background: rgba(20, 20, 28, 0.24);
        backdrop-filter: blur(2px);
        pointer-events: all;
      }
      #${SAVE_OVERLAY_ID} > div {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 210px;
        padding: 15px 18px;
        border: 1px solid rgba(255, 255, 255, 0.34);
        border-radius: 14px;
        color: #fff;
        background: rgba(31, 31, 42, 0.9);
        box-shadow: 0 14px 42px rgba(0, 0, 0, 0.28);
        font: 600 14px/20px Inter, system-ui, sans-serif;
      }
      #${SAVE_OVERLAY_ID} span {
        width: 22px;
        height: 22px;
        flex: 0 0 auto;
        border: 3px solid rgba(255, 255, 255, 0.28);
        border-top-color: #a8a5ff;
        border-radius: 50%;
        animation: better-excalidraw-spin 0.75s linear infinite;
      }
    `;
    document.head.append(style);
  }

  const overlay = document.createElement("div");
  overlay.id = SAVE_OVERLAY_ID;
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  const panel = document.createElement("div");
  const spinner = document.createElement("span");
  spinner.setAttribute("aria-hidden", "true");
  panel.append(spinner, document.createTextNode(text));
  overlay.append(panel);
  document.body.append(overlay);
}

async function captureCanvas(): Promise<string> {
  const elements = parseJson<unknown[]>(localStorage.getItem("excalidraw"), []);
  const appState = parseJson<Record<string, unknown>>(
    localStorage.getItem("excalidraw-state"),
    {},
  );
  const files = await readBinaryFiles(getReferencedFileIds(elements));

  return JSON.stringify(
    {
      type: "excalidraw",
      version: 2,
      source: "https://excalidraw.com",
      elements,
      appState,
      files,
    },
    null,
    2,
  );
}

function getAppZoom(appState: Record<string, unknown>): number {
  const zoom = appState.zoom;
  if (typeof zoom === "number" && zoom > 0) return zoom;
  if (zoom && typeof zoom === "object") {
    const value = (zoom as { value?: unknown }).value;
    if (typeof value === "number" && value > 0) return value;
  }
  return 1;
}

async function insertExtendedShape(
  kind: ExtendedShapeKind,
  bounds: DrawnShapeBounds,
): Promise<void> {
  const root = document.querySelector<HTMLElement>(EXCALIDRAW_ROOT_SELECTOR);
  const pointerTarget = document.elementFromPoint(bounds.centerX, bounds.centerY);
  const canvas =
    pointerTarget instanceof HTMLCanvasElement
      ? pointerTarget
      : root?.querySelector<HTMLCanvasElement>("canvas");
  if (!root || !canvas) throw new Error(t("excalidrawCanvasNotFound"));

  const appState = parseJson<Record<string, unknown>>(
    localStorage.getItem("excalidraw-state"),
    {},
  );
  const zoom = getAppZoom(appState);
  const elements = createExtendedShapeElements(
    kind,
    appState,
    bounds.width / zoom,
    bounds.height / zoom,
  );
  const clipboardContent = JSON.stringify({
    type: "excalidraw/clipboard",
    elements,
    files: {},
  });

  if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");
  root.focus({ preventScroll: true });

  const pointerInit: PointerEventInit = {
    bubbles: true,
    cancelable: true,
    clientX: bounds.centerX,
    clientY: bounds.centerY,
    pointerId: 1,
    pointerType: "mouse",
  };
  canvas.dispatchEvent(new PointerEvent("pointermove", pointerInit));
  canvas.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: bounds.centerX,
      clientY: bounds.centerY,
    }),
  );

  const clipboardData = new DataTransfer();
  clipboardData.setData(
    "application/vnd.excalidraw.clipboard+json",
    clipboardContent,
  );
  clipboardData.setData("text/plain", clipboardContent);
  document.dispatchEvent(
    new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData,
    }),
  );
  await new Promise((resolve) => window.setTimeout(resolve, 80));
}

function getExcalidrawRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>(EXCALIDRAW_ROOT_SELECTOR);
  if (!root) throw new Error(t("excalidrawCanvasNotFound"));
  if (!root.hasAttribute("tabindex")) root.setAttribute("tabindex", "-1");
  root.focus({ preventScroll: true });
  return root;
}

async function getSelectionClipboardData(): Promise<SelectionClipboardData> {
  const root = getExcalidrawRoot();
  const clipboardData = new DataTransfer();
  root.dispatchEvent(
    new ClipboardEvent("copy", {
      bubbles: true,
      cancelable: true,
      clipboardData,
    }),
  );
  await Promise.resolve();

  const raw =
    clipboardData.getData(EXCALIDRAW_CLIPBOARD_MIME) ||
    clipboardData.getData("text/plain");
  if (!raw) throw new Error(t("selectShapes"));

  const copied = JSON.parse(raw) as {
    elements?: SceneElement[];
    files?: Record<string, unknown>;
  };
  const copiedElements = (copied.elements ?? []).filter(
    (element) => !element.isDeleted,
  );
  if (copiedElements.length === 0) {
    throw new Error(t("selectShapes"));
  }

  const appState = parseJson<{ selectedElementIds?: Record<string, boolean> }>(
    localStorage.getItem("excalidraw-state"),
    {},
  );
  const selectedIds = appState.selectedElementIds ?? {};
  const explicitlySelected = copiedElements.filter(
    (element) => selectedIds[element.id],
  );
  if (explicitlySelected.length > 0) {
    return {
      allElements: copiedElements,
      files: copied.files ?? {},
      selectedElements: explicitlySelected,
    };
  }

  const copiedIds = new Set(copiedElements.map((element) => element.id));
  const elementsWithoutBoundText = copiedElements.filter(
    (element) => !element.containerId || !copiedIds.has(element.containerId),
  );
  return {
    allElements: copiedElements,
    files: copied.files ?? {},
    selectedElements:
      elementsWithoutBoundText.length > 0
        ? elementsWithoutBoundText
        : copiedElements,
  };
}

async function getSelectedElements(): Promise<SceneElement[]> {
  return (await getSelectionClipboardData()).selectedElements;
}

function dispatchNativeShortcut({
  code,
  key,
  primary = false,
  shiftKey = false,
}: {
  code: string;
  key: string;
  primary?: boolean;
  shiftKey?: boolean;
}): void {
  const root = getExcalidrawRoot();
  const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  const eventInit: KeyboardEventInit = {
    bubbles: true,
    cancelable: true,
    code,
    key,
    ctrlKey: primary && !isMac,
    metaKey: primary && isMac,
    shiftKey,
  };
  root.dispatchEvent(new KeyboardEvent("keydown", eventInit));
  root.dispatchEvent(new KeyboardEvent("keyup", eventInit));
}

function rotatePoint(
  pointX: number,
  pointY: number,
  centerX: number,
  centerY: number,
  angle: number,
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = pointX - centerX;
  const y = pointY - centerY;
  return {
    x: centerX + x * cos - y * sin,
    y: centerY + x * sin + y * cos,
  };
}

function getElementBounds(element: SceneElement): {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
} {
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const angle = element.angle ?? 0;
  const cornerCoordinates: Array<[number, number]> = [
    [element.x, element.y],
    [element.x + element.width, element.y],
    [element.x + element.width, element.y + element.height],
    [element.x, element.y + element.height],
  ];
  const corners = cornerCoordinates.map(([x, y]) =>
    rotatePoint(x, y, centerX, centerY, angle),
  );
  return {
    minX: Math.min(...corners.map((point) => point.x)),
    minY: Math.min(...corners.map((point) => point.y)),
    maxX: Math.max(...corners.map((point) => point.x)),
    maxY: Math.max(...corners.map((point) => point.y)),
  };
}

function sceneToViewport(
  sceneX: number,
  sceneY: number,
  appState: Record<string, unknown>,
  viewportElement: HTMLElement,
): { x: number; y: number } {
  const zoom = getAppZoom(appState);
  const scrollX = typeof appState.scrollX === "number" ? appState.scrollX : 0;
  const scrollY = typeof appState.scrollY === "number" ? appState.scrollY : 0;
  const viewportRect = viewportElement.getBoundingClientRect();
  return {
    x: viewportRect.left + (sceneX + scrollX) * zoom,
    y: viewportRect.top + (sceneY + scrollY) * zoom,
  };
}

async function rotateSelection(clockwise: boolean): Promise<void> {
  const selection = await getSelectionClipboardData();
  const { allElements, files, selectedElements } = selection;
  if (!selectedElements[0]) {
    throw new Error(t("selectShapes"));
  }
  if (
    selectedElements.some(
      (element) =>
        element.locked ||
        element.elbowed ||
        element.type === "frame" ||
        element.type === "magicframe",
    )
  ) {
    throw new Error(t("selectionCannotRotate"));
  }
  const root = getExcalidrawRoot();
  const canvas =
    root.querySelector<HTMLCanvasElement>("canvas.excalidraw__canvas.interactive") ??
    root.querySelector<HTMLCanvasElement>("canvas");
  if (!canvas) throw new Error(t("interactiveCanvasNotFound"));
  const appState = parseJson<Record<string, unknown>>(
    localStorage.getItem("excalidraw-state"),
    {},
  );
  const delta = clockwise ? Math.PI / 2 : -Math.PI / 2;
  const bounds = selectedElements.map(getElementBounds);
  const minX = Math.min(...bounds.map((item) => item.minX));
  const minY = Math.min(...bounds.map((item) => item.minY));
  const maxX = Math.max(...bounds.map((item) => item.maxX));
  const maxY = Math.max(...bounds.map((item) => item.maxY));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const rotatedElements = allElements.map((element) => {
    const elementCenterX = element.x + element.width / 2;
    const elementCenterY = element.y + element.height / 2;
    const rotatedCenter = rotatePoint(
      elementCenterX,
      elementCenterY,
      centerX,
      centerY,
      delta,
    );
    const angle = ((element.angle ?? 0) + delta + Math.PI * 2) % (Math.PI * 2);
    return {
      ...element,
      x: element.x + rotatedCenter.x - elementCenterX,
      y: element.y + rotatedCenter.y - elementCenterY,
      angle,
    };
  });
  const clipboardContent = JSON.stringify({
    type: "excalidraw/clipboard",
    elements: rotatedElements,
    files,
  });

  dispatchNativeShortcut({ code: "Delete", key: "Delete" });
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

  const centerViewport = sceneToViewport(centerX, centerY, appState, canvas);
  canvas.dispatchEvent(
    new PointerEvent("pointermove", {
      bubbles: true,
      cancelable: true,
      clientX: centerViewport.x,
      clientY: centerViewport.y,
      pointerId: 1,
      pointerType: "mouse",
    }),
  );
  canvas.dispatchEvent(
    new MouseEvent("mousemove", {
      bubbles: true,
      cancelable: true,
      clientX: centerViewport.x,
      clientY: centerViewport.y,
    }),
  );

  const clipboardData = new DataTransfer();
  clipboardData.setData(EXCALIDRAW_CLIPBOARD_MIME, clipboardContent);
  clipboardData.setData("text/plain", clipboardContent);
  document.dispatchEvent(
    new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData,
    }),
  );
  await new Promise((resolve) => window.setTimeout(resolve, 80));
}

async function performSelectionOperation(
  operation: SelectionOperation,
): Promise<void> {
  switch (operation) {
    case "duplicate":
      await getSelectedElements();
      dispatchNativeShortcut({ code: "KeyD", key: "d", primary: true });
      return;
    case "flipHorizontal":
      await getSelectedElements();
      dispatchNativeShortcut({ code: "KeyH", key: "H", shiftKey: true });
      return;
    case "flipVertical":
      await getSelectedElements();
      dispatchNativeShortcut({ code: "KeyV", key: "V", shiftKey: true });
      return;
    case "rotateClockwise":
      await rotateSelection(true);
      return;
    case "rotateCounterclockwise":
      await rotateSelection(false);
  }
}

async function openWorkspacePanel(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: "BETTER_EXCALIDRAW_OPEN_SIDE_PANEL",
  } satisfies WorkspaceMessage)) as MessageResponse;
  if (!response.ok) throw new Error(response.error);
}

chrome.runtime.onMessage.addListener(
  (
    message: WorkspaceMessage,
    _sender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (message.type === "BETTER_EXCALIDRAW_PING") {
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === "BETTER_EXCALIDRAW_LOAD_CANVAS") {
      void loadCanvas(message.fileName, message.content)
        .then((loadedContent) => sendResponse({ ok: true, content: loadedContent }))
        .catch((error: unknown) =>
          sendResponse({ ok: false, error: errorMessage(error) }),
        );
      return true;
    }

    if (message.type === "BETTER_EXCALIDRAW_CAPTURE_CANVAS") {
      void captureCanvas()
        .then((content) => sendResponse({ ok: true, content }))
        .catch((error: unknown) =>
          sendResponse({ ok: false, error: errorMessage(error) }),
        );
      return true;
    }

    if (message.type === "BETTER_EXCALIDRAW_SET_SAVE_STATUS") {
      setSaveStatus(message.visible, message.text);
      sendResponse({ ok: true });
      return false;
    }

    return false;
  },
);

installPageUi({
  onDrawShape: insertExtendedShape,
  onOpenWorkspace: openWorkspacePanel,
  onSelectionOperation: performSelectionOperation,
});
