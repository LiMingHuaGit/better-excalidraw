import type { ExtendedShapeKind } from "./geometry";

type PageUiOptions = {
  onDrawShape: (
    kind: ExtendedShapeKind,
    bounds: DrawnShapeBounds,
  ) => Promise<void>;
  onOpenWorkspace: () => Promise<void>;
  onSelectionOperation: (operation: SelectionOperation) => Promise<void>;
};

export type SelectionOperation =
  | "duplicate"
  | "rotateClockwise"
  | "rotateCounterclockwise"
  | "flipHorizontal"
  | "flipVertical";

export type DrawnShapeBounds = {
  centerX: number;
  centerY: number;
  height: number;
  width: number;
};

const STYLE_ID = "better-excalidraw-page-ui-styles";
const WORKSPACE_BUTTON_ID = "better-excalidraw-workspace-button";
const SHAPES_BUTTON_ID = "better-excalidraw-shapes-button";
const SHAPES_PANEL_ID = "better-excalidraw-shapes-panel";
const OPERATIONS_BUTTON_ID = "better-excalidraw-operations-button";
const OPERATIONS_PANEL_ID = "better-excalidraw-operations-panel";
const TOAST_ID = "better-excalidraw-page-toast";
const DRAW_PREVIEW_ID = "better-excalidraw-draw-preview";
const DRAW_HINT_ID = "better-excalidraw-draw-hint";

const SHAPES: Array<{
  kind: ExtendedShapeKind;
  label: string;
  points: string;
}> = [
  { kind: "triangle", label: "三角形", points: "12,3 21,21 3,21" },
  { kind: "rightTriangle", label: "直角三角形", points: "4,3 21,21 4,21" },
  { kind: "pentagon", label: "五边形", points: "12,2 22,9 18,21 6,21 2,9" },
  { kind: "hexagon", label: "六边形", points: "6,3 18,3 23,12 18,21 6,21 1,12" },
  { kind: "octagon", label: "八边形", points: "7,2 17,2 22,7 22,17 17,22 7,22 2,17 2,7" },
  { kind: "trapezoid", label: "梯形", points: "7,3 17,3 22,21 2,21" },
  { kind: "parallelogram", label: "平行四边形", points: "7,3 22,3 17,21 2,21" },
  {
    kind: "star",
    label: "星形",
    points: "12,2 14.5,9 22,9 16,13.5 18.5,21 12,16.5 5.5,21 8,13.5 2,9 9.5,9",
  },
];

const SELECTION_OPERATIONS: Array<{
  operation: SelectionOperation;
  label: string;
  shortcut?: string;
  icon: string;
}> = [
  {
    operation: "duplicate",
    label: "复制一份",
    shortcut: "Ctrl/⌘ D",
    icon: '<rect x="7" y="7" width="11" height="11" rx="2"/><path d="M15 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  },
  {
    operation: "rotateClockwise",
    label: "顺时针旋转 90°",
    icon: '<path d="M19 8V3m0 0h-5m5 0-3.2 3.2A8 8 0 1 0 20 13"/>',
  },
  {
    operation: "rotateCounterclockwise",
    label: "逆时针旋转 90°",
    icon: '<path d="M5 8V3m0 0h5M5 3l3.2 3.2A8 8 0 1 1 4 13"/>',
  },
  {
    operation: "flipHorizontal",
    label: "水平翻转",
    shortcut: "Shift H",
    icon: '<path d="M12 3v18M9 5 3 9v6l6 4V5Zm6 0 6 4v6l-6 4V5Z"/>',
  },
  {
    operation: "flipVertical",
    label: "垂直翻转",
    shortcut: "Shift V",
    icon: '<path d="M3 12h18M5 9l4-6h6l4 6H5Zm0 6 4 6h6l4-6H5Z"/>',
  },
];

function workspaceIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 6.5A2 2 0 0 1 5.5 4.5h4l2 2h7A2 2 0 0 1 20.5 8.5v9A2 2 0 0 1 18.5 19.5h-13a2 2 0 0 1-2-2v-11Z"/>
      <path d="M7 11h10M7 15h7"/>
    </svg>`;
}

function shapesIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 3 5 8H2l5-8Z"/>
      <rect x="13.5" y="3.5" width="7" height="7" rx="1"/>
      <circle cx="16.5" cy="17" r="4"/>
    </svg>`;
}

