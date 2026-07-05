function clean(value) {
  return String(value || "").trim();
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function createShadowingId() {
  if (globalThis.crypto?.randomUUID) return `shadowing-${globalThis.crypto.randomUUID()}`;
  return `shadowing-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLevel(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(5, Math.max(1, parsed));
}

export function normalizeShadowingItem(item) {
  if (!item) return null;
  const id = clean(item.id) || createShadowingId();
  const swedish = clean(firstDefined(item.swedish, item.text, item.content, ""));
  const title = clean(firstDefined(item.title, item.name, item.headline, "")) || swedish || "Shadowing";
  const chinese = clean(firstDefined(item.chinese, item.translation, item.meaning, ""));
  const audio = clean(firstDefined(item.audio, item.audio_source, item.audioSource, item.audio_url, item.audioUrl, item.standard_audio_path, ""));
  const category = clean(firstDefined(item.category, item.group, item.notebook, "Ungrouped")) || "Ungrouped";
  const createdAt = Number(firstDefined(item.createdAt, item.created_at, Date.now())) || Date.now();
  const updatedAt = Number(firstDefined(item.updatedAt, item.updated_at, createdAt)) || createdAt;
  const deletedAt = Number(firstDefined(item.deletedAt, item.deleted_at, 0)) || 0;
  const level = normalizeLevel(firstDefined(item.level, 1));
  const audioFileName = clean(firstDefined(item.audio_file_name, item.audioFileName, item.audioName, ""));
  const normalized = {
    id,
    title,
    swedish,
    chinese,
    audio,
    audio_source: audio,
    audio_file_name: audioFileName,
    standard_audio_bucket: clean(item.standard_audio_bucket),
    standard_audio_path: clean(item.standard_audio_path),
    standard_audio_mime_type: clean(item.standard_audio_mime_type),
    standard_audio_size_bytes: Number(item.standard_audio_size_bytes || 0) || null,
    standard_audio_duration_ms: Number(item.standard_audio_duration_ms || 0) || null,
    tts_provider: clean(item.tts_provider),
    tts_voice_id: clean(firstDefined(item.tts_voice_id, item.voice_id, item.voiceId, "")),
    tts_voice_name: clean(item.tts_voice_name),
    tts_model_id: clean(item.tts_model_id),
    tts_settings: item.tts_settings && typeof item.tts_settings === "object" ? item.tts_settings : {},
    tts_status: clean(item.tts_status),
    tts_error: clean(item.tts_error),
    category,
    level,
    createdAt,
    updatedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
  if (deletedAt) {
    normalized.deletedAt = deletedAt;
    normalized.deleted_at = deletedAt;
    normalized.deleted = true;
  }
  return normalized;
}

export async function readShadowingCatalog() {
  return [];
}

export async function readShadowingItems() {
  return [];
}

export async function readStoredShadowingItems() {
  return [];
}

export async function upsertShadowingItem(item) {
  return normalizeShadowingItem(item);
}

export async function saveShadowingItems(items = []) {
  return items.map(normalizeShadowingItem).filter(Boolean);
}

export async function deleteShadowingItem(id) {
  return Boolean(clean(id));
}

export async function clearShadowingStore() {
  if (typeof indexedDB !== "undefined") indexedDB.deleteDatabase("swedish-vocab-pwa-shadowing");
  try {
    localStorage.removeItem("swedish-vocab-pwa.shadowing");
    localStorage.removeItem("swedish-vocab-pwa.shadowingItems");
  } catch {
    // Ignore cleanup failures.
  }
}

export async function migrateLegacyShadowingItems() {
  await clearShadowingStore();
  return { migrated: false, count: 0 };
}
