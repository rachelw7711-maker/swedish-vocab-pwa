import { getAccessToken, getAuthState as getSharedAuthState, getCurrentUser as getSharedAuthUser, supabase, supabaseAnonKey, supabaseUrl } from "./supabase.js";
import {
  flushSyncOperations,
  lastSuccessfulSync,
  markSuccessfulSync,
  pendingSyncCount,
  runQueuedMutation,
} from "./sync-outbox.js";

const TABLES = {
  words: "learning_objects",
  wordForms: "word_forms",
  wordTranslations: "learning_object_translations",
  userWords: "user_words",
  profiles: "profiles",
  notebooks: "notebooks",
  studyPlans: "study_plans",
  studySessions: "study_sessions",
  studySessionItems: "study_session_items",
  studyHistory: "study_history",
  shadowingItems: "shadowing_items",
  shadowingRecordings: "shadowing_recordings",
  readingItems: "reading_items",
  userPreferences: "user_preferences",
  effectiveStudyTime: "effective_study_time",
  readingAnalysisItems: "reading_analysis_items",
};

const PAGE_SIZE = 1000;
const DEFAULT_PROFILE_ID = "default";
const DAILY_WORD_LIMIT = 10;

// Native-language content lives in learning_object_translations, one row
// per (learning_object_id, native_language). The app has no "choose your
// native language" setting yet, so every read/write is pinned to 'zh' for
// now — this is the single place that will need to change once a real
// per-user native-language preference exists.
// See: Reviews/词条数据结构设计草案（母语支持+词形结构化+Fraser-Uttryck）.md
const DEFAULT_NATIVE_LANGUAGE = "zh";

function clean(value) {
  return String(value || "").trim();
}

function unique(values) {
  return [...new Set((values || []).map((item) => clean(item)).filter(Boolean))];
}

function wordSignature(word) {
  return JSON.stringify({
    id: clean(word?.id),
    favorite: Boolean(word?.favorite),
    learned: Boolean(word?.learned),
    notebook: clean(word?.notebook),
    book_names: normalizeBookNames(firstDefined(word?.book_names, word?.bookNames, word?.books)).sort(),
    review_count: Number(word?.review_count || 0) || 0,
    wrong_count: Number(word?.wrong_count || 0) || 0,
    spelling_correct_count: Number(word?.spelling_correct_count || 0) || 0,
    first_studied_at: word?.first_studied_at || null,
    last_studied_at: word?.last_studied_at || null,
    last_reviewed: word?.last_reviewed || null,
    last_study_date: clean(word?.last_study_date),
    last_review_date: clean(word?.last_review_date),
    mastered_at: word?.mastered_at || null,
    next_review_at: word?.next_review_at ?? null,
    swedish: clean(word?.swedish),
    pos: clean(word?.pos),
    pos_detail: clean(word?.pos_detail),
    chinese: clean(word?.chinese),
    english: clean(word?.english),
    forms: clean(word?.forms),
    example: clean(word?.example),
    collocations: clean(word?.collocations),
    related_words: clean(word?.related_words),
  });
}

function wordContentSignature(word) {
  return JSON.stringify({
    id: clean(word?.id),
    swedish: clean(word?.swedish),
    pos: clean(word?.pos),
    pos_detail: clean(word?.pos_detail),
    chinese: clean(word?.chinese),
    english: clean(word?.english),
    forms: clean(word?.forms),
    example: clean(word?.example),
    collocations: clean(word?.collocations),
    related_words: clean(word?.related_words),
    tags: Array.isArray(word?.tags) ? word.tags : [],
    notebook: clean(word?.notebook),
  });
}

function normalizeBookNames(value) {
  if (Array.isArray(value)) return unique(value);
  if (typeof value === "string") return unique(value.split(/[\n,;]+/));
  return [];
}

function sourceBookNamesForRows(rows = []) {
  return new Set(unique(rows.map((row) => row?.source)));
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function readNoteSection(note, label) {
  const text = clean(note);
  if (!text) return "";
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n:]+:|$)`);
  return clean(text.match(pattern)?.[1]);
}

function readUserWordMetadata(userRow = {}) {
  const value = userRow?.personal_note;
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed?.schema === "spraklab-user-word-v1" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeWord(row, userRow = null, translationRow = null) {
  const wordId = clean(row.id || row.word_id);
  const userMetadata = readUserWordMetadata(userRow);
  const bookNames = normalizeBookNames(firstDefined(userRow?.book_names, userRow?.bookNames, userMetadata.book_names));
  const note = row.note || "";
  return {
    ...row,
    id: wordId,
    swedish: clean(row.swedish),
    pos: clean(firstDefined(row.pos, row.part_of_speech)) || "other",
    object_type: clean(row.object_type) || "word",
    category: clean(row.category),
    cefr_level: clean(row.cefr_level),
    ipa: clean(row.ipa),
    // NOTE ON THE FALLBACKS BELOW: pos_detail/forms/collocations/
    // related_words/swedish_explanation are now real columns (added by
    // supabase/migrations/20260719000100_learning_objects_phase1.sql) with
    // a `not null default ''` — meaning they always exist and are never
    // undefined/null, only possibly "". `firstDefined()` only skips
    // undefined/null, NOT empty strings, so `firstDefined(row.forms,
    // readNoteSection(...))` would always return `row.forms` even when it's
    // "" — silently hiding every existing word's data, which still lives in
    // `note` until each word is individually re-saved. Use `||` (which does
    // treat "" as falsy) for these specifically instead.
    pos_detail: clean(row.pos_detail) || clean(row.posDetail) || readNoteSection(note, "Part of speech detail"),
    // Chinese meaning now lives in learning_object_translations (native
    // language 'zh'); fall back to the legacy `chinese` column if no
    // translation row was fetched/found yet, so older data keeps working.
    chinese: clean(translationRow?.meaning) || clean(row.chinese),
    // "english" is a historical misnomer kept as the JS-facing property
    // name for now to avoid touching every app.js call site in this pass
    // (see Reviews/词条数据结构设计草案…md) — the field has always held a
    // Swedish-language explanation, never English. It's now stored in the
    // dedicated `swedish_explanation` column; older rows that haven't been
    // re-saved yet still have it packed inside `note` as a labeled section,
    // so that's the fallback (there has never been a real `english` column
    // on the live table — do not add row.english back as a source here).
    english: clean(row.swedish_explanation) || readNoteSection(note, "Swedish explanation"),
    forms: clean(row.forms) || readNoteSection(note, "Forms"),
    example: clean(row.example) || clean(row.example_sv),
    collocations: clean(row.collocations) || readNoteSection(note, "Collocations"),
    related_words: clean(row.related_words) || clean(row.relatedWords) || readNoteSection(note, "Related words"),
    tags: Array.isArray(row.tags) && row.tags.length
      ? row.tags
      : clean(readNoteSection(note, "Tags") || row.level).split(",").map(clean).filter(Boolean),
    notebook: clean(firstDefined(userRow?.notebook, userMetadata.notebook)),
    book_names: bookNames,
    favorite: Boolean(userRow?.favorite ?? userRow?.is_favorite ?? row.favorite),
    status: clean(userRow?.status ?? row.status),
    learned: Boolean(userRow?.learned ?? userRow?.mastered ?? row.learned),
    review_count: Number(userRow?.review_count ?? row.review_count ?? 0) || 0,
    wrong_count: Number(userRow?.wrong_count ?? userMetadata.wrong_count ?? row.wrong_count ?? 0) || 0,
    spelling_correct_count: Number(userRow?.spelling_correct_count ?? userRow?.learned_count ?? row.spelling_correct_count ?? 0) || 0,
    first_studied_at: dateToMillis(userRow?.first_studied_at) || dateToMillis(userMetadata.first_studied_at) || dateToMillis(userRow?.last_studied_at) || row.first_studied_at || null,
    last_studied_at: dateToMillis(userRow?.last_studied_at) || row.last_studied_at || null,
    last_reviewed: dateToMillis(userRow?.last_reviewed ?? userRow?.last_reviewed_at ?? userMetadata.last_reviewed) || row.last_reviewed || null,
    last_study_date: clean(userRow?.last_study_date ?? userMetadata.last_study_date ?? row.last_study_date) || (userRow?.last_studied_at ? new Date(userRow.last_studied_at).toISOString().slice(0, 10) : ""),
    last_review_date: clean(userRow?.last_review_date ?? userMetadata.last_review_date ?? row.last_review_date),
    mastered_at: dateToMillis(userRow?.mastered_at) || dateToMillis(userMetadata.mastered_at) || row.mastered_at || null,
    next_review_at: dateToMillis(userRow?.next_review_at) || Number(row.next_review_at ?? 0) || 0,
    // Stage-based SRS (SPK-LRN-001): review_stage 0-6 drives the interval
    // table, not a raw review_count. Existing words that predate this
    // field derive a starting stage from their review_count so they don't
    // reset to stage 0 (short interval) the next time they're reviewed.
    review_stage: Number(
      userMetadata.review_stage ?? row.review_stage ?? Math.min(Number(userRow?.review_count ?? row.review_count ?? 0) || 0, 6),
    ) || 0,
    last_rating: clean(userMetadata.last_rating ?? row.last_rating) || "",
    lapse_count: Number(userMetadata.lapse_count ?? row.lapse_count ?? 0) || 0,
    created_at: row.created_at ?? null,
    updated_at: Number(userRow?.updated_at ?? row.updated_at ?? 0) || Date.now(),
  };
}

