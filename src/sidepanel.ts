import "./styles.css";

import type { MessageResponse, WorkspaceMessage } from "./messages";
import { getWorkspaceHandle, saveWorkspaceHandle } from "./workspace-db";

type WorkspaceCanvas = {
  name: string;
  relativePath: string;
  handle: FileSystemFileHandle;
  size: number;
  modifiedAt: number;
};

type AppState = {
  directory: FileSystemDirectoryHandle | null;
  canvases: WorkspaceCanvas[];
  activePath: string | null;
  filter: string;
  busy: boolean;
  status: string;
  permissionRequired: boolean;
  autosaveSeconds: number;
  createDialogOpen: boolean;
  newCanvasName: string;
  newCanvasError: string;
};

const DEFAULT_AUTOSAVE_SECONDS = 30;
const MIN_AUTOSAVE_SECONDS = 5;
const MAX_AUTOSAVE_SECONDS = 3600;
const AUTOSAVE_STORAGE_KEY = "autosaveSeconds";

const state: AppState = {
  directory: null,
  canvases: [],
  activePath: null,
  filter: "",
  busy: false,
  status: "请选择一个包含 .excalidraw 文件的目录",
  permissionRequired: false,
  autosaveSeconds: DEFAULT_AUTOSAVE_SECONDS,
  createDialogOpen: false,
  newCanvasName: "",
  newCanvasError: "",
};

let autosaveTimer: number | null = null;
let lastSavedContent: string | null = null;
let saveInProgress = false;

function requireAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing app root");
  return root;
}

const app = requireAppRoot();