function operationsIcon(): string {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5" cy="12" r="1.5"/>
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="19" cy="12" r="1.5"/>
    </svg>`;
}

function shapeIcon(points: string): string {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="${points}"/></svg>`;
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .better-excalidraw-page-button {
      position: fixed;
      z-index: 20;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 10px;
      color: var(--icon-fill-color, #1b1b1f);
      background: var(--island-bg-color, #fff);
      box-shadow: var(--shadow-island, 0 1px 4px rgba(0, 0, 0, 0.18));
      cursor: pointer;
      transition: background-color 120ms ease, color 120ms ease, transform 120ms ease;
    }
    .better-excalidraw-page-button:hover {
      color: var(--color-primary, #6965db);
      background: var(--button-hover-bg, #f1f0ff);
    }
    .better-excalidraw-page-button:active { transform: scale(.96); }
    .better-excalidraw-page-button:focus-visible {
      outline: 2px solid var(--color-primary, #6965db);
      outline-offset: 2px;
    }
    .better-excalidraw-page-button svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    #${WORKSPACE_BUTTON_ID} { top: 76px; left: 16px; }
    #${SHAPES_BUTTON_ID} { top: 12px; right: 66px; }
    #${OPERATIONS_BUTTON_ID} { top: 12px; right: 16px; }
    #${SHAPES_BUTTON_ID}[aria-expanded="true"] {
      color: var(--color-primary, #6965db);
      background: var(--button-active-bg, #e9e7ff);
    }
    #${SHAPES_BUTTON_ID}[aria-pressed="true"] {
      color: var(--color-primary, #6965db);
      background: var(--button-active-bg, #e9e7ff);
    }
    #${SHAPES_PANEL_ID} {
      position: fixed;
      z-index: 21;
      width: 252px;
      padding: 10px;
      border: 1px solid var(--default-border-color, rgba(0, 0, 0, .12));
      border-radius: 12px;
      color: var(--text-primary-color, #1b1b1f);
      background: var(--island-bg-color, #fff);
      box-shadow: var(--shadow-island, 0 6px 24px rgba(0, 0, 0, .18));
      animation: better-excalidraw-panel-in 120ms ease-out;
    }
    #${OPERATIONS_BUTTON_ID}[aria-expanded="true"] {
      color: var(--color-primary, #6965db);
      background: var(--button-active-bg, #e9e7ff);
    }
    #${OPERATIONS_PANEL_ID} {
      position: fixed;
      z-index: 21;
      width: 230px;
      padding: 7px;
      border: 1px solid var(--default-border-color, rgba(0, 0, 0, .12));
      border-radius: 12px;
      color: var(--text-primary-color, #1b1b1f);
      background: var(--island-bg-color, #fff);
      box-shadow: var(--shadow-island, 0 6px 24px rgba(0, 0, 0, .18));
      animation: better-excalidraw-panel-in 120ms ease-out;
    }
    @keyframes better-excalidraw-panel-in {
      from { opacity: 0; transform: translateY(-4px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .better-excalidraw-shape-heading {
      margin: 2px 4px 9px;
      color: var(--text-secondary-color, #6b6b73);
      font: 600 12px/16px system-ui, sans-serif;
    }
    .better-excalidraw-shape-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .better-excalidraw-shape-option {
      min-width: 0;
      height: 50px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 0;
      border-radius: 8px;
      color: var(--icon-fill-color, #1b1b1f);
      background: transparent;
      cursor: pointer;
    }
    .better-excalidraw-shape-option:hover,
    .better-excalidraw-shape-option:focus-visible {
      color: var(--color-primary, #6965db);
      background: var(--button-hover-bg, #f1f0ff);
      outline: 0;
    }
    .better-excalidraw-shape-option svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linejoin: round;
    }
    .better-excalidraw-operation-option {
      width: 100%;
      min-height: 38px;
      display: grid;
      grid-template-columns: 24px 1fr auto;
      align-items: center;
      gap: 9px;
      padding: 7px 9px;
      border: 0;
      border-radius: 8px;
      color: inherit;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font: 500 13px/18px system-ui, sans-serif;
    }
    .better-excalidraw-operation-option:hover,
    .better-excalidraw-operation-option:focus-visible {
      color: var(--color-primary, #6965db);
      background: var(--button-hover-bg, #f1f0ff);
      outline: 0;
    }
    .better-excalidraw-operation-option svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .better-excalidraw-operation-shortcut {
      color: var(--text-secondary-color, #777780);
      font-size: 11px;
      font-weight: 500;
    }
    html.better-excalidraw-drawing .excalidraw canvas {
      cursor: crosshair !important;
    }
    #${DRAW_PREVIEW_ID} {
      position: fixed;
      z-index: 19;
      pointer-events: none;
    }
    #${DRAW_PREVIEW_ID} svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    #${DRAW_PREVIEW_ID} polygon {
      fill: rgba(105, 101, 219, .08);
      stroke: var(--color-primary, #6965db);
      stroke-width: 2;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    #${DRAW_HINT_ID} {
      position: fixed;
      left: 50%;
      bottom: 24px;
      z-index: 21;
      padding: 8px 12px;
      border-radius: 9px;
      color: #fff;
      background: rgba(31, 31, 42, .88);
      box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
      transform: translateX(-50%);
      pointer-events: none;
      font: 600 12px/16px system-ui, sans-serif;
    }
    #${TOAST_ID} {
      position: fixed;
      left: 50%;
      bottom: 28px;
      z-index: 2147483646;
      max-width: min(420px, calc(100vw - 32px));
      padding: 10px 14px;
      border-radius: 10px;
      color: #fff;
      background: rgba(31, 31, 42, .92);
      box-shadow: 0 8px 28px rgba(0, 0, 0, .24);
      transform: translateX(-50%);
      font: 600 13px/18px system-ui, sans-serif;
    }
    @media (max-width: 700px) {
      #${WORKSPACE_BUTTON_ID} { top: 68px; left: 8px; }
      #${SHAPES_BUTTON_ID} { right: 58px; }
      #${OPERATIONS_BUTTON_ID} { right: 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${SHAPES_PANEL_ID}, #${OPERATIONS_PANEL_ID} { animation: none; }
      .better-excalidraw-page-button { transition: none; }
    }
  `;
  document.head.append(style);
}

function findNativeToolbar(): HTMLElement | null {
  const buttons = Array.from(
    document.querySelectorAll<HTMLElement>("button, [role='button']"),
  );
  const rectangleButton = buttons.find((button) => {
    const label = `${button.getAttribute("aria-label") ?? ""} ${button.getAttribute("title") ?? ""}`;
    return /(^|\s)(矩形|Rectangle)(\s|$)/i.test(label);
  });
  if (!rectangleButton) return null;

  let node: HTMLElement | null = rectangleButton.parentElement;
  for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
    const rect = node.getBoundingClientRect();
    const buttonCount = node.querySelectorAll("button, [role='button']").length;
    if (buttonCount >= 8 && rect.width >= 320 && rect.height >= 36 && rect.height <= 80) {
      return node;
    }
  }
  return null;
}

function positionShapeControls(): void {
  const shapesButton = document.getElementById(SHAPES_BUTTON_ID);
  const operationsButton = document.getElementById(OPERATIONS_BUTTON_ID);
  if (!shapesButton || !operationsButton) return;
  const toolbar = findNativeToolbar();
  if (toolbar) {
    const rect = toolbar.getBoundingClientRect();
    const preferredLeft = rect.right + 10;
    const fitsRight = preferredLeft + 94 <= window.innerWidth - 8;
    const shapesLeft = fitsRight ? preferredLeft : rect.left - 104;
    const operationsLeft = shapesLeft + 50;
    for (const [button, left] of [
      [shapesButton, shapesLeft],
      [operationsButton, operationsLeft],
    ] as const) {
      button.style.left = `${Math.max(8, left)}px`;
      button.style.right = "auto";
      button.style.top = `${Math.max(8, rect.top)}px`;
    }
  }

  for (const [panelId, button] of [
    [SHAPES_PANEL_ID, shapesButton],
    [OPERATIONS_PANEL_ID, operationsButton],
  ] as const) {
    const panel = document.getElementById(panelId);
    if (!panel) continue;
    const buttonRect = button.getBoundingClientRect();
    const fallbackWidth = panelId === SHAPES_PANEL_ID ? 252 : 230;
    const panelWidth = panel.getBoundingClientRect().width || fallbackWidth;
    const left = Math.min(
      window.innerWidth - panelWidth - 8,
      Math.max(8, buttonRect.right - panelWidth),
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${buttonRect.bottom + 8}px`;
  }
}

function showToast(message: string): void {
  document.getElementById(TOAST_ID)?.remove();
  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2600);
}

function closeShapesPanel(): void {
  document.getElementById(SHAPES_PANEL_ID)?.remove();
  document.getElementById(SHAPES_BUTTON_ID)?.setAttribute("aria-expanded", "false");
}

function closeOperationsPanel(): void {
  document.getElementById(OPERATIONS_PANEL_ID)?.remove();
  document
    .getElementById(OPERATIONS_BUTTON_ID)
    ?.setAttribute("aria-expanded", "false");
}

function openShapesPanel(onSelectShape: (shape: (typeof SHAPES)[number]) => void): void {
  closeOperationsPanel();
  closeShapesPanel();
  const panel = document.createElement("div");
  panel.id = SHAPES_PANEL_ID;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "扩展图形");
  panel.innerHTML = `
    <div class="better-excalidraw-shape-heading">扩展图形</div>
    <div class="better-excalidraw-shape-grid">
      ${SHAPES.map(
        (shape) => `
          <button class="better-excalidraw-shape-option" type="button" data-shape="${shape.kind}" aria-label="${shape.label}" title="${shape.label}">
            ${shapeIcon(shape.points)}
          </button>`,
      ).join("")}
    </div>`;

  panel.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-shape]");
    if (!target) return;
    const kind = target.dataset.shape as ExtendedShapeKind | undefined;
    if (!kind) return;
    const shape = SHAPES.find((item) => item.kind === kind);
    if (!shape) return;
    onSelectShape(shape);
    closeShapesPanel();
  });
  document.body.append(panel);
  document.getElementById(SHAPES_BUTTON_ID)?.setAttribute("aria-expanded", "true");
  positionShapeControls();
}

function openOperationsPanel(
  onSelectOperation: (operation: SelectionOperation) => void,
): void {
  closeShapesPanel();
  closeOperationsPanel();
  const panel = document.createElement("div");
  panel.id = OPERATIONS_PANEL_ID;
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", "选中图形操作");
  panel.innerHTML = SELECTION_OPERATIONS.map(
    (item) => `
      <button class="better-excalidraw-operation-option" type="button" role="menuitem" data-operation="${item.operation}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${item.icon}</svg>
        <span>${item.label}</span>
        <span class="better-excalidraw-operation-shortcut">${item.shortcut ?? ""}</span>
      </button>`,
  ).join("");
  panel.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-operation]",
    );
    const operation = target?.dataset.operation as SelectionOperation | undefined;
    if (!operation) return;
    closeOperationsPanel();
    onSelectOperation(operation);
  });
  document.body.append(panel);
  document
    .getElementById(OPERATIONS_BUTTON_ID)
    ?.setAttribute("aria-expanded", "true");
  positionShapeControls();
}

function ensureButtons(
  options: PageUiOptions,
  toggleShapesPanel: () => void,
  toggleOperationsPanel: () => void,
): void {
  if (!document.body) return;
  ensureStyles();

  if (!document.getElementById(WORKSPACE_BUTTON_ID)) {
    const button = document.createElement("button");
    button.id = WORKSPACE_BUTTON_ID;
    button.className = "better-excalidraw-page-button";
    button.type = "button";
    button.title = "打开本地画布工作区";
    button.setAttribute("aria-label", "打开本地画布工作区");
    button.innerHTML = workspaceIcon();
    button.addEventListener("click", () => {
      void options.onOpenWorkspace().catch((error: unknown) => {
        showToast(error instanceof Error ? error.message : String(error));
      });
    });
    document.body.append(button);
  }

  if (!document.getElementById(SHAPES_BUTTON_ID)) {
    const button = document.createElement("button");
    button.id = SHAPES_BUTTON_ID;
    button.className = "better-excalidraw-page-button";
    button.type = "button";
    button.title = "扩展图形";
    button.setAttribute("aria-label", "扩展图形");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = shapesIcon();
    button.addEventListener("click", toggleShapesPanel);
    document.body.append(button);
  }

  if (!document.getElementById(OPERATIONS_BUTTON_ID)) {
    const button = document.createElement("button");
    button.id = OPERATIONS_BUTTON_ID;
    button.className = "better-excalidraw-page-button";
    button.type = "button";
    button.title = "选中图形操作";
    button.setAttribute("aria-label", "选中图形操作");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = operationsIcon();
    button.addEventListener("click", toggleOperationsPanel);
    document.body.append(button);
  }

  positionShapeControls();
}

export function installPageUi(options: PageUiOptions): () => void {
  let frame = 0;
  let activeShape: (typeof SHAPES)[number] | null = null;
  let dragStart: { x: number; y: number; pointerId: number } | null = null;

  const removeDrawPreview = () => {
    document.getElementById(DRAW_PREVIEW_ID)?.remove();
  };

  const deactivateShapeTool = () => {
    activeShape = null;
    dragStart = null;
    removeDrawPreview();
    document.getElementById(DRAW_HINT_ID)?.remove();
    document.documentElement.classList.remove("better-excalidraw-drawing");
    document.getElementById(SHAPES_BUTTON_ID)?.setAttribute("aria-pressed", "false");
  };

  const activateShapeTool = (shape: (typeof SHAPES)[number]) => {
    activeShape = shape;
    removeDrawPreview();
    document.documentElement.classList.add("better-excalidraw-drawing");
    document.getElementById(SHAPES_BUTTON_ID)?.setAttribute("aria-pressed", "true");
    document.getElementById(DRAW_HINT_ID)?.remove();
    const hint = document.createElement("div");
    hint.id = DRAW_HINT_ID;
    hint.textContent = `拖拽绘制${shape.label} · Esc 取消`;
    document.body.append(hint);
  };

  const toggleShapesPanel = () => {
    if (document.getElementById(SHAPES_PANEL_ID)) closeShapesPanel();
    else openShapesPanel(activateShapeTool);
  };

  const runSelectionOperation = (operation: SelectionOperation) => {
    void options.onSelectionOperation(operation).catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : String(error));
    });
  };

  const toggleOperationsPanel = () => {
    if (activeShape) deactivateShapeTool();
    if (document.getElementById(OPERATIONS_PANEL_ID)) closeOperationsPanel();
    else openOperationsPanel(runSelectionOperation);
  };

  const scheduleEnsure = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() =>
      ensureButtons(options, toggleShapesPanel, toggleOperationsPanel),
    );
  };

  ensureButtons(options, toggleShapesPanel, toggleOperationsPanel);
  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleEnsure);

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node;
    const panel = document.getElementById(SHAPES_PANEL_ID);
    const button = document.getElementById(SHAPES_BUTTON_ID);
    const operationsPanel = document.getElementById(OPERATIONS_PANEL_ID);
    const operationsButton = document.getElementById(OPERATIONS_BUTTON_ID);
    if (panel && !panel.contains(target) && !button?.contains(target)) closeShapesPanel();
    if (
      operationsPanel &&
      !operationsPanel.contains(target) &&
      !operationsButton?.contains(target)
    ) {
      closeOperationsPanel();
    }
    if (
      activeShape &&
      target instanceof Element &&
      !panel?.contains(target) &&
      !button?.contains(target) &&
      target.closest(".excalidraw button, .excalidraw [role='button']")
    ) {
      deactivateShapeTool();
    }
  };
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    if (activeShape) deactivateShapeTool();
    else {
      closeShapesPanel();
      closeOperationsPanel();
    }
  };

  const getBounds = (event: PointerEvent) => {
    if (!dragStart) return null;
    let endX = event.clientX;
    let endY = event.clientY;
    if (event.shiftKey) {
      const size = Math.max(Math.abs(endX - dragStart.x), Math.abs(endY - dragStart.y));
      endX = dragStart.x + Math.sign(endX - dragStart.x || 1) * size;
      endY = dragStart.y + Math.sign(endY - dragStart.y || 1) * size;
    }
    const left = Math.min(dragStart.x, endX);
    const top = Math.min(dragStart.y, endY);
    const width = Math.abs(endX - dragStart.x);
    const height = Math.abs(endY - dragStart.y);
    return {
      centerX: left + width / 2,
      centerY: top + height / 2,
      height,
      left,
      top,
      width,
    };
  };

  const updateDrawPreview = (event: PointerEvent) => {
    if (!activeShape) return;
    const bounds = getBounds(event);
    if (!bounds) return;
    let preview = document.getElementById(DRAW_PREVIEW_ID);
    if (!preview) {
      preview = document.createElement("div");
      preview.id = DRAW_PREVIEW_ID;
      preview.innerHTML = shapeIcon(activeShape.points);
      document.body.append(preview);
    }
    preview.style.left = `${bounds.left}px`;
    preview.style.top = `${bounds.top}px`;
    preview.style.width = `${Math.max(1, bounds.width)}px`;
    preview.style.height = `${Math.max(1, bounds.height)}px`;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!activeShape || event.button !== 0 || !(event.target instanceof HTMLCanvasElement)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    updateDrawPreview(event);
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    updateDrawPreview(event);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!dragStart || !activeShape || event.pointerId !== dragStart.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const bounds = getBounds(event);
    const shape = activeShape;
    deactivateShapeTool();
    if (!bounds || bounds.width < 4 || bounds.height < 4) return;
    void options.onDrawShape(shape.kind, bounds).catch((error: unknown) => {
      showToast(error instanceof Error ? error.message : String(error));
    });
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    deactivateShapeTool();
  };
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointermove", handlePointerMove, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);

  return () => {
    observer.disconnect();
    window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", scheduleEnsure);
    document.removeEventListener("click", handleDocumentClick, true);
    document.removeEventListener("keydown", handleKeydown, true);
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("pointermove", handlePointerMove, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    document.removeEventListener("pointercancel", handlePointerCancel, true);
    deactivateShapeTool();
    document.getElementById(WORKSPACE_BUTTON_ID)?.remove();
    document.getElementById(SHAPES_BUTTON_ID)?.remove();
    document.getElementById(SHAPES_PANEL_ID)?.remove();
    document.getElementById(OPERATIONS_BUTTON_ID)?.remove();
    document.getElementById(OPERATIONS_PANEL_ID)?.remove();
  };
}