function sanitizeUserWordRows(userWordRows = [], sourceBookNames = new Set()) {
  if (sourceBookNames.size === 0) return userWordRows;
  return userWordRows.map((row) => {
    const bookNames = normalizeBookNames(firstDefined(row?.book_names, row?.bookNames));
    const nextBookNames = bookNames.filter((book) => !sourceBookNames.has(book));
    const notebook = clean(row?.notebook);
    if (!sourceBookNames.has(notebook) && nextBookNames.length === bookNames.length) return row;
    return {
      ...row,
      notebook: sourceBookNames.has(notebook) ? "" : notebook,
      book_names: nextBookNames,
    };
  });
}

async function readCurrentUser() {
  try {
    const authState = await getSharedAuthState({ waitForAccessToken: true });
    if (authState?.session?.user?.id) return authState.session.user;
    if (authState?.user?.id) return authState.user;
    return await getSharedAuthUser({ refresh: true });
  } catch (error) {
    console.warn("[Min Ordbok] Failed to read auth session. Continuing without user state.", error);
    return null;
  }
}

function dateToMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function millisToIso(value) {
  const millis = Number(value || 0);
  return millis ? new Date(millis).toISOString() : null;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function endOfDayMillis(dateKey = todayKey()) {
  const [year, month, day] = clean(dateKey).split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date();
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

function startOfDayMillis(dateKey = todayKey()) {
  const [year, month, day] = clean(dateKey).split("-").map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function requireUser(user) {
  if (!user?.id) {
    const error = new Error("Supabase user session is required for database sync.");
    error.code = "NO_AUTH_SESSION";
    throw error;
  }
}

export async function getCurrentAccountId() {
  const user = await readCurrentUser();
  return user?.id || null;
}

export async function getCurrentAccessToken(options = {}) {
  return getAccessToken(options);
}

export async function getSyncStatus() {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false, pending: 0, lastSyncedAt: 0 };
  return {
    enabled: true,
    pending: await pendingSyncCount(user.id).catch(() => 0),
    lastSyncedAt: lastSuccessfulSync(user.id),
  };
}

export async function recordSuccessfulSync() {
  const user = await readCurrentUser();
  if (!user?.id) return 0;
  return markSuccessfulSync(user.id);
}

export async function flushPendingSync() {
  const user = await readCurrentUser();
  if (!user?.id) return { attempted: 0, completed: 0, failed: 0, pending: 0 };
  return flushSyncOperations({
    userId: user.id,
    handlers: {
      user_word_progress: ({ word }) => writeUserWordProgress(user.id, word),
      user_preferences: ({ preferences }) => writeUserPreferences(user.id, preferences),
      notebook_names: ({ names }) => writeRemoteNotebookNames(user.id, names),
      study_plan: ({ plan }) => writeStudyPlan(user.id, plan),
      study_session_item: (payload) => writeStudySessionItem(user.id, payload),
      complete_study_session: (payload) => writeCompletedStudySession(user.id, payload),
      study_history: ({ entry }) => writeStudyHistoryEntry(entry),
      shadowing_item: ({ item }) => writeShadowingItem(user.id, item),
      shadowing_recording: ({ recording }) => writeShadowingRecording(user.id, recording),
      shadowing_recording_audio: (payload) => writeShadowingRecordingWithAudio(user.id, payload),
      effective_study_time: (payload) => writeEffectiveStudyTime(payload),
    },
  });
}

export async function ensureProfile() {
  const user = await readCurrentUser();
  if (!user?.id) return null;
  const { data: existing, error: readError } = await supabase
    .from(TABLES.profiles)
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (existing?.id) return existing;
  const profile = {
    id: user.id,
    email: user.email || "",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLES.profiles)
    .upsert(profile, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchAll(table, buildQuery = (query) => query) {
  if (!supabase?.from) throw new Error("Supabase client is not available.");
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    // .range() must be applied AFTER buildQuery's filters/order, not before
    // — chaining .in() + .order() onto a builder that already has .range()
    // set silently returns 0 rows (confirmed live against this project's
    // supabase-js version), even though .eq() alone after .range() is fine.
    // Applying range last avoids the combination entirely.
    const query = buildQuery(supabase.from(table).select("*")).range(from, to);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function uploadShadowingAudio({ bucket, path, file, contentType = "application/octet-stream", upsert = true } = {}) {
  const bucketName = clean(bucket);
  const objectPath = clean(path);
  if (!bucketName || !objectPath || !file) {
    throw new Error("Missing bucket, path, or audio file for Storage upload.");
  }
  if (!supabase?.storage) throw new Error("Supabase Storage is not available.");
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(objectPath, file, {
      contentType,
      upsert,
    });
  if (error) throw error;
  return {
    bucket: bucketName,
    path: data?.path || objectPath,
  };
}

export async function downloadShadowingAudioBlob({ bucket, path } = {}) {
  const bucketName = clean(bucket);
  const objectPath = clean(path);
  if (!bucketName || !objectPath) return null;
  if (!supabase?.storage) throw new Error("Supabase Storage is not available.");
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(objectPath);
  if (error) throw error;
  return data || null;
}

export async function downloadShadowingAudioUrl({ bucket, path, expiresIn = 60 * 60 } = {}) {
  const bucketName = clean(bucket);
  const objectPath = clean(path);
  if (!bucketName || !objectPath) return "";
  if (/^(blob:|data:|https?:|\/)/i.test(objectPath)) return objectPath;
  if (!supabase?.storage) throw new Error("Supabase Storage is not available.");
  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUrl(objectPath, expiresIn);
  if (error) throw error;
  return data?.signedUrl || "";
}

export async function deleteShadowingAudio({ bucket, path } = {}) {
  const bucketName = clean(bucket);
  const objectPath = clean(path);
  if (!bucketName || !objectPath || /^(blob:|data:|https?:|\/)/i.test(objectPath)) {
    return { enabled: false, deleted: 0 };
  }
  if (!supabase?.storage) throw new Error("Supabase Storage is not available.");
  const { data, error } = await supabase.storage
    .from(bucketName)
    .remove([objectPath]);
  if (error) throw error;
  return {
    enabled: true,
    deleted: data?.length || 0,
  };
}

async function loadWordsThroughServerFallback() {
  if (typeof fetch !== "function") return null;
  const response = await fetch("/api/words", {
    headers: { accept: "application/json" },
  });
  const payload = await response.json().catch(() => null);
  console.log("[Min Ordbok] public.words server fallback result", {
    ok: response.ok,
    status: response.status,
    error: payload?.error || null,
    count: Array.isArray(payload?.words) ? payload.words.length : 0,
    sample: Array.isArray(payload?.words) ? payload.words.slice(0, 3) : [],
  });
  if (!response.ok) {
    throw new Error(payload?.error || "Server words fallback failed.");
  }
  return Array.isArray(payload?.words) ? payload.words : [];
}

export async function loadRemoteLibrarySnapshot() {
  const user = await readCurrentUser();
  if (user?.id) {
    await ensureProfile().catch((error) => {
      console.warn("[Min Ordbok] Failed to ensure profile. Continuing with public words.", error);
    });
  }

  console.log("[Min Ordbok] public.words query config", {
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabaseAnonKey: Boolean(supabaseAnonKey),
  });
  let wordRows = [];
  try {
    wordRows = await fetchAll(TABLES.words, (query) => query.eq("object_type", "word").order("swedish", { ascending: true }));
    console.log("[Min Ordbok] public.words query result", {
      error: null,
      count: wordRows.length,
      sample: wordRows.slice(0, 3),
    });
  } catch (error) {
    console.log("[Min Ordbok] public.words query result", {
      error,
      count: 0,
      sample: [],
    });
    if (error?.code !== "42501") throw error;
    wordRows = await loadWordsThroughServerFallback();
  }
  const userWordRows = user?.id
    ? await fetchAll(TABLES.userWords, (query) => query.eq("user_id", user.id)).catch((error) => {
        console.warn("[Min Ordbok] Failed to read user word state. Continuing with public words.", error);
        return [];
      })
    : [];
  // Native-language content (Chinese meaning today; more languages once a
  // real native-language preference exists — see DEFAULT_NATIVE_LANGUAGE).
  // Fetched as one bulk query rather than per-word to avoid N+1 requests.
  const translationRows = await fetchAll(TABLES.wordTranslations, (query) => query.eq("native_language", DEFAULT_NATIVE_LANGUAGE)).catch((error) => {
    console.warn("[Min Ordbok] Failed to read learning_object_translations. Falling back to legacy chinese column.", error);
    return [];
  });
  const sourceBookNames = sourceBookNamesForRows(wordRows);
  const sanitizedUserWordRows = sanitizeUserWordRows(userWordRows, sourceBookNames);

  if (user?.id && sourceBookNames.size > 0) {
    await cleanupSourceDerivedUserBooks(user.id, userWordRows, sanitizedUserWordRows).catch((error) => {
      console.warn("[Min Ordbok] Failed to clean source-derived books. Continuing with sanitized UI state.", error);
    });
  }

  const userRowsByWordId = new Map(sanitizedUserWordRows.map((row) => [clean(row.word_id), row]));
  const translationRowsByWordId = new Map(translationRows.map((row) => [clean(row.learning_object_id), row]));
  const words = wordRows.map((word) => normalizeWord(word, userRowsByWordId.get(clean(word.id)), translationRowsByWordId.get(clean(word.id))));
  const books = unique(sanitizedUserWordRows.flatMap((row) => [row.notebook, ...normalizeBookNames(row.book_names)]));

  return {
    words,
    books,
    accountId: user?.id || DEFAULT_PROFILE_ID,
    remoteWordCount: words.length,
    remoteBookCount: books.length,
    userWordCount: userWordRows.length,
  };
}

// Fraser/Uttryck browsing: learning_objects rows with object_type
// "phrase"/"expression" instead of "word" — same table, same shape, just
// excluded from loadRemoteLibrarySnapshot's main word query (object_type
// = "word" filter above) so they don't leak into the regular dictionary,
// search or home-page counts. normalizeWord() already carries object_type
// and category through unchanged, so createWordCard can render these
// exactly like a word card with no extra branching.
export async function loadPhraseObjects() {
  const rows = await fetchAll(TABLES.words, (query) =>
    query
      .in("object_type", ["phrase", "expression"])
      .in("status", ["human_reviewed", "published"])
      .order("swedish", { ascending: true }),
  );
  if (!rows.length) return [];
  const translationRows = await fetchAll(TABLES.wordTranslations, (query) => query.eq("native_language", DEFAULT_NATIVE_LANGUAGE)).catch(
    (error) => {
      console.warn("[Min Ordbok] Failed to read translations for phrase objects.", error);
      return [];
    },
  );
  const translationRowsById = new Map(translationRows.map((row) => [clean(row.learning_object_id), row]));
  return rows.map((row) => normalizeWord(row, null, translationRowsById.get(clean(row.id))));
}

// Single-entry lookup by id, for the Läsning reading-page's "查看完整表达卡"
// link (规范§9.4) — expressions aren't in the main word snapshot (state.words
// only holds object_type "word"), so this fetches directly.
export async function loadWordOrPhraseById(id) {
  const cleanId = clean(id);
  if (!cleanId) return null;
  const { data, error } = await supabase.from(TABLES.words).select("*").eq("id", cleanId).maybeSingle();
  if (error) throw error;
  return data ? normalizeWord(data) : null;
}

// "Promote" one collocation line from a word's Fraser section into its own
// standalone learning_objects entry (object_type "phrase"), so it can be
// browsed in the Fraser/Uttryck catalog and studied independently — the
// promoted_object_id link back to the source word's
// learning_object_collocations row is what SPK-DIC-001's Fraser/Uttryck
// design already expects. This is a manual, one-at-a-time curation action
// (not bulk/automatic — the existing collocations are literal phrases, not
// all of them are worth a standalone entry).
//
// Routed through /api/promote-collocation (service role) rather than a
// direct client insert: the anon key has no write grant on
// learning_objects (confirmed live, 42501) — this writes shared public
// catalog content, not a user-private row, so it can't reuse the
// personal-word sync path. See server.mjs for the future-launch note
// about adding an admin/curator check there before opening signups.
export async function promoteCollocationToPhrase({ sourceWordId, phrase, meaning, exampleSv, cefrLevel }) {
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/promote-collocation", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ sourceWordId, phrase, meaning, exampleSv, cefrLevel }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || "Failed to promote collocation.");
  return normalizeWord(payload.entry, null, { meaning: clean(meaning) });
}

async function cleanupSourceDerivedUserBooks(userId, currentRows = [], sanitizedRows = []) {
  const sanitizedById = new Map(sanitizedRows.map((row) => [clean(row.id), row]));
  const changedRows = currentRows.filter((row) => {
    const sanitized = sanitizedById.get(clean(row.id));
    if (!sanitized) return false;
    return clean(row.notebook) !== clean(sanitized.notebook) || JSON.stringify(normalizeBookNames(row.book_names)) !== JSON.stringify(normalizeBookNames(sanitized.book_names));
  });

  for (let index = 0; index < changedRows.length; index += PAGE_SIZE) {
    const batch = changedRows.slice(index, index + PAGE_SIZE);
    const results = await Promise.all(batch.map((row) => {
      const sanitized = sanitizedById.get(clean(row.id));
      return supabase
        .from(TABLES.userWords)
        .update({
          notebook: clean(sanitized.notebook) || null,
          book_names: normalizeBookNames(sanitized.book_names),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("word_id", row.word_id);
    }));
    const error = results.find((result) => result?.error)?.error;
    if (error) throw error;
  }
}

function toUserWordRow(userId, word) {
  if (!userId || !word?.id) return null;
  const status = clean(word.status) || (word.learned ? "mastered" : word.first_studied_at || word.last_study_date ? "learning" : "new");
  return {
    user_id: userId,
    word_id: word.id,
    is_favorite: Boolean(word.favorite),
    status,
    mastered: Boolean(word.learned),
    learned_count: Number(word.spelling_correct_count || 0) || 0,
    review_count: Number(word.review_count || 0) || 0,
    last_studied_at: millisToIso(word.last_studied_at) || null,
    next_review_at: millisToIso(word.next_review_at) || null,
    personal_note: JSON.stringify({
      schema: "spraklab-user-word-v1",
      notebook: clean(word.notebook),
      book_names: normalizeBookNames(word.book_names),
      wrong_count: Number(word.wrong_count || 0) || 0,
      first_studied_at: Number(word.first_studied_at || 0) || null,
      last_reviewed: Number(word.last_reviewed || 0) || null,
      last_study_date: clean(word.last_study_date),
      last_review_date: clean(word.last_review_date),
      mastered_at: Number(word.mastered_at || 0) || null,
      review_stage: Number(word.review_stage || 0) || 0,
      last_rating: clean(word.last_rating),
      lapse_count: Number(word.lapse_count || 0) || 0,
    }),
    updated_at: new Date().toISOString(),
  };
}

function toUserWordProgressRow(userId, word) {
  return toUserWordRow(userId, word);
}

// Writes to `public.learning_objects`. This replaces a previous version of
// this function that wrote a field set (lemma/part_of_speech/example_sv/
// note/level/source/created_by) which — this is now confirmed directly
// against the live database via `supabase db query --linked` — actually
// matches the real table almost exactly, except `pos`/`example`/`english`
// were never real column names on it (the real names are
// part_of_speech/example_sv, and there was no english column at all; see
// normalizeWord's comments). The field set below targets the columns that
// were verified to exist live, plus the new columns added by
// supabase/migrations/20260719000100_learning_objects_phase1.sql.
function toWordRow(word, userId = null) {
  if (!word?.id) return null;
  return {
    id: word.id,
    swedish: clean(word.swedish),
    part_of_speech: clean(word.pos) || "other",
    pos_detail: clean(word.pos_detail),
    object_type: clean(word.object_type) || "word",
    category: clean(word.category) || null,
    cefr_level: clean(word.cefr_level) || null,
    ipa: clean(word.ipa),
    // `chinese` is kept in sync here for backward compatibility (older
    // code paths / direct SQL still reading the legacy column) and is also
    // written to learning_object_translations by toWordTranslationRow.
    chinese: clean(word.chinese),
    swedish_explanation: clean(word.english),
    example_sv: clean(word.example),
    forms: clean(word.forms),
    collocations: clean(word.collocations),
    related_words: clean(word.related_words),
    tags: Array.isArray(word.tags) ? word.tags : [],
    notebook: clean(word.notebook) || undefined,
    source: clean(word.source) || "human",
    status: clean(word.status) || "published",
    created_by: userId || undefined,
    updated_at: new Date().toISOString(),
  };
}

// Writes the native-language ('zh' for now — see DEFAULT_NATIVE_LANGUAGE)
// row in learning_object_translations for a word. Called alongside
// toWordRow so a word edit updates both the language-neutral row and its
// Chinese content in one sync pass.
function toWordTranslationRow(word) {
  if (!word?.id) return null;
  return {
    learning_object_id: word.id,
    native_language: DEFAULT_NATIVE_LANGUAGE,
    meaning: clean(word.chinese),
    updated_at: new Date().toISOString(),
  };
}

async function upsertRows(table, rows, { onConflict = "id", ignoreDuplicates = false } = {}) {
  const cleanRows = rows.filter(Boolean);
  for (let index = 0; index < cleanRows.length; index += PAGE_SIZE) {
    const batch = cleanRows.slice(index, index + PAGE_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict, ignoreDuplicates, defaultToNull: false });
    if (error) throw error;
  }
}

export async function syncRemoteLibrarySnapshot({ words = [] } = {}) {
  return syncRemoteWordChanges({ previousWords: [], nextWords: words });
}

export async function syncRemoteWordChanges({ previousWords = [], nextWords = [] } = {}) {
  const user = await readCurrentUser();
  if (user?.id) await ensureProfile();
  const previousById = new Map(previousWords.map((word) => [clean(word.id), word]));
  const changedWords = nextWords.filter((word) => {
    const previous = previousById.get(clean(word.id));
    return !previous || wordSignature(previous) !== wordSignature(word);
  });
  const contentChangedWords = nextWords.filter((word) => {
    const previous = previousById.get(clean(word.id));
    return !previous || wordContentSignature(previous) !== wordContentSignature(word);
  });
  await upsertRows(TABLES.words, contentChangedWords.map((word) => toWordRow(word, user?.id || null)));
  await upsertRows(TABLES.wordTranslations, contentChangedWords.map(toWordTranslationRow), { onConflict: "learning_object_id,native_language" });
  if (user?.id) {
    await upsertRows(TABLES.userWords, changedWords.map((word) => toUserWordRow(user.id, word)), { onConflict: "user_id,word_id" });
  }
  return {
    enabled: true,
    words: contentChangedWords.length,
    userWords: user?.id ? changedWords.length : 0,
  };
}

// Structured grammatical forms (comparative/participle/etc., see
// Reviews/Ordbok-词条字段规范（按词性）.md) live in word_forms, one row per
// (learning_object_id, form_type). Fetched lazily per word (from the word
// edit dialog) rather than bulk-loaded with the whole library, since only a
// small fraction of words are being actively edited at any time.
export async function loadWordForms(learningObjectId) {
  const id = clean(learningObjectId);
  if (!id) return [];
  const { data, error } = await supabase
    .from(TABLES.wordForms)
    .select("form_type, form_value")
    .eq("learning_object_id", id);
  if (error) throw error;
  return data || [];
}

// Extra example sentences beyond the primary learning_objects.example_sv
// (sort_order 0 is reserved for that primary example conceptually; rows
// here are the 2nd+ examples, e.g. from the bundled enrichment pass that
// prioritizes an idiomatic-usage example when the word has one). Lazy
// per-word fetch, same pattern as loadWordForms.
export async function loadWordExamples(learningObjectId) {
  const id = clean(learningObjectId);
  if (!id) return [];
  const { data, error } = await supabase
    .from("learning_object_examples")
    .select("example_swedish, example_chinese, sort_order")
    .eq("learning_object_id", id)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data || [];
}

// Full learning_object_translations row for one word (meaning/explanation/
// grammar_note/learning_tip/example_translation/cultural_note) — the bulk
// library load (loadRemoteLibrarySnapshot) only carries `meaning` forward
// into `word.chinese`; the rest (learning_tip in particular) has had no
// reader anywhere in the app until now. Fetched lazily per word, same
// reasoning as loadWordForms above.
export async function loadWordTranslationDetail(learningObjectId, nativeLanguage = DEFAULT_NATIVE_LANGUAGE) {
  const id = clean(learningObjectId);
  if (!id) return null;
  const { data, error } = await supabase
    .from(TABLES.wordTranslations)
    .select("meaning, explanation, grammar_note, learning_tip, example_translation, cultural_note")
    .eq("learning_object_id", id)
    .eq("native_language", nativeLanguage)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// learning_object_relationships rows FROM this word, each joined to its
// target word's swedish/chinese so the caller doesn't need a second round
// trip. `learning_objects!to_object_id(...)` disambiguates which of the
// table's two FKs (from_object_id/to_object_id) to embed through — without
// it PostgREST can't tell which relationship to follow.
export async function loadWordRelationships(learningObjectId) {
  const id = clean(learningObjectId);
  if (!id) return [];
  const { data, error } = await supabase
    .from("learning_object_relationships")
    .select("relationship_type, learning_objects!to_object_id(swedish, chinese, part_of_speech)")
    .eq("from_object_id", id);
  if (error) throw error;
  return (data || [])
    .map((row) => ({
      type: row.relationship_type,
      swedish: clean(row.learning_objects?.swedish),
      chinese: clean(row.learning_objects?.chinese),
      pos: clean(row.learning_objects?.part_of_speech),
    }))
    .filter((row) => row.swedish);
}

// Replace-all semantics: deletes every existing word_forms row for this
// word, then inserts the current set. Simpler and safer than a diffing
// upsert given the small (≤7) row count per word, and it means clearing a
// field in the UI actually removes the stale form_type instead of leaving
// it behind.
export async function saveWordForms(learningObjectId, forms = []) {
  const id = clean(learningObjectId);
  if (!id) return { enabled: false, forms: 0 };
  const rows = forms
    .filter((entry) => clean(entry?.form_type) && clean(entry?.form_value))
    .map((entry) => ({
      learning_object_id: id,
      form_type: clean(entry.form_type),
      form_value: clean(entry.form_value),
      updated_at: new Date().toISOString(),
    }));
  const { error: deleteError } = await supabase
    .from(TABLES.wordForms)
    .delete()
    .eq("learning_object_id", id);
  if (deleteError) throw deleteError;
  if (!rows.length) return { enabled: true, forms: 0 };
  const { error: insertError } = await supabase.from(TABLES.wordForms).insert(rows);
  if (insertError) throw insertError;
  return { enabled: true, forms: rows.length };
}

async function writeUserWordProgress(userId, word = {}) {
  const row = toUserWordProgressRow(userId, word);
  const { data, error } = await supabase
    .from(TABLES.userWords)
    .upsert(row, { onConflict: "user_id,word_id" })
    .select()
    .single();
  if (error) throw error;
  return { enabled: true, word: data };
}

export async function upsertUserWordProgress(word = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !word?.id) return { enabled: false, word: null };
  await ensureProfile();
  const payload = { word };
  return runQueuedMutation("user_word_progress", payload, {
    userId: user.id,
    handler: ({ word: queuedWord }) => writeUserWordProgress(user.id, queuedWord),
  });
}

export async function loadDailyWordProgress({ date = todayKey() } = {}) {
  const user = await readCurrentUser();
  if (!user?.id) {
    return {
      enabled: false,
      date,
      todayNewWordIds: [],
      todayNewCount: 0,
      dueReviewWordIds: [],
      dueReviewCount: 0,
    };
  }
  const startOfTodayIso = millisToIso(startOfDayMillis(date));
  const endOfTodayIso = millisToIso(endOfDayMillis(date));
  const [
    { data: todayNewRows, error: newCountError },
    { data: dueReviewRows, error: dueReviewError },
    { data: firstReviewRows, error: firstReviewError },
    { count: overdueCount, error: overdueError },
    { count: dueTodayCount, error: dueTodayError },
  ] = await Promise.all([
    supabase
      .from(TABLES.userWords)
      .select("word_id")
      .eq("user_id", user.id)
      .eq("review_count", 0)
      .gte("last_studied_at", startOfTodayIso)
      .lte("last_studied_at", endOfTodayIso),
    supabase
      .from(TABLES.userWords)
      .select("word_id,next_review_at,review_count,status")
      .eq("user_id", user.id)
      .not("next_review_at", "is", null)
      .lte("next_review_at", endOfTodayIso)
      .neq("status", "mastered")
      .order("next_review_at", { ascending: true })
      .limit(DAILY_WORD_LIMIT),
    supabase
      .from(TABLES.userWords)
      .select("word_id,last_studied_at,review_count,status")
      .eq("user_id", user.id)
      .eq("review_count", 0)
      .not("last_studied_at", "is", null)
      .lt("last_studied_at", startOfTodayIso)
      .neq("status", "mastered")
      .order("last_studied_at", { ascending: false })
      .limit(DAILY_WORD_LIMIT),
    // Exact counts (not capped by DAILY_WORD_LIMIT like the queries above)
    // — needed for real workload classification (SPK-LRN-001 §10). The
    // capped queries above exist to build an actionable id list for
    // today's session, not to report the true backlog size.
    supabase
      .from(TABLES.userWords)
      .select("word_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("next_review_at", "is", null)
      .lt("next_review_at", startOfTodayIso)
      .neq("status", "mastered"),
    supabase
      .from(TABLES.userWords)
      .select("word_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("next_review_at", "is", null)
      .gte("next_review_at", startOfTodayIso)
      .lte("next_review_at", endOfTodayIso)
      .neq("status", "mastered"),
  ]);
  if (newCountError) throw newCountError;
  if (dueReviewError) throw dueReviewError;
  if (firstReviewError) throw firstReviewError;
  if (overdueError) throw overdueError;
  if (dueTodayError) throw dueTodayError;
  const todayNewWordIds = unique((todayNewRows || []).map((row) => row.word_id));
  const dueReviewWordIds = unique([
    ...(firstReviewRows || []).map((row) => row.word_id),
    ...(dueReviewRows || []).map((row) => row.word_id),
  ]).slice(0, DAILY_WORD_LIMIT);
  return {
    enabled: true,
    date,
    todayNewWordIds,
    todayNewCount: todayNewWordIds.length,
    dueReviewWordIds,
    dueReviewCount: dueReviewWordIds.length,
    overdueCount: overdueCount || 0,
    dueTodayCount: dueTodayCount || 0,
  };
}

async function writeRemoteNotebookNames(userId, names = []) {
  const { data: existing, error: readError } = await supabase
    .from(TABLES.notebooks)
    .select("id,name,deleted_at")
    .eq("user_id", userId);
  if (readError) throw readError;

  const existingByName = new Map((existing || []).map((row) => [clean(row.name).toLocaleLowerCase("sv-SE"), row]));
  const rows = names.map((name, index) => {
    const key = clean(name).toLocaleLowerCase("sv-SE");
    const existingRow = existingByName.get(key);
    return {
      ...(existingRow?.id ? { id: existingRow.id } : {}),
      user_id: userId,
      name: clean(name),
      sort_order: index,
      archived: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };
  });
  await upsertRows(TABLES.notebooks, rows);

  const activeKeys = new Set(names.map((name) => clean(name).toLocaleLowerCase("sv-SE")));
  const staleIds = (existing || [])
    .filter((row) => row.id && !row.deleted_at && !activeKeys.has(clean(row.name).toLocaleLowerCase("sv-SE")))
    .map((row) => row.id);
  if (staleIds.length) {
    const { error } = await supabase
      .from(TABLES.notebooks)
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .in("id", staleIds);
    if (error) throw error;
  }
  return { enabled: true, notebooks: rows.length, archived: staleIds.length };
}

export async function syncRemoteNotebookNames() {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  const names = unique([...arguments].flat().flatMap((value) => Array.isArray(value) ? value : [value]));
  return runQueuedMutation("notebook_names", { names }, {
    userId: user.id,
    handler: ({ names: queuedNames }) => writeRemoteNotebookNames(user.id, queuedNames),
  });
}

export async function ensureRemoteNotebookNames(names = []) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  const normalized = unique(names);
  if (normalized.length === 0) return { enabled: true, notebooks: 0 };
  const { data: existing, error: readError } = await supabase
    .from(TABLES.notebooks)
    .select("id,name")
    .eq("user_id", user.id);
  if (readError) throw readError;

  const existingByName = new Map((existing || []).map((row) => [clean(row.name).toLocaleLowerCase("sv-SE"), row]));
  const rows = normalized.map((name, index) => {
    const key = clean(name).toLocaleLowerCase("sv-SE");
    const existingRow = existingByName.get(key);
    return {
      ...(existingRow?.id ? { id: existingRow.id } : {}),
      user_id: user.id,
      name,
      sort_order: index,
      archived: false,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };
  });
  await upsertRows(TABLES.notebooks, rows);
  return { enabled: true, notebooks: rows.length };
}

export async function deleteRemoteWord(wordId) {
  const id = clean(wordId);
  if (!id) return { enabled: true };
  const user = await readCurrentUser();
  if (user?.id) {
    const { error } = await supabase
      .from(TABLES.userWords)
      .delete()
      .eq("user_id", user.id)
      .eq("word_id", id);
    if (error) throw error;
  }
  return { enabled: true };
}

export async function loadRemotePhase4Snapshot({ date = todayKey(), scope = "all" } = {}) {
  const user = await readCurrentUser();
  if (!user?.id) {
    return {
      enabled: false,
      history: [],
      notebooks: [],
      preferences: null,
      studyPlan: null,
      studySessions: [],
      studySessionItems: [],
      shadowingItems: [],
      shadowingRecordings: [],
    };
  }

  await ensureProfile().catch((error) => {
    console.warn("[Min Ordbok] Failed to ensure profile for Phase 4 snapshot.", error);
  });

  const [
    notebooks,
    preferences,
    history,
    studyPlans,
    shadowingItems,
    shadowingRecordings,
  ] = await Promise.all([
    fetchAll(TABLES.notebooks, (query) => query.eq("user_id", user.id).is("deleted_at", null).order("sort_order", { ascending: true })),
    supabase.from(TABLES.userPreferences).select("*").eq("user_id", user.id).maybeSingle(),
    fetchAll(TABLES.studyHistory, (query) => query.eq("user_id", user.id).order("created_at", { ascending: false }).limit(1000)),
    fetchAll(TABLES.studyPlans, (query) => query.eq("user_id", user.id).eq("plan_date", date).eq("scope", scope).order("created_at", { ascending: false })),
    fetchAll(TABLES.shadowingItems, (query) => query.eq("user_id", user.id).is("deleted_at", null).order("updated_at", { ascending: false })),
    fetchAll(TABLES.shadowingRecordings, (query) => query.eq("user_id", user.id).is("deleted_at", null).order("recorded_at", { ascending: false })),
  ]);
  if (preferences.error) throw preferences.error;

  const studyPlan = studyPlans[0] || null;
  const studySessions = studyPlan
    ? await fetchAll(TABLES.studySessions, (query) => query.eq("user_id", user.id).eq("study_plan_id", studyPlan.id).order("started_at", { ascending: false }))
    : [];
  const sessionIds = studySessions.map((row) => row.id).filter(Boolean);
  const studySessionItems = sessionIds.length
    ? await fetchAll(TABLES.studySessionItems, (query) => query.eq("user_id", user.id).in("study_session_id", sessionIds).order("position", { ascending: true }))
    : [];

  return {
    enabled: true,
    history: history.map(fromStudyHistoryRow),
    notebooks: notebooks.map((row) => clean(row.name)).filter(Boolean),
    preferences: preferences.data ? fromUserPreferencesRow(preferences.data) : null,
    studyPlan,
    studySessions,
    studySessionItems,
    shadowingItems: shadowingItems.map(fromShadowingItemRow),
    shadowingRecordings: shadowingRecordings.map(fromShadowingRecordingRow),
  };
}

async function writeUserPreferences(userId, preferences = {}) {
  const row = {
    user_id: userId,
    study_scope: clean(preferences.studyScope || preferences.study_scope) || "all",
    selected_notebook_id: preferences.selected_notebook_id || null,
    selected_notebook_name: clean(preferences.selectedNotebookName || preferences.selected_notebook_name),
    shadowing_show_subtitles: preferences.shadowingShowSubtitles ?? preferences.shadowing_show_subtitles ?? true,
    shadowing_continuous: preferences.shadowingContinuous ?? preferences.shadowing_continuous ?? false,
    shadowing_auto_pause: preferences.shadowingAutoPause ?? preferences.shadowing_auto_pause ?? false,
    shadowing_level: clean(preferences.shadowingLevel || preferences.shadowing_level || "1"),
    preferences: preferences.preferences || {},
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLES.userPreferences)
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return { enabled: true, preferences: fromUserPreferencesRow(data) };
}

export async function upsertUserPreferences(preferences = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  return runQueuedMutation("user_preferences", { preferences }, {
    userId: user.id,
    handler: ({ preferences: queuedPreferences }) => writeUserPreferences(user.id, queuedPreferences),
  });
}

export async function loadEffectiveStudyTime({ date = todayKey() } = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false, date, totalMs: 0, devices: [] };
  const { data, error } = await supabase
    .from(TABLES.effectiveStudyTime)
    .select("device_id,active_ms,timezone,updated_at")
    .eq("user_id", user.id)
    .eq("study_date", date);
  if (error) throw error;
  const devices = (data || []).map((row) => ({
    deviceId: clean(row.device_id),
    activeMs: Math.max(0, Number(row.active_ms || 0) || 0),
    timezone: clean(row.timezone) || "UTC",
    updatedAt: dateToMillis(row.updated_at),
  }));
  return {
    enabled: true,
    date,
    totalMs: devices.reduce((total, row) => total + row.activeMs, 0),
    devices,
  };
}

async function writeEffectiveStudyTime({ deviceId, date, activeMs, timezone } = {}) {
  const { data, error } = await supabase.rpc("merge_effective_study_time", {
    p_device_id: clean(deviceId),
    p_study_date: clean(date),
    p_active_ms: Math.max(0, Math.floor(Number(activeMs || 0) || 0)),
    p_timezone: clean(timezone) || "UTC",
  });
  if (error) throw error;
  return { enabled: true, activeMs: Math.max(0, Number(data || 0) || 0) };
}

export async function upsertEffectiveStudyTime(payload = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !payload.deviceId || !payload.date) return { enabled: false, activeMs: 0 };
  return runQueuedMutation("effective_study_time", payload, {
    userId: user.id,
    handler: writeEffectiveStudyTime,
  });
}

async function writeStudyPlan(userId, plan = {}) {
  const row = {
    id: plan.id || undefined,
    user_id: userId,
    plan_date: plan.date || plan.plan_date || todayKey(),
    scope: clean(plan.scope) || "all",
    target_new_count: Number(plan.target_new_count ?? plan.targetNewCount ?? plan.newWordIds?.length ?? 0) || 0,
    target_review_count: Number(plan.target_review_count ?? plan.targetReviewCount ?? plan.reviewWordIds?.length ?? 0) || 0,
    status: clean(plan.status) || "active",
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLES.studyPlans)
    .upsert(row, { onConflict: "user_id,plan_date,scope" })
    .select()
    .single();
  if (error) throw error;
  return { enabled: true, plan: data };
}

export async function upsertStudyPlan(plan = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false, plan: null };
  return runQueuedMutation("study_plan", { plan }, {
    userId: user.id,
    handler: ({ plan: queuedPlan }) => writeStudyPlan(user.id, queuedPlan),
  });
}

export async function ensureStudySession({ plan, mode, wordIds = [] } = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false, session: null, items: [] };
  requireUser(user);
  const remotePlan = plan?.id ? plan : (await upsertStudyPlan(plan || {})).plan;
  if (!remotePlan?.id) return { enabled: false, session: null, items: [] };

  const { data: existing, error: readError } = await supabase
    .from(TABLES.studySessions)
    .select("*")
    .eq("user_id", user.id)
    .eq("study_plan_id", remotePlan.id)
    .eq("mode", mode)
    .order("started_at", { ascending: false })
    .limit(1);
  if (readError) throw readError;
  let session = existing?.[0] || null;
  if (!session) {
    const { data, error } = await supabase
      .from(TABLES.studySessions)
      .insert({
        user_id: user.id,
        study_plan_id: remotePlan.id,
        mode,
        status: "active",
      })
      .select()
      .single();
    if (error?.code === "23505") {
      const { data: concurrent, error: concurrentReadError } = await supabase
        .from(TABLES.studySessions)
        .select("*")
        .eq("user_id", user.id)
        .eq("study_plan_id", remotePlan.id)
        .eq("mode", mode)
        .order("started_at", { ascending: false })
        .limit(1);
      if (concurrentReadError) throw concurrentReadError;
      session = concurrent?.[0] || null;
    } else if (error) {
      throw error;
    } else {
      session = data;
    }
    if (!session) throw new Error("Kunde inte skapa studiesessionen.");
  }

  const rows = unique(wordIds).map((wordId, position) => ({
    user_id: user.id,
    study_session_id: session.id,
    word_id: wordId,
    position,
    status: "pending",
    updated_at: new Date().toISOString(),
  }));
  if (rows.length) {
    const { error } = await supabase
      .from(TABLES.studySessionItems)
      .upsert(rows, { onConflict: "study_session_id,word_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  const items = await fetchAll(TABLES.studySessionItems, (query) => query.eq("user_id", user.id).eq("study_session_id", session.id).order("position", { ascending: true }));
  return { enabled: true, plan: remotePlan, session, items };
}

async function writeStudySessionItem(userId, { sessionId, wordId, status = "completed", spellingPassed = false, isCorrect = null, answer = "", collocationAnswer = "" } = {}) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLES.studySessionItems)
    .update({
      status,
      shown_at: status === "shown" ? now : undefined,
      answered_at: ["answered", "completed"].includes(status) ? now : undefined,
      completed_at: status === "completed" ? now : undefined,
      spelling_passed: Boolean(spellingPassed),
      is_correct: isCorrect,
      answer: clean(answer),
      collocation_answer: clean(collocationAnswer),
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("study_session_id", sessionId)
    .eq("word_id", wordId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return { enabled: true, item: data };
}

export async function saveStudySessionItem(payload = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !payload.sessionId || !payload.wordId) return { enabled: false };
  return runQueuedMutation("study_session_item", payload, {
    userId: user.id,
    handler: (queuedPayload) => writeStudySessionItem(user.id, queuedPayload),
  });
}

async function writeCompletedStudySession(userId, { sessionId, status = "completed" } = {}) {
  const { error } = await supabase
    .from(TABLES.studySessions)
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", sessionId);
  if (error) throw error;
  return { enabled: true };
}

export async function completeStudySession(sessionId, status = "completed") {
  const user = await readCurrentUser();
  if (!user?.id || !sessionId) return { enabled: false };
  const payload = { sessionId, status };
  return runQueuedMutation("complete_study_session", payload, {
    userId: user.id,
    handler: (queuedPayload) => writeCompletedStudySession(user.id, queuedPayload),
  });
}

function studyHistoryEntry(userId, action, word, context = {}) {
  return {
    id: context.id || undefined,
    user_id: userId,
    word_id: word.id,
    study_session_id: context.studySessionId || null,
    study_session_item_id: context.studySessionItemId || null,
    action: clean(action) || "updated",
    snapshot: {
      swedish: clean(word.swedish),
      chinese: clean(word.chinese),
      pos: clean(word.pos),
      pos_detail: clean(word.pos_detail),
      notebook: clean(word.notebook),
    },
    created_at: millisToIso(context.created_at) || new Date().toISOString(),
  };
}

async function writeStudyHistoryEntry(entry) {
  const { data, error } = await supabase
    .from(TABLES.studyHistory)
    .upsert(entry, { onConflict: "id", ignoreDuplicates: true })
    .select()
    .maybeSingle();
  if (error) throw error;
  return { enabled: true, history: data ? fromStudyHistoryRow(data) : null };
}

export async function appendStudyHistory(action, word, context = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !word?.id) return { enabled: false };
  const entry = {
    ...studyHistoryEntry(user.id, action, word, context),
  };
  return runQueuedMutation("study_history", { entry }, {
    id: entry.id,
    userId: user.id,
    handler: ({ entry: queuedEntry }) => writeStudyHistoryEntry(queuedEntry),
  });
}

async function writeShadowingItem(userId, item = {}) {
  const row = toShadowingItemRow(userId, item);
  const { data, error } = await supabase
    .from(TABLES.shadowingItems)
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return { enabled: true, item: fromShadowingItemRow(data) };
}

export async function upsertShadowingItem(item = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  return runQueuedMutation("shadowing_item", { item }, {
    userId: user.id,
    handler: ({ item: queuedItem }) => writeShadowingItem(user.id, queuedItem),
  });
}

export async function deleteShadowingItem(itemId) {
  const user = await readCurrentUser();
  const id = clean(itemId);
  if (!user?.id || !id) return { enabled: false };
  const { error } = await supabase
    .from(TABLES.shadowingItems)
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw error;
  return { enabled: true };
}

async function writeShadowingRecording(userId, recording = {}) {
  const requestedAttemptNo = Number(recording.attempt_no || recording.attemptNo || 1) || 1;
  let existingAttemptNo = 0;
  if (recording.id) {
    const { data: existingRecording, error: existingRecordingError } = await supabase
      .from(TABLES.shadowingRecordings)
      .select("attempt_no")
      .eq("user_id", userId)
      .eq("id", recording.id)
      .maybeSingle();
    if (existingRecordingError) throw existingRecordingError;
    existingAttemptNo = Number(existingRecording?.attempt_no || 0);
  }
  const { data: latestAttempts, error: latestAttemptError } = await supabase
    .from(TABLES.shadowingRecordings)
    .select("attempt_no")
    .eq("user_id", userId)
    .eq("shadowing_item_id", recording.shadowing_item_id)
    .is("deleted_at", null)
    .order("attempt_no", { ascending: false })
    .limit(1);
  if (latestAttemptError) throw latestAttemptError;
  const nextAttemptNo = existingAttemptNo || Math.max(requestedAttemptNo, Number(latestAttempts?.[0]?.attempt_no || 0) + 1);
  const row = {
    id: recording.id || undefined,
    user_id: userId,
    shadowing_item_id: recording.shadowing_item_id,
    audio_bucket: clean(recording.audio_bucket) || "shadowing-recordings",
    audio_path: clean(recording.audio_path || recording.audio || recording.dataUrl),
    audio_mime_type: clean(recording.audio_mime_type || recording.mimeType),
    audio_size_bytes: Number(recording.audio_size_bytes || recording.size || 0) || null,
    audio_duration_ms: Number(recording.audio_duration_ms || recording.durationMs || 0) || null,
    attempt_no: nextAttemptNo,
    level: recording.level == null ? null : Number(recording.level),
    notes: clean(recording.notes),
    comparison_status: clean(recording.comparison_status) || "none",
    comparison_result: recording.comparison_result || {},
    recorded_at: millisToIso(recording.recorded_at) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  let { data, error } = await supabase
    .from(TABLES.shadowingRecordings)
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error?.code === "23505") {
    const { data: retryAttempts, error: retryReadError } = await supabase
      .from(TABLES.shadowingRecordings)
      .select("attempt_no")
      .eq("user_id", userId)
      .eq("shadowing_item_id", recording.shadowing_item_id)
      .is("deleted_at", null)
      .order("attempt_no", { ascending: false })
      .limit(1);
    if (retryReadError) throw retryReadError;
    row.attempt_no = Number(retryAttempts?.[0]?.attempt_no || 0) + 1;
    ({ data, error } = await supabase
      .from(TABLES.shadowingRecordings)
      .upsert(row, { onConflict: "id" })
      .select()
      .single());
  }
  if (error) throw error;
  return { enabled: true, recording: fromShadowingRecordingRow(data) };
}

export async function upsertShadowingRecording(recording = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !recording.shadowing_item_id) return { enabled: false };
  return runQueuedMutation("shadowing_recording", { recording }, {
    userId: user.id,
    handler: ({ recording: queuedRecording }) => writeShadowingRecording(user.id, queuedRecording),
  });
}

async function writeShadowingRecordingWithAudio(userId, payload = {}) {
  const upload = await uploadShadowingAudio({
    bucket: payload.bucket,
    path: payload.path,
    file: payload.file,
    contentType: payload.contentType,
    upsert: true,
  });
  return writeShadowingRecording(userId, {
    ...(payload.recording || {}),
    audio_bucket: upload.bucket,
    audio_path: upload.path,
  });
}

export async function saveShadowingRecordingWithAudio(payload = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !payload.file || !payload.recording?.shadowing_item_id) return { enabled: false };
  return runQueuedMutation("shadowing_recording_audio", payload, {
    userId: user.id,
    handler: (queuedPayload) => writeShadowingRecordingWithAudio(user.id, queuedPayload),
  });
}

export async function deleteShadowingRecording(recordingId) {
  const user = await readCurrentUser();
  const id = clean(recordingId);
  if (!user?.id || !id) return { enabled: false };
  const { error } = await supabase
    .from(TABLES.shadowingRecordings)
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
  return { enabled: true };
}

function fromStudyHistoryRow(row) {
  const snapshot = row?.snapshot || {};
  return {
    id: row.id,
    action: row.action,
    word_id: row.word_id,
    swedish: snapshot.swedish || "",
    chinese: snapshot.chinese || "",
    pos: snapshot.pos || "other",
    pos_detail: snapshot.pos_detail || "",
    notebook: snapshot.notebook || "",
    created_at: dateToMillis(row.created_at),
  };
}

function fromUserPreferencesRow(row) {
  return {
    studyScope: clean(row.study_scope) || "all",
    selectedNotebookName: clean(row.selected_notebook_name),
    shadowingShowSubtitles: row.shadowing_show_subtitles !== false,
    shadowingContinuous: Boolean(row.shadowing_continuous),
    shadowingAutoPause: Boolean(row.shadowing_auto_pause),
    shadowingLevel: clean(row.shadowing_level) || "1",
    preferences: row.preferences || {},
  };
}

function toShadowingItemRow(userId, item = {}) {
  const audio = clean(item.audio || item.audio_source || item.standard_audio_path);
  return {
    id: item.id || undefined,
    user_id: userId,
    title: clean(item.title) || clean(item.swedish) || "Shadowing",
    swedish: clean(item.swedish),
    chinese: clean(item.chinese),
    text_resource_id: item.text_resource_id || null,
    category: clean(item.category) || "Ungrouped",
    level: Number(item.level || 1) || 1,
    standard_audio_bucket: clean(item.standard_audio_bucket) || "shadowing-standard-audio",
    standard_audio_path: audio,
    standard_audio_mime_type: clean(item.standard_audio_mime_type || item.audio_mime_type),
    standard_audio_size_bytes: Number(item.standard_audio_size_bytes || 0) || null,
    standard_audio_duration_ms: Number(item.standard_audio_duration_ms || 0) || null,
    tts_provider: clean(item.tts_provider) || "elevenlabs",
    tts_voice_id: clean(item.tts_voice_id || item.voice_id || item.voiceId),
    tts_voice_name: clean(item.tts_voice_name),
    tts_model_id: clean(item.tts_model_id),
    tts_settings: item.tts_settings || {},
    tts_status: clean(item.tts_status) || "pending",
    tts_error: clean(item.tts_error),
    created_at: millisToIso(item.createdAt || item.created_at) || undefined,
    updated_at: new Date().toISOString(),
    deleted_at: item.deleted_at ? millisToIso(item.deleted_at) : null,
  };
}

function fromShadowingItemRow(row) {
  const createdAt = dateToMillis(row.created_at);
  const updatedAt = dateToMillis(row.updated_at);
  const audio = clean(row.standard_audio_path);
  return {
    id: row.id,
    title: row.title,
    swedish: row.swedish,
    chinese: row.chinese,
    audio,
    audio_source: audio,
    audio_file_name: audio && audio.startsWith("data:") ? "Databasljud" : audio,
    standard_audio_bucket: row.standard_audio_bucket,
    standard_audio_path: row.standard_audio_path,
    standard_audio_mime_type: row.standard_audio_mime_type,
    standard_audio_size_bytes: row.standard_audio_size_bytes,
    standard_audio_duration_ms: row.standard_audio_duration_ms,
    tts_provider: row.tts_provider,
    tts_voice_id: row.tts_voice_id,
    tts_voice_name: row.tts_voice_name,
    tts_model_id: row.tts_model_id,
    tts_settings: row.tts_settings || {},
    tts_status: row.tts_status,
    tts_error: row.tts_error,
    category: row.category,
    level: row.level,
    text_resource_id: row.text_resource_id,
    createdAt,
    updatedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

// Läsning — see supabase/migrations/20260727010000_text_resources_v1.sql.
// Same authenticated-only, user-owned pattern as shadowing_items (personal
// content, not the shared learning_objects catalog). reading_items is now a
// thin per-user wrapper; the text itself and its analysis (key vocabulary/
// expressions/summary) live in the shared text_resources/text_analysis
// tables so Läsning and Shadowing never re-analyze the same text — see
// Reviews/AI成本控制与阅读模块-实施计划-2026-07-26.md.
function toReadingItemRow(userId, item = {}) {
  return {
    id: item.id || undefined,
    user_id: userId,
    title: clean(item.title),
    source_text: clean(item.source_text || item.sourceText),
    text_resource_id: item.text_resource_id || null,
    shadowing_item_id: item.shadowing_item_id || null,
    // Sentence highlights/notes (2026-07-30) — [{sentenceIndex, text, note}],
    // same "small JSON blob on the owning row" pattern as user_words'
    // personal_note rather than a whole new table, since this is purely
    // the user's own private annotation of their own saved text.
    notes: Array.isArray(item.notes) ? item.notes : [],
    created_at: millisToIso(item.createdAt || item.created_at) || undefined,
    updated_at: new Date().toISOString(),
    deleted_at: item.deleted_at ? millisToIso(item.deleted_at) : null,
  };
}

function fromReadingItemRow(row) {
  return {
    id: row.id,
    title: row.title,
    source_text: row.source_text,
    text_resource_id: row.text_resource_id,
    shadowing_item_id: row.shadowing_item_id,
    notes: Array.isArray(row.notes) ? row.notes : [],
    createdAt: dateToMillis(row.created_at),
    updatedAt: dateToMillis(row.updated_at),
  };
}

export async function loadReadingItems() {
  const user = await readCurrentUser();
  if (!user?.id) return [];
  const rows = await fetchAll(TABLES.readingItems, (query) =>
    query.eq("user_id", user.id).is("deleted_at", null).order("updated_at", { ascending: false }),
  );
  return rows.map(fromReadingItemRow);
}

async function writeReadingItem(userId, item = {}) {
  const row = toReadingItemRow(userId, item);
  const { data, error } = await supabase.from(TABLES.readingItems).upsert(row, { onConflict: "id" }).select().single();
  if (error) throw error;
  return { enabled: true, item: fromReadingItemRow(data) };
}

export async function upsertReadingItem(item = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  return runQueuedMutation("reading_item", { item }, {
    userId: user.id,
    handler: ({ item: queuedItem }) => writeReadingItem(user.id, queuedItem),
  });
}

export async function deleteReadingItem(itemId) {
  const user = await readCurrentUser();
  const id = clean(itemId);
  if (!user?.id || !id) return { enabled: false };
  const { error } = await supabase
    .from(TABLES.readingItems)
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw error;
  return { enabled: true };
}

// Per-item discovery-state tracking (2026-07-30, Reviews/阅读模块理念升级与
// ChatGPT实验-综合review与执行计划-2026-07-30.md 决策3) — row creation itself
// is service-role only (materialized server-side by analyzeReadingResource
// the first time this user's reading resolves to a given text_analysis),
// but the status column is user-owned (RLS: auth.uid() = user_id), so
// reading it and updating it can go straight through Supabase like any
// other personal data — no backend detour needed for that part.
function fromReadingAnalysisItemRow(row) {
  return {
    id: row.id,
    textAnalysisId: row.text_analysis_id,
    itemType: row.item_type,
    refId: row.ref_id,
    itemData: row.item_data || {},
    sortOrder: row.sort_order,
    status: row.status,
  };
}

export async function loadReadingAnalysisItems(textAnalysisId) {
  const id = clean(textAnalysisId);
  if (!id) return [];
  const { data, error } = await supabase
    .from(TABLES.readingAnalysisItems)
    .select("*")
    .eq("text_analysis_id", id)
    .order("item_type", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []).map(fromReadingAnalysisItemRow);
}

export async function setReadingAnalysisItemStatus(itemId, status) {
  const id = clean(itemId);
  if (!id) return null;
  const { data, error } = await supabase
    .from(TABLES.readingAnalysisItems)
    .update({ status })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? fromReadingAnalysisItemRow(data) : null;
}

function fromTextAnalysisRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    textResourceId: row.text_resource_id,
    selectedVocabulary: row.selected_vocabulary || [],
    selectedExpressions: row.selected_expressions || [],
    keySentences: row.key_sentences || [],
    languagePatterns: row.language_patterns || [],
    summarySv: row.summary_sv || "",
    summaryZh: row.summary_zh || "",
    summaryGeneratedAt: dateToMillis(row.summary_generated_at),
    headlineZh: row.headline_zh || "",
    keyPoints: row.key_points || [],
  };
}

// The only steps that go through the server: OpenAI must never be called
// with a key exposed to the browser, and writing new learning_objects rows
// needs the service-role key the browser doesn't have. Everything else
// (create/read/update/delete of the reading_items row itself) goes straight
// through Supabase like the functions above, gated by RLS. See
// Reviews/AI成本控制与阅读模块-实施计划-2026-07-26.md — the server checks its
// own text_hash cache first, so re-analyzing the same text (or switching
// between Läsning/Shadowing) never re-calls the AI.
export async function analyzeReadingText(text, sourceType = "paste", glossary = []) {
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/reading/analyze", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ text, sourceType, glossary }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Kunde inte analysera texten.");
  return {
    textResource: payload.textResource,
    analysis: fromTextAnalysisRow(payload.analysis),
    tier: payload.tier,
    cached: Boolean(payload.cached),
    deepReady: Boolean(payload.deepReady),
  };
}

// Two-layer generation, deep half (2026-08-02) — called right after
// analyzeReadingText above when its deepReady comes back false. Fills in
// vocabulary/expressions/sentences/patterns on the same text_analysis row.
export async function analyzeReadingTextDeep(textResourceId) {
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/reading/analyze-deep", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ textResourceId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Kunde inte slutföra analysen.");
  return { analysis: fromTextAnalysisRow(payload.analysis), tier: payload.tier };
}

// 2026-08-03: lets the user file a reading-analysis phrase/expression into
// Fraser or Uttryck themselves, overriding whatever the AI auto-classified
// it as at analysis time.
export async function classifyReadingExpression(expressionId, classification) {
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/reading/classify-expression", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ expressionId, classification }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Kunde inte spara frasen.");
  return payload.entry;
}

