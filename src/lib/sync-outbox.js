const DB_NAME = "spraklab-sync";
const DB_VERSION = 1;
const STORE_NAME = "outbox";
const LAST_SYNC_STORAGE_KEY = "swedish-vocab-pwa.lastSuccessfulSync";
const SYNC_EVENT_NAME = "spraklab:sync-status";

let databasePromise = null;
let flushPromise = null;

function clean(value) {
  return String(value || "").trim();
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined") {
    databasePromise = Promise.reject(new Error("IndexedDB is unavailable."));
    return databasePromise;
  }
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("user_id", "user_id", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the sync queue."));
  });
  return databasePromise;
}

async function useStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;
    try {
      result = action(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result?.result);
    transaction.onerror = () => reject(transaction.error || result?.error || new Error("Sync queue transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Sync queue transaction was aborted."));
  });
}

function dispatchSyncStatus(detail = {}) {
  if (typeof globalThis.dispatchEvent !== "function" || typeof CustomEvent !== "function") return;
  globalThis.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME, { detail }));
}

function readLastSyncMap() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(LAST_SYNC_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function lastSuccessfulSync(userId) {
  const timestamp = Number(readLastSyncMap()[clean(userId)] || 0) || 0;
  return Math.max(0, timestamp);
}

export function markSuccessfulSync(userId, timestamp = Date.now()) {
  const accountId = clean(userId);
  if (!accountId) return 0;
  const value = Math.max(0, Number(timestamp || 0) || Date.now());
  const rows = readLastSyncMap();
  rows[accountId] = value;
  try {
    globalThis.localStorage?.setItem(LAST_SYNC_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Sync remains valid even if the display timestamp cannot be cached.
  }
  dispatchSyncStatus({ status: "success", userId: accountId, lastSyncedAt: value });
  return value;
}

export async function enqueueSyncOperation(type, payload, { id, userId } = {}) {
  const accountId = clean(userId);
  const operationType = clean(type);
  if (!accountId || !operationType) throw new Error("A sync operation requires type and userId.");
  const operation = {
    id: clean(id) || createId(),
    user_id: accountId,
    type: operationType,
    payload,
    created_at: Date.now(),
    updated_at: Date.now(),
    attempts: 0,
    last_error: "",
  };
  await useStore("readwrite", (store) => store.put(operation));
  const pending = await pendingSyncCount(accountId);
  dispatchSyncStatus({ status: "pending", userId: accountId, pending });
  return operation;
}

export async function removeSyncOperation(id) {
  const operationId = clean(id);
  if (!operationId) return;
  await useStore("readwrite", (store) => store.delete(operationId));
}

export async function pendingSyncOperations(userId) {
  const accountId = clean(userId);
  if (!accountId) return [];
  const rows = await useStore("readonly", (store) => store.index("user_id").getAll(accountId));
  return (rows || []).sort((a, b) => Number(a.created_at || 0) - Number(b.created_at || 0));
}

export async function pendingSyncCount(userId) {
  return (await pendingSyncOperations(userId)).length;
}

async function recordFailure(operation, error) {
  const next = {
    ...operation,
    attempts: Number(operation.attempts || 0) + 1,
    updated_at: Date.now(),
    last_error: clean(error?.message || error).slice(0, 500),
  };
  await useStore("readwrite", (store) => store.put(next));
}

export async function runQueuedMutation(type, payload, { userId, handler, id } = {}) {
  const accountId = clean(userId);
  if (!accountId) return handler(payload);
  const operation = await enqueueSyncOperation(type, payload, { id, userId: accountId }).catch((error) => {
    console.warn("[SpråkLab] Could not persist a pending sync operation.", error);
    return null;
  });
  try {
    const result = await handler(payload);
    if (operation?.id) await removeSyncOperation(operation.id);
    markSuccessfulSync(accountId);
    const pending = await pendingSyncCount(accountId).catch(() => 0);
    dispatchSyncStatus({ status: "success", userId: accountId, pending, lastSyncedAt: lastSuccessfulSync(accountId) });
    return result;
  } catch (error) {
    if (operation) await recordFailure(operation, error).catch(() => {});
    throw error;
  }
}

export async function flushSyncOperations({ userId, handlers = {} } = {}) {
  const accountId = clean(userId);
  if (!accountId) return { attempted: 0, completed: 0, failed: 0, pending: 0 };
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const operations = await pendingSyncOperations(accountId);
    if (operations.length === 0) {
      return { attempted: 0, completed: 0, failed: 0, pending: 0 };
    }
    dispatchSyncStatus({ status: "syncing", userId: accountId, pending: operations.length });
    let completed = 0;
    let failed = 0;
    for (const operation of operations) {
      const handler = handlers[operation.type];
      if (typeof handler !== "function") {
        await recordFailure(operation, new Error(`Unknown sync operation: ${operation.type}`));
        failed += 1;
        continue;
      }
      try {
        await handler(operation.payload);
        await removeSyncOperation(operation.id);
        completed += 1;
      } catch (error) {
        await recordFailure(operation, error);
        failed += 1;
      }
    }
    const pending = await pendingSyncCount(accountId);
    if (completed > 0) markSuccessfulSync(accountId);
    dispatchSyncStatus({
      status: failed > 0 ? "error" : "success",
      userId: accountId,
      completed,
      failed,
      pending,
      lastSyncedAt: lastSuccessfulSync(accountId),
    });
    return { attempted: operations.length, completed, failed, pending };
  })();
  try {
    return await flushPromise;
  } finally {
    flushPromise = null;
  }
}

export { SYNC_EVENT_NAME };
