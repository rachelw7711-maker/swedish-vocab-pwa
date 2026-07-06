import { getAccessToken, getCurrentUser as getSharedAuthUser, supabase, supabaseAnonKey, supabaseUrl } from "./supabase.js";

const TABLES = {
  words: "words",
  userWords: "user_words",
  profiles: "profiles",
  notebooks: "notebooks",
  studyPlans: "study_plans",
  studySessions: "study_sessions",
  studySessionItems: "study_session_items",
  studyHistory: "study_history",
  shadowingItems: "shadowing_items",
  shadowingRecordings: "shadowing_recordings",
  userPreferences: "user_preferences",
};

const PAGE_SIZE = 1000;
const DEFAULT_PROFILE_ID = "default";

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

function userWordId(userId, wordId) {
  return `${clean(userId) || DEFAULT_PROFILE_ID}:${clean(wordId)}`;
}

function normalizeWord(row, userRow = null) {
  const wordId = clean(row.id || row.word_id);
  const bookNames = normalizeBookNames(firstDefined(userRow?.book_names, userRow?.bookNames));
  const note = row.note || "";
  return {
    ...row,
    id: wordId,
    swedish: clean(row.swedish),
    pos: clean(firstDefined(row.pos, row.part_of_speech)) || "other",
    pos_detail: clean(firstDefined(row.pos_detail, row.posDetail)),
    chinese: clean(row.chinese),
    english: clean(firstDefined(row.english, readNoteSection(note, "Swedish explanation"))),
    forms: clean(firstDefined(row.forms, readNoteSection(note, "Forms"))),
    example: clean(firstDefined(row.example, row.example_sv)),
    collocations: clean(firstDefined(row.collocations, readNoteSection(note, "Collocations"))),
    related_words: clean(firstDefined(row.related_words, row.relatedWords, readNoteSection(note, "Related words"))),
    tags: Array.isArray(row.tags) ? row.tags : clean(firstDefined(row.tags, readNoteSection(note, "Tags"), row.level)).split(",").map(clean).filter(Boolean),
    notebook: clean(userRow?.notebook),
    book_names: bookNames,
    favorite: Boolean(userRow?.favorite ?? row.favorite),
    learned: Boolean(userRow?.learned ?? row.learned),
    review_count: Number(userRow?.review_count ?? row.review_count ?? 0) || 0,
    wrong_count: Number(userRow?.wrong_count ?? row.wrong_count ?? 0) || 0,
    spelling_correct_count: Number(userRow?.spelling_correct_count ?? row.spelling_correct_count ?? 0) || 0,
    first_studied_at: userRow?.first_studied_at ?? row.first_studied_at ?? null,
    last_studied_at: userRow?.last_studied_at ?? row.last_studied_at ?? null,
    last_reviewed: userRow?.last_reviewed ?? row.last_reviewed ?? null,
    last_study_date: clean(userRow?.last_study_date ?? row.last_study_date),
    last_review_date: clean(userRow?.last_review_date ?? row.last_review_date),
    mastered_at: userRow?.mastered_at ?? row.mastered_at ?? null,
    next_review_at: Number(userRow?.next_review_at ?? row.next_review_at ?? 0) || 0,
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
    return await getSharedAuthUser();
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

export async function getCurrentAccessToken() {
  return getAccessToken();
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
    const query = buildQuery(supabase.from(table).select("*").range(from, to));
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
    wordRows = await fetchAll(TABLES.words, (query) => query.order("swedish", { ascending: true }));
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
  const sourceBookNames = sourceBookNamesForRows(wordRows);
  const sanitizedUserWordRows = sanitizeUserWordRows(userWordRows, sourceBookNames);

  if (user?.id && sourceBookNames.size > 0) {
    await cleanupSourceDerivedUserBooks(user.id, userWordRows, sanitizedUserWordRows).catch((error) => {
      console.warn("[Min Ordbok] Failed to clean source-derived books. Continuing with sanitized UI state.", error);
    });
  }

  const userRowsByWordId = new Map(sanitizedUserWordRows.map((row) => [clean(row.word_id), row]));
  const words = wordRows.map((word) => normalizeWord(word, userRowsByWordId.get(clean(word.id))));
  const books = unique(sanitizedUserWordRows.flatMap((row) => [row.notebook, ...normalizeBookNames(row.book_names)]));

  if (user?.id && wordRows.length > 0 && userWordRows.length === 0) {
    void initializeUserWords(user.id, wordRows).catch((error) => {
      console.warn("[Min Ordbok] Failed to initialize user words.", error);
    });
  }

  return {
    words,
    books,
    accountId: user?.id || DEFAULT_PROFILE_ID,
    remoteWordCount: words.length,
    remoteBookCount: books.length,
    userWordCount: userWordRows.length,
  };
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

async function initializeUserWords(userId, wordRows = []) {
  const rows = wordRows.map((word) => ({
    id: userWordId(userId, word.id),
    user_id: userId,
    word_id: word.id,
    status: "new",
  }));
  await upsertRows(TABLES.userWords, rows);
}

function toUserWordRow(userId, word) {
  if (!userId || !word?.id) return null;
  return {
    id: userWordId(userId, word.id),
    user_id: userId,
    word_id: word.id,
    favorite: Boolean(word.favorite),
    learned: Boolean(word.learned),
    notebook: clean(word.notebook),
    book_names: normalizeBookNames(firstDefined(word.book_names, word.bookNames, word.books)),
    review_count: Number(word.review_count || 0) || 0,
    wrong_count: Number(word.wrong_count || 0) || 0,
    spelling_correct_count: Number(word.spelling_correct_count || 0) || 0,
    first_studied_at: word.first_studied_at || null,
    last_studied_at: word.last_studied_at || null,
    last_reviewed: word.last_reviewed || null,
    last_study_date: clean(word.last_study_date),
    last_review_date: clean(word.last_review_date),
    mastered_at: word.mastered_at || null,
    next_review_at: word.next_review_at ?? null,
    updated_at: new Date().toISOString(),
  };
}

function toWordRow(word) {
  if (!word?.id) return null;
  return {
    id: word.id,
    swedish: clean(word.swedish),
    pos: clean(word.pos) || "other",
    pos_detail: clean(word.pos_detail),
    chinese: clean(word.chinese),
    english: clean(word.english),
    forms: clean(word.forms),
    example: clean(word.example),
    collocations: clean(word.collocations),
    related_words: clean(word.related_words),
    tags: Array.isArray(word.tags) ? word.tags : [],
    notebook: clean(word.notebook),
    updated_at: new Date().toISOString(),
  };
}

async function upsertRows(table, rows) {
  const cleanRows = rows.filter(Boolean);
  for (let index = 0; index < cleanRows.length; index += PAGE_SIZE) {
    const batch = cleanRows.slice(index, index + PAGE_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: "id" });
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
  await upsertRows(TABLES.words, contentChangedWords.map(toWordRow));
  if (user?.id) {
    await upsertRows(TABLES.userWords, changedWords.map((word) => toUserWordRow(user.id, word)));
  }
  return {
    enabled: true,
    words: contentChangedWords.length,
    userWords: user?.id ? changedWords.length : 0,
  };
}

export async function syncRemoteNotebookNames() {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  const names = unique([...arguments].flat().flatMap((value) => Array.isArray(value) ? value : [value]));
  const { data: existing, error: readError } = await supabase
    .from(TABLES.notebooks)
    .select("id,name,deleted_at")
    .eq("user_id", user.id);
  if (readError) throw readError;

  const existingByName = new Map((existing || []).map((row) => [clean(row.name).toLocaleLowerCase("sv-SE"), row]));
  const rows = names.map((name, index) => {
    const key = clean(name).toLocaleLowerCase("sv-SE");
    const existingRow = existingByName.get(key);
    return {
      id: existingRow?.id,
      user_id: user.id,
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
    ? await fetchAll(TABLES.studySessions, (query) => query.eq("user_id", user.id).eq("study_plan_id", studyPlan.id).order("started_at", { ascending: true }))
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

export async function upsertUserPreferences(preferences = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  const row = {
    user_id: user.id,
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

export async function upsertStudyPlan(plan = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false, plan: null };
  const row = {
    id: plan.id || undefined,
    user_id: user.id,
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
    if (error) throw error;
    session = data;
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
      .upsert(rows, { onConflict: "study_session_id,word_id" });
    if (error) throw error;
  }
  const items = await fetchAll(TABLES.studySessionItems, (query) => query.eq("user_id", user.id).eq("study_session_id", session.id).order("position", { ascending: true }));
  return { enabled: true, plan: remotePlan, session, items };
}

export async function saveStudySessionItem({ sessionId, wordId, status = "completed", spellingPassed = false, isCorrect = null, answer = "", collocationAnswer = "" } = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !sessionId || !wordId) return { enabled: false };
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
    .eq("user_id", user.id)
    .eq("study_session_id", sessionId)
    .eq("word_id", wordId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return { enabled: true, item: data };
}

export async function completeStudySession(sessionId, status = "completed") {
  const user = await readCurrentUser();
  if (!user?.id || !sessionId) return { enabled: false };
  const { error } = await supabase
    .from(TABLES.studySessions)
    .update({
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("id", sessionId);
  if (error) throw error;
  return { enabled: true };
}

export async function appendStudyHistory(action, word, context = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !word?.id) return { enabled: false };
  const entry = {
    id: context.id || undefined,
    user_id: user.id,
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
  const { data, error } = await supabase
    .from(TABLES.studyHistory)
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return { enabled: true, history: fromStudyHistoryRow(data) };
}

export async function upsertShadowingItem(item = {}) {
  const user = await readCurrentUser();
  if (!user?.id) return { enabled: false };
  const row = toShadowingItemRow(user.id, item);
  const { data, error } = await supabase
    .from(TABLES.shadowingItems)
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return { enabled: true, item: fromShadowingItemRow(data) };
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

export async function upsertShadowingRecording(recording = {}) {
  const user = await readCurrentUser();
  if (!user?.id || !recording.shadowing_item_id) return { enabled: false };
  const row = {
    id: recording.id || undefined,
    user_id: user.id,
    shadowing_item_id: recording.shadowing_item_id,
    audio_bucket: clean(recording.audio_bucket) || "shadowing-recordings",
    audio_path: clean(recording.audio_path || recording.audio || recording.dataUrl),
    audio_mime_type: clean(recording.audio_mime_type || recording.mimeType),
    audio_size_bytes: Number(recording.audio_size_bytes || recording.size || 0) || null,
    audio_duration_ms: Number(recording.audio_duration_ms || recording.durationMs || 0) || null,
    attempt_no: Number(recording.attempt_no || recording.attemptNo || 1) || 1,
    level: recording.level == null ? null : Number(recording.level),
    notes: clean(recording.notes),
    comparison_status: clean(recording.comparison_status) || "none",
    comparison_result: recording.comparison_result || {},
    recorded_at: millisToIso(recording.recorded_at) || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from(TABLES.shadowingRecordings)
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return { enabled: true, recording: fromShadowingRecordingRow(data) };
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
    createdAt,
    updatedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
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