// 规范§9.3/§10 — summary is a separate, user-initiated call, never bundled
// into analyzeReadingText above.
export async function generateReadingSummary(textResourceId) {
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/reading/summary", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ textResourceId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Kunde inte generera sammanfattning.");
  return payload.summary;
}

// 规范§12 — photo/camera import. Extraction only, no analysis: the result
// lands in the reading editor's textarea for the user to review/edit
// before saving, exactly like pasted text.
export async function extractTextFromImage(imageDataUrl) {
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/reading/ocr", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ imageDataUrl }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Kunde inte läsa texten från bilden.");
  return { text: payload.text || "", glossary: Array.isArray(payload.glossary) ? payload.glossary : [], warning: payload.warning || "" };
}

// 规范§21 — cost/usage transparency. Reads the user's own ai_usage_logs
// rows directly (RLS: auth.uid() = user_id, granted at the same migration
// that created the table) — no server endpoint needed for a read-only
// aggregate the user's already allowed to see.
export async function loadAiUsageSummary() {
  const user = await readCurrentUser();
  if (!user?.id) return null;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("feature, credits_used, actual_cost, cache_hit, created_at")
    .eq("user_id", user.id)
    .gte("created_at", monthStart.toISOString());
  if (error) throw error;

  const rows = data || [];
  const todayRows = rows.filter((row) => new Date(row.created_at) >= dayStart);
  const byFeature = {};
  rows.forEach((row) => {
    const key = row.feature;
    if (!byFeature[key]) byFeature[key] = { credits: 0, cost: 0, count: 0 };
    byFeature[key].credits += row.credits_used || 0;
    byFeature[key].cost += row.actual_cost || 0;
    byFeature[key].count += 1;
  });
  const cacheHits = rows.filter((row) => row.cache_hit).length;

  return {
    creditsToday: todayRows.reduce((sum, row) => sum + (row.credits_used || 0), 0),
    creditsMonth: rows.reduce((sum, row) => sum + (row.credits_used || 0), 0),
    costMonth: rows.reduce((sum, row) => sum + (row.actual_cost || 0), 0),
    cacheHitRate: rows.length ? Math.round((cacheHits / rows.length) * 100) : 0,
    byFeature,
  };
}

