import type { ExtendedShapeKind } from "./geometry";

type PageUiOptions = {
  onInsertShape: (kind: ExtendedShapeKind) => Promise<void>;
  onOpenWorkspace: () => Promise<void>;
};

const STYLE_ID = "better-excalidraw-page-ui-styles";
const WORKSPACE_BUTTON_ID = "better-excalidraw-workspace-button";
const SHAPES_BUTTON_ID = "better-excalidraw-shapes-button";
const SHAPES_PANEL_ID = "better-excalidraw-shapes-panel";
const TOAST_ID = "better-excalidraw-page-toast";

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
    #${SHAPES_BUTTON_ID} { top: 12px; right: 16px; }
    #${SHAPES_BUTTON_ID}[aria-expanded="true"] {
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
      #${SHAPES_BUTTON_ID} { right: 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${SHAPES_PANEL_ID} { animation: none; }
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
  const button = document.getElementById(SHAPES_BUTTON_ID);
  if (!button) return;
  const toolbar = findNativeToolbar();
  if (toolbar) {
    const rect = toolbar.getBoundingClientRect();
    const preferredLeft = rect.right + 10;
    const left = preferredLeft + 44 <= window.innerWidth - 8 ? preferredLeft : rect.left - 54;
    button.style.left = `${Math.max(8, left)}px`;
    button.style.right = "auto";
    button.style.top = `${Math.max(8, rect.top)}px`;
  }

  const panel = document.getElementById(SHAPES_PANEL_ID);
  if (!panel) return;
  const buttonRect = button.getBoundingClientRect();
  const panelWidth = panel.getBoundingClientRect().width || 252;
  const left = Math.min(window.innerWidth - panelWidth - 8, Math.max(8, buttonRect.right - panelWidth));
  panel.style.left = `${left}px`;
  panel.style.top = `${buttonRect.bottom + 8}px`;
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

function openShapesPanel(options: PageUiOptions): void {
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
    target.disabled = true;
    void options
      .onInsertShape(kind)
      .then(() => closeShapesPanel())
      .catch((error: unknown) => {
        target.disabled = false;
        showToast(error instanceof Error ? error.message : String(error));
      });
  });
  document.body.append(panel);
  document.getElementById(SHAPES_BUTTON_ID)?.setAttribute("aria-expanded", "true");
  positionShapeControls();
}

function ensureButtons(options: PageUiOptions): void {
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
    button.innerHTML = shapesIcon();
    button.addEventListener("click", () => {
      if (document.getElementById(SHAPES_PANEL_ID)) closeShapesPanel();
      else openShapesPanel(options);
    });
    document.body.append(button);
  }

  positionShapeControls();
}

export function installPageUi(options: PageUiOptions): () => void {
  let frame = 0;
  const scheduleEnsure = () => {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => ensureButtons(options));
  };

  ensureButtons(options);
  const observer = new MutationObserver(scheduleEnsure);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleEnsure);

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node;
    const panel = document.getElementById(SHAPES_PANEL_ID);
    const button = document.getElementById(SHAPES_BUTTON_ID);
    if (panel && !panel.contains(target) && !button?.contains(target)) closeShapesPanel();
  };
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") closeShapesPanel();
  };
  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("keydown", handleKeydown, true);

  return () => {
    observer.disconnect();
    window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", scheduleEnsure);
    document.removeEventListener("click", handleDocumentClick, true);
    document.removeEventListener("keydown", handleKeydown, true);
    document.getElementById(WORKSPACE_BUTTON_ID)?.remove();
    document.getElementById(SHAPES_BUTTON_ID)?.remove();
    document.getElementById(SHAPES_PANEL_ID)?.remove();
  };
}