function escapeHtml(value: string): string {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function icon(name: "folder" | "refresh" | "save" | "search" | "canvas"): string {
  const paths = {
    folder:
      '<path d="M3.5 6.25A1.75 1.75 0 0 1 5.25 4.5h3.02l1.5 1.75h5.98A1.75 1.75 0 0 1 17.5 8v6.75a1.75 1.75 0 0 1-1.75 1.75H5.25a1.75 1.75 0 0 1-1.75-1.75v-8.5Z"/>',
    refresh:
      '<path d="M16.5 6.5v-3m0 0h-3m3 0-2.15 2.15a6.5 6.5 0 1 0 1.38 7.1"/>',
    save: '<path d="M4 3.5h9.8L17 6.7v9.8H4v-13Z"/><path d="M7 3.5v5h7v-5M7 16.5v-5h7v5"/>',
    search: '<circle cx="9" cy="9" r="5.5"/><path d="m13 13 4 4"/>',
    canvas: '<rect x="3.5" y="3.5" width="13" height="13" rx="2"/><path d="m6.5 12 2.6-2.7 2.1 2 1.6-1.5 2.2 2.2"/>',
  };

  return `<svg viewBox="0 0 20 20" aria-hidden="true">${paths[name]}</svg>`;
}

function render(): void {
  const query = state.filter.trim().toLocaleLowerCase();
  const visibleCanvases = state.canvases.filter((canvas) =>
    canvas.relativePath.toLocaleLowerCase().includes(query),
  );
  const workspaceName = state.directory?.name ?? "未选择工作区";

  app.innerHTML = `
    <main class="shell">
      <header class="header">
        <div class="brand-mark">B</div>
        <div class="brand-copy">
          <h1>Better Excalidraw</h1>
          <p>本地画布工作区</p>
        </div>
      </header>

      <section class="workspace-card">
        <div class="workspace-heading">
          <div class="workspace-icon">${icon("folder")}</div>
          <div class="workspace-copy">
            <strong title="${escapeHtml(workspaceName)}">${escapeHtml(workspaceName)}</strong>
            <span>${state.canvases.length} 个画布</span>
          </div>
        </div>
        <button class="primary-button" data-action="choose-workspace" ${state.busy ? "disabled" : ""}>
          ${state.directory ? "更换目录" : "打开工作区目录"}
        </button>
        <button class="secondary-button" data-action="new-canvas" ${!state.directory || state.busy ? "disabled" : ""}>
          新建画布
        </button>
        ${
          state.permissionRequired
            ? '<button class="secondary-button" data-action="reconnect">重新授权目录</button>'
            : ""
        }
      </section>

      <section class="toolbar" aria-label="画布工具栏">
        <label class="search-field">
          ${icon("search")}
          <input type="search" placeholder="搜索画布" value="${escapeHtml(state.filter)}" data-role="search" />
        </label>
        <button class="icon-button" title="重新扫描" aria-label="重新扫描" data-action="refresh" ${!state.directory || state.busy ? "disabled" : ""}>
          ${icon("refresh")}
        </button>
        <button class="icon-button" title="保存当前画布" aria-label="保存当前画布" data-action="save" ${!state.activePath || state.busy ? "disabled" : ""}>
          ${icon("save")}
        </button>
      </section>

      <section class="autosave-settings" aria-label="自动保存设置">
        <label for="autosave-seconds">自动保存</label>
        <input
          id="autosave-seconds"
          data-role="autosave-seconds"
          type="number"
          min="0"
          max="${MAX_AUTOSAVE_SECONDS}"
          step="5"
          value="${state.autosaveSeconds}"
          aria-describedby="autosave-hint"
        />
        <span>秒</span>
        <small id="autosave-hint">0 为关闭，最短 ${MIN_AUTOSAVE_SECONDS} 秒</small>
      </section>

      <section class="canvas-list" aria-label="工作区画布">
        ${
          visibleCanvases.length
            ? visibleCanvases
                .map(
                  (canvas) => `
                    <button class="canvas-row ${state.activePath === canvas.relativePath ? "active" : ""}" data-canvas-path="${escapeHtml(canvas.relativePath)}" ${state.busy ? "disabled" : ""}>
                      <span class="canvas-icon">${icon("canvas")}</span>
                      <span class="canvas-copy">
                        <strong>${escapeHtml(canvas.name.replace(/\.excalidraw$/i, ""))}</strong>
                        <small>${escapeHtml(canvas.relativePath)} · ${formatSize(canvas.size)} · ${formatDate(canvas.modifiedAt)}</small>
                      </span>
                    </button>
                  `,
                )
                .join("")
            : `<div class="empty-state">${
                state.directory
                  ? query
                    ? "没有匹配的画布"
                    : "目录中没有 .excalidraw 文件"
                  : "打开一个目录后，画布会显示在这里"
              }</div>`
        }
      </section>

      <footer class="status ${state.busy ? "busy" : ""}">
        <span class="status-dot"></span>
        <span>${escapeHtml(state.status)}</span>
      </footer>
      ${
        state.createDialogOpen
          ? `<div class="dialog-backdrop" data-role="dialog-backdrop">
              <form class="create-dialog" data-role="new-canvas-form">
                <h2>新建画布</h2>
                <p>画布将保存到当前工作区根目录。</p>
                <label>
                  <span>画布名称</span>
                  <input data-role="new-canvas-name" value="${escapeHtml(state.newCanvasName)}" autocomplete="off" autofocus />
                </label>
                ${
                  state.newCanvasError
                    ? `<p class="dialog-error" role="alert">${escapeHtml(state.newCanvasError)}</p>`
                    : ""
                }
                <div class="dialog-actions">
                  <button type="button" class="dialog-button" data-action="cancel-new-canvas">取消</button>
                  <button type="submit" class="dialog-button primary">创建</button>
                </div>
              </form>
            </div>`
          : ""
      }
    </main>
  `;
}

function setStatus(status: string, busy = false): void {
  state.status = status;
  state.busy = busy;
  render();
}

async function ensurePermission(
  directory: FileSystemDirectoryHandle,
  request: boolean,
): Promise<boolean> {
  const descriptor: FileSystemHandlePermissionDescriptor = { mode: "readwrite" };
  if ((await directory.queryPermission(descriptor)) === "granted") return true;
  if (!request) return false;
  return (await directory.requestPermission(descriptor)) === "granted";
}

async function scanDirectory(
  directory: FileSystemDirectoryHandle,
  prefix = "",
): Promise<WorkspaceCanvas[]> {
  const canvases: WorkspaceCanvas[] = [];

  for await (const [name, handle] of directory.entries()) {
    if (name.startsWith(".")) continue;
    const relativePath = prefix ? `${prefix}/${name}` : name;

    if (handle.kind === "directory") {
      canvases.push(...(await scanDirectory(handle, relativePath)));
      continue;
    }

    if (!name.toLocaleLowerCase().endsWith(".excalidraw")) continue;
    const file = await handle.getFile();
    canvases.push({
      name,
      relativePath,
      handle,
      size: file.size,
      modifiedAt: file.lastModified,
    });
  }

  return canvases.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath, "zh-CN"),
  );
}

