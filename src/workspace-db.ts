const DATABASE_NAME = "better-excalidraw-workspace";
const DATABASE_VERSION = 1;
const STORE_NAME = "settings";
const WORKSPACE_HANDLE_KEY = "workspace-directory-handle";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveWorkspaceHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(handle, WORKSPACE_HANDLE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function getWorkspaceHandle(): Promise<FileSystemDirectoryHandle | null> {
  const database = await openDatabase();
  try {
    return await new Promise<FileSystemDirectoryHandle | null>(
      (resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction
          .objectStore(STORE_NAME)
          .get(WORKSPACE_HANDLE_KEY);
        request.onsuccess = () =>
          resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
        request.onerror = () => reject(request.error);
      },
    );
  } finally {
    database.close();
  }
}
