import type { MessageResponse, WorkspaceMessage } from "./messages";
import {
  createExtendedShapeElement,
  type ExtendedShapeKind,
} from "./geometry";
import { installPageUi, type DrawnShapeBounds } from "./page-ui";

const EXCALIDRAW_ROOT_SELECTOR = ".excalidraw";
const FILES_DATABASE_NAME = "files-db";
const FILES_STORE_CANDIDATES = ["files-store", "files", "binaryFiles"];
const SAVE_OVERLAY_ID = "better-excalidraw-save-overlay";
const SAVE_STYLE_ID = "better-excalidraw-save-style";

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
    throw new Error("文件不是有效的 Excalidraw 画布");
  }

  const root = document.querySelector<HTMLElement>(EXCALIDRAW_ROOT_SELECTOR);
  if (!root) {
    throw new Error("没有找到 Excalidraw 画布，请刷新网页后重试");
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

function setSaveStatus(visible: boolean, text = "正在保存当前画布…"): void {
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
  if (!root || !canvas) throw new Error("没有找到 Excalidraw 画布");

  const appState = parseJson<Record<string, unknown>>(
    localStorage.getItem("excalidraw-state"),
    {},
  );
  const zoom = getAppZoom(appState);
  const element = createExtendedShapeElement(
    kind,
    appState,
    bounds.width / zoom,
    bounds.height / zoom,
  );
  const clipboardContent = JSON.stringify({
    type: "excalidraw/clipboard",
    elements: [element],
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
});
