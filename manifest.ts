import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "__MSG_extensionName__",
  version: "0.7.0",
  description: "__MSG_extensionDescription__",
  default_locale: "en",
  minimum_chrome_version: "116",
  permissions: ["sidePanel", "storage"],
  host_permissions: ["https://excalidraw.com/*"],
  icons: {
    16: "icons/icon16.png",
    32: "icons/icon32.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  action: {
    default_title: "__MSG_actionTitle__",
    default_icon: {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
    },
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
