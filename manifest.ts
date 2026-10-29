import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Better Excalidraw Workspace",
  version: "0.5.0",
  description: "Local workspaces and extended geometry tools for Excalidraw.",
  minimum_chrome_version: "116",
  permissions: ["sidePanel", "storage"],
  host_permissions: ["https://excalidraw.com/*"],
  action: {
    default_title: "打开 Excalidraw 工作区",
  },
  side_panel: {
    default_path: "sidepanel.html",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://excalidraw.com/*"],
      js: ["src/content.ts"],
      run_at: "document_idle",
    },
  ],
});
