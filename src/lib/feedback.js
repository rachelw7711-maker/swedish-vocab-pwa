// Unified user-facing feedback: toasts for one-off success/error messages,
// and a persistent banner reflecting background sync health. Both are thin
// consumers of the existing spraklab:sync-status event (see sync-outbox.js) —
// this module intentionally does not introduce a second sync mechanism.
import { SYNC_EVENT_NAME, pendingSyncOperations } from "./sync-outbox.js";

const TOAST_DURATION = { success: 3200, info: 3200, warning: 4200, error: 5200 };
const REPEATED_FAILURE_THRESHOLD = 3;

let toastContainer = null;
let bannerEl = null;
let bannerTextEl = null;
let bannerRetryEl = null;
let retryHandler = null;

function changeCount(count) {
  return `${count} ändring${count === 1 ? "" : "ar"}`;
}

export function showToast(message, { type = "info", duration } = {}) {
  toastContainer = toastContainer || document.getElementById("toastContainer");
  if (!toastContainer || !message) return null;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", type === "error" || type === "warning" ? "alert" : "status");
  toast.textContent = message;
  toastContainer.appendChild(toast);
  const ms = duration || TOAST_DURATION[type] || TOAST_DURATION.info;
  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.add("toast-leaving");
    setTimeout(() => toast.remove(), 220);
  };
  const timer = setTimeout(dismiss, ms);
  toast.addEventListener("click", () => {
    clearTimeout(timer);
    dismiss();
  });
  return toast;
}

function setBanner(mode, text, { showRetry = false } = {}) {
  if (!bannerEl || !bannerTextEl) return;
  if (!text) {
    bannerEl.hidden = true;
    delete bannerEl.dataset.mode;
    return;
  }
  bannerEl.hidden = false;
  bannerEl.dataset.mode = mode;
  bannerTextEl.textContent = text;
  if (bannerRetryEl) bannerRetryEl.hidden = !showRetry;
}

async function maxAttemptsFor(userId) {
  if (!userId) return 0;
  try {
    const operations = await pendingSyncOperations(userId);
    return operations.reduce((max, operation) => Math.max(max, Number(operation.attempts || 0) || 0), 0);
  } catch {
    return 0;
  }
}

export function setSyncRetryHandler(handler) {
  retryHandler = typeof handler === "function" ? handler : null;
}

export function initSyncStatusUI({ getUserId } = {}) {
  bannerEl = document.getElementById("syncStatusBanner");
  bannerTextEl = document.getElementById("syncStatusBannerText");
  bannerRetryEl = document.getElementById("syncStatusBannerRetry");
  toastContainer = document.getElementById("toastContainer");
  if (bannerRetryEl) {
    bannerRetryEl.addEventListener("click", () => {
      if (retryHandler) retryHandler();
    });
  }

  window.addEventListener(SYNC_EVENT_NAME, async (event) => {
    const detail = event.detail || {};
    const userId = typeof getUserId === "function" ? getUserId() : null;
    if (detail.userId && userId && detail.userId !== userId) return;
    const pending = Math.max(0, Number(detail.pending || 0) || 0);
    const failed = Math.max(0, Number(detail.failed || 0) || 0);

    if (detail.status === "error" || failed > 0) {
      const attempts = await maxAttemptsFor(detail.userId || userId);
      const text =
        attempts >= REPEATED_FAILURE_THRESHOLD
          ? `Synkroniseringen har misslyckats ${attempts} gånger. Kontrollera din internetanslutning.`
          : pending > 0
            ? `Synk misslyckades. ${changeCount(pending)} väntar.`
            : "Synk misslyckades. Försöker igen automatiskt.";
      setBanner("error", text, { showRetry: true });
      return;
    }
    if (detail.status === "syncing") {
      setBanner("syncing", "Synkroniserar…");
      return;
    }
    if (detail.status === "pending" && pending > 0) {
      setBanner("pending", `${changeCount(pending)} väntar på synk.`);
      return;
    }
    const wasRecovering = bannerEl && !bannerEl.hidden && bannerEl.dataset.mode !== "syncing";
    setBanner(null, "");
    if (wasRecovering) showToast("Allt synkat.", { type: "success" });
  });

  window.addEventListener("offline", () => {
    setBanner("offline", "Du är offline. Ändringar sparas lokalt och synkas senare.");
  });
  window.addEventListener("online", () => {
    if (bannerEl?.dataset.mode === "offline") setBanner(null, "");
  });
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    setBanner("offline", "Du är offline. Ändringar sparas lokalt och synkas senare.");
  }
}
