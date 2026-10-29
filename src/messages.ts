export type LoadCanvasMessage = {
  type: "BETTER_EXCALIDRAW_LOAD_CANVAS";
  fileName: string;
  content: string;
};

export type CaptureCanvasMessage = {
  type: "BETTER_EXCALIDRAW_CAPTURE_CANVAS";
};

export type SaveStatusMessage = {
  type: "BETTER_EXCALIDRAW_SET_SAVE_STATUS";
  visible: boolean;
  text?: string;
};

export type PingMessage = {
  type: "BETTER_EXCALIDRAW_PING";
};

export type WorkspaceMessage =
  | LoadCanvasMessage
  | CaptureCanvasMessage
  | SaveStatusMessage
  | PingMessage;

export type MessageResponse =
  | { ok: true; content?: string }
  | { ok: false; error: string };