async function refreshWorkspace(): Promise<void> {
  if (!state.directory) return;
  setStatus("正在扫描工作区…", true);

  try {
    if (!(await ensurePermission(state.directory, false))) {
      state.permissionRequired = true;
      state.canvases = [];
      setStatus("需要重新授权才能读取工作区");
      return;
    }

    state.permissionRequired = false;
    state.canvases = await scanDirectory(state.directory);
    if (
      state.activePath &&
      !state.canvases.some((canvas) => canvas.relativePath === state.activePath)
    ) {
      state.activePath = null;
    }
    setStatus(`已读取 ${state.canvases.length} 个画布`);
  } catch (error) {
    setStatus(`扫描失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

async function chooseWorkspace(): Promise<void> {
  try {
    const directory = await window.showDirectoryPicker({
      id: "better-excalidraw-workspace",
      mode: "readwrite",
      startIn: state.directory ?? "documents",
    });
    state.directory = directory;
    state.activePath = null;
    state.permissionRequired = false;
    await saveWorkspaceHandle(directory);
    await refreshWorkspace();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    setStatus(`打开目录失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

function getDefaultCanvasName(): string {
  const names = new Set(
    state.canvases.map((canvas) => canvas.name.replace(/\.excalidraw$/i, "")),
  );
  let index = 1;
  while (names.has(index === 1 ? "未命名画布" : `未命名画布 ${index}`)) {
    index += 1;
  }
  return index === 1 ? "未命名画布" : `未命名画布 ${index}`;
}

function openCreateCanvasDialog(): void {
  state.newCanvasName = getDefaultCanvasName();
  state.newCanvasError = "";
  state.createDialogOpen = true;
  render();
  window.requestAnimationFrame(() => {
    const input = app.querySelector<HTMLInputElement>("[data-role='new-canvas-name']");
    input?.focus();
    input?.select();
  });
}

function closeCreateCanvasDialog(): void {
  state.createDialogOpen = false;
  state.newCanvasName = "";
  state.newCanvasError = "";
  render();
}

function showCreateCanvasError(message: string): void {
  state.newCanvasError = message;
  render();
  window.requestAnimationFrame(() => {
    const input = app.querySelector<HTMLInputElement>("[data-role='new-canvas-name']");
    input?.focus();
  });
}

async function createNewCanvas(): Promise<void> {
  if (!state.directory) return;
  const rawName = state.newCanvasName.trim();
  if (!rawName) {
    showCreateCanvasError("请输入画布名称");
    return;
  }
  if (/[\\/:*?\"<>|\0]/.test(rawName)) {
    showCreateCanvasError("画布名称不能包含 \\ / : * ? \" < > | 等字符");
    return;
  }
  if (rawName.startsWith(".")) {
    showCreateCanvasError("画布名称不能以 . 开头");
    return;
  }
  const fileName = rawName.toLocaleLowerCase().endsWith(".excalidraw")
    ? rawName
    : `${rawName}.excalidraw`;

  try {
    if (!(await ensurePermission(state.directory, true))) {
      showCreateCanvasError("没有工作区写入权限");
      return;
    }

    try {
      await state.directory.getFileHandle(fileName);
      showCreateCanvasError("工作区中已存在同名画布");
      return;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) {
        throw error;
      }
    }

    state.createDialogOpen = false;
    state.newCanvasError = "";
    render();

    if (state.activePath) {
      const saved = await saveActiveCanvas({
        quiet: true,
        refresh: false,
        displayLoading: true,
        loadingText: "正在保存当前画布…",
      });
      if (!saved) {
        state.createDialogOpen = true;
        state.newCanvasName = rawName;
        showCreateCanvasError("当前画布保存失败，尚未创建新画布");
        return;
      }
    }
    setStatus(`正在创建 ${fileName}…`, true);

    const handle = await state.directory.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    try {
      await writable.write(
        JSON.stringify(
          {
            type: "excalidraw",
            version: 2,
            source: "https://excalidraw.com",
            elements: [],
            appState: { viewBackgroundColor: "#ffffff" },
            files: {},
          },
          null,
          2,
        ),
      );
      await writable.close();
    } catch (error) {
      await writable.abort().catch(() => undefined);
      throw error;
    }

    state.activePath = null;
    lastSavedContent = null;
    await refreshWorkspace();
    await openCanvas(fileName);
  } catch (error) {
    const message = `创建失败：${error instanceof Error ? error.message : String(error)}`;
    if (state.createDialogOpen) showCreateCanvasError(message);
    else setStatus(message);
  }
}

async function getExcalidrawTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id || !tab.url?.startsWith("https://excalidraw.com/")) {
    throw new Error("请先打开并选中 excalidraw.com 页面");
  }
  return tab;
}

async function sendToExcalidraw(
  message: WorkspaceMessage,
): Promise<MessageResponse> {
  const tab = await getExcalidrawTab();
  return chrome.tabs.sendMessage(tab.id!, message) as Promise<MessageResponse>;
}

async function openCanvas(relativePath: string): Promise<void> {
  const canvas = state.canvases.find((item) => item.relativePath === relativePath);
  if (!canvas) return;
  if (canvas.relativePath === state.activePath) return;

  if (state.activePath) {
    const saved = await saveActiveCanvas({
      quiet: true,
      refresh: false,
      displayLoading: true,
      loadingText: "正在保存并切换画布…",
    });
    if (!saved) return;
  }

  setStatus(`正在加载 ${canvas.name}…`, true);

  try {
    const file = await canvas.handle.getFile();
    const content = await file.text();
    const response = await sendToExcalidraw({
      type: "BETTER_EXCALIDRAW_LOAD_CANVAS",
      fileName: canvas.name,
      content,
    });
    if (!response.ok) throw new Error(response.error);

    state.activePath = canvas.relativePath;
    lastSavedContent = response.content ?? content;
    setStatus(`已打开 ${canvas.name}`);
  } catch (error) {
    setStatus(`加载失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

type SaveOptions = {
  quiet?: boolean;
  refresh?: boolean;
  displayLoading?: boolean;
  loadingText?: string;
};

async function saveActiveCanvas(options: SaveOptions = {}): Promise<boolean> {
  const canvas = state.canvases.find(
    (item) => item.relativePath === state.activePath,
  );
  if (!canvas || !state.directory) return true;
  if (state.busy || saveInProgress) return false;
  saveInProgress = true;
  if (!options.quiet) setStatus(`正在保存 ${canvas.name}…`, true);

  try {
    if (options.displayLoading) {
      const statusResponse = await sendToExcalidraw({
        type: "BETTER_EXCALIDRAW_SET_SAVE_STATUS",
        visible: true,
        text: options.loadingText,
      });
      if (!statusResponse.ok) throw new Error(statusResponse.error);
    }

    if (!(await ensurePermission(state.directory, true))) {
      throw new Error("没有工作区写入权限");
    }

    const response = await sendToExcalidraw({
      type: "BETTER_EXCALIDRAW_CAPTURE_CANVAS",
    });
    if (!response.ok) throw new Error(response.error);
    if (!response.content) throw new Error("没有读取到当前画布内容");

    if (response.content === lastSavedContent) {
      if (!options.quiet) setStatus(`${canvas.name} 没有未保存修改`);
      return true;
    }

    const writable = await canvas.handle.createWritable();
    await writable.write(response.content);
    await writable.close();
    lastSavedContent = response.content;

    if (options.refresh !== false) {
      await refreshWorkspace();
    }
    setStatus(`${options.quiet ? "已自动保存" : "已保存"} ${canvas.name}`);
    return true;
  } catch (error) {
    setStatus(`保存失败：${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    if (options.displayLoading) {
      try {
        await sendToExcalidraw({
          type: "BETTER_EXCALIDRAW_SET_SAVE_STATUS",
          visible: false,
        });
      } catch {
        // 页面刷新或关闭时无需保留遮罩状态。
      }
    }
    saveInProgress = false;
  }
}

function scheduleAutosave(): void {
  if (autosaveTimer !== null) {
    window.clearInterval(autosaveTimer);
    autosaveTimer = null;
  }

  if (state.autosaveSeconds === 0) return;
  autosaveTimer = window.setInterval(() => {
    if (!state.activePath || state.busy) return;
    void saveActiveCanvas({ quiet: true, refresh: false });
  }, state.autosaveSeconds * 1000);
}

async function updateAutosaveSeconds(rawValue: string): Promise<void> {
  const parsed = Number.parseInt(rawValue, 10);
  const seconds = Number.isFinite(parsed)
    ? parsed === 0
      ? 0
      : Math.min(MAX_AUTOSAVE_SECONDS, Math.max(MIN_AUTOSAVE_SECONDS, parsed))
    : DEFAULT_AUTOSAVE_SECONDS;

  state.autosaveSeconds = seconds;
  await chrome.storage.local.set({ [AUTOSAVE_STORAGE_KEY]: seconds });
  scheduleAutosave();
  setStatus(seconds === 0 ? "已关闭自动保存" : `每 ${seconds} 秒自动保存`);
}

async function restoreAutosaveSetting(): Promise<void> {
  const stored = await chrome.storage.local.get(AUTOSAVE_STORAGE_KEY);
  const value = stored[AUTOSAVE_STORAGE_KEY];
  if (typeof value === "number" && value >= 0) {
    state.autosaveSeconds = value;
  }
  scheduleAutosave();
}

async function reconnectWorkspace(): Promise<void> {
  if (!state.directory) return;
  try {
    if (!(await ensurePermission(state.directory, true))) {
      setStatus("未获得目录授权");
      return;
    }
    state.permissionRequired = false;
    await refreshWorkspace();
  } catch (error) {
    setStatus(`授权失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

app.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  if (target.dataset.role === "dialog-backdrop") {
    closeCreateCanvasDialog();
    return;
  }
  const actionButton = target.closest<HTMLElement>("[data-action]");
  const canvasButton = target.closest<HTMLElement>("[data-canvas-path]");

  if (canvasButton?.dataset.canvasPath) {
    void openCanvas(canvasButton.dataset.canvasPath);
    return;
  }

  switch (actionButton?.dataset.action) {
    case "choose-workspace":
      void chooseWorkspace();
      break;
    case "reconnect":
      void reconnectWorkspace();
      break;
    case "new-canvas":
      openCreateCanvasDialog();
      break;
    case "cancel-new-canvas":
      closeCreateCanvasDialog();
      break;
    case "refresh":
      void refreshWorkspace();
      break;
    case "save":
      void saveActiveCanvas({
        displayLoading: true,
        loadingText: "正在保存当前画布…",
      });
      break;
  }
});

app.addEventListener("input", (event) => {
  const target = event.target as HTMLInputElement;
  if (target.dataset.role === "new-canvas-name") {
    state.newCanvasName = target.value;
    return;
  }
  if (target.dataset.role !== "search") return;
  state.filter = target.value;
  render();
  const search = app.querySelector<HTMLInputElement>("[data-role='search']");
  search?.focus();
  search?.setSelectionRange(state.filter.length, state.filter.length);
});

app.addEventListener("submit", (event) => {
  const form = event.target as HTMLFormElement;
  if (form.dataset.role !== "new-canvas-form") return;
  event.preventDefault();
  void createNewCanvas();
});

app.addEventListener("change", (event) => {
  const target = event.target as HTMLInputElement;
  if (target.dataset.role !== "autosave-seconds") return;
  void updateAutosaveSeconds(target.value);
});

async function restoreWorkspace(): Promise<void> {
  render();
  try {
    await restoreAutosaveSetting();
    render();
    const directory = await getWorkspaceHandle();
    if (!directory) return;
    state.directory = directory;

    if (!(await ensurePermission(directory, false))) {
      state.permissionRequired = true;
      setStatus("点击“重新授权目录”恢复上次工作区");
      return;
    }

    await refreshWorkspace();
  } catch (error) {
    setStatus(`恢复工作区失败：${error instanceof Error ? error.message : String(error)}`);
  }
}

void restoreWorkspace();