// Mina studier "Uthållighet"/"Studiepass" cards (2026-08-09) — reuses the
// existing effective_study_time table (already populated per calendar day
// per device by tickEffectiveStudyTime, previously only ever read for
// "today") to derive cumulative days learned / longest streak / this
// week's active days without any new schema. Rows are summed by date
// client-side since Supabase JS has no GROUP BY; a single user's history
// (days x devices) is small enough that this is not an N+1/pagination risk.
export async function loadEffectiveStudyTimeHistory() {
  const user = await readCurrentUser();
  if (!user?.id) return { totalDays: 0, longestStreak: 0, activeDaysThisWeek: 0 };
  const { data, error } = await supabase
    .from(TABLES.effectiveStudyTime)
    .select("study_date, active_ms")
    .eq("user_id", user.id)
    .order("study_date", { ascending: true })
    .limit(3660);
  if (error) throw error;

  const msByDate = new Map();
  (data || []).forEach((row) => {
    const date = clean(row.study_date);
    if (!date) return;
    msByDate.set(date, (msByDate.get(date) || 0) + Math.max(0, Number(row.active_ms || 0) || 0));
  });
  const activeDates = [...msByDate.entries()].filter(([, ms]) => ms > 0).map(([date]) => date).sort();

  let longestStreak = 0;
  let currentRun = 0;
  let previousDate = null;
  activeDates.forEach((date) => {
    const dayMs = 24 * 60 * 60 * 1000;
    const isConsecutive = previousDate && new Date(date) - new Date(previousDate) === dayMs;
    currentRun = isConsecutive ? currentRun + 1 : 1;
    longestStreak = Math.max(longestStreak, currentRun);
    previousDate = date;
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoKey = weekAgo.toISOString().slice(0, 10);
  const activeDaysThisWeek = activeDates.filter((date) => date >= weekAgoKey).length;

  return {
    totalDays: activeDates.length,
    longestStreak,
    activeDaysThisWeek,
  };
}

// Mina studier "Studiepass" card — study_sessions/study_session_items were
// already collecting real started_at/completed_at timestamps for every
// "Repetera"/"Lär dig nya ord" session (see saveStudySessionItem/
// completeStudySession) but nothing ever aggregated them for display.
export async function loadStudySessionsSummary() {
  const user = await readCurrentUser();
  if (!user?.id) return { completedCount: 0, totalMs: 0 };
  const { data, error } = await supabase
    .from(TABLES.studySessions)
    .select("started_at, completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .limit(5000);
  if (error) throw error;
  const rows = data || [];
  const totalMs = rows.reduce((sum, row) => {
    const started = dateToMillis(row.started_at);
    const completed = dateToMillis(row.completed_at);
    if (!started || !completed || completed <= started) return sum;
    return sum + (completed - started);
  }, 0);
  return { completedCount: rows.length, totalMs };
}

// SPK-DIC-001 §11 review gate, flag-only (2026-07-30 decision) — reads
// straight from Supabase like any other word list (anon key can already
// read all of learning_objects), only the actual status write needs the
// backend (see markWordsReviewed below).
const REVIEW_QUEUE_PAGE_SIZE = 50;

export async function loadReviewQueuePage(offset = 0, limit = REVIEW_QUEUE_PAGE_SIZE) {
  const { data, error, count } = await supabase
    .from(TABLES.words)
    .select("id, swedish, chinese, part_of_speech, object_type", { count: "exact" })
    .eq("status", "ai_generated")
    .order("swedish", { ascending: true })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return {
    items: (data || []).map((row) => ({ id: row.id, swedish: row.swedish, chinese: row.chinese, pos: row.part_of_speech, object_type: row.object_type })),
    total: count || 0,
  };
}

export async function markWordsReviewed(ids) {
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/review/mark-reviewed", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Kunde inte markera som granskat.");
  return { updated: payload.updated || 0 };
}

// 缺口2 (2026-07-30) — reopening a previously-analyzed reading item needs
// its textbook_glossary back too (analyzeReadingText's own response only
// covers the moment of first analysis); a plain RLS-gated read, same as
// loadTextAnalysis below.
// "Mina läsningar" richer list (2026-07-30) — one batched pair of queries
// for ALL reading items' stats at once (not one query per item — same
// anti-N+1 discipline as fetchAll/db.js elsewhere), so the list can show
// word count / vocabulary / phrase / sentence counts without opening each
// item individually.
export async function loadReadingListStats(textResourceIds) {
  const ids = [...new Set((textResourceIds || []).filter(Boolean))];
  if (!ids.length) return {};
  const [{ data: resources, error: resourceError }, { data: analyses, error: analysisError }] = await Promise.all([
    supabase.from("text_resources").select("id, word_count").in("id", ids),
    supabase.from("text_analysis").select("text_resource_id, selected_vocabulary, selected_expressions, key_sentences, language_patterns").in("text_resource_id", ids),
  ]);
  if (resourceError) throw resourceError;
  if (analysisError) throw analysisError;

  const byResource = {};
  (resources || []).forEach((row) => {
    byResource[row.id] = { wordCount: row.word_count || 0, vocabCount: 0, exprCount: 0, sentenceCount: 0, patternCount: 0, vocabulary: [] };
  });
  (analyses || []).forEach((row) => {
    const entry = byResource[row.text_resource_id] || (byResource[row.text_resource_id] = { wordCount: 0, vocabCount: 0, exprCount: 0, sentenceCount: 0, patternCount: 0, vocabulary: [] });
    entry.vocabCount = (row.selected_vocabulary || []).length;
    entry.exprCount = (row.selected_expressions || []).length;
    entry.sentenceCount = (row.key_sentences || []).length;
    entry.patternCount = (row.language_patterns || []).length;
    entry.vocabulary = row.selected_vocabulary || [];
  });
  return byResource;
}

export async function loadTextResource(textResourceId) {
  const id = clean(textResourceId);
  if (!id) return null;
  const { data, error } = await supabase.from("text_resources").select("id, word_count, textbook_glossary, analysis_status").eq("id", id).maybeSingle();
  if (error) throw error;
  return data
    ? { id: data.id, wordCount: data.word_count || 0, textbookGlossary: data.textbook_glossary || [], deepReady: data.analysis_status === "ready" }
    : null;
}

export async function loadTextAnalysis(textResourceId) {
  const id = clean(textResourceId);
  if (!id) return null;
  const { data, error } = await supabase
    .from("text_analysis")
    .select("*")
    .eq("text_resource_id", id)
    .order("analysis_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return fromTextAnalysisRow(data);
}

function fromShadowingRecordingRow(row) {
  return {
    id: row.id,
    shadowing_item_id: row.shadowing_item_id,
    audio_bucket: row.audio_bucket,
    audio: row.audio_path,
    audio_path: row.audio_path,
    audio_mime_type: row.audio_mime_type,
    audio_size_bytes: row.audio_size_bytes,
    audio_duration_ms: row.audio_duration_ms,
    attempt_no: row.attempt_no,
    level: row.level,
    notes: row.notes,
    comparison_status: row.comparison_status,
    comparison_result: row.comparison_result || {},
    recorded_at: dateToMillis(row.recorded_at),
    created_at: dateToMillis(row.created_at),
    updated_at: dateToMillis(row.updated_at),
  };
}
