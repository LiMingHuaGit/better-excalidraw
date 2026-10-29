import type { MessageResponse, WorkspaceMessage } from "./messages";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener(
  (
    message: WorkspaceMessage,
    sender,
    sendResponse: (response: MessageResponse) => void,
  ) => {
    if (message.type !== "BETTER_EXCALIDRAW_OPEN_SIDE_PANEL") return false;
    if (!sender.tab?.id) {
      sendResponse({ ok: false, error: "无法识别当前 Excalidraw 标签页" });
      return false;
    }

    void chrome.sidePanel
      .open({ tabId: sender.tab.id })
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    return true;
  },
);
