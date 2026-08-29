import * as remoteDb from "./src/lib/db.js?v=139";
import * as shadowingStore from "./src/lib/shadowing-store.js";
import { getAccessToken, getCurrentUser, supabase, syncAuthState } from "./src/lib/supabase.js";
import { educationWordPacks } from "./vocab-data.js";
import { documentWordPacks } from "./document-vocab-data.js";

const DB_NAME = "swedish-vocab-pwa";
const DEFAULT_NOTEBOOK = "Mina böcker";
const LEARNED_NOTEBOOK = "Lärt mig";
const FIXED_NOTEBOOKS = ["Nyttiga fraser", "Kraftverb", "Skatt-substantiv", "Superord"];
const DEFAULT_BOOKSHELF_CATEGORIES = [LEARNED_NOTEBOOK, ...FIXED_NOTEBOOKS];
const LOCAL_USER_BOOKS_KEY = "swedish-vocab-pwa.userBooks";
const LEGACY_NOTEBOOKS_KEY = "swedish-vocab-pwa.notebooks";
const LEGACY_PLAIN_USER_BOOKS_KEY = "userBooks";
const LEGACY_PLAIN_NOTEBOOKS_KEY = "notebooks";
const LEGACY_PLAIN_DAILY_STUDY_KEY = "dailyStudy";
const LOCAL_WORDS_KEY = "swedish-vocab-pwa.words";
const LOCAL_HISTORY_KEY = "swedish-vocab-pwa.history";
const LOCAL_FAVORITES_KEY = "swedish-vocab-pwa.favorites";
const LOCAL_NOTEBOOKS_KEY = LOCAL_USER_BOOKS_KEY;
const LOCAL_LEARNED_WORDS_KEY = "swedish-vocab-pwa.learnedWords";
const LOCAL_CUSTOM_WORDS_KEY = "swedish-vocab-pwa.customWords";
const LOCAL_DAILY_STUDY_KEY = "swedish-vocab-pwa.dailyStudy";
const LOCAL_DAILY_STUDY_SESSION_KEY = "swedish-vocab-pwa.dailyStudySession";
const LOCAL_DAILY_REVIEW_SESSION_KEY = "swedish-vocab-pwa.dailyReviewSession";
const LOCAL_LEARN_DAILY_SESSION_KEY = "swedish-vocab-pwa.learnDailySession";
const LOCAL_DAILY_STUDY_STATE_KEY = "swedish-vocab-pwa.dailyStudyState";
const LOCAL_WORD_PROGRESS_KEY = "swedish-vocab-pwa.wordProgress";
const LOCAL_STUDY_STATS_KEY = "swedish-vocab-pwa.studyStats";
const LOCAL_EFFECTIVE_STUDY_TIME_KEY = "swedish-vocab-pwa.effectiveStudyTime";
const LOCAL_EFFECTIVE_STUDY_DEVICE_KEY = "swedish-vocab-pwa.effectiveStudyDeviceId";
const LOCAL_STORAGE_SCHEMA_KEY = "swedish-vocab-pwa.storageSchemaVersion";
const LOCAL_BACKUPS_KEY = "swedish-vocab-pwa.backups";
const STORAGE_SCHEMA_VERSION = 1;
const DEFAULT_FAVORITE_CATEGORY = DEFAULT_NOTEBOOK;
const STUDY_SCOPE_ALL = "all";
const STUDY_SCOPE_FAVORITES = "favorites";
const STUDY_SCOPE_LEARNED = "learned";
const DAILY_NEW_WORD_LIMIT = 10;
const MAX_SPELLING_ATTEMPTS = 3;
const PROFILE_XP_PER_LEVEL = 1000;
const PROFILE_DAILY_GOAL_MINUTES = 30;
const EFFECTIVE_STUDY_TICK_MS = 15000;
const EFFECTIVE_STUDY_IDLE_LIMIT_MS = 60000;
const EFFECTIVE_STUDY_MAX_TICK_MS = 30000;
const EFFECTIVE_STUDY_SYNC_INTERVAL_MS = 60000;
const STARTUP_LOADING_TIMEOUT_MS = 30000;
const DEFAULT_STUDY_CATEGORIES = ["Ord om samhället", "viktiga verb"];
const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1"]);
const APP_BOOT_VERSION = "stable-start-20260711-01";
const SHADOWING_STANDARD_AUDIO_BUCKET = "shadowing-standard-audio";
const SHADOWING_RECORDINGS_BUCKET = "shadowing-recordings";
const DEFAULT_ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const AUTH_REDIRECT_URL = "https://swedish-vocab-pwa.vercel.app/";
const LEGACY_VIEW_STATE_KEYS = [
  "currentPage",
  "activeView",
  "activeTab",
  "studyMode",
  "currentStudyWord",
  "currentReviewWord",
  "studySession",
  "reviewSession",
  "modal",
  "openModal",
  "activeModal",
  "dialog",
  "wordDialog",
  "addWord",
  "add-word",
  "addWordOpen",
  "route",
  "lastRoute",
  "lastPage",
];

function closeRestoredDialogsImmediately() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    try {
      dialog.close();
    } catch {
      dialog.removeAttribute("open");
    }
  });
  document.body.dataset.activeView = "homeView";
  delete document.body.dataset.wordDialogOpen;
}

closeRestoredDialogsImmediately();

function removeStoredViewState() {
  LEGACY_VIEW_STATE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(`swedish-vocab-pwa.${key}`);
    } catch {
      // Ignore storage failures.
    }
    try {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem(`swedish-vocab-pwa.${key}`);
    } catch {
      // Ignore storage failures.
    }
  });
}

const posLabels = {
  verb: "Verb",
  noun: "Substantiv",
  adjective: "Adjektiv",
  adverb: "Adverb",
  pronoun: "Pronomen",
  preposition: "Preposition",
  conjunction: "Konjunktion",
  presens_particip: "Presens particip",
  perfekt_particip: "Perfekt particip",
  phrase: "Fras",
  abbreviation: "Förkortning",
  other: "Övrigt",
};

// Which structured word_forms fields apply to each part of speech, and what
// group of inputs (data-pos-group in index.html's #wordFormsFields) should
// be shown for it. Parts of speech not listed here fall back to the free
// text "forms" textarea (data-pos-group="freetext") — see
// Reviews/Ordbok-词条字段规范（按词性）.md for the field-by-field rationale.
const WORD_FORM_GROUPS_BY_POS = {
  noun: "noun",
  verb: "verb",
  adjective: "adjective",
  adverb: "adverb",
  pronoun: "pronoun",
  presens_particip: "presens_particip",
  perfekt_particip: "perfekt_particip",
};

// Display labels for structured word_forms rows, reused from the edit
// dialog's field labels in index.html (#wordFormsFields) so the read-only
// Grammatik section and the edit form always say the same thing.
const WORD_FORM_LABELS = {
  declension_group: "Böjningsklass",
  singular_indefinite: "Obestämd singular",
  singular_definite: "Bestämd singular",
  plural_indefinite: "Obestämd plural",
  plural_definite: "Bestämd plural",
  infinitive: "Infinitiv",
  present: "Presens",
  preteritum: "Preteritum",
  supinum: "Supinum",
  imperative: "Imperativ",
  verb_group: "Verbgrupp",
  base_form: "Grundform",
  neuter_form: "Neutrum (ett-ord)",
  plural_form: "Plural",
  definite_form: "Bestämd form",
  comparative: "Komparativ",
  superlative_indefinite: "Superlativ (obestämd)",
  superlative_definite: "Superlativ (bestämd)",
  superlative: "Superlativ",
  subject_form: "Subjektsform",
  object_form: "Objektsform",
  possessive_en: "Possessiv (en-ord)",
  possessive_ett: "Possessiv (ett-ord)",
  possessive_plural: "Possessiv (plural)",
  base_verb: "Grundverb",
  participle_form: "Partikelform",
  en_form: "En-form",
  ett_form: "Ett-form",
};

// Line order per pos group for the read-only Grammatik display. `genus` is
// deliberately left out of the noun list — it's applied to the word title
// instead (see applyGenusToTitle) per Reviews/SPK-DIC-001_SprakLab_Word_Card
// _Content_Standard_v1.0 §3: "Genus 必须与 lemma 一同醒目展示，如 en bok、
// ett hus" — which leaves exactly the 4 declension forms as separate lines.
const WORD_FORM_LINE_ORDER_BY_POS = {
  noun: ["singular_indefinite", "singular_definite", "plural_indefinite", "plural_definite", "declension_group"],
  verb: ["infinitive", "present", "preteritum", "supinum", "imperative", "verb_group"],
  adjective: ["base_form", "neuter_form", "plural_form", "definite_form", "comparative", "superlative_indefinite", "superlative_definite"],
  adverb: ["base_form", "comparative", "superlative"],
  pronoun: ["subject_form", "object_form", "possessive_en", "possessive_ett", "possessive_plural"],
  presens_particip: ["base_verb", "participle_form"],
  perfekt_particip: ["base_verb", "en_form", "ett_form", "plural_form"],
};

const actionLabels = {
  created: "Skapad",
  updated: "Redigerad",
  reviewed: "Repeterad",
  learned: "Lärt mig",
  favorite: "Sparad",
  deleted: "Raderad",
};

const primaryPos = ["verb", "noun", "adjective", "adverb"];
const INITIAL_LIST_LIMIT = 80;
const LIST_LIMIT_STEP = 80;
const INITIAL_HISTORY_LIMIT = 120;
const HISTORY_LIMIT_STEP = 120;
const NEEDS_REVIEW_PLACEHOLDER = "behöver kontrolleras";

const dictionaryWords = [];
// Fraser & Uttryck catalog (learning_objects with object_type
// phrase/expression) — loaded lazily on first visit to fraserView, same
// module-level-cache pattern as dictionaryWords.
const phraseObjects = [];
let phraseObjectsLoaded = false;
const allWordPacks = [...educationWordPacks, ...documentWordPacks];
const builtInNotebookNames = new Set(allWordPacks.map((pack) => normalizeNotebookName(pack.notebook)));
const legacyNotebookNames = new Set([
  "SFI 常用词",
  "SVA Grund 常用词",
  "SVA Gymnasium 常用词",
  "Vardag & samhälle",
  "SFI basord",
  "SVA Grund",
  "SVA Gymnasium",
]);

const seedWords = [
  {
    swedish: "fika",
    pos: "noun",
    pos_detail: "en",
    chinese: "咖啡休息；瑞典生活里和朋友、同事喝咖啡聊天的社交时刻。",
    english: "En svensk kaffepaus som ofta är social och gärna har något sött till.",
    forms: "en fika; fikan; flera fikor; fikorna",
    example: "Ska vi ta en fika efter jobbet?",
    collocations: "ta en fika; fika med kollegorna; bjuda på fika",
    tags: ["Vardag"],
    notebook: DEFAULT_NOTEBOOK,
  },
  {
    swedish: "hinna",
    pos: "verb",
    pos_detail: "vi",
    chinese: "来得及；有时间做某事。",
    english: "Att ha tillräckligt med tid för att göra något eller komma fram i tid.",
    forms: "imperativ: hinn; infinitiv: hinna; presens: hinner; preteritum: hann; supinum: hunnit",
    example: "Jag hinner inte till bussen om jag går nu.",
    collocations: "hinna med; hinna fram; hinna i tid",
    tags: ["Pendling"],
    notebook: DEFAULT_NOTEBOOK,
  },
  {
    swedish: "lagom",
    pos: "adjective",
    pos_detail: "adj.",
    chinese: "刚刚好；适度，不太多也不太少。",
    english: "Precis lagom mängd eller nivå, varken för mycket eller för lite.",
    forms: "en: lagom; ett: lagom; plural: lagom",
    example: "Kaffet är lagom varmt nu.",
    collocations: "lagom mycket; lagom stor; lagom till middag",
    tags: ["Vanliga uttryck"],
    notebook: DEFAULT_NOTEBOOK,
  },
  {
    swedish: "orka",
    pos: "verb",
    pos_detail: "vt/vi",
    chinese: "有精力；撑得住；口语里常表示不想或没力气做。",
    english: "Att ha energi, ork eller kraft att göra något.",
    forms: "imperativ: orka; infinitiv: orka; presens: orkar; preteritum: orkade; supinum: orkat",
    example: "Jag orkar inte laga mat idag.",
    collocations: "orka med jobbet; inte orka mer; orka vänta",
    tags: ["Talspråk"],
    notebook: DEFAULT_NOTEBOOK,
  },
  {
    swedish: "mysig",
    pos: "adjective",
    pos_detail: "adj.",
    chinese: "舒服温馨的；让人放松愉快的。",
    english: "Trevlig, varm och bekväm på ett hemtrevligt sätt.",
    forms: "en: mysig; ett: mysigt; plural: mysiga",
    example: "Det finns ett mysigt kafé runt hörnet.",
    collocations: "mysig kväll; mysigt hemma; en mysig restaurang",
    tags: ["Vardag"],
    notebook: DEFAULT_NOTEBOOK,
  },
  {
    swedish: "tack",
    pos: "phrase",
    pos_detail: "artighetsfras",
    chinese: "谢谢；也可用于接受或婉拒。",
    english: "Ett vanligt tackord som också används när man tackar ja eller nej artigt.",
    forms: "tack; tack så mycket; nej tack; ja tack",
    example: "Tack för senast!",
    collocations: "tack för hjälpen; tack själv; tack ändå",
    tags: ["Artighet"],
    notebook: DEFAULT_NOTEBOOK,
  },
];

const builtInWordIds = new Set(
  [...seedWords, ...allWordPacks.flatMap((pack) => pack.words)]
    .map((word) => clean(word.id))
    .filter(Boolean),
);

const state = {
  words: [],
  history: [],
  shadowing: [],
  shadowingRecordings: [],
  shadowingCatalog: [],
  filter: "all",
  query: "",
  currentQuiz: null,
  generatedWord: null,
  activeView: "homeView",
  libraryReturnView: "",
  fraserTypeFilter: "all",
  readingItems: [],
  readingItemsLoaded: false,
  readingListStats: {},
  selectedReadingId: "",
  currentReadingAnalysis: null,
  // Set right before showing the editor panel — true only when reached via
  // "✎ Redigera text" on the results page (see showReadingEditorPanel).
  readingEditorFromResults: false,
  selectedNotebook: "",
  historyPos: "all",
  historyAction: "all",
  shadowingLevel: "1",
  shadowingShowSubtitles: true,
  shadowingAutoPause: false,
  shadowingContinuous: false,
  shadowingLoopEnabled: false,
  shadowingLoopStart: 0,
  shadowingLoopEnd: 0,
  shadowingFlowStep: "paste",
  shadowingFlowText: "",
  shadowingFlowWordCount: 0,
  shadowingFlowReadTimeText: "",
  shadowingFlowUnknownWords: [],
  shadowingFlowSelectedUnknownWords: null,
  shadowingUnknownExpanded: false,
  shadowingRecordingUrl: "",
  shadowingRecordingMimeType: "",
  shadowingRecordingBlob: null,
  shadowingRecordingItemId: "",
  shadowingPendingAudioSource: "",
  shadowingPendingAudioName: "",
  selectedShadowingId: "",
  shadowingPlaybackState: "paused",
  shadowingSeeking: false,
  auth: {
    user: null,
    loading: true,
    busy: false,
    message: "",
    mode: "login",
    otpPending: false,
    otpEmail: "",
  },
  sync: {
    status: "idle",
    pending: 0,
    lastSyncedAt: 0,
  },
  stopBatchEnrich: false,
  dailyNewWordTarget: 10,
  favoriteCategory: "all",
  exportPos: "all",
  exportNotebook: "all",
  favoriteStates: new Map(),
  dailyStudy: null,
  dailyProgress: null,
  studyStats: null,
  studyScope: STUDY_SCOPE_ALL,
  studySession: null,
  learningMode: null,
  activeLearning: null,
  isLearningOpen: false,
  spellingPassed: false,
  saveSheetWordId: null,
  wordDialogSnapshot: "",
  wordDialogReturnView: "",
  wordDialogSourceDetailId: "",
  listLimits: {
    library: INITIAL_LIST_LIMIT,
    notebook: INITIAL_LIST_LIMIT,
    history: INITIAL_HISTORY_LIMIT,
    fraser: INITIAL_LIST_LIMIT,
  },
};

let startupLoadingTimedOut = false;
let startupLoadingTimeoutId = null;
let studySessionAdvanceTimerId = null;
let shadowingRecorder = null;
let shadowingRecordStream = null;
let shadowingRecordChunks = [];
let shadowingRecordingStartedAt = 0;
let shadowingComparisonQueued = false;
let shadowingSpeechUtterance = null;
let shadowingSpeechCharacterIndex = 0;
let authUiSubscription = null;
let effectiveStudyTimerId = null;
let effectiveStudyLastTickAt = Date.now();
let effectiveStudyLastInteractionAt = Date.now();
let effectiveStudyLastDateKey = "";
let effectiveStudySyncTimerId = null;
let effectiveStudySyncPromise = null;
let effectiveStudySyncRequested = false;
let effectiveStudyCloudAccountId = "";
let effectiveStudyEphemeralDeviceId = "";
const effectiveStudyCloudRows = new Map();
const shadowingSignedUrlCache = new Map();

function isLocalDevelopmentOrigin() {
  return LOCAL_DEVELOPMENT_HOSTS.has(window.location.hostname);
}

function localOriginForPort(port) {
  const host = window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";
  return `http://${host}:${port}`;
}

document.body.dataset.appReady = "loading";
window.setTimeout(() => {
  if (document.body.dataset.appReady !== "ready") {
    console.warn("[Min Ordbok] Startup fallback: showing app shell after a slow or blocked init.");
    document.body.dataset.appReady = "ready";
  }
}, 2800);

document.body.dataset.activeView = state.activeView;

const searchTextCache = new WeakMap();
const searchIndexCache = new WeakMap();
const shadowingAudio = new Audio();
const shadowingRecordingAudio = new Audio();
const wordSpeechAudio = new Audio();
const wordSpeechUrlCache = new Map();
const shadowingStageLabels = {
  1: "Level 1 Listen",
  2: "Level 2 Repeat",
  3: "Level 3 Assisted Shadowing",
  4: "Level 4 Real Shadowing",
  5: "Level 5 Blind Shadowing",
};

const els = {
  totalCount: document.querySelector("#totalCount"),
  libraryOrdbokMeta: document.querySelector("#libraryOrdbokMeta"),
  learnedCount: document.querySelector("#learnedCount"),
  dueCount: document.querySelector("#dueCount"),
  searchInput: document.querySelector("#searchInput"),
  searchBtn: document.querySelector("#searchBtn"),
  generateWordBtn: document.querySelector("#generateWordBtn"),
  enrichSearchBtn: document.querySelector("#enrichSearchBtn"),
  filterRow: document.querySelector("#filterRow"),
  favoriteCategoryFilterWrap: document.querySelector("#favoriteCategoryFilterWrap"),
  favoriteCategoryFilter: document.querySelector("#favoriteCategoryFilter"),
  wordList: document.querySelector("#wordList"),
  dictionaryPanel: document.querySelector("#dictionaryPanel"),
  dictionaryList: document.querySelector("#dictionaryList"),
  createFromSearchBtn: document.querySelector("#createFromSearchBtn"),
  exportPosFilter: document.querySelector("#exportPosFilter"),
  exportNotebookSelect: document.querySelector("#exportNotebookSelect"),
  printLibraryBtn: document.querySelector("#printLibraryBtn"),
  homeGreeting: document.querySelector("#homeGreeting"),
  homeHeroImage: document.querySelector(".mot-sverige-cutout"),
  authDialog: document.querySelector("#authDialog"),
  authForm: document.querySelector("#authForm"),
  authLoginTab: document.querySelector("#authLoginTab"),
  authSignupTab: document.querySelector("#authSignupTab"),
  authSignupFields: document.querySelector("#authSignupFields"),
  authHelperText: document.querySelector("#authHelperText"),
  authFirstNameInput: document.querySelector("#authFirstNameInput"),
  authLastNameInput: document.querySelector("#authLastNameInput"),
  authEmailInput: document.querySelector("#authEmailInput"),
  authEmailStep: document.querySelector("#authEmailStep"),
  authOtpStep: document.querySelector("#authOtpStep"),
  authOtpInput: document.querySelector("#authOtpInput"),
  authChangeEmailBtn: document.querySelector("#authChangeEmailBtn"),
  authMessage: document.querySelector("#authMessage"),
  closeAuthDialogBtn: document.querySelector("#closeAuthDialogBtn"),
  submitAuthBtn: document.querySelector("#submitAuthBtn"),
  profileSignedOutCard: document.querySelector("#profileSignedOutCard"),
  profileSignedInGrid: document.querySelector("#profileSignedInGrid"),
  profileMainPanel: document.querySelector("#profileMainPanel"),
  profileStudiesPanel: document.querySelector("#profileStudiesPanel"),
  profileReviewPanel: document.querySelector("#profileReviewPanel"),
  profileSettingsPanel: document.querySelector("#profileSettingsPanel"),
  reviewQueueTotal: document.querySelector("#reviewQueueTotal"),
  reviewQueueMarkPageBtn: document.querySelector("#reviewQueueMarkPageBtn"),
  reviewQueueList: document.querySelector("#reviewQueueList"),
  reviewQueuePrevBtn: document.querySelector("#reviewQueuePrevBtn"),
  reviewQueuePageLabel: document.querySelector("#reviewQueuePageLabel"),
  reviewQueueNextBtn: document.querySelector("#reviewQueueNextBtn"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileAccountName: document.querySelector("#profileAccountName"),
  profilePlanBadge: document.querySelector("#profilePlanBadge"),
  profileLevelValue: document.querySelector("#profileLevelValue"),
  profileLevelProgress: document.querySelector("#profileLevelProgress"),
  profileXpBar: document.querySelector("#profileXpBar"),
  profileNextLevel: document.querySelector("#profileNextLevel"),
  profileRemainingXp: document.querySelector("#profileRemainingXp"),
  profileDailyGoal: document.querySelector("#profileDailyGoal"),
  profileGoalRing: document.querySelector("#profileGoalRing"),
  profileGoalPercent: document.querySelector("#profileGoalPercent"),
  profileGoalNew: document.querySelector("#profileGoalNew"),
  profileGoalReview: document.querySelector("#profileGoalReview"),
  profileGoalShadowing: document.querySelector("#profileGoalShadowing"),
  profileGoalReading: document.querySelector("#profileGoalReading"),
  profileWordCount: document.querySelector("#profileWordCount"),
  profileMasteredCount: document.querySelector("#profileMasteredCount"),
  profileTodayActivity: document.querySelector("#profileTodayActivity"),
  profileAccountEmail: document.querySelector("#profileAccountEmail"),
  profileSyncStatus: document.querySelector("#profileSyncStatus"),
  profileLastSyncValue: document.querySelector("#profileLastSyncValue"),
  profileStudyStats: document.querySelector("#profileStudyStats"),
  profileStudyHint: document.querySelector("#profileStudyHint"),
  profileAccuracyRate: document.querySelector("#profileAccuracyRate"),
  profileCefrBreakdown: document.querySelector("#profileCefrBreakdown"),
  profileRatingBreakdown: document.querySelector("#profileRatingBreakdown"),
  profileRatingHint: document.querySelector("#profileRatingHint"),
  profileReadingCount: document.querySelector("#profileReadingCount"),
  profileShadowingCount: document.querySelector("#profileShadowingCount"),
  profileCumulativeDays: document.querySelector("#profileCumulativeDays"),
  profileLongestStreak: document.querySelector("#profileLongestStreak"),
  profileActiveDaysWeek: document.querySelector("#profileActiveDaysWeek"),
  profileReviewCount: document.querySelector("#profileReviewCount"),
  profileSessionCount: document.querySelector("#profileSessionCount"),
  profileSessionTime: document.querySelector("#profileSessionTime"),
  profileReadingWordsTotal: document.querySelector("#profileReadingWordsTotal"),
  profileReadingVocabTotal: document.querySelector("#profileReadingVocabTotal"),
  profileReadingExprTotal: document.querySelector("#profileReadingExprTotal"),
  profileReadingMarkedSentences: document.querySelector("#profileReadingMarkedSentences"),
  profileReadingNotesTotal: document.querySelector("#profileReadingNotesTotal"),
  profileShadowingRecordings: document.querySelector("#profileShadowingRecordings"),
  profileShadowingRecordedTime: document.querySelector("#profileShadowingRecordedTime"),
  profileAiTimeSaved: document.querySelector("#profileAiTimeSaved"),
  profileAiCreditsToday: document.querySelector("#profileAiCreditsToday"),
  profileAiCreditsMonth: document.querySelector("#profileAiCreditsMonth"),
  profileAiCostHint: document.querySelector("#profileAiCostHint"),
  profileAiFeatureBreakdown: document.querySelector("#profileAiFeatureBreakdown"),
  profileSettingsSummary: document.querySelector("#profileSettingsSummary"),
  profileStartCard: document.querySelector("#profileStartCard"),
  profileReadingHistoryBtn: document.querySelector("#profileReadingHistoryBtn"),
  profileGuestButton: document.querySelector("#profileGuestButton"),
  topbarLibraryBack: document.querySelector(".topbar-library-back"),
  topbarAuthButton: document.querySelector("#topbarAuthButton"),
  profileLoginButton: document.querySelector("#profileLoginButton"),
  profileSignupButton: document.querySelector("#profileSignupButton"),
  profileLogoutButton: document.querySelector("#profileLogoutButton"),
  notebookPinnedBookList: document.querySelector("#notebookPinnedBookList"),
  notebookBookList: document.querySelector("#notebookBookList"),
  notebookExportPanel: document.querySelector("#notebookExportPanel"),
  bookExportDialog: document.querySelector("#bookExportDialog"),
  closeBookExportBtn: document.querySelector("#closeBookExportBtn"),
  createNotebookPanel: document.querySelector("#createNotebookPanel"),
  pinnedBookPanel: document.querySelector("#pinnedBookPanel"),
  bookListPanel: document.querySelector("#bookListPanel"),
  notebookDetailPanel: document.querySelector("#notebookDetailPanel"),
  notebookTitle: document.querySelector("#notebookTitle"),
  notebookList: document.querySelector("#notebookList"),
  fraserList: document.querySelector("#fraserList"),
  fraserTypeFilter: document.querySelector("#fraserTypeFilter"),
  newReadingBtn: document.querySelector("#newReadingBtn"),
  readingList: document.querySelector("#readingList"),
  readingListPanel: document.querySelector("#readingListPanel"),
  readingEditorPanel: document.querySelector("#readingEditorPanel"),
  readingItemId: document.querySelector("#readingItemId"),
  readingTitleInput: document.querySelector("#readingTitleInput"),
  readingEditorHeading: document.querySelector("#readingEditorHeading"),
  readingEditorIntro: document.querySelector("#readingEditorIntro"),
  readingTextInput: document.querySelector("#readingTextInput"),
  readingTextToggleBtn: document.querySelector("#readingTextToggleBtn"),
  readingAuthNote: document.querySelector("#readingAuthNote"),
  closeReadingEditorBtn: document.querySelector("#closeReadingEditorBtn"),
  deleteReadingBtn: document.querySelector("#deleteReadingBtn"),
  saveReadingBtn: document.querySelector("#saveReadingBtn"),
  analyzeReadingBtn: document.querySelector("#analyzeReadingBtn"),
  readingAnalysisPanel: document.querySelector("#readingAnalysisPanel"),
  readingMoreBtn: document.querySelector("#readingMoreBtn"),
  readingMoreMenu: document.querySelector("#readingMoreMenu"),
  readingAnalysisHeading: document.querySelector("#readingAnalysisHeading"),
  readingAnalysisLoading: document.querySelector("#readingAnalysisLoading"),
  readingSummarySv: document.querySelector("#readingSummarySv"),
  readingSummaryZh: document.querySelector("#readingSummaryZh"),
  readingHeadlineZh: document.querySelector("#readingHeadlineZh"),
  readingKeyPoints: document.querySelector("#readingKeyPoints"),
  readingDeepPending: document.querySelector("#readingDeepPending"),
  readingKeywordsBlock: document.querySelector("#readingKeywordsBlock"),
  readingKeyWords: document.querySelector("#readingKeyWords"),
  readingPhrasesBlock: document.querySelector("#readingPhrasesBlock"),
  readingKeyPhrases: document.querySelector("#readingKeyPhrases"),
  readingWordCountNote: document.querySelector("#readingWordCountNote"),
  importReadingPhotoBtn: document.querySelector("#importReadingPhotoBtn"),
  readingPhotoFileInput: document.querySelector("#readingPhotoFileInput"),
  readingPhotoStatus: document.querySelector("#readingPhotoStatus"),
  readingReportCard: document.querySelector("#readingReportCard"),
  readingAnnotateSection: document.querySelector("#readingAnnotateSection"),
  readingAnnotateText: document.querySelector("#readingAnnotateText"),
  readingAnnotateToggleBtn: document.querySelector("#readingAnnotateToggleBtn"),
  readingTextbookGlossary: document.querySelector("#readingTextbookGlossary"),
  readingTextbookGlossaryList: document.querySelector("#readingTextbookGlossaryList"),
  readingSentencesBlock: document.querySelector("#readingSentencesBlock"),
  readingKeySentences: document.querySelector("#readingKeySentences"),
  readingPatternsBlock: document.querySelector("#readingPatternsBlock"),
  readingLanguagePatterns: document.querySelector("#readingLanguagePatterns"),
  sendSelectedSentencesToShadowingBtn: document.querySelector("#sendSelectedSentencesToShadowingBtn"),
  generateReadingSummaryBtn: document.querySelector("#generateReadingSummaryBtn"),
  sendReadingToShadowingBtn: document.querySelector("#sendReadingToShadowingBtn"),
  backToBooksBtn: document.querySelector("#backToBooksBtn"),
  bookActionMenu: document.querySelector("#bookActionMenu"),
  historyList: document.querySelector("#historyList"),
  shadowingList: document.querySelector("#shadowingList"),
  shadowingHistorySection: document.querySelector("#shadowingHistorySection"),
  shadowingHistorySummary: document.querySelector("#shadowingHistorySummary"),
  shadowingItemId: document.querySelector("#shadowingItemId"),
  shadowingEditorPanel: document.querySelector("#shadowingEditorPanel"),
  shadowingPlayerPanel: document.querySelector("#shadowingPlayerPanel"),
  shadowingExportPanel: document.querySelector("#shadowingExportPanel"),
  shadowingMoreBtn: document.querySelector("#shadowingMoreBtn"),
  shadowingMoreMenu: document.querySelector("#shadowingMoreMenu"),
  shadowingGenerating: document.querySelector("#shadowingGenerating"),
  shadowingTitleInput: document.querySelector("#shadowingTitleInput"),
  shadowingSwedishInput: document.querySelector("#shadowingSwedishInput"),
  shadowingChineseInput: document.querySelector("#shadowingChineseInput"),
  shadowingAudioUrlInput: document.querySelector("#shadowingAudioUrlInput"),
  shadowingAudioFileInput: document.querySelector("#shadowingAudioFileInput"),
  shadowingCategoryInput: document.querySelector("#shadowingCategoryInput"),
  shadowingLevelInput: document.querySelector("#shadowingLevelInput"),
  newShadowingBtn: document.querySelector("#newShadowingBtn"),
  saveShadowingBtn: document.querySelector("#saveShadowingBtn"),
  shadowingContinueBtn: document.querySelector("#shadowingContinueBtn"),
  shadowingAddUnknownBtn: document.querySelector("#shadowingAddUnknownBtn"),
  shadowingPreviewPanel: document.querySelector("#shadowingPreviewPanel"),
  shadowingPreviewWordCount: document.querySelector("#shadowingPreviewWordCount"),
  shadowingPreviewReadTime: document.querySelector("#shadowingPreviewReadTime"),
  shadowingPreviewText: document.querySelector("#shadowingPreviewText"),
  shadowingUnknownWordsPanel: document.querySelector("#shadowingUnknownWordsPanel"),
  shadowingUnknownWordsHint: document.querySelector("#shadowingUnknownWordsHint"),
  shadowingUnknownWordsList: document.querySelector("#shadowingUnknownWordsList"),
  generateShadowingAudioBtn: document.querySelector("#generateShadowingAudioBtn"),
  downloadShadowingStandardBtn: document.querySelector("#downloadShadowingStandardBtn"),
  downloadShadowingRecordingBtn: document.querySelector("#downloadShadowingRecordingBtn"),
  shadowingTitle: document.querySelector("#shadowingTitle"),
  shadowingLevelBadge: document.querySelector("#shadowingLevelBadge"),
  shadowingSubtitle: document.querySelector("#shadowingSubtitle"),
  shadowingAudioHint: document.querySelector("#shadowingAudioHint"),
  shadowingStageBar: document.querySelector("#shadowingStageBar"),
  shadowingPlayPauseBtn: document.querySelector("#shadowingPlayPauseBtn"),
  shadowingPauseBtn: document.querySelector("#shadowingPauseBtn"),
  shadowingStopBtn: document.querySelector("#shadowingStopBtn"),
  shadowingSetABtn: document.querySelector("#shadowingSetABtn"),
  shadowingSetBBtn: document.querySelector("#shadowingSetBBtn"),
  shadowingToggleLoopBtn: document.querySelector("#shadowingToggleLoopBtn"),
  shadowingToggleAutoPauseBtn: document.querySelector("#shadowingToggleAutoPauseBtn"),
  shadowingToggleContinuousBtn: document.querySelector("#shadowingToggleContinuousBtn"),
  shadowingToggleSubtitlesBtn: document.querySelector("#shadowingToggleSubtitlesBtn"),
  shadowingRecordBtn: document.querySelector("#shadowingRecordBtn"),
  shadowingStopRecordBtn: document.querySelector("#shadowingStopRecordBtn"),
  shadowingPlayRecordingBtn: document.querySelector("#shadowingPlayRecordingBtn"),
  shadowingExportStandardPlayBtn: document.querySelector("#shadowingExportStandardPlayBtn"),
  shadowingExportRecordingPlayBtn: document.querySelector("#shadowingExportRecordingPlayBtn"),
  shadowingCompareBtn: document.querySelector("#shadowingCompareBtn"),
  shadowingClearRecordingBtn: document.querySelector("#shadowingClearRecordingBtn"),
  shadowingLevelButtons: document.querySelector("#shadowingLevelButtons"),
  shadowingTime: document.querySelector("#shadowingTime"),
  shadowingAudioProgress: document.querySelector("#shadowingAudioProgress"),
  shadowingPlaybackRate: document.querySelector("#shadowingPlaybackRate"),
  shadowingVoiceSelect: document.querySelector("#shadowingVoiceSelect"),
  shadowingLoopRange: document.querySelector("#shadowingLoopRange"),
  shadowingRecordingPanel: document.querySelector("#shadowingRecordingPanel"),
  shadowingRecordingStatus: document.querySelector("#shadowingRecordingStatus"),
  shadowingRecordingPlayer: document.querySelector("#shadowingRecordingPlayer"),
  shadowingRecordingActions: document.querySelector("#shadowingRecordingActions"),
  template: document.querySelector("#wordCardTemplate"),
  addWordBtn: document.querySelector("#addWordBtn"),
  closeLibraryBtn: document.querySelector("#closeLibraryBtn"),
  createNotebookBtn: document.querySelector("#createNotebookBtn"),
  importEducationBtn: document.querySelector("#importEducationBtn"),
  importDocumentBtn: document.querySelector("#importDocumentBtn"),
  importDocumentTopBtn: document.querySelector("#importDocumentTopBtn"),
  importFrom4173Btn: document.querySelector("#importFrom4173Btn"),
  enrichNotebookBtn: document.querySelector("#enrichNotebookBtn"),
  stopEnrichBtn: document.querySelector("#stopEnrichBtn"),
  dedupeWordsBtn: document.querySelector("#dedupeWordsBtn"),
  printNotebookBtn: document.querySelector("#printNotebookBtn"),
  printHistoryBtn: document.querySelector("#printHistoryBtn"),
  notebookSelect: document.querySelector("#notebookSelect"),
  historyPosFilter: document.querySelector("#historyPosFilter"),
  historyActionFilter: document.querySelector("#historyActionFilter"),
  dialog: document.querySelector("#wordDialog"),
  discardWordDialog: document.querySelector("#discardWordDialog"),
  closeWordDialogBtn: document.querySelector("#closeWordDialogBtn"),
  cancelWordDialogBtn: document.querySelector("#cancelWordDialogBtn"),
  continueEditingWordBtn: document.querySelector("#continueEditingWordBtn"),
  discardWordChangesBtn: document.querySelector("#discardWordChangesBtn"),
  detailDialog: document.querySelector("#detailDialog"),
  detailEditBtn: document.querySelector("#detailEditBtn"),
  detailMoreBtn: document.querySelector("#detailMoreBtn"),
  detailMoreMenu: document.querySelector("#detailMoreMenu"),
  detailContent: document.querySelector("#detailContent"),
  detailActionBar: document.querySelector("#detailActionBar"),
  closeDetailBtn: document.querySelector("#closeDetailBtn"),
  saveSheetDialog: document.querySelector("#saveSheetDialog"),
  closeSaveSheetBtn: document.querySelector("#closeSaveSheetBtn"),
  saveSheetBooks: document.querySelector("#saveSheetBooks"),
  saveSheetNewBookBtn: document.querySelector("#saveSheetNewBookBtn"),
  saveSheetLearnedToggle: document.querySelector("#saveSheetLearnedToggle"),
  saveSheetFavoriteToggle: document.querySelector("#saveSheetFavoriteToggle"),
  form: document.querySelector("#wordForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  word_id: document.querySelector("#wordId"),
  pasteWordInfoInput: document.querySelector("#pasteWordInfoInput"),
  autofillWordBtn: document.querySelector("#autofillWordBtn"),
  swedishInput: document.querySelector("#swedishInput"),
  posInput: document.querySelector("#posInput"),
  pos_detailInput: document.querySelector("#posDetailInput"),
  ipaInput: document.querySelector("#ipaInput"),
  cefrLevelInput: document.querySelector("#cefrLevelInput"),
  wordFormsFields: document.querySelector("#wordFormsFields"),
  chineseInput: document.querySelector("#chineseInput"),
  englishInput: document.querySelector("#englishInput"),
  formsInput: document.querySelector("#formsInput"),
  exampleInput: document.querySelector("#exampleInput"),
  collocationsInput: document.querySelector("#collocationsInput"),
  related_wordsInput: document.querySelector("#relatedWordsInput"),
  noteInput: document.querySelector("#noteInput"),
  notebookInput: document.querySelector("#notebookInput"),
  tagInput: document.querySelector("#tagInput"),
  startNewStudyBtn: document.querySelector("#startNewStudyBtn"),
  startReviewStudyBtn: document.querySelector("#startReviewStudyBtn"),
  startQuizBtn: document.querySelector("#startQuizBtn"),
  showAnswerBtn: document.querySelector("#showAnswerBtn"),
  viewStudyDetailBtn: document.querySelector("#viewStudyDetailBtn"),
  studySessionDialog: document.querySelector("#studySessionDialog"),
  closeStudySessionBtn: document.querySelector("#closeStudySessionBtn"),
  studySessionTitle: document.querySelector("#studySessionTitle"),
  studySessionProgress: document.querySelector("#studySessionProgress"),
  studySessionCard: document.querySelector("#studySessionCard"),
  sessionWordInputWrap: document.querySelector("#sessionWordInputWrap"),
  sessionWordInput: document.querySelector("#sessionWordInput"),
  sessionCollocationInputWrap: document.querySelector("#sessionCollocationInputWrap"),
  sessionCollocationInput: document.querySelector("#sessionCollocationInput"),
  studySessionFeedback: document.querySelector("#studySessionFeedback"),
  studySessionActions: document.querySelector("#studySessionActions"),
  studySessionMoreBtn: document.querySelector("#studySessionMoreBtn"),
  studySessionMoreMenu: document.querySelector("#studySessionMoreMenu"),
  studySessionSaveBooks: document.querySelector("#studySessionSaveBooks"),
  sessionCompletePanel: document.querySelector("#sessionCompletePanel"),
  sessionCompleteTitle: document.querySelector("#sessionCompleteTitle"),
  sessionCompleteText: document.querySelector("#sessionCompleteText"),
  sessionCompleteCount: document.querySelector("#sessionCompleteCount"),
  sessionCompleteMastered: document.querySelector("#sessionCompleteMastered"),
  closeSessionCompleteBtn: document.querySelector("#closeSessionCompleteBtn"),
  startReviewFromCompleteBtn: document.querySelector("#startReviewFromCompleteBtn"),
  studyScopeSelect: document.querySelector("#studyScopeSelect"),
  studySteps: document.querySelector("#studySteps"),
  studyNewCount: document.querySelector("#studyNewCount"),
  studyReviewCount: document.querySelector("#studyReviewCount"),
  studyStreakCount: document.querySelector("#studyStreakCount"),
  studyMasteredCount: document.querySelector("#studyMasteredCount"),
  entryNewCount: document.querySelector("#entryNewCount"),
  entryReviewCount: document.querySelector("#entryReviewCount"),
  entryReviewDetail: document.querySelector("#entryReviewDetail"),
  studyWorkloadMessage: document.querySelector("#studyWorkloadMessage"),
  readingShadowingEntryCard: document.querySelector("#readingShadowingEntryCard"),
  readingShadowingEntryTitle: document.querySelector("#readingShadowingEntryTitle"),
  readingShadowingEntryDetail: document.querySelector("#readingShadowingEntryDetail"),
  readingShadowingEntryBtn: document.querySelector("#readingShadowingEntryBtn"),
  openInShadowingBtn: document.querySelector("#openInShadowingBtn"),
  dailyNewWordTargetSelect: document.querySelector("#dailyNewWordTargetSelect"),
  dailyNewWordTargetReadout: document.querySelector("#dailyNewWordTargetReadout"),
  studyCompletePanel: document.querySelector("#studyCompletePanel"),
  completeTodayCount: document.querySelector("#completeTodayCount"),
  completeMasteredCount: document.querySelector("#completeMasteredCount"),
  completeStreakCount: document.querySelector("#completeStreakCount"),
  spellingWrap: document.querySelector("#spellingWrap"),
  spellingInput: document.querySelector("#spellingInput"),
  spellingActions: document.querySelector("#spellingActions"),
  checkSpellingBtn: document.querySelector("#checkSpellingBtn"),
  spellingFeedback: document.querySelector("#spellingFeedback"),
  quizPrompt: document.querySelector("#quizPrompt"),
  quizHint: document.querySelector("#quizHint"),
  answerBox: document.querySelector("#answerBox"),
  reviewActions: document.querySelector("#reviewActions"),
  installBtn: document.querySelector("#installBtn"),
  resetDataBtn: document.querySelector("#resetDataBtn"),
  exportPreviewDialog: document.querySelector("#exportPreviewDialog"),
  exportPreviewTitle: document.querySelector("#exportPreviewTitle"),
  exportPreviewContent: document.querySelector("#exportPreviewContent"),
  shareExportPreviewBtn: document.querySelector("#shareExportPreviewBtn"),
  printExportPreviewBtn: document.querySelector("#printExportPreviewBtn"),
  closeExportPreviewBtn: document.querySelector("#closeExportPreviewBtn"),
  closeExportPreviewActionBtn: document.querySelector("#closeExportPreviewActionBtn"),
};

let lastWordLoadDebug = {
  wordsLength: 0,
  booksLength: 0,
  remoteReadOk: false,
  remoteLength: 0,
  remoteBookLength: 0,
  fromIndexedDb: false,
  fromLocalStorage: false,
  fromRemote: false,
  fromDefaultLibrary: false,
};

let remoteLibrarySnapshot = null;
let remoteLibrarySnapshotLoaded = false;
let remotePhase4Snapshot = null;
let appInitializationComplete = false;

async function ensureRemoteLibrarySnapshot() {
  if (!remoteLibrarySnapshotLoaded) {
    remoteLibrarySnapshot = await remoteDb.loadRemoteLibrarySnapshot();
    void remoteDb.ensureRemoteNotebookNames(DEFAULT_BOOKSHELF_CATEGORIES).catch((error) => {
      console.warn("[Min Ordbok] Failed to ensure default bookshelf categories.", error);
    });
    remoteLibrarySnapshotLoaded = true;
  }
  return remoteLibrarySnapshot;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeWord(word) {
  const now = Date.now();
  const tags = wordTags(word);
  const bookNames = normalizeBookNames(
    firstDefined(word.book_names, word.bookNames, word.books, []),
  );
  const notebook = normalizeLegacyNotebookName(word.notebook);
  const explicitBooks = bookNames.length > 0 ? bookNames : (notebook && notebook !== DEFAULT_NOTEBOOK ? [notebook] : []);
  return {
    id: word.id || createId(),
    swedish: clean(word.swedish),
    pos: word.pos || inferPos(tags[0]),
    pos_detail: normalizePosDetail(firstDefined(word.pos_detail, word.posDetail, legacyPosDetail(word))),
    ipa: clean(word.ipa || ""),
    cefr_level: clean(word.cefr_level || ""),
    chinese: clean(word.chinese),
    english: clean(word.english || ""),
    forms: clean(word.forms || ""),
    example: clean(word.example || ""),
    collocations: clean(word.collocations || ""),
    related_words: clean(firstDefined(word.related_words, word.relatedWords, "")),
    // SPK-DIC-001 fields added 2026-07-26 (Reviews/SPK-DIC-001-完整标准核对
    // 与任务清单-2026-07-26.md) — this function is a strict whitelist (no
    // `...word` spread), so a new DB column silently vanishes here unless
    // listed explicitly.
    memory_tip: clean(word.memory_tip || ""),
    grammar_note: clean(word.grammar_note || ""),
    adverb_form: clean(word.adverb_form || ""),
    comparison_type: clean(word.comparison_type || ""),
    passiv_s: clean(word.passiv_s || ""),
    countability: clean(word.countability || ""),
    transitivity: clean(word.transitivity || ""),
    function_tags: Array.isArray(word.function_tags) ? word.function_tags : [],
    meaning_note: clean(word.meaning_note || ""),
    usage_registers: Array.isArray(word.usage_registers) ? word.usage_registers : [],
    note: clean(firstDefined(word.note, word.comment, word.kommentar, "")),
    notebook,
    book_names: explicitBooks,
    tags,
    favorite: Boolean(word.favorite),
    status: clean(firstDefined(word.status, "")),
    learned: Boolean(word.learned),
    review_count: Number(firstDefined(word.review_count, word.reviewCount, 0)) || 0,
    review_stage: Number(firstDefined(word.review_stage, 0)) || 0,
    last_rating: clean(firstDefined(word.last_rating, "")),
    lapse_count: Number(firstDefined(word.lapse_count, 0)) || 0,
    wrong_count: Number(firstDefined(word.wrong_count, word.wrongCount, 0)) || 0,
    last_reviewed: firstDefined(word.last_reviewed, word.lastReviewed, null),
    next_review_at: firstDefined(word.next_review_at, word.nextReviewAt, now),
    mastered_at: firstDefined(word.mastered_at, word.masteredAt, null),
    first_studied_at: firstDefined(word.first_studied_at, word.firstStudiedAt, null),
    last_studied_at: firstDefined(word.last_studied_at, word.lastStudiedAt, null),
    last_study_date: firstDefined(word.last_study_date, word.lastStudyDate, ""),
    last_review_date: firstDefined(word.last_review_date, word.lastReviewDate, ""),
    spelling_correct_count: Number(firstDefined(word.spelling_correct_count, word.spellingCorrectCount, 0)) || 0,
    created_at: firstDefined(word.created_at, word.createdAt, now),
    updated_at: firstDefined(word.updated_at, word.updatedAt, now),
  };
}

function normalizeForSave(word) {
  return { ...normalizeWord(word), updated_at: Date.now() };
}

function normalizeBookNames(value) {
  const rows = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,;]+/)
      : [];
  return [...new Set(rows.map(normalizeNotebookName))].filter(
    (name) => name && name !== DEFAULT_NOTEBOOK && !builtInNotebookNames.has(name) && !isLearnedNotebook(name),
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Kunde inte läsa ljudfilen."));
    reader.readAsDataURL(file);
  });
}

function setWordDialogOpen(isOpen) {
  if (isOpen) {
    document.body.dataset.wordDialogOpen = "true";
    return;
  }
  delete document.body.dataset.wordDialogOpen;
}

function mergeNotebookNames(...groups) {
  return [...new Set(groups.flat().map(normalizeNotebookName))].filter(
    (name) => name && name !== DEFAULT_NOTEBOOK && !isLearnedNotebook(name) && !builtInNotebookNames.has(name),
  );
}

function isBuiltInWord(word) {
  return Boolean(word?.id) && builtInWordIds.has(clean(word.id));
}

function favoriteKey(word) {
  return clean(word?.id) || [word?.notebook, word?.swedish, word?.pos].map(clean).join("::").toLowerCase();
}

function readNotebookNames() {
  const rows = [
    ...(remoteLibrarySnapshot?.books || []),
    ...state.words.flatMap((word) => [word.notebook, ...wordBookNames(word)]),
  ];
  return mergeNotebookNames(rows);
}

function writeNotebookNames(names) {
  const normalized = names
    .map(normalizeNotebookName)
    .filter((name) => name && name !== DEFAULT_NOTEBOOK && !isLearnedNotebook(name) && !builtInNotebookNames.has(name));
  void remoteDb.syncRemoteNotebookNames(normalized);
  remoteLibrarySnapshot = {
    ...(remoteLibrarySnapshot || {}),
    books: [...new Set([...normalized])],
  };
  remoteLibrarySnapshotLoaded = true;
}

function rememberNotebookName(name) {
  const notebook = normalizeNotebookName(name);
  if (!notebook || notebook === DEFAULT_NOTEBOOK || isLearnedNotebook(notebook) || builtInNotebookNames.has(notebook)) return;
  const notebooks = new Set([
    DEFAULT_NOTEBOOK,
    ...readNotebookNames(),
  ]);
  notebooks.add(notebook);
  writeNotebookNames([...notebooks]);
}

function readStudyStats() {
  return {
    current_streak: 0,
    last_study_date: "",
    total_mastered: 0,
  };
}

function writeStudyStats(stats) {
  return stats;
}

function readDailyStudy() {
  const scopeKey = profileDataScopeKey();
  if (state.dailyStudy?.date === todayKey() && state.dailyStudy?.dataScope === scopeKey) return state.dailyStudy;
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_DAILY_STUDY_STATE_KEY) || "{}");
    const stored = rows?.[scopeKey];
    if (stored?.date === todayKey()) return stored;
  } catch {
    // Continue with a new in-memory plan if local storage is unavailable.
  }
  return {};
}

function writeDailyStudy(value) {
  const scopeKey = profileDataScopeKey();
  state.dailyStudy = {
    date: value.date || todayKey(),
    scope: value.scope || state.studyScope || STUDY_SCOPE_ALL,
    newWordIds: uniqueIds(value.newWordIds),
    reviewWordIds: uniqueIds(value.reviewWordIds),
    completedNewWordIds: uniqueIds(value.completedNewWordIds),
    completedReviewWordIds: uniqueIds(value.completedReviewWordIds),
    spellingPassedWordIds: uniqueIds(value.spellingPassedWordIds),
    newSessionCompleted: Boolean(value.newSessionCompleted),
    reviewSessionCompleted: Boolean(value.reviewSessionCompleted),
    completedAt: value.completedAt || null,
    remotePlanId: value.remotePlanId || value.remote_plan_id || null,
    remoteSessionIds: value.remoteSessionIds || value.remote_session_ids || {},
    dataScope: scopeKey,
    updatedAt: Date.now(),
  };
  try {
    const rows = JSON.parse(localStorage.getItem(LOCAL_DAILY_STUDY_STATE_KEY) || "{}");
    const nextRows = rows && typeof rows === "object" && !Array.isArray(rows) ? rows : {};
    nextRows[scopeKey] = state.dailyStudy;
    localStorage.setItem(LOCAL_DAILY_STUDY_STATE_KEY, JSON.stringify(nextRows));
  } catch {
    // Continue with in-memory study state if local storage is unavailable.
  }
  writeLearnDailySession(state.dailyStudy);
}

function readLearnDailySession(date = todayKey()) {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_LEARN_DAILY_SESSION_KEY) || "null");
    if (!parsed || parsed.date !== date) return null;
    const scopeKey = profileDataScopeKey();
    if ((parsed.dataScope || "guest") !== scopeKey) return null;
    const wordIds = uniqueIds(parsed.wordIds);
    if (wordIds.length === 0) return null;
    return {
      date: parsed.date,
      scope: parsed.scope || STUDY_SCOPE_ALL,
      wordIds,
      completedWordIds: uniqueIds(parsed.completedWordIds).filter((id) => wordIds.includes(id)),
      spellingPassedWordIds: uniqueIds(parsed.spellingPassedWordIds).filter((id) => wordIds.includes(id)),
      completed: Boolean(parsed.completed),
      completedAt: parsed.completedAt || null,
    };
  } catch {
    return null;
  }
}

function writeLearnDailySession(plan = state.dailyStudy || {}) {
  const date = plan.date || todayKey();
  const wordIds = uniqueIds(plan.newWordIds);
  const completedWordIds = uniqueIds(plan.completedNewWordIds).filter((id) => wordIds.includes(id));
  if (date !== todayKey() || wordIds.length === 0) return;
  const completed = Boolean(plan.newSessionCompleted) || completedWordIds.length >= wordIds.length;
  try {
    localStorage.setItem(
      LOCAL_LEARN_DAILY_SESSION_KEY,
      JSON.stringify({
        date,
        dataScope: profileDataScopeKey(),
        scope: plan.scope || state.studyScope || STUDY_SCOPE_ALL,
        wordIds,
        completedWordIds,
        spellingPassedWordIds: uniqueIds(plan.spellingPassedWordIds).filter((id) => wordIds.includes(id)),
        completed,
        completedAt: completed ? plan.completedAt || Date.now() : null,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    // Continue with in-memory progress if storage is unavailable.
  }
}

function readLocalWordProgressMap() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_WORD_PROGRESS_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    if (parsed.__scopes && typeof parsed.__scopes === "object") {
      return parsed.__scopes[profileDataScopeKey()] || {};
    }
    return profileDataScopeKey() === "guest" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalWordProgressMap(progressMap) {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_WORD_PROGRESS_KEY) || "{}");
    const existing = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    const scopes = existing.__scopes && typeof existing.__scopes === "object"
      ? existing.__scopes
      : { guest: existing };
    scopes[profileDataScopeKey()] = progressMap || {};
    localStorage.setItem(LOCAL_WORD_PROGRESS_KEY, JSON.stringify({ __scopes: scopes }));
  } catch {
    // Continue with in-memory progress if storage is unavailable.
  }
}

function progressSnapshotForWord(word) {
  if (!word?.id) return null;
  return {
    id: word.id,
    learned: Boolean(word.learned),
    status: clean(word.status),
    review_count: Number(word.review_count || 0) || 0,
    review_stage: Number(word.review_stage || 0) || 0,
    last_rating: clean(word.last_rating),
    lapse_count: Number(word.lapse_count || 0) || 0,
    wrong_count: Number(word.wrong_count || 0) || 0,
    spelling_correct_count: Number(word.spelling_correct_count || 0) || 0,
    first_studied_at: word.first_studied_at || null,
    last_studied_at: word.last_studied_at || null,
    last_reviewed: word.last_reviewed || null,
    last_study_date: clean(word.last_study_date),
    last_review_date: clean(word.last_review_date),
    mastered_at: word.mastered_at || null,
    next_review_at: word.next_review_at ?? null,
  };
}

function readLocalWordProgressWords() {
  return Object.values(readLocalWordProgressMap()).filter((word) => word?.id);
}

function writeLocalWordProgress(word) {
  const snapshot = progressSnapshotForWord(word);
  if (!snapshot) return;
  const progressMap = readLocalWordProgressMap();
  progressMap[snapshot.id] = {
    ...(progressMap[snapshot.id] || {}),
    ...snapshot,
    updated_at: Date.now(),
  };
  writeLocalWordProgressMap(progressMap);
}

function sessionWordIdsForMode(mode, plan = state.dailyStudy || readDailyStudy()) {
  return mode === "review" ? uniqueIds(plan.reviewWordIds) : uniqueIds(plan.newWordIds);
}

function legacyCompletedIdsForMode(mode, plan = {}) {
  return mode === "review" ? uniqueIds(plan.completedReviewWordIds) : uniqueIds(plan.completedNewWordIds);
}

function normalizeDailySession(mode, session = {}, plan = state.dailyStudy || readDailyStudy()) {
  const wordIds = sessionWordIdsForMode(mode, plan);
  const validIds = new Set(wordIds);
  const completedWordIds = uniqueIds(session.completedWordIds).filter((id) => validIds.has(id));
  const spellingPassedWordIds = uniqueIds(session.spellingPassedWordIds).filter((id) => validIds.has(id));
  const completed =
    wordIds.length > 0 &&
    (completedWordIds.length >= wordIds.length || (Boolean(session.completed) && completedWordIds.length > 0));
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    mode,
    date: plan.date || todayKey(),
    scope: plan.scope || state.studyScope || STUDY_SCOPE_ALL,
    wordIds,
    completedWordIds,
    spellingPassedWordIds,
    completed,
    completedAt: completed ? session.completedAt || Date.now() : null,
    updatedAt: session.updatedAt || Date.now(),
  };
}

function readDailySession(mode, plan = state.dailyStudy || readDailyStudy()) {
  const legacyCompletedWordIds = legacyCompletedIdsForMode(mode, plan);
  const legacyCompletedFlag = mode === "review" ? plan.reviewSessionCompleted : plan.newSessionCompleted;
  return normalizeDailySession(
    mode,
    {
      completedWordIds: legacyCompletedWordIds,
      spellingPassedWordIds: mode === "review" ? [] : uniqueIds(plan.spellingPassedWordIds),
      completed: Boolean(legacyCompletedFlag),
      completedAt: legacyCompletedFlag ? Date.now() : null,
    },
    plan,
  );
}

function writeDailySession(mode, session, plan = state.dailyStudy || readDailyStudy()) {
  const normalized = normalizeDailySession(mode, session, plan);
  const nextPlan = {
    ...plan,
    completedNewWordIds: mode === "new" ? normalized.completedWordIds : uniqueIds(plan.completedNewWordIds),
    completedReviewWordIds: mode === "review" ? normalized.completedWordIds : uniqueIds(plan.completedReviewWordIds),
    spellingPassedWordIds: mode === "new" ? normalized.spellingPassedWordIds : uniqueIds(plan.spellingPassedWordIds),
    newSessionCompleted: mode === "new" ? normalized.completed : Boolean(plan.newSessionCompleted),
    reviewSessionCompleted: mode === "review" ? normalized.completed : Boolean(plan.reviewSessionCompleted),
    completedAt: normalized.completed ? normalized.completedAt : plan.completedAt || null,
  };
  writeDailyStudy(nextPlan);
  state.dailyStudy = readDailyStudy();
}

function persistUserPreferences() {
  void remoteDb.upsertUserPreferences({
    studyScope: state.studyScope,
    selectedNotebookName: state.selectedNotebook,
    shadowingShowSubtitles: state.shadowingShowSubtitles,
    shadowingContinuous: state.shadowingContinuous,
    shadowingAutoPause: state.shadowingAutoPause,
    shadowingLevel: state.shadowingLevel,
    preferences: {
      favoriteCategory: state.favoriteCategory,
      exportNotebook: state.exportNotebook,
      exportPos: state.exportPos,
      shadowingLoopEnabled: state.shadowingLoopEnabled,
      dailyNewWordTarget: state.dailyNewWordTarget,
    },
  }).catch((error) => console.warn("[Min Ordbok] Remote preferences sync failed.", error));
}

function remoteStudySessionState(snapshot = remotePhase4Snapshot) {
  const sessions = Array.isArray(snapshot?.studySessions) ? snapshot.studySessions : [];
  const items = Array.isArray(snapshot?.studySessionItems) ? snapshot.studySessionItems : [];
  return sessions.reduce((result, session) => {
    if (!session?.mode || result[session.mode]) return result;
    const sessionItems = items
      .filter((item) => item.study_session_id === session.id)
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    const wordIds = uniqueIds(sessionItems.map((item) => item.word_id));
    const completedWordIds = uniqueIds(
      sessionItems
        .filter((item) => item.status === "completed" || item.completed_at)
        .map((item) => item.word_id),
    ).filter((id) => wordIds.includes(id));
    result[session.mode] = {
      id: session.id,
      status: session.status || "active",
      wordIds,
      completedWordIds,
      spellingPassedWordIds: uniqueIds(
        sessionItems
          .filter((item) => item.spelling_passed)
          .map((item) => item.word_id),
      ).filter((id) => wordIds.includes(id)),
    };
    return result;
  }, {});
}

async function persistDailyStudyPlan(plan = state.dailyStudy || readDailyStudy()) {
  const result = await remoteDb.upsertStudyPlan({
    id: plan.remotePlanId,
    date: plan.date || todayKey(),
    scope: plan.scope || state.studyScope || STUDY_SCOPE_ALL,
    newWordIds: plan.newWordIds,
    reviewWordIds: plan.reviewWordIds,
    status: plan.newSessionCompleted && plan.reviewSessionCompleted ? "completed" : "active",
  }).catch((error) => {
    console.warn("[Min Ordbok] Remote study plan sync failed.", error);
    return null;
  });
  if (result?.plan?.id) {
    writeDailyStudy({ ...plan, remotePlanId: result.plan.id });
  }
  return result?.plan || null;
}

function applyRemoteStudyState(plan, snapshot = remotePhase4Snapshot) {
  if (!snapshot?.enabled || !plan) return plan;
  const remoteSessions = remoteStudySessionState(snapshot);
  const studyReadyWordIds = new Set(
    getLibraryWordsForDisplay()
      .filter(isStudyReadyWord)
      .map((word) => word.id),
  );
  const sessionIds = {};
  (snapshot.studySessions || []).forEach((session) => {
    if (session.mode) sessionIds[session.mode] = session.id;
  });
  const remoteNewWordIds = uniqueIds(remoteSessions.new?.wordIds || []).filter((id) => studyReadyWordIds.has(id));
  const remoteReviewWordIds = uniqueIds(remoteSessions.review?.wordIds || []).filter((id) => studyReadyWordIds.has(id));
  const nextNewWordIds = uniqueIds([...remoteNewWordIds, ...plan.newWordIds]).slice(0, DAILY_NEW_WORD_LIMIT);
  const nextReviewWordIds = uniqueIds([...remoteReviewWordIds, ...plan.reviewWordIds]).slice(0, DAILY_NEW_WORD_LIMIT);
  const completedNewWordIds = uniqueIds([
    ...uniqueIds(plan.completedNewWordIds),
    ...uniqueIds(remoteSessions.new?.completedWordIds || []),
  ]).filter((id) => nextNewWordIds.includes(id));
  const completedReviewWordIds = uniqueIds([
    ...uniqueIds(plan.completedReviewWordIds),
    ...uniqueIds(remoteSessions.review?.completedWordIds || []),
  ]).filter((id) => nextReviewWordIds.includes(id));
  const next = {
    ...plan,
    newWordIds: nextNewWordIds,
    reviewWordIds: nextReviewWordIds,
    completedNewWordIds,
    completedReviewWordIds,
    spellingPassedWordIds: uniqueIds([
      ...uniqueIds(plan.spellingPassedWordIds),
      ...uniqueIds(remoteSessions.new?.spellingPassedWordIds || []),
    ]).filter((id) => nextNewWordIds.includes(id)),
    newSessionCompleted:
      nextNewWordIds.length > 0 &&
      (remoteSessions.new?.status === "completed" || completedNewWordIds.length >= nextNewWordIds.length || Boolean(plan.newSessionCompleted)),
    reviewSessionCompleted:
      nextReviewWordIds.length > 0 &&
      (remoteSessions.review?.status === "completed" || completedReviewWordIds.length >= nextReviewWordIds.length || Boolean(plan.reviewSessionCompleted)),
    remotePlanId: snapshot.studyPlan?.id || plan.remotePlanId || null,
    remoteSessionIds: { ...(plan.remoteSessionIds || {}), ...sessionIds },
  };
  writeDailyStudy(next);
  return readDailyStudy();
}

async function ensureRemoteDailyStudySessions(plan = state.dailyStudy || ensureDailyStudyPlan()) {
  if (!plan?.date || plan.date !== todayKey()) return null;
  const remotePlan = await persistDailyStudyPlan(plan);
  if (!remotePlan?.id && !plan.remotePlanId) return null;
  const sessionIds = { ...(state.dailyStudy?.remoteSessionIds || {}) };
  for (const mode of ["new", "review"]) {
    const wordIds = mode === "review" ? uniqueIds(plan.reviewWordIds) : uniqueIds(plan.newWordIds);
    if (wordIds.length === 0) continue;
    const result = await remoteDb.ensureStudySession({
      plan: remotePlan || { id: plan.remotePlanId, date: plan.date, scope: plan.scope },
      mode,
      wordIds,
    }).catch((error) => {
      console.warn(`[Min Ordbok] Remote ${mode} session sync failed.`, error);
      return null;
    });
    if (result?.session?.id) {
      sessionIds[mode] = result.session.id;
      const completedWordIds = mode === "review" ? uniqueIds(plan.completedReviewWordIds) : uniqueIds(plan.completedNewWordIds);
      const spellingPassed = new Set(mode === "new" ? uniqueIds(plan.spellingPassedWordIds) : []);
      await Promise.all(
        completedWordIds
          .filter((wordId) => wordIds.includes(wordId))
          .map((wordId) =>
            remoteDb.saveStudySessionItem({
              sessionId: result.session.id,
              wordId,
              status: "completed",
              spellingPassed: spellingPassed.has(wordId),
              isCorrect: spellingPassed.has(wordId) || null,
            }),
          ),
      ).catch((error) => console.warn(`[Min Ordbok] Remote ${mode} completion repair failed.`, error));
    }
  }
  writeDailyStudy({
    ...state.dailyStudy,
    remotePlanId: remotePlan?.id || state.dailyStudy?.remotePlanId,
    remoteSessionIds: sessionIds,
  });
  return readDailyStudy();
}

async function ensureRemoteStudySession(mode) {
  const plan = state.dailyStudy || ensureDailyStudyPlan();
  const remotePlan = await persistDailyStudyPlan(plan);
  const result = await remoteDb.ensureStudySession({
    plan: remotePlan || { id: plan.remotePlanId, date: plan.date, scope: plan.scope, newWordIds: plan.newWordIds, reviewWordIds: plan.reviewWordIds },
    mode,
    wordIds: getSessionIds(mode),
  }).catch((error) => {
    console.warn("[Min Ordbok] Remote study session sync failed.", error);
    return null;
  });
  if (result?.session?.id) {
    writeDailyStudy({
      ...state.dailyStudy,
      remotePlanId: result.plan?.id || state.dailyStudy?.remotePlanId,
      remoteSessionIds: {
        ...(state.dailyStudy?.remoteSessionIds || {}),
        [mode]: result.session.id,
      },
    });
  }
  return result?.session || null;
}

function normalizeFavoriteCategory(value) {
  const notebook = normalizeNotebookName(value);
  if (!notebook || notebook === DEFAULT_NOTEBOOK) return DEFAULT_FAVORITE_CATEGORY;
  return builtInNotebookNames.has(notebook) ? DEFAULT_FAVORITE_CATEGORY : notebook;
}

function applyFavoriteState(word) {
  const record = state.favoriteStates.get(favoriteKey(word));
  return record ? { ...word, favorite: record.favorite } : word;
}

function getFavoriteCategory(word) {
  return state.favoriteStates.get(favoriteKey(word))?.category || DEFAULT_FAVORITE_CATEGORY;
}

function saveFavoriteState(word, favorite, category = getFavoriteCategory(word)) {
  const key = favoriteKey(word);
  if (!key) return;
  rememberNotebookName(category);
  state.favoriteStates.set(key, {
    key,
    favorite: Boolean(favorite),
    category: normalizeFavoriteCategory(category),
  });
}

function isWordSaved(word) {
  return Boolean(word?.learned) || Boolean(word?.favorite) || wordBookNames(word).length > 0;
}

function selectedNotebookSet(word) {
  return new Set(wordBookNames(word));
}

function choosePrimaryNotebook(word, books) {
  const normalizedCurrent = normalizeNotebookName(word?.notebook);
  if (books.has(normalizedCurrent)) return normalizedCurrent;
  if (books.size > 0) return [...books][0];
  return DEFAULT_NOTEBOOK;
}

async function setWordLearnedState(word, learned) {
  if (!word?.id) return;
  if (learned) {
    await markWordLearned(word);
    return;
  }
  await updateWord(
    word.id,
    {
      learned: false,
      mastered_at: null,
      next_review_at: Date.now(),
    },
    "updated",
  );
  refreshOpenDetail(word.id);
  const updated = state.words.find((item) => item.id === word.id);
  if (updated && state.saveSheetWordId === word.id) renderSaveSheet(updated);
}

async function setWordBookMembership(word, notebookName, enabled) {
  if (!word?.id) return;
  const notebook = normalizeNotebookName(notebookName);
  if (!notebook || notebook === DEFAULT_NOTEBOOK || isLearnedNotebook(notebook) || builtInNotebookNames.has(notebook)) return;
  const selected = selectedNotebookSet(word);
  if (enabled) selected.add(notebook);
  else selected.delete(notebook);
  const nextBooks = [...selected].filter(Boolean);
  const patch = {
    book_names: nextBooks,
    notebook: choosePrimaryNotebook(word, selected),
  };
  await updateWord(word.id, patch, "updated");
  refreshOpenDetail(word.id);
  const updated = state.words.find((item) => item.id === word.id);
  if (updated && state.saveSheetWordId === word.id) renderSaveSheet(updated);
}

function closeSaveSheet() {
  if (!els.saveSheetDialog.open) return;
  els.saveSheetDialog.close();
  state.saveSheetWordId = null;
}

function renderSaveSheet(word) {
  const currentWord = state.words.find((item) => item.id === word?.id) || word;
  if (!currentWord) return;
  state.saveSheetWordId = currentWord.id;
  const selectedBooks = selectedNotebookSet(currentWord);
  const books = getNotebooks().filter((book) => !isLearnedNotebook(book) && !sameCategory(book, DEFAULT_NOTEBOOK));
  const bookRows = [...new Set([...(books || []), ...selectedBooks])]
    .filter(Boolean)
    .filter((book) => !isLearnedNotebook(book))
    .sort((a, b) => a.localeCompare(b, "sv"));
  els.saveSheetBooks.replaceChildren(
    ...bookRows.map((book) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "save-sheet-book";
      button.dataset.saveBook = book;
      button.classList.toggle("active", selectedBooks.has(book));
      button.textContent = book;
      return button;
    }),
  );
  els.saveSheetLearnedToggle.checked = Boolean(currentWord.learned);
  els.saveSheetFavoriteToggle.checked = Boolean(currentWord.favorite);
  if (!els.saveSheetDialog.open) els.saveSheetDialog.showModal();
}

function openSaveSheetForWord(word) {
  if (!word) return;
  renderSaveSheet(word);
}

async function readStoredWordsWithDebug() {
  const remoteSnapshot = await ensureRemoteLibrarySnapshot();
  const remoteWords = remoteSnapshot?.words || [];
  const remoteBooks = remoteSnapshot?.books || [];
  const fallbackWords = remoteWords.length > 0 ? [] : initialLibraryWords();
  const localProgressWords = readLocalWordProgressWords();
  return {
    words: mergeWordLists(remoteWords, fallbackWords, localProgressWords),
    debug: {
      remoteReadOk: Boolean(remoteSnapshot),
      remoteLength: remoteWords.length,
      remoteBookLength: remoteBooks.length,
      indexedDbReadOk: false,
      indexedDbLength: 0,
      localStorageLength: 0,
      fromIndexedDb: false,
      fromLocalStorage: false,
      fromRemote: remoteWords.length > 0,
      fromDefaultLibrary: fallbackWords.length > 0,
      fromLocalProgress: localProgressWords.length > 0,
      remoteBooks,
    },
  };
}

async function readWords() {
  const result = await readStoredWordsWithDebug();
  if (result.debug.remoteBookLength > 0) {
    writeNotebookNames(mergeNotebookNames(readNotebookNames(), result.debug.remoteBooks));
  }
  lastWordLoadDebug = {
    ...result.debug,
    wordsLength: result.words.length,
    booksLength: countBooks(result.words),
  };
  return result.words;
}

function countBooks(words) {
  return new Set(
    words.flatMap((word) => [normalizeNotebookName(word.notebook), ...wordBookNames(word)]).filter((notebook) => Boolean(notebook)),
  ).size;
}

function mergeWordLists(...lists) {
  const merged = [];
  const byKey = new Map();
  lists.flat().forEach((word) => {
    const normalized = normalizeWord(word);
    const key = wordKey(normalized);
    const existingIndex = byKey.get(key);
    if (existingIndex === undefined) {
      byKey.set(key, merged.length);
      merged.push(normalized);
      return;
    }
    const existing = merged[existingIndex];
    merged[existingIndex] =
      wordCompletenessScore(normalized) >= wordCompletenessScore(existing)
        ? mergeStoredWordState(normalized, existing)
        : mergeStoredWordState(existing, normalized);
  });
  return merged;
}

function mergeStoredWordState(primary, secondary) {
  const primaryNextReview = Number(primary.next_review_at || 0) || 0;
  const secondaryNextReview = Number(secondary.next_review_at || 0) || 0;
  return normalizeWord({
    ...primary,
    favorite: primary.favorite || secondary.favorite,
    learned: primary.learned || secondary.learned,
    review_count: Math.max(primary.review_count || 0, secondary.review_count || 0),
    review_stage: Math.max(primary.review_stage || 0, secondary.review_stage || 0),
    lapse_count: Math.max(primary.lapse_count || 0, secondary.lapse_count || 0),
    wrong_count: Math.max(primary.wrong_count || 0, secondary.wrong_count || 0),
    spelling_correct_count: Math.max(primary.spelling_correct_count || 0, secondary.spelling_correct_count || 0),
    first_studied_at: primary.first_studied_at || secondary.first_studied_at,
    last_studied_at: Math.max(primary.last_studied_at || 0, secondary.last_studied_at || 0) || null,
    last_reviewed: Math.max(primary.last_reviewed || 0, secondary.last_reviewed || 0) || null,
    last_study_date: primary.last_study_date || secondary.last_study_date,
    last_review_date: primary.last_review_date || secondary.last_review_date,
    next_review_at:
      primaryNextReview && secondaryNextReview
        ? Math.min(primaryNextReview, secondaryNextReview)
        : primaryNextReview || secondaryNextReview,
    mastered_at: primary.mastered_at || secondary.mastered_at,
  });
}

function initialLibraryWords() {
  return allWordPacks.flatMap((pack) =>
    (pack.words || []).map((word) =>
      normalizeWord({
        ...word,
        notebook: normalizeNotebookName(word.notebook || pack.notebook || DEFAULT_NOTEBOOK),
        tags: word.tags?.length ? word.tags : [pack.level, pack.notebook].filter(Boolean),
      }),
    ),
  );
}

async function replaceWords(words) {
  const previousWords = state.words.slice();
  const normalizedWords = words.map(normalizeWord);
  await remoteDb.syncRemoteWordChanges({
    previousWords,
    nextWords: normalizedWords,
    notebookNames: readNotebookNames(),
  }).catch((error) => console.warn("[Min Ordbok] Remote word sync failed.", error));
  remoteLibrarySnapshot = {
    ...(remoteLibrarySnapshot || {}),
    words: normalizedWords,
    books: [
      ...new Set(
        [...readNotebookNames(), ...normalizedWords.flatMap((word) => [normalizeNotebookName(word.notebook), ...wordBookNames(word)])]
          .filter((book) => book && book !== DEFAULT_NOTEBOOK && !isLearnedNotebook(book) && !builtInNotebookNames.has(book)),
      ),
    ],
    remoteWordCount: normalizedWords.length,
    remoteBookCount: [
      ...new Set(
        [...readNotebookNames(), ...normalizedWords.flatMap((word) => [normalizeNotebookName(word.notebook), ...wordBookNames(word)])]
          .filter((book) => book && book !== DEFAULT_NOTEBOOK && !isLearnedNotebook(book) && !builtInNotebookNames.has(book)),
      ),
    ].length,
  };
  remoteLibrarySnapshotLoaded = true;
}

function dateFromTimestamp(value) {
  const timestamp = Number(value || 0) || 0;
  return timestamp ? new Date(timestamp).toISOString().slice(0, 10) : "";
}

function localDailyWordProgress(words = getLibraryWordsForDisplay(), date = todayKey()) {
  const start = startOfDayTimestamp(0);
  const end = (() => {
    const value = new Date();
    value.setHours(23, 59, 59, 999);
    return value.getTime();
  })();
  const todayNewWordIds = uniqueIds(
    words
      .filter((word) => {
        const studiedAt = Number(word.last_studied_at || 0) || 0;
        return (
          Number(word.review_count || 0) === 0 &&
          ((studiedAt >= start && studiedAt <= end) || clean(word.last_study_date) === date)
        );
      })
      .map((word) => word.id),
  ).slice(0, DAILY_NEW_WORD_LIMIT);
  const dueReviewWordIds = uniqueIds(
    words
      .filter((word) => {
        if (!word?.id || isWordInLearnedNotebook(word)) return false;
        if (clean(word.last_review_date) === date) return false;
        const nextReviewAt = Number(word.next_review_at || 0) || 0;
        const lastStudyDate = clean(word.last_study_date) || dateFromTimestamp(word.last_studied_at);
        const firstReviewDue = Number(word.review_count || 0) === 0 && lastStudyDate && lastStudyDate < date;
        return firstReviewDue || (nextReviewAt > 0 && nextReviewAt <= end);
      })
      .sort((a, b) => {
        const nextA = Number(a.next_review_at || 0) || Number.MAX_SAFE_INTEGER;
        const nextB = Number(b.next_review_at || 0) || Number.MAX_SAFE_INTEGER;
        return nextA - nextB;
      })
      .map((word) => word.id),
  ).slice(0, DAILY_NEW_WORD_LIMIT);
  // Uncapped due/overdue totals for workload classification (SPK-LRN-001
  // §10) — dueReviewWordIds above is intentionally capped to build an
  // actionable session list, this counts the true backlog.
  let overdueCount = 0;
  let dueTodayCount = 0;
  words.forEach((word) => {
    if (!word?.id || isWordInLearnedNotebook(word)) return;
    if (clean(word.last_review_date) === date) return;
    const nextReviewAt = Number(word.next_review_at || 0) || 0;
    const lastStudyDate = clean(word.last_study_date) || dateFromTimestamp(word.last_studied_at);
    const firstReviewDue = Number(word.review_count || 0) === 0 && lastStudyDate && lastStudyDate < date;
    if (firstReviewDue || (nextReviewAt > 0 && nextReviewAt < start)) {
      overdueCount++;
    } else if (nextReviewAt >= start && nextReviewAt <= end) {
      dueTodayCount++;
    }
  });
  return {
    enabled: true,
    date,
    todayNewWordIds,
    todayNewCount: todayNewWordIds.length,
    dueReviewWordIds,
    dueReviewCount: dueReviewWordIds.length,
    overdueCount,
    dueTodayCount,
  };
}

function mergeDailyWordProgress(remoteProgress, localProgress) {
  const todayNewWordIds = uniqueIds([
    ...(remoteProgress?.todayNewWordIds || []),
    ...(localProgress?.todayNewWordIds || []),
  ]).slice(0, DAILY_NEW_WORD_LIMIT);
  const dueReviewWordIds = uniqueIds([
    ...(remoteProgress?.dueReviewWordIds || []),
    ...(localProgress?.dueReviewWordIds || []),
  ]).slice(0, DAILY_NEW_WORD_LIMIT);
  return {
    ...(remoteProgress || {}),
    enabled: Boolean(remoteProgress?.enabled || localProgress?.enabled),
    date: remoteProgress?.date || localProgress?.date || todayKey(),
    todayNewWordIds,
    todayNewCount: Math.max(Number(remoteProgress?.todayNewCount || 0) || 0, todayNewWordIds.length),
    dueReviewWordIds,
    dueReviewCount: dueReviewWordIds.length,
    overdueCount: Math.max(Number(remoteProgress?.overdueCount || 0) || 0, Number(localProgress?.overdueCount || 0) || 0),
    dueTodayCount: Math.max(Number(remoteProgress?.dueTodayCount || 0) || 0, Number(localProgress?.dueTodayCount || 0) || 0),
  };
}

async function refreshDailyProgress(wordsForLocalProgress = state.words) {
  const remoteProgress = await remoteDb.loadDailyWordProgress({
    date: todayKey(),
  }).catch((error) => {
    console.warn("[Min Ordbok] Daily Supabase progress load failed.", error);
    return {
      enabled: false,
      date: todayKey(),
      todayNewWordIds: [],
      todayNewCount: 0,
      dueReviewWordIds: [],
      dueReviewCount: 0,
    };
  });
  state.dailyProgress = mergeDailyWordProgress(remoteProgress, localDailyWordProgress(wordsForLocalProgress, todayKey()));
  return state.dailyProgress;
}

async function refreshDailyProgressUntilWordIncluded(wordId, mode) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const progress = await refreshDailyProgress();
    const ids = mode === "review" ? progress?.dueReviewWordIds || [] : progress?.todayNewWordIds || [];
    if (!wordId || ids.includes(wordId)) return progress;
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return state.dailyProgress;
}

function readLocalHistory() {
  return (state.history || []).map(normalizeHistoryEntry).filter(Boolean);
}

function writeLocalHistory(history) {
  state.history = history.map(normalizeHistoryEntry).filter(Boolean).slice(0, 1000);
}

function appendLocalHistory(action, word, history = readLocalHistory()) {
  const entry = historyEntry(action, word);
  history.unshift(entry);
  writeLocalHistory(history);
  void remoteDb.appendStudyHistory(action, word, {
    id: entry.id,
    created_at: entry.created_at,
    studySessionId: state.studySession?.remoteSessionId || null,
  }).catch((error) => console.warn("[Min Ordbok] Remote history sync failed.", error));
  return history;
}

function normalizeHistoryEntry(item) {
  if (!item) return null;
  return {
    id: item.id || createId(),
    action: clean(item.action) || "updated",
    word_id: item.word_id || item.wordId || "",
    swedish: clean(item.swedish),
    chinese: clean(item.chinese),
    pos: clean(item.pos) || "other",
    pos_detail: clean(item.pos_detail || item.posDetail),
    notebook: clean(item.notebook),
    created_at: Number(item.created_at || item.createdAt || Date.now()) || Date.now(),
  };
}

function normalizeShadowingLevel(value) {
  const level = Number.parseInt(value, 10);
  if (Number.isNaN(level)) return 1;
  return Math.min(5, Math.max(1, level));
}

function shadowingLevelLabel(level) {
  return shadowingStageLabels[normalizeShadowingLevel(level)] || "Level 1 Listen";
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeNotebookName(value) {
  const notebook = clean(value || DEFAULT_NOTEBOOK);
  if (notebook === "默认单词本") return DEFAULT_NOTEBOOK;
  if (notebook === "Min ordbok") return DEFAULT_NOTEBOOK;
  if (notebook === "Okategoriserad") return DEFAULT_NOTEBOOK;
  return notebook;
}

function normalizeLegacyNotebookName(value) {
  const notebook = clean(value || DEFAULT_NOTEBOOK);
  return legacyNotebookNames.has(notebook) ? DEFAULT_NOTEBOOK : normalizeNotebookName(notebook);
}

function normalizePosDetail(value) {
  const detail = clean(value);
  const map = {
    礼貌用语: "artighetsfras",
  };
  return map[detail] || detail;
}

function normalizeTag(value) {
  const tag = clean(value);
  if (!tag || isOriginTag(tag)) return "";
  const map = {
    日常: "Vardag",
    通勤: "Pendling",
    常用表达: "Vanliga uttryck",
    口语: "Talspråk",
    生活: "Vardag",
    礼貌用语: "Artighet",
    未分类: DEFAULT_NOTEBOOK,
    自建词条: "Eget ord",
    AI生成: "AI-genererad",
    AI生成草稿: "AI-utkast",
    "SFI 生活": "SFI vardag",
    "SFI 工作": "SFI jobb",
    "SFI 社会": "SFI samhälle",
    "SFI 日常": "SFI vardag",
    "SFI 医疗": "SFI vård",
    "SFI 学习": "SFI studier",
    "SFI 经济": "SFI ekonomi",
    "SFI 住房": "SFI bostad",
    "SFI 购物": "SFI inköp",
    "SFI 常用": "SFI basord",
    "SFI 时间": "SFI tid",
    "SFI 连接词": "SFI samband",
    "SFI 口语": "SFI talspråk",
    "SVA Grund 学术": "SVA Grund akademiskt",
    "SVA Grund 写作": "SVA Grund skrivande",
    "SVA Grund 阅读": "SVA Grund läsning",
    "SVA Grund 学习": "SVA Grund studier",
    "SVA Grund 社会": "SVA Grund samhälle",
    "SVA Grund 工作": "SVA Grund jobb",
    "SVA Grund 常用": "SVA Grund basord",
    "SVA Grund 连接词": "SVA Grund samband",
    "SVA Grund 讨论": "SVA Grund samtal",
    "SVA Gym 写作": "SVA Gym skrivande",
    "SVA Gym 口语": "SVA Gym muntligt",
    "SVA Gym 学术": "SVA Gym akademiskt",
    "SVA Gym 文学": "SVA Gym litteratur",
    "SVA Gym 分析": "SVA Gym analys",
    "SVA Gym 社会": "SVA Gym samhälle",
    "SVA Gym 阅读": "SVA Gym läsning",
    "SVA Gym 高级表达": "SVA Gym nyanser",
    "SVA Gym 连接词": "SVA Gym samband",
    "SVA Gym 论证": "SVA Gym argumentation",
  };
  return map[tag] || tag;
}

function normalizeTags(value) {
  const rawTags = Array.isArray(value) ? value : clean(value).split(",");
  return rawTags.map((item) => normalizeTag(item)).filter(Boolean);
}

function wordTags(word) {
  return normalizeTags(word?.tags ?? word?.tag ?? "");
}

function tagsForInput(tags) {
  return normalizeTags(tags).join(", ");
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function isOriginTag(value) {
  const text = clean(value).toLowerCase();
  return (
    text === "okategoriserad" ||
    text.includes("rivstart") ||
    text.includes("kapitel") ||
    text.includes("a1/a2") ||
    text.includes("b1/b2") ||
    text.includes("sfi") ||
    text.includes("sva") ||
    text.includes("samhälle")
  );
}

function inferPos(tag = "") {
  const text = String(tag).toLowerCase();
  if (text.includes("动词") || text.includes("verb")) return "verb";
  if (text.includes("名词") || text.includes("substantiv")) return "noun";
  if (text.includes("形容词") || text.includes("adjektiv")) return "adjective";
  if (text.includes("副词") || text.includes("adverb")) return "adverb";
  return "other";
}

function legacyPosDetail(word) {
  if (word.pos === "noun") return "en/ett";
  if (word.pos === "verb") return "vt/vi";
  return "";
}

async function seedIfNeeded() {
  buildDictionaryWords();
  const { words: mergedWords } = await readStoredWordsWithDebug();

  if (mergedWords.length === 0) {
    const seed = initialLibraryWords().map((word) => normalizeForSave(word));
    await replaceWords(seed);
    seed.forEach((word) => appendLocalHistory("created", word));
    return;
  }

  await replaceWords(mergedWords);
}

async function restoreBuiltInWordPacks() {
  const currentWords = (await readWords()).map(normalizeWord);
  const builtInById = new Map();
  const currentById = new Map(currentWords.map((word) => [clean(word.id), word]));
  const builtInBySwedish = new Map();
  const resultWords = [...currentWords];

  allWordPacks.forEach((pack) => {
    pack.words.forEach((entry) => {
      const word = normalizeWord({
        ...entry,
        notebook: DEFAULT_NOTEBOOK,
        tags: entry.tags || entry.tag || pack.level,
      });
      const id = clean(word.id);
      if (id) builtInById.set(id, word);
      const swedish = clean(word.swedish).toLowerCase();
      if (!builtInBySwedish.has(swedish)) builtInBySwedish.set(swedish, []);
      builtInBySwedish.get(swedish).push(word);
    });
  });

  builtInById.forEach((baseWord, id) => {
    const current = currentById.get(id);
    if (current) {
      const merged = mergeBuiltInState(baseWord, current);
      const index = resultWords.findIndex((word) => clean(word.id) === id);
      if (index >= 0) resultWords[index] = merged;
      return;
    }
    resultWords.push(baseWord);
  });

  const repairedWords = resultWords.map((word) => {
    if (isBuiltInWord(word)) return word;
    return repairMissingBuiltInContent(word, builtInBySwedish);
  });

  await replaceWords(repairedWords);
}

function mergeBuiltInState(base, current) {
  return normalizeWord({
    ...base,
    id: current.id || base.id,
    notebook: current.notebook || base.notebook,
    book_names: current.book_names?.length ? current.book_names : base.book_names,
    favorite: current.favorite || base.favorite,
    learned: current.learned || base.learned,
    review_count: Math.max(current.review_count || 0, base.review_count || 0),
    next_review_at: current.next_review_at || base.next_review_at,
    created_at: current.created_at || base.created_at,
    updated_at: current.updated_at || base.updated_at,
    wrong_count: Math.max(current.wrong_count || 0, base.wrong_count || 0),
    last_reviewed: current.last_reviewed || base.last_reviewed,
    tags: current.tags?.length ? current.tags : base.tags,
  });
}

function mergeRestoredBuiltInWord(base, overlay) {
  return normalizeWord({
    ...base,
    id: overlay.id || base.id,
    notebook: overlay.notebook || base.notebook,
    book_names: overlay.book_names?.length ? overlay.book_names : base.book_names,
    chinese: richerText(base.chinese, overlay.chinese),
    english: richerText(base.english, overlay.english),
    forms: richerText(base.forms, overlay.forms),
    example: richerText(base.example, overlay.example),
    collocations: richerText(base.collocations, overlay.collocations),
    related_words: richerText(base.related_words, overlay.related_words),
    favorite: overlay.favorite || base.favorite,
    learned: overlay.learned || base.learned,
    review_count: Math.max(overlay.review_count || 0, base.review_count || 0),
    next_review_at: overlay.next_review_at || base.next_review_at,
    created_at: overlay.created_at || base.created_at,
    updated_at: overlay.updated_at || base.updated_at,
    wrong_count: Math.max(overlay.wrong_count || 0, base.wrong_count || 0),
    last_reviewed: overlay.last_reviewed || base.last_reviewed,
    tags: overlay.tags?.length ? overlay.tags : base.tags,
  });
}

function richerText(baseValue, overlayValue) {
  const base = clean(baseValue);
  const overlay = clean(overlayValue);
  if (!base || isPlaceholderText(base)) return overlay || base;
  if (!overlay || isPlaceholderText(overlay)) return base;
  return textRichnessScore(overlay) > textRichnessScore(base) ? overlay : base;
}

function repairMissingBuiltInContent(word, builtInBySwedish) {
  const candidates = builtInBySwedish.get(clean(word.swedish).toLowerCase()) || [];
  if (candidates.length === 0) return word;
  const source = candidates.find((item) => item.pos === word.pos) || candidates[0];
  const patch = {};
  if (shouldUseBuiltInText(word.chinese, source.chinese)) patch.chinese = source.chinese;
  if (shouldUseBuiltInText(word.english, source.english)) patch.english = source.english;
  if (shouldUseBuiltInText(word.forms, source.forms)) patch.forms = source.forms;
  if (shouldUseBuiltInText(word.example, source.example)) patch.example = source.example;
  if (shouldUseBuiltInText(word.related_words, source.related_words)) patch.related_words = source.related_words;
  if (collocationsNeedChineseMeaning(word.collocations) && !collocationsNeedChineseMeaning(source.collocations)) {
    patch.collocations = source.collocations;
  }
  return Object.keys(patch).length ? normalizeWord({ ...word, ...patch, updated_at: Date.now() }) : word;
}

function shouldUseBuiltInText(currentValue, builtInValue) {
  const current = clean(currentValue);
  const builtIn = clean(builtInValue);
  return Boolean(builtIn) && (!current || isPlaceholderText(current));
}

function isPlaceholderText(value) {
  const text = clean(value).toLowerCase();
  return (
    !text ||
    text === NEEDS_REVIEW_PLACEHOLDER ||
    text === `${NEEDS_REVIEW_PLACEHOLDER}.` ||
    text === "kinesisk betydelse saknas." ||
    text === "kinesisk betydelse saknas" ||
    text === "svensk förklaring saknas." ||
    text === "svensk förklaring saknas" ||
    text === "ordklass saknas." ||
    text === "ordklass saknas" ||
    text === "böjning saknas." ||
    text === "böjning saknas" ||
    text === "exempel saknas." ||
    text === "exempel saknas" ||
    text === "exempel saknas för den här frasen" ||
    text === "fraser saknas." ||
    text === "fraser saknas" ||
    text === "relaterade ord saknas." ||
    text === "relaterade ord saknas" ||
    text === "ordkortet behöver kompletteras med betydelse, exempel eller fraser." ||
    text === "待补中文释义。" ||
    text === "待补中文释义" ||
    text === "待完善" ||
    text === "待完善。"
  );
}

function hasMeaningfulText(value) {
  const text = clean(value);
  return Boolean(text) && !isPlaceholderText(text);
}

function makeFallbackExample(word, phrase = clean(word.swedish)) {
  const subject = clean(phrase || word.swedish || "ordet");
  const quoted = subject.replace(/"/g, "");
  switch (word.pos) {
    case "verb":
      return `Jag försöker ${quoted} i dag.`;
    case "noun":
      return `Jag använder ordet "${quoted}" i vardagen.`;
    case "adjective":
      return `Det här är ${quoted}.`;
    case "adverb":
      return `Det känns ${quoted} i dag.`;
    case "phrase":
      return `Jag använder uttrycket "${quoted}" i vardagen.`;
    default:
      return `Jag såg "${quoted}" i en svensk text.`;
  }
}

function makeFallbackCollocationLine(word, phrase = clean(word.swedish)) {
  const term = clean(phrase || word.swedish || NEEDS_REVIEW_PLACEHOLDER) || NEEDS_REVIEW_PLACEHOLDER;
  return `${term} | ${NEEDS_REVIEW_PLACEHOLDER} | ${makeFallbackExample(word, term)}`;
}

function normalizeStructuredLine(line, word, fallbackLineFactory) {
  const cleanLine = clean(line);
  if (!cleanLine || isPlaceholderText(cleanLine)) return fallbackLineFactory();
  const parts = cleanLine.split(/\s+\|\s+|\s+—\s+|\s+-\s+/);
  const phrase = clean(parts[0]) || clean(word.swedish) || NEEDS_REVIEW_PLACEHOLDER;
  const second = clean(parts[1]);
  const remainder = clean(parts.slice(2).join(" - "));
  if (parts.length >= 3) {
    const meaning = hasMeaningfulText(second) ? second : NEEDS_REVIEW_PLACEHOLDER;
    const example = hasMeaningfulText(remainder) ? stripChineseExampleTranslation(remainder) : makeFallbackExample(word, phrase);
    return `${phrase} | ${meaning} | ${example}`;
  }
  if (parts.length === 2) {
    const meaning = hasMeaningfulText(second) ? second : NEEDS_REVIEW_PLACEHOLDER;
    return `${phrase} | ${meaning} | ${makeFallbackExample(word, phrase)}`;
  }
  return fallbackLineFactory(phrase);
}

function normalizeCollocationsText(value, word, builtInValue = "") {
  const lines = splitMultilineItems(value || builtInValue);
  if (lines.length === 0) return makeFallbackCollocationLine(word);
  return lines.map((line) => normalizeStructuredLine(line, word, (phrase) => makeFallbackCollocationLine(word, phrase))).join("\n");
}

function normalizeRelatedWordsText(value, builtInValue = "") {
  const lines = splitMultilineItems(value || builtInValue);
  if (lines.length === 0) return NEEDS_REVIEW_PLACEHOLDER;
  return lines
    .map((line) => {
      const cleanLine = clean(line);
      if (!cleanLine || isPlaceholderText(cleanLine)) return NEEDS_REVIEW_PLACEHOLDER;
      const parts = cleanLine.split(/\s+\|\s+|\s+—\s+|\s+-\s+/);
      const word = clean(parts[0]);
      const meaning = clean(parts.slice(1).join(" - "));
      if (!word) return NEEDS_REVIEW_PLACEHOLDER;
      return `${word} | ${hasMeaningfulText(meaning) ? meaning : NEEDS_REVIEW_PLACEHOLDER}`;
    })
    .filter(Boolean)
    .join("\n");
}

function buildBuiltInWordsBySwedish() {
  const sourceWords = dictionaryWords.length > 0 ? dictionaryWords : initialLibraryWords();
  const builtInBySwedish = new Map();
  sourceWords.forEach((word) => {
    const normalized = normalizeWord(word);
    const swedish = clean(normalized.swedish).toLowerCase();
    if (!swedish) return;
    if (!builtInBySwedish.has(swedish)) builtInBySwedish.set(swedish, []);
    builtInBySwedish.get(swedish).push(normalized);
  });
  return builtInBySwedish;
}

function repairWordContent(word, builtInBySwedish) {
  const candidates = builtInBySwedish.get(clean(word.swedish).toLowerCase()) || [];
  const source = candidates.find((item) => item.pos === word.pos) || candidates[0] || null;
  const patched = normalizeWord({
    ...word,
    chinese: hasMeaningfulText(word.chinese)
      ? word.chinese
      : hasMeaningfulText(source?.chinese)
        ? source.chinese
        : NEEDS_REVIEW_PLACEHOLDER,
    english: hasMeaningfulText(word.english)
      ? word.english
      : hasMeaningfulText(source?.english)
        ? source.english
        : NEEDS_REVIEW_PLACEHOLDER,
    forms: hasMeaningfulText(word.forms)
      ? word.forms
      : hasMeaningfulText(source?.forms)
        ? source.forms
        : NEEDS_REVIEW_PLACEHOLDER,
    example: hasMeaningfulText(word.example)
      ? stripChineseExampleTranslation(word.example)
      : hasMeaningfulText(source?.example)
        ? stripChineseExampleTranslation(source.example)
        : makeFallbackExample(word),
    collocations: normalizeCollocationsText(word.collocations, word, source?.collocations || ""),
    related_words: normalizeRelatedWordsText(word.related_words, source?.related_words || ""),
    updated_at: hasMeaningfulText(word.example) ||
      hasMeaningfulText(word.chinese) ||
      hasMeaningfulText(word.english) ||
      hasMeaningfulText(word.forms) ||
      hasMeaningfulText(word.collocations) ||
      hasMeaningfulText(word.related_words)
      ? word.updated_at
      : Date.now(),
  });
  return {
    word: patched,
    changed: JSON.stringify(patched) !== JSON.stringify(normalizeWord(word)),
  };
}

function repairIncompleteWordContent(words) {
  const builtInBySwedish = buildBuiltInWordsBySwedish();
  let repairedCount = 0;
  const repairedWords = words.map((word) => {
    const result = repairWordContent(word, builtInBySwedish);
    if (result.changed) repairedCount += 1;
    return result.word;
  });
  const beforeCount = words.filter(needsEnrichment).length;
  const afterCount = repairedWords.filter(needsEnrichment).length;
  return {
    words: repairedWords,
    stats: {
      total: words.length,
      incompleteBefore: beforeCount,
      repairedCount,
      incompleteAfter: afterCount,
    },
  };
}

function collocationsNeedChineseMeaning(value) {
  const lines = splitMultilineItems(value);
  if (lines.length === 0) return true;
  return lines.some((line) => {
    const parts = line.split(/\s+\|\s+|\s+—\s+|\s+-\s+/).map(clean);
    if (isPlaceholderText(line)) return true;
    if (parts.length < 3) return true;
    return !/[\u4e00-\u9fff]/.test(parts[1] || "");
  });
}

function textRichnessScore(value) {
  const text = clean(value);
  return text.length + splitMultilineItems(text).length * 40;
}

function splitMultilineItems(value) {
  return clean(value)
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function applyManualRelatedWordExamples() {
  const examples = new Map([
    [
      "förbättring",
      [
        "förbättra | 改善、提高（动词）",
        "bättre | 更好",
        "utveckling | 发展、进步",
      ],
    ],
    [
      "mottagare",
      [
        "avsändare | 发件人",
        "ta emot | 接收",
        "mottagning | 接待、接收",
      ],
    ],
  ]);
  const words = (await readWords()).map(normalizeWord);
  let changed = false;
  const updatedWords = words.map((word) => {
    const related_words = examples.get(clean(word.swedish).toLowerCase());
    if (!related_words || clean(word.related_words)) return word;
    changed = true;
    return normalizeForSave({
      ...word,
      related_words: related_words.join("\n"),
    });
  });
  if (changed) await replaceWords(updatedWords);
}

async function loadData() {
  const words = await readWords();
  await refreshDailyProgress(words);
  remotePhase4Snapshot = await remoteDb.loadRemotePhase4Snapshot({
    date: todayKey(),
    scope: state.studyScope || STUDY_SCOPE_ALL,
  }).catch((error) => {
    console.warn("[Min Ordbok] Phase 4 remote snapshot failed. Official data remains Supabase-only.", error);
    return null;
  });
  if (remotePhase4Snapshot?.preferences) {
    state.studyScope = remotePhase4Snapshot.preferences.studyScope || state.studyScope || STUDY_SCOPE_ALL;
    state.selectedNotebook = remotePhase4Snapshot.preferences.selectedNotebookName || state.selectedNotebook;
    state.shadowingShowSubtitles = remotePhase4Snapshot.preferences.shadowingShowSubtitles;
    state.shadowingContinuous = remotePhase4Snapshot.preferences.shadowingContinuous;
    state.shadowingAutoPause = remotePhase4Snapshot.preferences.shadowingAutoPause;
    state.shadowingLevel = remotePhase4Snapshot.preferences.shadowingLevel || state.shadowingLevel;
    if (remotePhase4Snapshot.preferences.preferences?.favoriteCategory) {
      state.favoriteCategory = remotePhase4Snapshot.preferences.preferences.favoriteCategory;
    }
    if (remotePhase4Snapshot.preferences.preferences?.dailyNewWordTarget) {
      state.dailyNewWordTarget = Number(remotePhase4Snapshot.preferences.preferences.dailyNewWordTarget) || 10;
    }
    if (remotePhase4Snapshot.preferences.preferences?.exportNotebook) {
      state.exportNotebook = remotePhase4Snapshot.preferences.preferences.exportNotebook;
    }
    if (remotePhase4Snapshot.preferences.preferences?.exportPos) {
      state.exportPos = remotePhase4Snapshot.preferences.preferences.exportPos;
    }
    if (remotePhase4Snapshot.preferences.preferences?.shadowingLoopEnabled !== undefined) {
      state.shadowingLoopEnabled = Boolean(remotePhase4Snapshot.preferences.preferences.shadowingLoopEnabled);
    }
    if (remotePhase4Snapshot.studyPlan?.scope !== state.studyScope) {
      remotePhase4Snapshot = await remoteDb.loadRemotePhase4Snapshot({
        date: todayKey(),
        scope: state.studyScope,
      }).catch(() => remotePhase4Snapshot);
    }
  }
  if (remotePhase4Snapshot?.notebooks?.length) {
    remoteLibrarySnapshot = {
      ...(remoteLibrarySnapshot || {}),
      books: mergeNotebookNames(remoteLibrarySnapshot?.books || [], remotePhase4Snapshot.notebooks),
    };
    remoteLibrarySnapshotLoaded = true;
  }
  const history = remotePhase4Snapshot?.history || [];
  state.favoriteStates = new Map();
  state.words = words
    .map(normalizeWord)
    .map(applyFavoriteState)
    .sort((a, b) => b.updated_at - a.updated_at);
  state.history = history.sort((a, b) => b.created_at - a.created_at);
  state.studyStats = readStudyStats();
  state.dailyStudy = applyRemoteStudyState(ensureDailyStudyPlan(state.studyScope), remotePhase4Snapshot);
  await ensureRemoteDailyStudySessions(state.dailyStudy);
  state.shadowingRecordings = remotePhase4Snapshot?.shadowingRecordings || [];
  state.shadowing = mergeShadowingItemsForApp(remotePhase4Snapshot?.shadowingItems || []);
  await refreshEffectiveStudyTimeCloud(todayKey());
  console.info("[Min Ordbok] Data init", {
    wordsLength: state.words.length,
    booksLength: getNotebooks().length,
    remoteReadOk: lastWordLoadDebug.remoteReadOk,
    remoteLength: lastWordLoadDebug.remoteLength,
    remoteBookLength: lastWordLoadDebug.remoteBookLength,
    fromLocalStorage: lastWordLoadDebug.fromLocalStorage,
    fromIndexedDb: lastWordLoadDebug.fromIndexedDb,
    fromRemote: lastWordLoadDebug.fromRemote,
    indexedDbLength: lastWordLoadDebug.indexedDbLength,
    localStorageLength: lastWordLoadDebug.localStorageLength,
    dailyNewWords: state.dailyStudy.newWordIds?.length || 0,
    dailyReviewWords: state.dailyStudy.reviewWordIds?.length || 0,
    phase4Remote: Boolean(remotePhase4Snapshot?.enabled),
    phase4History: remotePhase4Snapshot?.history?.length || 0,
    phase4Shadowing: remotePhase4Snapshot?.shadowingItems?.length || 0,
  });
  renderAll();
}

function buildDictionaryWords() {
  dictionaryWords.splice(0, dictionaryWords.length);
  const seen = new Set();
  state.words
    .map((word) => normalizeWord(word))
    .forEach((word) => {
      const key = word.swedish.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        dictionaryWords.push(word);
      }
    });
}

function wordKey(word) {
  const id = clean(word.id);
  if (id) return id;
  return `${clean(word.notebook).toLowerCase()}::${clean(word.swedish).toLowerCase()}::${clean(word.pos).toLowerCase()}`;
}

function historyEntry(action, word) {
  return {
    id: createId(),
    action,
    word_id: word.id,
    swedish: word.swedish,
    chinese: word.chinese,
    pos: word.pos,
    pos_detail: word.pos_detail,
    notebook: word.notebook,
    created_at: Date.now(),
  };
}

async function addHistory(action, word) {
  appendLocalHistory(action, word);
}

function isDue(word) {
  return !word.learned || word.next_review_at <= Date.now();
}

function searchableText(word) {
  const cached = searchTextCache.get(word);
  if (cached) return cached;
  const text = [
    word.swedish,
    posLabels[word.pos],
    word.pos_detail,
    word.chinese,
    word.english,
    word.forms,
    word.example,
    word.collocations,
    word.related_words,
    word.note,
  ]
    .join(" ")
    .toLocaleLowerCase("sv-SE");
  searchTextCache.set(word, text);
  return text;
}

function normalizeSearchTerm(value) {
  return clean(value).toLocaleLowerCase("sv-SE");
}

function addSearchIndexValue(values, value) {
  const normalized = normalizeSearchTerm(value)
    .replace(/[.!?。]+$/g, "")
    .replace(/\s+/g, " ");
  if (!normalized) return;
  values.add(normalized);
  normalized
    .split(/[\s/|,，]+/)
    .map(normalizeSearchTerm)
    .filter((part) => part && !["en", "ett", "den", "det", "de", "plural"].includes(part))
    .forEach((part) => values.add(part));
}

function wordSearchIndex(word) {
  const cached = searchIndexCache.get(word);
  if (cached) return cached;

  const values = new Set();
  addSearchIndexValue(values, word.swedish);
  splitForms(word.forms).forEach((form) => {
    const [rawLabel, ...rawValueParts] = form.split(":");
    const value = rawValueParts.length > 0 ? rawValueParts.join(":") : rawLabel;
    addSearchIndexValue(values, value);
  });

  const index = [...values];
  searchIndexCache.set(word, index);
  return index;
}

function wordMatchesQuery(word, query) {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return true;
  return searchableText(word).includes(normalizedQuery) || wordSearchIndex(word).some((entry) => entry.includes(normalizedQuery));
}

function wordMatchesExactSearchForm(word, query) {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) return false;
  return wordSearchIndex(word).some((entry) => entry === normalizedQuery);
}

function exactSearchRank(word, query) {
  const normalizedQuery = normalizeSearchTerm(query);
  if (normalizeSearchTerm(word.swedish) === normalizedQuery) return 0;
  const forms = splitForms(word.forms);
  if (word.pos === "verb" && forms.some((form) => normalizeSearchTerm(form.split(":").slice(1).join(":")) === normalizedQuery)) return 1;
  if (forms.some((form) => normalizeSearchTerm(form.split(":").slice(1).join(":")) === normalizedQuery)) return 2;
  return 3;
}

function getVisibleWords() {
  const query = normalizeSearchTerm(state.query);
  const words = getLibraryWordsForDisplay();
  const exactFormMatches = query
    ? words.filter((word) => wordMatchesExactSearchForm(word, query)).sort((a, b) => exactSearchRank(a, query) - exactSearchRank(b, query))
    : [];
  const searchPool = exactFormMatches.length > 0 ? exactFormMatches : words;
  return searchPool.filter((word) => {
    const matchesQuery = exactFormMatches.length > 0 || wordMatchesQuery(word, query);
    if (!matchesQuery) return false;
    if (state.filter === "due") return isDue(word);
    if (state.filter === "favorite") {
      return word.favorite && (state.favoriteCategory === "all" || getFavoriteCategory(word) === state.favoriteCategory);
    }
    if (state.filter === "learned") return word.learned;
    if (primaryPos.includes(state.filter)) return word.pos === state.filter;
    if (state.filter === "other-pos") return !primaryPos.includes(word.pos);
    return true;
  });
}

function getDictionaryMatches() {
  const query = normalizeSearchTerm(state.query);
  if (!query) return [];
  return dictionaryWords
    .filter((word) => wordMatchesQuery(word, query))
    .sort((a, b) => dictionaryRank(a, query) - dictionaryRank(b, query))
    .slice(0, 20);
}

function dictionaryRank(word, query) {
  const swedish = normalizeSearchTerm(word.swedish);
  const index = wordSearchIndex(word);
  if (swedish === query) return 0;
  if (index.some((entry) => entry === query)) return 1;
  if (swedish.startsWith(query)) return 2;
  if (swedish.includes(query)) return 3;
  if (index.some((entry) => entry.startsWith(query))) return 4;
  if (index.some((entry) => entry.includes(query))) return 5;
  return 6;
}

function getNotebooks() {
  const notebooks = new Set([LEARNED_NOTEBOOK, ...FIXED_NOTEBOOKS, ...readNotebookNames()]);
  getLibraryWordsForDisplay().forEach((word) => {
    const notebook = normalizeNotebookName(word.notebook);
    if (notebook && notebook !== DEFAULT_NOTEBOOK && !isLearnedNotebook(notebook) && !builtInNotebookNames.has(notebook)) {
      notebooks.add(notebook);
    }
    wordBookNames(word).forEach((book) => {
      if (book && book !== DEFAULT_NOTEBOOK && !isLearnedNotebook(book) && !builtInNotebookNames.has(book)) {
        notebooks.add(book);
      }
    });
  });
  return [...notebooks].filter(Boolean);
}

function getNotebookWords(notebook = state.selectedNotebook) {
  if (isLearnedNotebook(notebook)) {
    return getLibraryWordsForDisplay().filter(isWordInLearnedNotebook);
  }
  return getLibraryWordsForDisplay().filter((word) =>
    sameCategory(word.notebook, notebook) || wordBookNames(word).some((book) => sameCategory(book, notebook)),
  );
}

function getUserNotebooks() {
  return getNotebooks().filter((notebook) => !isLearnedNotebook(notebook));
}

function getWordsByExportPos(words, pos = state.exportPos) {
  if (pos === "all") return words;
  if (primaryPos.includes(pos)) return words.filter((word) => word.pos === pos);
  if (pos === "other-pos") return words.filter((word) => !primaryPos.includes(word.pos));
  return words;
}

function getLibraryWordsForDisplay() {
  return state.words.length > 0 ? state.words : initialLibraryWords();
}

function getFilteredHistory() {
  return state.history.filter((item) => {
    const posMatch =
      state.historyPos === "all" ||
      item.pos === state.historyPos ||
      (state.historyPos === "other-pos" && !primaryPos.includes(item.pos));
    const actionMatch = state.historyAction === "all" || item.action === state.historyAction;
    return posMatch && actionMatch;
  });
}

function resetListLimit(key) {
  state.listLimits[key] = key === "history" ? INITIAL_HISTORY_LIMIT : INITIAL_LIST_LIMIT;
}

function increaseListLimit(key) {
  const current = state.listLimits[key] || (key === "history" ? INITIAL_HISTORY_LIMIT : INITIAL_LIST_LIMIT);
  state.listLimits[key] = current + (key === "history" ? HISTORY_LIMIT_STEP : LIST_LIMIT_STEP);
}

function renderAll() {
  renderAuthState();
  renderStats();
  renderNotebookOptions();
  renderExportNotebookOptions();
  renderFavoriteCategoryFilter();
  renderStudyScopeOptions();
  renderStudyStats();
  renderActiveView();
}

function renderActiveView() {
  if (state.activeView === "homeView") {
    return;
  }
  if (state.activeView === "profileView") {
    renderProfileView();
    return;
  }
  if (state.activeView === "notebookView") {
    renderNotebook();
    return;
  }
  if (state.activeView === "historyView") {
    renderShadowing();
    return;
  }
  if (state.activeView === "fraserView") {
    renderFraserView();
    return;
  }
  if (state.activeView === "readingView") {
    renderReadingView();
    return;
  }
  renderWords();
  renderDictionary();
}

async function renderFraserView() {
  if (!phraseObjectsLoaded) {
    phraseObjectsLoaded = true;
    try {
      const rows = await remoteDb.loadPhraseObjects();
      phraseObjects.splice(0, phraseObjects.length, ...rows);
    } catch (error) {
      console.warn("[SpråkLab] Failed to load Fraser/Uttryck catalog.", error);
    }
    if (state.activeView === "fraserView") renderFraserView();
    return;
  }
  const filtered =
    state.fraserTypeFilter === "all"
      ? phraseObjects
      : phraseObjects.filter((item) => item.object_type === state.fraserTypeFilter);
  renderWordCollection(
    els.fraserList,
    filtered,
    "Inga fraser eller uttryck ännu — de tillkommer när ord kompletteras med Fraser/Uttryck-innehåll.",
    "dictionary",
    "fraser",
  );
}

// Läsning V1 (paste-text only, no OCR/PDF/photo — see
// Reviews/下一阶段规划-...md §5). Reading items are user-owned/private
// (require login, same as Shadowing — reading_items RLS is
// authenticated-only), so this list is empty for anonymous sessions.
async function renderReadingView() {
  if (!state.readingItemsLoaded) {
    state.readingItemsLoaded = true;
    try {
      state.readingItems = await remoteDb.loadReadingItems();
    } catch (error) {
      console.warn("[SpråkLab] Failed to load reading items.", error);
    }
    if (state.activeView === "readingView") renderReadingView();
    return;
  }
  renderReadingList();
}

// "Mina läsningar" richer history (2026-07-30, tier-2 item 6 of Reviews/
// 阅读模块设计想法-专业review-2026-07-27.md §十三) — renders instantly with
// what's already in memory (title/snippet/date), then progressively adds
// word count / CEFR / discovery counts once the batched stats query
// returns (same pattern as enhanceReadingAnalysisWithItemState).
function renderReadingList() {
  if (!els.readingList) return;
  els.readingList.replaceChildren();
  if (state.readingItems.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Inga texter ännu. Klicka på \"Ny text\" för att klistra in en svensk text.";
    els.readingList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  state.readingItems.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "reading-item-card";
    card.dataset.readingId = item.id;
    const title = document.createElement("strong");
    title.textContent = item.title || "(Utan titel)";
    const snippet = document.createElement("span");
    snippet.className = "reading-item-snippet";
    snippet.textContent = clean(item.source_text).slice(0, 80);
    const meta = document.createElement("span");
    meta.className = "reading-item-meta";
    meta.dataset.readingItemMeta = item.id;
    meta.textContent = item.text_resource_id ? formatReadingItemDate(item.updatedAt || item.createdAt) : `${formatReadingItemDate(item.updatedAt || item.createdAt)} · Ej analyserad än`;
    card.append(title, snippet, meta);
    fragment.append(card);
  });
  els.readingList.append(fragment);
  enhanceReadingListWithStats();
}

function formatReadingItemDate(timestamp) {
  const value = Number(timestamp || 0) || 0;
  if (!value) return "";
  const dateKey = localDateKeyForTimestamp(value);
  const today = localDateKeyForTimestamp(Date.now());
  if (dateKey === today) return "Idag";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === localDateKeyForTimestamp(yesterday.getTime())) return "Igår";
  const daysAgo = Math.round((Date.now() - value) / 86400000);
  if (daysAgo > 0 && daysAgo < 7) return `${daysAgo} dagar sedan`;
  return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}

async function enhanceReadingListWithStats() {
  const ids = state.readingItems.map((item) => item.text_resource_id).filter(Boolean);
  if (!ids.length) return;
  let statsByResource;
  try {
    statsByResource = await remoteDb.loadReadingListStats(ids);
  } catch (error) {
    console.warn("[SpråkLab] Failed to load reading list stats.", error);
    return;
  }
  // 2026-08-03: cached so openReadingEditor can synchronously decide
  // "already analyzed -> go straight to results" without an editor-page
  // flash in the common case (the list's own stats fetch has usually
  // already resolved by the time the user taps a card).
  state.readingListStats = { ...(state.readingListStats || {}), ...statsByResource };
  state.readingItems.forEach((item) => {
    if (!item.text_resource_id) return;
    const meta = els.readingList?.querySelector(`[data-reading-item-meta="${item.id}"]`);
    const stats = meta && statsByResource[item.text_resource_id];
    if (!meta || !stats) return;
    const dateLabel = formatReadingItemDate(item.updatedAt || item.createdAt);
    const cefr = estimateCefrRange(stats.vocabulary);
    const parts = [dateLabel, `${stats.wordCount} ord`];
    if (cefr) parts.push(cefr);
    if (stats.vocabCount + stats.exprCount + stats.sentenceCount > 0) {
      parts.push(`${stats.vocabCount} ord · ${stats.exprCount} fraser · ${stats.sentenceCount} meningar`);
    }
    meta.textContent = parts.filter(Boolean).join(" · ");
  });
}

function readingWordCount(text) {
  return (clean(text).match(/[a-zA-ZåäöÅÄÖ]+/g) || []).length;
}

// 规范§5 — surfaces the length tier before the user hits "Analysera", so a
// long text doesn't look like a silent failure.
function updateReadingWordCountNote() {
  if (!els.readingWordCountNote) return;
  const count = readingWordCount(els.readingTextInput.value);
  if (!count) {
    els.readingWordCountNote.hidden = true;
    return;
  }
  let note = `${count} ord.`;
  if (count > 2000) note += " För lång för att sparas i sin helhet just nu (max 2000 ord).";
  else if (count > 1000) note += " Över 1000 ord — markera det stycke du vill analysera i textrutan innan du klickar på Analysera.";
  else if (count > 500) note += " Lite längre text — analysen kostar något mer.";
  els.readingWordCountNote.hidden = false;
  els.readingWordCountNote.textContent = note;
}

// 规范§12 — extraction only, no analysis. Appends to any existing text
// (rather than replacing) so a multi-page article can be built up from
// several photos; the result lands in the editable textarea exactly like
// pasted text, per Rachel's original requirement that extracted text stay
// fully editable before saving.
// 缺口2 (2026-07-30) — plain read-only display of whatever glossary the
// photo import (or a previously-saved reading item) carries. Not part of
// the reading_analysis_items state-tracking system (that's for AI-surfaced
// items); this is just showing back what the textbook itself already
// printed, so no ignore/status affordance here.
function renderTextbookGlossary(glossary) {
  if (!els.readingTextbookGlossary || !els.readingTextbookGlossaryList) return;
  const entries = glossary || [];
  els.readingTextbookGlossary.hidden = !entries.length;
  els.readingTextbookGlossaryList.replaceChildren();
  entries.forEach((entry) => {
    const dt = document.createElement("dt");
    dt.textContent = entry.word;
    const dd = document.createElement("dd");
    dd.textContent = entry.definition;
    els.readingTextbookGlossaryList.append(dt, dd);
  });
}

async function handleReadingPhotoImport(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  els.readingPhotoStatus.hidden = false;
  els.readingPhotoStatus.textContent = "Läser text från bilden…";
  els.importReadingPhotoBtn.disabled = true;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const { text, glossary, warning } = await remoteDb.extractTextFromImage(dataUrl);
    if (warning || !text) {
      els.readingPhotoStatus.textContent = warning || "Ingen text hittades i bilden.";
      return;
    }
    const existing = clean(els.readingTextInput.value);
    const combined = existing ? `${existing}\n\n${text}` : text;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(els.readingTextInput, combined);
    els.readingTextInput.dispatchEvent(new Event("input", { bubbles: true }));
    // 缺口2 (2026-07-30): a multi-page import (several photos of the same
    // article) accumulates glossary entries across all of them, same as the
    // text itself accumulates in the textarea above.
    if (glossary?.length) {
      const existingWords = new Set((state.readingPendingGlossary || []).map((g) => g.word.toLowerCase()));
      state.readingPendingGlossary = [...(state.readingPendingGlossary || []), ...glossary.filter((g) => !existingWords.has(g.word.toLowerCase()))];
      renderTextbookGlossary(state.readingPendingGlossary);
    }
    els.readingPhotoStatus.textContent = glossary?.length
      ? `Text importerad, inklusive ${glossary.length} ord från en ordlista i bilden — granska och redigera innan du sparar.`
      : "Text importerad — granska och redigera innan du sparar.";
  } catch (error) {
    console.warn("[SpråkLab] Photo import failed.", error);
    els.readingPhotoStatus.textContent = error.message || "Kunde inte läsa texten från bilden.";
  } finally {
    els.importReadingPhotoBtn.disabled = false;
  }
}

// 2026-08-03, Rachel's decision: Läsning becomes two separate pages — the
// edit form (this panel) and the AI results/"learning card stream"
// (readingAnalysisPanel, now a sibling instead of nested inside this one).
// showReadingEditorPanel/openReadingResults are the two dumb panel-toggle
// primitives; openReadingEditor is the smart entry point that decides which
// one to land on (only used from "Ny text" and clicking a list item — NOT
// from the Tillbaka button on the results page, which must always show the
// editor regardless of analysis state or it would just bounce right back).
function showReadingEditorPanel() {
  els.readingListPanel.hidden = true;
  els.readingList.hidden = true;
  els.readingAnalysisPanel.hidden = true;
  els.readingEditorPanel.hidden = false;
  // 2026-08-10, Rachel's request: reached via "✎ Redigera text" on the
  // results page → Tillbaka moves into the header (replacing Till
  // Bibliotek there) and Ta bort lives only in that page's "⋯" menu now,
  // so both local buttons hide here to avoid duplicating them. Reached the
  // normal way (Ny text / a list item) → both stay exactly as before.
  if (els.closeReadingEditorBtn) els.closeReadingEditorBtn.hidden = state.readingEditorFromResults;
  if (state.readingEditorFromResults && els.deleteReadingBtn) els.deleteReadingBtn.hidden = true;
  updateTopbarLibraryBack();
}

function openReadingResults(item) {
  if (els.readingAnalysisHeading) els.readingAnalysisHeading.textContent = item?.title || "Läsning";
  els.readingListPanel.hidden = true;
  els.readingList.hidden = true;
  els.readingEditorPanel.hidden = true;
  els.readingAnalysisPanel.hidden = false;
  closeReadingMoreMenu();
  updateTopbarLibraryBack();
}

// 2026-08-10, Rachel's request: Tillbaka on the results page moved into the
// top-right header slot (replacing "Till Bibliotek" there — see
// updateTopbarLibraryBack) and now always returns straight to the Läsning
// main list, regardless of how the page was reached. "✎ Redigera text"
// (editReadingResultsText, now inside the "⋯" menu — readingMoreMenu)
// remains the only path back into the editor, to fix a typo in an
// already-analyzed article's source text.
function closeReadingResults() {
  closeReadingEditor();
}

// Reached only from the results page's "⋯" menu (Rachel, 2026-08-10):
// Tillbaka there moves into the header too, replacing Till Bibliotek, and
// returns straight to results instead of the main list.
function closeReadingEditorToResults() {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  openReadingResults(item);
}

function editReadingResultsText() {
  state.readingEditorFromResults = true;
  showReadingEditorPanel();
}

function closeReadingMoreMenu() {
  if (els.readingMoreMenu) els.readingMoreMenu.hidden = true;
}

function openReadingEditor(item = null) {
  state.selectedReadingId = item?.id || "";
  state.currentReadingAnalysis = null;
  state.readingEditorFromResults = false;
  state.readingPendingGlossary = [];
  state.currentReadingWordCount = 0;
  renderTextbookGlossary([]);
  // 2026-08-01, Rachel's feedback #6: reopening an already-saved item was
  // always showing "Ny text" (the create-flow heading), confusing since
  // you're reviewing/continuing something existing, not creating anything.
  if (els.readingEditorHeading) els.readingEditorHeading.textContent = item?.id ? item.title || "Läsning" : "Ny text";
  if (els.readingEditorIntro) {
    els.readingEditorIntro.hidden = Boolean(item?.id);
    els.readingEditorIntro.textContent = "Klistra in en svensk text eller importera ett foto, spara den, och låt AI hjälpa dig med sammanfattning och nya ord.";
  }
  els.readingItemId.value = item?.id || "";
  els.readingTitleInput.value = item?.title || "";
  els.readingTextInput.value = item?.source_text || "";
  els.deleteReadingBtn.hidden = !item?.id;
  els.analyzeReadingBtn.hidden = !item?.id;
  if (els.openInShadowingBtn) els.openInShadowingBtn.hidden = !item?.id;
  // 2026-08-02, Rachel's feedback: Spara staying visible forever (even
  // right after a successful save, with nothing new to persist) read as a
  // second, purposeless "spara" step alongside Analysera/Öppna i Shadowing,
  // which already re-save on the user's behalf before doing their own job.
  // Hide it once there's nothing unsaved; the input listeners below bring
  // it back the moment the user actually changes something.
  els.saveReadingBtn.hidden = Boolean(item?.id);
  updateReadingWordCountNote();
  renderReadingAnnotateSection(item);
  if (els.readingTextInput) els.readingTextInput.classList.remove("reading-text-collapsed");
  if (els.readingTextToggleBtn) els.readingTextToggleBtn.hidden = true;
  if (els.readingPhotoStatus) els.readingPhotoStatus.hidden = true;
  if (els.sendSelectedSentencesToShadowingBtn) els.sendSelectedSentencesToShadowingBtn.hidden = true;

  // 2026-08-03: land directly on the results page for an item that's
  // already analyzed, using the reading list's own cached stats
  // (enhanceReadingListWithStats) as a synchronous best-effort signal so
  // there's no editor-page flash in the common case. The async block below
  // is the real source of truth and can still correct to results if this
  // cache missed (e.g. the list's own stats fetch hadn't resolved yet).
  const cachedStats = item?.text_resource_id ? state.readingListStats?.[item.text_resource_id] : null;
  const likelyAnalyzed = Boolean(cachedStats && (cachedStats.vocabCount || cachedStats.exprCount || cachedStats.sentenceCount || cachedStats.patternCount));
  if (likelyAnalyzed) {
    openReadingResults(item);
  } else {
    showReadingEditorPanel();
  }

  // Async-enhance once any existing analysis loads, same pattern as
  // enhanceGrammarSectionWithStructuredForms — the panel is already usable
  // synchronously above.
  if (item?.text_resource_id) {
    const textResourceId = item.text_resource_id;
    remoteDb.loadTextResource(textResourceId).then((resource) => {
      if (els.readingItemId.value !== item.id || !resource) return;
      state.currentReadingWordCount = resource.wordCount;
      if (resource.textbookGlossary.length) {
        state.readingPendingGlossary = resource.textbookGlossary;
        renderTextbookGlossary(resource.textbookGlossary);
      }
      renderReadingReport();
      remoteDb.loadTextAnalysis(textResourceId).then((analysis) => {
        if (els.readingItemId.value !== item.id) return; // user navigated away
        if (!analysis || (!analysis.selectedVocabulary.length && !analysis.selectedExpressions.length && !analysis.summarySv)) return;
        state.currentReadingAnalysis = analysis;
        openReadingResults(item);
        renderReadingAnalysis(analysis, { deepReady: resource.deepReady });
        // A previous session's deep layer may have been interrupted (e.g.
        // the app was closed right after the fast layer landed) — pick it
        // back up here rather than leaving the placeholder stuck forever.
        if (!resource.deepReady) continueDeepReadingAnalysis(textResourceId);
      }).catch((error) => console.warn("[SpråkLab] Failed to load existing text analysis.", error));
    }).catch((error) => console.warn("[SpråkLab] Failed to load text resource.", error));
  }
}

function closeReadingEditor() {
  state.selectedReadingId = "";
  state.currentReadingAnalysis = null;
  els.readingListPanel.hidden = false;
  els.readingList.hidden = false;
  els.readingEditorPanel.hidden = true;
  els.readingAnalysisPanel.hidden = true;
  updateTopbarLibraryBack();
}

// 阅读模块设计想法-专业review-2026-07-27.md §"标题问题" — a title should
// never be required. Priority: user-entered > an obvious title-like first
// line in the pasted text (short, no sentence-ending punctuation, more
// content follows) > the text's own opening words. Purely a display label
// for the reading history list — never alters the saved source_text.
function deriveReadingTitle(sourceText) {
  const lines = sourceText.split("\n").map((line) => clean(line)).filter(Boolean);
  const firstLine = lines[0] || "";
  const looksLikeTitle = firstLine.length > 0 && firstLine.length <= 60 && !/[.!?]$/.test(firstLine) && lines.length > 1;
  if (looksLikeTitle) return firstLine;
  const flatText = clean(sourceText).replace(/\s+/g, " ");
  return flatText.length > 40 ? `${flatText.slice(0, 40)}…` : flatText;
}

async function saveCurrentReadingItem() {
  const sourceText = clean(els.readingTextInput.value);
  if (!sourceText) return null;
  const title = clean(els.readingTitleInput.value) || deriveReadingTitle(sourceText);
  const existing = state.readingItems.find((item) => item.id === els.readingItemId.value);
  const payload = { ...(existing || {}), id: els.readingItemId.value || undefined, title, source_text: sourceText };
  els.saveReadingBtn.disabled = true;
  try {
    const result = await remoteDb.upsertReadingItem(payload);
    if (!result?.enabled) {
      els.readingAuthNote.hidden = false;
      return null;
    }
    els.readingAuthNote.hidden = true;
    const saved = result.item;
    state.readingItems = [saved, ...state.readingItems.filter((item) => item.id !== saved.id)];
    els.readingItemId.value = saved.id;
    els.saveReadingBtn.hidden = true;
    if (els.readingEditorHeading) els.readingEditorHeading.textContent = saved.title || "Läsning";
    if (els.readingEditorIntro) els.readingEditorIntro.hidden = true;
    // Stays hidden if this editor was reached via "✎ Redigera text" on the
    // results page — Ta bort lives only in that page's "⋯" menu now, not
    // duplicated here too (Rachel, 2026-08-10).
    els.deleteReadingBtn.hidden = state.readingEditorFromResults;
    els.analyzeReadingBtn.hidden = false;
    if (els.openInShadowingBtn) els.openInShadowingBtn.hidden = false;
    renderReadingAnnotateSection(saved);
    return saved;
  } catch (error) {
    console.warn("[SpråkLab] Failed to save reading item.", error);
    return null;
  } finally {
    els.saveReadingBtn.disabled = false;
  }
}

// 规范§3/§8/§9 — the server does DB-first lookup, hash-cache check, and only
// calls AI for genuinely missing words/expressions (server-reading.mjs).
// This just saves the item, sends the text, and renders whatever three-layer
// result comes back — the cost-control logic isn't the client's job.
const MAX_AUTO_ANALYSIS_WORDS = 1000;

// 规范§5: texts over the auto-analysis limit must not trigger a full-text
// analysis — the user has to pick a paragraph/chapter/selection instead.
// Simplest selection mechanism that needs no new UI component: use the
// textarea's own native text selection. If the user has selected a portion
// when they click Analysera on an over-limit text, analyze just that
// selection (it becomes its own text_resource, own hash) instead of the
// whole article; if nothing is selected, explain what to do rather than
// silently failing or spending an API call.
async function analyzeCurrentReadingItem() {
  const saved = await saveCurrentReadingItem();
  if (!saved) return;

  const fullText = saved.source_text;
  const fullWordCount = readingWordCount(fullText);
  let textToAnalyze = fullText;
  if (fullWordCount > MAX_AUTO_ANALYSIS_WORDS) {
    const textarea = els.readingTextInput;
    const selection = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd).trim();
    if (!selection) {
      alert(
        `Texten är för lång (${fullWordCount} ord) för att analysera i sin helhet. Markera det stycke du vill analysera i textrutan ovan och klicka på Analysera igen.`,
      );
      return;
    }
    const selectionWordCount = readingWordCount(selection);
    if (selectionWordCount > MAX_AUTO_ANALYSIS_WORDS) {
      alert(`Det markerade stycket är fortfarande för långt (${selectionWordCount} ord). Markera ett kortare stycke.`);
      return;
    }
    textToAnalyze = selection;
  }

  els.analyzeReadingBtn.disabled = true;
  els.analyzeReadingBtn.textContent = "Analyserar…";
  // 2026-08-03: navigate to the results page immediately (Rachel's
  // decision — Analysera opens a full separate page, not more content
  // further down the editor) rather than waiting for the fast-layer AI
  // call to resolve first; the loading placeholder fills the gap.
  openReadingResults(saved);
  showReadingAnalysisLoading();
  try {
    const { textResource, analysis, deepReady } = await remoteDb.analyzeReadingText(textToAnalyze, "paste", state.readingPendingGlossary || []);
    const updated = { ...saved, text_resource_id: textResource.id };
    const result = await remoteDb.upsertReadingItem(updated);
    const finalItem = result?.item || updated;
    state.readingItems = state.readingItems.map((item) => (item.id === finalItem.id ? finalItem : item));
    state.currentReadingAnalysis = analysis;
    state.currentReadingWordCount = textResource.word_count || readingWordCount(textToAnalyze);
    renderReadingAnalysis(analysis, { deepReady });
    els.analyzeReadingBtn.disabled = false;
    els.analyzeReadingBtn.textContent = "Analysera";
    if (!deepReady) continueDeepReadingAnalysis(textResource.id);
  } catch (error) {
    console.warn("[SpråkLab] Reading analysis failed.", error);
    closeReadingResults();
    alert(error.message || "Kunde inte analysera texten just nu.");
    els.analyzeReadingBtn.disabled = false;
    els.analyzeReadingBtn.textContent = "Analysera";
  }
}

// Shows the results page's "Analyserar …" loading state and hides every
// content block so a fresh navigation (or a re-analyze of an item whose
// results page still has the PREVIOUS analysis rendered) never flashes
// stale content before the new fast-layer call resolves.
function showReadingAnalysisLoading() {
  if (els.readingAnalysisLoading) {
    els.readingAnalysisLoading.hidden = false;
    els.readingAnalysisLoading.querySelector("p").textContent = "🔄 Analyserar …";
  }
  if (els.readingDeepPending) els.readingDeepPending.hidden = true;
  if (els.readingSummarySv) els.readingSummarySv.hidden = true;
  if (els.readingSummaryZh) els.readingSummaryZh.hidden = true;
  if (els.readingHeadlineZh) els.readingHeadlineZh.hidden = true;
  if (els.readingKeyPoints) els.readingKeyPoints.hidden = true;
  if (els.readingKeywordsBlock) els.readingKeywordsBlock.hidden = true;
  if (els.readingPhrasesBlock) els.readingPhrasesBlock.hidden = true;
  if (els.readingSentencesBlock) els.readingSentencesBlock.hidden = true;
  if (els.readingPatternsBlock) els.readingPatternsBlock.hidden = true;
  if (els.readingReportCard) els.readingReportCard.hidden = true;
}

// Deep half of the two-layer pipeline — fires right after the fast layer
// renders, fills in vocabulary/phrases/sentences/patterns/report once it
// resolves. Runs detached from analyzeCurrentReadingItem's own try/finally
// so a slow or failed deep call never blocks the button/UI the fast layer
// already unlocked.
async function continueDeepReadingAnalysis(textResourceId) {
  try {
    const { analysis } = await remoteDb.analyzeReadingTextDeep(textResourceId);
    // Guard against the user having navigated to a different reading item
    // while the deep call was in flight — only apply the result if we're
    // still looking at the same one.
    if (state.currentReadingAnalysis?.textResourceId !== textResourceId) return;
    state.currentReadingAnalysis = analysis;
    renderReadingAnalysis(analysis, { deepReady: true });
  } catch (error) {
    console.warn("[SpråkLab] Deep reading analysis failed.", error);
    if (els.readingDeepPending) {
      els.readingDeepPending.hidden = false;
      els.readingDeepPending.querySelector("p").textContent = "⚠️ Kunde inte slutföra analysen. Försök igen senare.";
    }
  }
}

// 规范§9.4: 阅读页面只负责发现与轻量预览 — key vocabulary chips only ever
// show a lightweight Ordbok-sourced preview inline; key expressions already
// carry their full display content (expression + meaning + source sentence)
// per 规范§9.2, so no separate reveal step is needed for those.
function setReadingTextCollapsed(collapsed) {
  if (!els.readingTextInput || !els.readingTextToggleBtn) return;
  els.readingTextInput.classList.toggle("reading-text-collapsed", collapsed);
  els.readingTextToggleBtn.hidden = false;
  els.readingTextToggleBtn.textContent = collapsed ? "Visa allt" : "Visa mindre";
}

// 2026-08-02, two-layer generation: `deepReady` false means only the fast
// layer (headline/summary/key points) is in and vocabulary/phrases/
// sentences/patterns/report haven't been generated yet — show those
// sections' placeholder instead of the (empty) sections themselves, and
// skip the item-state/report calls that need real deep content to mean
// anything. "Läs och markera" (annotate) is deliberately NOT gated on
// deepReady — it only needs the original text, which the fast layer
// already has, so the user can start marking sentences immediately
// (Rachel's confirmed call — annotate shouldn't wait on AI).
function renderReadingAnalysis(analysis, { deepReady = true } = {}) {
  els.readingAnalysisPanel.hidden = false;
  if (els.readingAnalysisLoading) els.readingAnalysisLoading.hidden = true;
  setReadingTextCollapsed(true);

  const hasSummary = Boolean(analysis.summarySv);
  els.readingSummarySv.textContent = analysis.summarySv || "";
  els.readingSummaryZh.textContent = analysis.summaryZh || "";
  els.readingSummarySv.hidden = !hasSummary;
  els.readingSummaryZh.hidden = !hasSummary;
  if (els.generateReadingSummaryBtn) els.generateReadingSummaryBtn.hidden = hasSummary;

  if (els.readingHeadlineZh) {
    els.readingHeadlineZh.textContent = analysis.headlineZh || "";
    els.readingHeadlineZh.hidden = !analysis.headlineZh;
  }
  if (els.readingKeyPoints) {
    els.readingKeyPoints.replaceChildren();
    const points = analysis.keyPoints || [];
    points.forEach((point) => {
      const li = document.createElement("li");
      li.textContent = point;
      els.readingKeyPoints.append(li);
    });
    els.readingKeyPoints.hidden = !points.length;
  }

  if (els.readingDeepPending) els.readingDeepPending.hidden = deepReady;
  if (!deepReady) {
    if (els.readingKeywordsBlock) els.readingKeywordsBlock.hidden = true;
    if (els.readingPhrasesBlock) els.readingPhrasesBlock.hidden = true;
    if (els.readingSentencesBlock) els.readingSentencesBlock.hidden = true;
    if (els.readingPatternsBlock) els.readingPatternsBlock.hidden = true;
    if (els.readingReportCard) els.readingReportCard.hidden = true;
    if (els.sendSelectedSentencesToShadowingBtn) els.sendSelectedSentencesToShadowingBtn.hidden = true;
    return;
  }

  els.readingKeyWords.replaceChildren();
  const vocabulary = analysis.selectedVocabulary || [];
  vocabulary.forEach((entry, index) => {
    const word = state.words.find((item) => item.id === entry.word_id);
    // 2026-08-03, Rachel's feedback: word and Chinese meaning were crammed
    // onto one chip line; now the word gets its own line in the box, with
    // part-of-speech + meaning on a second line below it.
    // 2026-08-10: a just-generated missing word isn't in the client's own
    // word snapshot (state.words) yet, so this used to render with no
    // ordklass/meaning at all — the analysis entry itself now always
    // carries pos/chinese (server-reading.mjs), used as the fallback.
    const pos = word ? word.pos : entry.pos;
    const chinese = word ? word.chinese : entry.chinese;
    const card = document.createElement("div");
    card.className = "reading-word-card";
    card.dataset.readingItemType = "vocabulary";
    card.dataset.readingItemSortOrder = index;
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "reading-word-card-toggle";
    toggle.dataset.readingWordId = entry.word_id;
    const term = document.createElement("strong");
    term.className = "reading-word-card-term";
    term.textContent = word ? word.swedish : entry.swedish;
    const meta = document.createElement("span");
    meta.className = "reading-word-card-meta";
    meta.textContent = pos && chinese ? `${posBadgeLabel(pos)} · ${chinese}` : "";
    toggle.append(term, meta);
    const detail = document.createElement("div");
    detail.className = "reading-word-card-detail";
    detail.hidden = true;
    card.append(toggle, detail);
    els.readingKeyWords.append(card);
  });
  // 2026-08-01, 关于阅读模块的调整.pages: hide a section entirely when it's
  // empty rather than showing "inga ... hittades" placeholder text — reads
  // as the AI being selective, not as something missing.
  if (els.readingKeywordsBlock) els.readingKeywordsBlock.hidden = !vocabulary.length;

  els.readingKeyPhrases.replaceChildren();
  const expressions = analysis.selectedExpressions || [];
  expressions.forEach((entry, index) => {
    // 2026-08-03, Rachel's feedback: same box-card logic as the vocabulary
    // cards above — phrase on its own line, meaning below it, detail
    // (example sentence + save destination) expands directly underneath
    // when clicked. The AI's collocation/idiom guess is a starting point,
    // not final — "Skicka till Fraser"/"Skicka till Uttryck" let her file
    // it into whichever catalog she actually wants, overriding the guess.
    const card = document.createElement("div");
    card.className = "reading-phrase-card";
    card.dataset.readingItemType = "expression";
    card.dataset.readingItemSortOrder = index;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "reading-phrase-card-toggle";
    const term = document.createElement("strong");
    term.className = "reading-phrase-card-term";
    term.textContent = entry.expression_text;
    const meta = document.createElement("span");
    meta.className = "reading-phrase-card-meta";
    meta.textContent = entry.meaning_zh;
    toggle.append(term, meta);

    const detail = document.createElement("div");
    detail.className = "reading-phrase-card-detail";
    detail.hidden = true;
    const example = document.createElement("p");
    example.textContent = entry.source_sentence;
    const exampleZh = document.createElement("p");
    exampleZh.className = "example-translation";
    exampleZh.textContent = entry.source_sentence_zh;
    detail.append(example, exampleZh);
    if (entry.expression_id) {
      const actions = document.createElement("div");
      actions.className = "reading-phrase-card-actions";
      const toFraser = document.createElement("button");
      toFraser.type = "button";
      toFraser.className = "secondary-button";
      toFraser.dataset.readingClassify = "collocation";
      toFraser.dataset.readingExpressionId = entry.expression_id;
      toFraser.textContent = "Skicka till Fraser";
      toFraser.classList.toggle("active", entry.category !== "idiom");
      const toUttryck = document.createElement("button");
      toUttryck.type = "button";
      toUttryck.className = "secondary-button";
      toUttryck.dataset.readingClassify = "idiom";
      toUttryck.dataset.readingExpressionId = entry.expression_id;
      toUttryck.textContent = "Skicka till Uttryck";
      toUttryck.classList.toggle("active", entry.category === "idiom");
      actions.append(toFraser, toUttryck);
      detail.append(actions);
    }
    card.append(toggle, detail);
    els.readingKeyPhrases.append(card);
  });
  if (els.readingPhrasesBlock) els.readingPhrasesBlock.hidden = !expressions.length;

  if (els.readingKeySentences) {
    els.readingKeySentences.replaceChildren();
    const sentences = analysis.keySentences || [];
    sentences.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "reading-sentence-row";
      row.dataset.readingItemType = "sentence";
      row.dataset.readingItemSortOrder = index;
      const sentence = document.createElement("p");
      sentence.textContent = entry.sentence;
      const translation = document.createElement("p");
      translation.className = "example-translation";
      translation.textContent = entry.translation_zh;
      const reason = document.createElement("p");
      reason.className = "reading-sentence-reason";
      reason.textContent = entry.reason;
      row.append(sentence, translation, reason);
      if (entry.shadowing_suitable) {
        const badge = document.createElement("span");
        badge.className = "pos-badge";
        badge.textContent = "Shadowing";
        row.append(badge);
      }
      els.readingKeySentences.append(row);
    });
    if (els.readingSentencesBlock) els.readingSentencesBlock.hidden = !sentences.length;
  }

  const hasShadowingSentences = (analysis.keySentences || []).some((s) => s.shadowing_suitable);
  if (els.sendSelectedSentencesToShadowingBtn) els.sendSelectedSentencesToShadowingBtn.hidden = !hasShadowingSentences;

  // Language Patterns (2026-07-31, 桌面AI语义评分.pages §5) — sentence-level
  // constructions, deliberately never more than 4 (see MAX_LANGUAGE_PATTERNS
  // server-side); most texts genuinely have 0-2, so an empty state is normal.
  if (els.readingLanguagePatterns) {
    els.readingLanguagePatterns.replaceChildren();
    const patterns = analysis.languagePatterns || [];
    patterns.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "reading-pattern-row";
      row.dataset.readingItemType = "pattern";
      row.dataset.readingItemSortOrder = index;
      const pattern = document.createElement("strong");
      pattern.textContent = entry.pattern;
      const meaning = document.createElement("span");
      meaning.textContent = entry.meaning_zh;
      const example = document.createElement("p");
      example.className = "example-translation";
      example.textContent = entry.source_sentence;
      row.append(pattern, meaning, example);
      els.readingLanguagePatterns.append(row);
    });
    if (els.readingPatternsBlock) els.readingPatternsBlock.hidden = !patterns.length;
  }

  enhanceReadingAnalysisWithItemState(analysis);
  renderReadingReport();
}

// "Learning Report" card (tier-2 item 5 of Reviews/阅读模块设计想法-专业
// review-2026-07-27.md §十三, unblocked 2026-07-30 by reading_analysis_items
// existing) — adapted from the mockup in 关于阅读模块的实验及思考.pages, but
// reconciled against what SpråkLab actually surfaces today: no "Patterns"
// row (that category was cut, see the same session's review doc), and CEFR
// level is estimated for free from the already-loaded corpus data for the
// selected vocabulary (no new AI call) rather than invented. Compression
// ratio and time estimates are explicitly labeled as estimates — they're a
// simple heuristic over counts already on screen, not a measured fact.
// Shared with renderReadingList's per-item stats (2026-07-30) — same
// zero-extra-AI-call estimate, just derived from whichever vocabulary list
// is on hand (the full analysis client-side, or a batch-loaded summary).
function estimateCefrRange(vocabularyEntries) {
  const cefrOrder = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const levels = (vocabularyEntries || [])
    .map((entry) => state.words.find((w) => w.id === entry.word_id)?.cefr_level)
    .filter((level) => cefrOrder.includes(level))
    .sort((a, b) => cefrOrder.indexOf(a) - cefrOrder.indexOf(b));
  if (!levels.length) return "";
  return levels[0] === levels[levels.length - 1] ? levels[0] : `${levels[0]}-${levels[levels.length - 1]}`;
}

function computeReadingReport(analysis, wordCount) {
  if (!analysis || !wordCount) return null;
  const vocabCount = (analysis.selectedVocabulary || []).length;
  const collocCount = (analysis.selectedExpressions || []).filter((e) => e.category !== "idiom").length;
  const idiomCount = (analysis.selectedExpressions || []).filter((e) => e.category === "idiom").length;
  const sentenceCount = (analysis.keySentences || []).length;
  const patternCount = (analysis.languagePatterns || []).length;
  const itemCount = vocabCount + collocCount + idiomCount + sentenceCount + patternCount;
  const cefrRange = estimateCefrRange(analysis.selectedVocabulary);

  const readMinutes = Math.max(1, Math.round(wordCount / 150));
  const learnMinutes = Math.max(1, Math.round(itemCount * 0.6));
  const reviewMinutes = Math.max(1, Math.round(itemCount * 0.3));

  return {
    wordCount,
    cefrRange,
    vocabCount,
    collocCount,
    idiomCount,
    sentenceCount,
    patternCount,
    compressionRatio: wordCount ? ((itemCount / wordCount) * 100).toFixed(1) : "0.0",
    readMinutes,
    learnMinutes,
    reviewMinutes,
    totalMinutes: readMinutes + learnMinutes + reviewMinutes,
  };
}

function renderReadingReport() {
  if (!els.readingReportCard) return;
  const report = computeReadingReport(state.currentReadingAnalysis, state.currentReadingWordCount);
  els.readingReportCard.hidden = !report;
  if (!report) return;
  els.readingReportCard.querySelector("[data-report-word-count]").textContent = `${report.wordCount} ord`;
  const cefrRow = els.readingReportCard.querySelector("[data-report-cefr-row]");
  if (cefrRow) {
    cefrRow.hidden = !report.cefrRange;
    if (report.cefrRange) cefrRow.querySelector("[data-report-cefr]").textContent = report.cefrRange;
  }
  els.readingReportCard.querySelector("[data-report-vocab]").textContent = report.vocabCount;
  els.readingReportCard.querySelector("[data-report-colloc]").textContent = report.collocCount;
  els.readingReportCard.querySelector("[data-report-idiom]").textContent = report.idiomCount;
  els.readingReportCard.querySelector("[data-report-sentences]").textContent = report.sentenceCount;
  els.readingReportCard.querySelector("[data-report-patterns]").textContent = report.patternCount;
  els.readingReportCard.querySelector("[data-report-compression]").textContent = `${report.compressionRatio}%`;
  els.readingReportCard.querySelector("[data-report-read-min]").textContent = report.readMinutes;
  els.readingReportCard.querySelector("[data-report-learn-min]").textContent = report.learnMinutes;
  els.readingReportCard.querySelector("[data-report-review-min]").textContent = report.reviewMinutes;
  els.readingReportCard.querySelector("[data-report-total-min]").textContent = report.totalMinutes;
}

// Per-item discovery-state tracking (2026-07-30 decision) — progressive
// enhancement, same pattern as enhanceGrammarSectionWithStructuredForms:
// the panel above is already fully usable synchronously, this just adds a
// per-item "ignorera" toggle once the reading_analysis_items rows (server-
// materialized alongside the analysis itself) have loaded.
async function enhanceReadingAnalysisWithItemState(analysis) {
  if (!analysis?.id) return;
  let items;
  try {
    items = await remoteDb.loadReadingAnalysisItems(analysis.id);
  } catch (error) {
    console.warn("[SpråkLab] Failed to load reading item state.", error);
    return;
  }
  if (state.currentReadingAnalysis?.id !== analysis.id) return; // user navigated away
  const byKey = new Map(items.map((item) => [`${item.itemType}:${item.sortOrder}`, item]));
  [els.readingKeyWords, els.readingKeyPhrases, els.readingKeySentences, els.readingLanguagePatterns].forEach((container) => {
    container?.querySelectorAll("[data-reading-item-type]").forEach((el) => {
      const item = byKey.get(`${el.dataset.readingItemType}:${el.dataset.readingItemSortOrder}`);
      if (item) applyReadingItemState(el, item);
    });
  });
}

function applyReadingItemState(el, item) {
  el.dataset.readingItemId = item.id;
  el.dataset.readingItemStatus = item.status;
  el.classList.toggle("reading-item-ignored", item.status === "ignored");
  if (el.querySelector(".reading-item-ignore-btn")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "reading-item-ignore-btn";
  const setLabel = () => {
    const ignored = el.dataset.readingItemStatus === "ignored";
    btn.title = ignored ? "Ångra" : "Ignorera";
    btn.textContent = ignored ? "↺" : "✕";
  };
  setLabel();
  btn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextStatus = el.dataset.readingItemStatus === "ignored" ? "viewed" : "ignored";
    btn.disabled = true;
    try {
      await remoteDb.setReadingAnalysisItemStatus(el.dataset.readingItemId, nextStatus);
      el.dataset.readingItemStatus = nextStatus;
      el.classList.toggle("reading-item-ignored", nextStatus === "ignored");
      setLabel();
    } catch (error) {
      console.warn("[SpråkLab] Failed to update reading item status.", error);
    } finally {
      btn.disabled = false;
    }
  });
  el.append(btn);
}

// Marks a surfaced item "viewed" the first time the user actually opens it
// (word preview / expression detail) — a no-op if it's already past "new".
function markReadingItemViewedFromElement(el) {
  if (!el || el.dataset.readingItemStatus !== "new" || !el.dataset.readingItemId) return;
  el.dataset.readingItemStatus = "viewed";
  remoteDb.setReadingAnalysisItemStatus(el.dataset.readingItemId, "viewed").catch((error) => {
    console.warn("[SpråkLab] Failed to mark reading item viewed.", error);
  });
}

// 规范§9.4 — the light preview reads directly from the already-loaded Ordbok
// snapshot (state.words), no AI call. "Visa hela ordkortet" is the only
// path into the full word card.
// 2026-08-03, Rachel's feedback: the word-detail preview used to be one
// shared box appended after the whole vocabulary list — clicking any word
// jumped focus away from it. Now each word card owns its own detail slot,
// directly below that word, accordion-style (only one open at a time).
function toggleReadingWordDetail(toggle) {
  const card = toggle.closest(".reading-word-card");
  const detail = card?.querySelector(".reading-word-card-detail");
  if (!detail) return;
  const alreadyOpen = !detail.hidden;
  els.readingKeyWords?.querySelectorAll(".reading-word-card-detail").forEach((el) => {
    if (el !== detail) el.hidden = true;
  });
  if (alreadyOpen) {
    detail.hidden = true;
    return;
  }
  const word = state.words.find((item) => item.id === toggle.dataset.readingWordId);
  const entry = (state.currentReadingAnalysis?.selectedVocabulary || []).find((e) => e.word_id === toggle.dataset.readingWordId);
  const wordPos = word ? word.pos : entry?.pos;
  const wordChinese = word ? word.chinese : entry?.chinese;
  detail.replaceChildren();
  if (!wordPos && !wordChinese) return;
  const pos = document.createElement("span");
  pos.className = "pos-badge";
  pos.textContent = posBadgeLabel(wordPos);
  const meaning = document.createElement("p");
  meaning.textContent = wordChinese || "";
  detail.append(pos, meaning);
  // The example sentence and full-card link only exist once the word is
  // actually in the loaded Ordbok snapshot — a just-generated missing word
  // gets pos/chinese above (from the analysis entry itself) but nothing
  // more without a real dictionary lookup, which stays out of scope here.
  if (word) {
    const example = document.createElement("p");
    example.className = "example-translation";
    example.textContent = clean(word.example).split("\n")[0] || "";
    const openFull = document.createElement("button");
    openFull.type = "button";
    openFull.className = "secondary-button";
    openFull.textContent = "Visa hela ordkortet";
    openFull.addEventListener("click", () => openWordFromReadingChip(word.swedish));
    detail.append(example, openFull);
  }
  detail.hidden = false;
}

// 2026-08-03: accordion-style detail, same pattern as toggleReadingWordDetail.
function toggleReadingPhraseDetail(toggle) {
  const card = toggle.closest(".reading-phrase-card");
  const detail = card?.querySelector(".reading-phrase-card-detail");
  if (!detail) return;
  const alreadyOpen = !detail.hidden;
  els.readingKeyPhrases?.querySelectorAll(".reading-phrase-card-detail").forEach((el) => {
    if (el !== detail) el.hidden = true;
  });
  detail.hidden = alreadyOpen;
}

// Lets the user file this phrase into Fraser or Uttryck themselves,
// overriding whatever the AI auto-classified it as at analysis time.
async function classifyReadingPhrase(button) {
  const expressionId = button.dataset.readingExpressionId;
  const classification = button.dataset.readingClassify;
  if (!expressionId || !classification) return;
  const actions = button.closest(".reading-phrase-card-actions");
  actions?.querySelectorAll("button").forEach((btn) => { btn.disabled = true; });
  try {
    await remoteDb.classifyReadingExpression(expressionId, classification);
    actions?.querySelectorAll("[data-reading-classify]").forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
  } catch (error) {
    console.warn("[SpråkLab] Failed to classify reading phrase.", error);
    alert(error.message || "Kunde inte spara frasen just nu.");
  } finally {
    actions?.querySelectorAll("button").forEach((btn) => { btn.disabled = false; });
  }
}

// 规范§9.3/§10 — summary is only ever generated here, on click, never at
// import/analyze time.
async function generateSummaryForCurrentReadingItem() {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  if (!item?.text_resource_id || !els.generateReadingSummaryBtn) return;
  els.generateReadingSummaryBtn.disabled = true;
  els.generateReadingSummaryBtn.textContent = "Genererar…";
  try {
    const summary = await remoteDb.generateReadingSummary(item.text_resource_id);
    els.readingSummarySv.textContent = summary.summary_sv;
    els.readingSummaryZh.textContent = summary.summary_zh;
    els.readingSummarySv.hidden = false;
    els.readingSummaryZh.hidden = false;
    els.generateReadingSummaryBtn.hidden = true;
    if (state.currentReadingAnalysis) {
      state.currentReadingAnalysis.summarySv = summary.summary_sv;
      state.currentReadingAnalysis.summaryZh = summary.summary_zh;
    }
  } catch (error) {
    console.warn("[SpråkLab] Failed to generate reading summary.", error);
    alert(error.message || "Kunde inte generera sammanfattning just nu.");
  } finally {
    els.generateReadingSummaryBtn.disabled = false;
    els.generateReadingSummaryBtn.textContent = "Generera sammanfattning";
  }
}

// Reuses the existing search flow rather than a bespoke lookup: works
// whether or not the word is already in the corpus (search's own
// "not found, create it" state already handles the miss case).
function openWordFromReadingChip(swedish) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(els.searchInput, swedish);
  els.searchInput.dispatchEvent(new Event("input", { bubbles: true }));
  runSearchAndOpenDetail();
}

// Läsning doesn't run its own player — it hands the text to Shadowing
// (already a mature TTS/recording engine), per the architecture doc's
// "don't rebuild the player per module" principle.
async function sendTextToShadowing(button, { title, swedish, textResourceId, linkToReadingItem = false }) {
  button.disabled = true;
  try {
    const result = await remoteDb.upsertShadowingItem({
      title,
      swedish,
      // Rachel, 2026-08-09: Shadowing practice content should be Swedish
      // only. The article's whole-text Chinese summary used to land here,
      // but it's a summary of the *whole* Läsning article, not a
      // translation of whatever partial Swedish text actually got sent
      // (e.g. sendSelectedSentencesToShadowing only sends a few
      // sentences) — never accurate, and never displayed anymore either
      // (see renderShadowingList/renderShadowingPlayer).
      chinese: "",
      category: "Läsning",
      // 规范§4/§13 — same text_resource, so Shadowing never re-analyzes or
      // re-transcribes what Läsning already processed.
      text_resource_id: textResourceId || null,
    });
    if (!result?.enabled) {
      els.readingAuthNote.hidden = false;
      return;
    }
    if (linkToReadingItem) {
      const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
      if (item) await remoteDb.upsertReadingItem({ ...item, shadowing_item_id: result.item.id });
    }
    const normalized = shadowingStore.normalizeShadowingItem(result.item);
    remotePhase4Snapshot = {
      ...(remotePhase4Snapshot || {}),
      shadowingItems: mergeShadowingItemsForApp([normalized], remotePhase4Snapshot?.shadowingItems || []),
    };
    await refreshShadowingState();
    state.selectedShadowingId = normalized.id;
    activateView("historyView");
    // 2026-08-11, Rachel's request: text handed off from Läsning now lands
    // on Prepare (review/pick a voice first) instead of jumping straight
    // to Practice with audio already auto-generating.
    populateShadowingForm(normalized);
    openShadowingEditor();
    renderShadowing();
  } catch (error) {
    console.warn("[SpråkLab] Failed to send text to Shadowing.", error);
  } finally {
    button.disabled = false;
  }
}

async function sendCurrentReadingItemToShadowing() {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  if (!item) return;
  await sendTextToShadowing(els.sendReadingToShadowingBtn, {
    title: item.title || "Läsning",
    swedish: item.source_text,
    textResourceId: item.text_resource_id,
    linkToReadingItem: true,
  });
}

// 阅读模块设计想法-专业review-2026-07-27.md §6 — lets Shadowing practice
// focus on the sentences actually picked as good standalone material,
// instead of always sending the whole article (existing button above,
// unchanged) — additive, not a replacement.
async function sendSelectedSentencesToShadowing() {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  const sentences = (state.currentReadingAnalysis?.keySentences || []).filter((s) => s.shadowing_suitable).map((s) => s.sentence);
  if (!sentences.length) return;
  await sendTextToShadowing(els.sendSelectedSentencesToShadowingBtn, {
    title: item?.title ? `${item.title} (utvalda meningar)` : "Utvalda meningar",
    swedish: sentences.join("\n"),
    textResourceId: item?.text_resource_id,
    linkToReadingItem: false,
  });
}

// Sentence highlight/notes (2026-07-30, tier-3 item 10 of Reviews/阅读模块
// 设计想法-专业review-2026-07-27.md §十三) — a lightweight sentence split
// (same simple .!? heuristic used elsewhere for sentence counting), each
// sentence clickable to toggle a highlight; a highlighted sentence gets an
// inline note box. Persisted straight onto reading_items.notes via the
// existing upsertReadingItem, same as any other item edit — no new table.
function splitReadingSentences(text) {
  return (clean(text).match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);
}

const READING_ANNOTATE_COLLAPSED_COUNT = 4;

function renderReadingAnnotateSection(item) {
  if (!els.readingAnnotateSection || !els.readingAnnotateText) return;
  if (!item?.id || !clean(item.source_text)) {
    els.readingAnnotateSection.hidden = true;
    return;
  }
  els.readingAnnotateSection.hidden = false;
  // 2026-08-03, Rachel's feedback: the original text dominated the results
  // page — collapse to the first few sentences by default (mirrors the
  // editor's own "Visa allt" text-collapse), expand only when she actually
  // wants to mark something further down. A JS-based slice, not a CSS
  // max-height crop — highlighted sentences grow a block-level note
  // textarea right after them, which a height crop would visually slice
  // instead of cleanly hiding. Expand state resets when a different item
  // loads but survives this section's own in-place re-renders (adding a
  // note re-renders this same section — collapsing mid-edit would be
  // jarring).
  if (els.readingAnnotateSection.dataset.readingAnnotateItemId !== item.id) {
    els.readingAnnotateSection.dataset.readingAnnotateItemId = item.id;
    els.readingAnnotateSection.dataset.expanded = "false";
  }
  const expanded = els.readingAnnotateSection.dataset.expanded === "true";
  const allSentences = splitReadingSentences(item.source_text);
  const sentences = expanded ? allSentences : allSentences.slice(0, READING_ANNOTATE_COLLAPSED_COUNT);
  const notesByIndex = new Map((item.notes || []).map((n) => [n.sentenceIndex, n]));
  els.readingAnnotateText.replaceChildren();
  sentences.forEach((sentence, index) => {
    const wrap = document.createElement("span");
    wrap.className = "reading-annotate-sentence-wrap";
    const span = document.createElement("span");
    span.className = "reading-annotate-sentence";
    span.textContent = `${sentence} `;
    span.dataset.sentenceIndex = index;
    const noteEntry = notesByIndex.get(index);
    if (noteEntry) {
      span.classList.add("highlighted");
      const noteBox = document.createElement("textarea");
      noteBox.className = "reading-annotate-note";
      noteBox.placeholder = "Skriv en anteckning om den här meningen…";
      noteBox.value = noteEntry.note || "";
      noteBox.dataset.sentenceIndex = index;
      wrap.append(span, noteBox);
    } else {
      wrap.append(span);
    }
    els.readingAnnotateText.append(wrap);
  });
  if (els.readingAnnotateToggleBtn) {
    els.readingAnnotateToggleBtn.hidden = allSentences.length <= READING_ANNOTATE_COLLAPSED_COUNT;
    els.readingAnnotateToggleBtn.textContent = expanded ? "Visa mindre" : "Visa hela texten";
  }
}

async function persistReadingNotes(updatedNotes) {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  if (!item) return;
  try {
    const result = await remoteDb.upsertReadingItem({ ...item, notes: updatedNotes });
    const saved = result?.item || { ...item, notes: updatedNotes };
    state.readingItems = state.readingItems.map((entry) => (entry.id === saved.id ? saved : entry));
    renderReadingAnnotateSection(saved);
  } catch (error) {
    console.warn("[SpråkLab] Failed to save reading note.", error);
  }
}

function toggleReadingSentenceHighlight(sentenceIndex) {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  if (!item) return;
  const sentences = splitReadingSentences(item.source_text);
  const notes = item.notes || [];
  const exists = notes.some((n) => n.sentenceIndex === sentenceIndex);
  const updatedNotes = exists
    ? notes.filter((n) => n.sentenceIndex !== sentenceIndex)
    : [...notes, { sentenceIndex, text: sentences[sentenceIndex] || "", note: "" }];
  persistReadingNotes(updatedNotes);
}

function updateReadingSentenceNote(sentenceIndex, noteText) {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  if (!item) return;
  const updatedNotes = (item.notes || []).map((n) => (n.sentenceIndex === sentenceIndex ? { ...n, note: noteText } : n));
  persistReadingNotes(updatedNotes);
}

// Read-only export of a reading item's full analysis (2026-07-30, tier-3
// item 7 of Reviews/阅读模块设计想法-专业review-2026-07-27.md §十三) — reuses
// the existing #exportPreviewDialog (share/print/close) already built for
// Ordbok exports, per that same doc's principle "导出是内部记录的外部副本
// ...导出不重新调用AI": everything here comes from data already loaded in
// this session, nothing is generated fresh.
function openReadingExportPreview() {
  const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
  const analysis = state.currentReadingAnalysis;
  if (!item) return;
  const report = analysis ? computeReadingReport(analysis, state.currentReadingWordCount) : null;

  const vocabRows = (analysis?.selectedVocabulary || []).map((entry) => {
    const word = state.words.find((w) => w.id === entry.word_id);
    return { sv: word?.swedish || entry.swedish || "", zh: word?.chinese || "" };
  });
  const phraseRows = (analysis?.selectedExpressions || []).map((entry) => ({
    label: entry.category === "idiom" ? "Uttryck" : "Fras",
    sv: entry.expression_text,
    zh: entry.meaning_zh,
    example: entry.source_sentence,
  }));
  const sentenceRows = (analysis?.keySentences || []).map((entry) => ({ sv: entry.sentence, zh: entry.translation_zh }));
  const patternRows = (analysis?.languagePatterns || []).map((entry) => ({ pattern: entry.pattern, zh: entry.meaning_zh, example: entry.source_sentence }));
  const noteRows = (item.notes || []).filter((n) => clean(n.note));

  const title = item.title || "(Utan titel)";
  els.exportPreviewTitle.textContent = title;
  els.exportPreviewDialog.dataset.exportTitle = title;
  els.exportPreviewDialog.dataset.exportType = "reading";
  els.exportPreviewDialog.dataset.exportText = [
    title,
    report ? `${report.wordCount} ord${report.cefrRange ? " · " + report.cefrRange : ""}` : "",
    "",
    "== Text ==",
    item.source_text || "",
    analysis?.summarySv ? `\n== Sammanfattning ==\n${analysis.summarySv}\n${analysis.summaryZh || ""}` : "",
    vocabRows.length ? `\n== Ord värda att lära sig ==\n${vocabRows.map((r) => `${r.sv} - ${r.zh}`).join("\n")}` : "",
    phraseRows.length ? `\n== Fraser & Uttryck ==\n${phraseRows.map((r) => `${r.sv} - ${r.zh} (${r.example})`).join("\n")}` : "",
    sentenceRows.length ? `\n== Viktiga meningar ==\n${sentenceRows.map((r) => `${r.sv} - ${r.zh}`).join("\n")}` : "",
    patternRows.length ? `\n== Språkmönster ==\n${patternRows.map((r) => `${r.pattern} - ${r.zh} (${r.example})`).join("\n")}` : "",
    noteRows.length ? `\n== Mina anteckningar ==\n${noteRows.map((n) => `${n.text}\n→ ${n.note}`).join("\n\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const statsLine = report
    ? `<p class="export-reading-stats">${report.wordCount} ord${report.cefrRange ? ` · ${report.cefrRange}` : ""} · ${report.vocabCount} nyckelord · ${report.collocCount} fraser · ${report.idiomCount} uttryck · ${report.sentenceCount} meningar · ${report.patternCount} mönster</p>`
    : "";
  const summaryBlock = analysis?.summarySv
    ? `<section><h3>Sammanfattning</h3><p>${escapeHtml(analysis.summarySv)}</p><p class="example-translation">${escapeHtml(analysis.summaryZh || "")}</p></section>`
    : "";
  const vocabBlock = vocabRows.length
    ? `<section><h3>Ord värda att lära sig</h3><ul>${vocabRows.map((r) => `<li><strong>${escapeHtml(r.sv)}</strong> — ${escapeHtml(r.zh)}</li>`).join("")}</ul></section>`
    : "";
  const phraseBlock = phraseRows.length
    ? `<section><h3>Fraser &amp; Uttryck</h3><ul>${phraseRows.map((r) => `<li><strong>${escapeHtml(r.sv)}</strong> (${escapeHtml(r.label)}) — ${escapeHtml(r.zh)}<br/><span class="example-translation">${escapeHtml(r.example)}</span></li>`).join("")}</ul></section>`
    : "";
  const sentenceBlock = sentenceRows.length
    ? `<section><h3>Viktiga meningar</h3><ul>${sentenceRows.map((r) => `<li>${escapeHtml(r.sv)}<br/><span class="example-translation">${escapeHtml(r.zh)}</span></li>`).join("")}</ul></section>`
    : "";
  const patternBlock = patternRows.length
    ? `<section><h3>Språkmönster</h3><ul>${patternRows.map((r) => `<li><strong>${escapeHtml(r.pattern)}</strong> — ${escapeHtml(r.zh)}<br/><span class="example-translation">${escapeHtml(r.example)}</span></li>`).join("")}</ul></section>`
    : "";
  const noteBlock = noteRows.length
    ? `<section><h3>Mina anteckningar</h3><ul>${noteRows.map((n) => `<li>${escapeHtml(n.text)}<br/><span class="example-translation">${escapeHtml(n.note)}</span></li>`).join("")}</ul></section>`
    : "";

  els.exportPreviewContent.innerHTML = `
    <header class="export-preview-document-header">
      <h1>${escapeHtml(title)}</h1>
      ${statsLine}
    </header>
    <section><h3>Text</h3><p class="export-reading-source-text">${escapeHtml(item.source_text || "")}</p></section>
    ${summaryBlock}${vocabBlock}${phraseBlock}${sentenceBlock}${patternBlock}${noteBlock}
    ${!analysis ? '<div class="empty-state">Texten är inte analyserad än — endast originaltexten exporteras.</div>' : ""}
  `;
  if (!els.exportPreviewDialog.open) els.exportPreviewDialog.showModal();
}

async function deleteCurrentReadingItem() {
  const id = els.readingItemId.value;
  if (!id) return;
  // 2026-08-10, Rachel's request: deleting a whole reading note now needs a
  // second confirmation — same confirm() pattern already used for deleting
  // a notebook (deleteBookAction) or Shadowing content (deleteShadowingItem).
  const item = state.readingItems.find((entry) => entry.id === id);
  if (!confirm(`Ta bort "${item?.title || "den här läsningen"}"? Det går inte att ångra.`)) return;
  try {
    await remoteDb.deleteReadingItem(id);
    state.readingItems = state.readingItems.filter((item) => item.id !== id);
    closeReadingEditor();
    renderReadingList();
  } catch (error) {
    console.warn("[SpråkLab] Failed to delete reading item.", error);
  }
}

function renderStats() {
  const words = getLibraryWordsForDisplay();
  els.totalCount.textContent = words.length;
  els.learnedCount.textContent = words.filter((word) => word.learned).length;
  els.dueCount.textContent = words.filter(isDue).length;
  // 2026-08-29 audit fix (SprakLab-Audit-Report.md §2.3): the Bibliotek
  // Ordbok card used to hardcode this count as static HTML text, which
  // drifted from the real corpus size. Reuses the same words.length this
  // function already computes, so it can never drift again.
  if (els.libraryOrdbokMeta) els.libraryOrdbokMeta.textContent = `Ordlista · Studier · ${words.length} ord`;
}

// 2026-07-30 homepage redesign (Rachel's decision): the separate "Fortsätt
// lära dig" panel is gone — Läsning/Shadowing entry now lives in one card
// in the swipeable study-entry-grid row, alongside Repetition/Nya ord.
// Empty state prompts to get started; once the user has actually done a
// reading and/or Shadowing today, show today's counts instead (her explicit
// choice over showing "continue where you left off" text). "Done today" is
// intentionally simple for this first pass: a reading counts once it's been
// analyzed (has text_resource_id) today; a Shadowing item counts once
// created today — refine later if this doesn't match what "completed"
// should mean.
let readingShadowingEntryLoaded = false;
async function renderReadingShadowingEntryCard() {
  if (!readingShadowingEntryLoaded) {
    readingShadowingEntryLoaded = true;
    if (!state.readingItemsLoaded) {
      state.readingItemsLoaded = true;
      state.readingItems = await remoteDb.loadReadingItems().catch(() => []);
    }
    renderReadingShadowingEntryCard();
    return;
  }
  if (!els.readingShadowingEntryDetail) return;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();

  const readingsToday = (state.readingItems || []).filter((item) => item.text_resource_id && Number(item.updatedAt || item.createdAt || 0) >= todayMs).length;
  const shadowingToday = getShadowingItems().filter((item) => Number(item.createdAt || 0) >= todayMs).length;

  // 2026-08-11, Rachel's request: the card's title is now a static
  // "Läs/Lyssna/Härma" explaining what Studio is (set in index.html),
  // not swapped per state — only the detail line and button still change.
  if (!readingsToday && !shadowingToday) {
    els.readingShadowingEntryDetail.textContent = "Ta ett foto eller klistra in en text";
    els.readingShadowingEntryBtn.textContent = "Börja träna";
  } else {
    els.readingShadowingEntryDetail.textContent = `${readingsToday} läsning${readingsToday === 1 ? "" : "ar"} idag · ${shadowingToday} Shadowing-pass idag`;
    els.readingShadowingEntryBtn.textContent = "Fortsätt";
  }
}

function openReadingShadowingEntry() {
  activateView("readingView");
  openReadingEditor(null);
}

function renderStudyStats() {
  renderReadingShadowingEntryCard();
  state.dailyStudy = ensureDailyStudyPlan();
  // 2026-08-29 audit fix (SprakLab-Audit-Report.md §2.1): state.dailyProgress
  // starts as null until refreshDailyProgress's remote round-trip resolves.
  // An early render pass used to fall through to `dailyProgress?.xyz || 0`,
  // painting "0 ord idag" (and hiding the workload banner) for real users
  // with real tasks, until the async data replaced it moments later. Bail
  // out instead and leave the "…" placeholder from index.html in place —
  // same early-return shape this function already used for dailyStudy.
  if (!state.dailyStudy || !state.dailyProgress) return;
  const newSession = readDailySession("new", state.dailyStudy);
  const reviewSession = readDailySession("review", state.dailyStudy);
  const dailyTarget = Number(state.dailyNewWordTarget || 10) || 10;
  const overdueCount = Number(state.dailyProgress?.overdueCount || 0) || 0;
  const dueTodayCount = Number(state.dailyProgress?.dueTodayCount || 0) || 0;
  const dueOverdueTotal = overdueCount + dueTodayCount;
  const workload = getWorkloadState(dueOverdueTotal, dailyTarget);
  const todayNew = Math.min(Number(state.dailyProgress?.todayNewCount || 0) || 0, dailyTarget);
  const availableNew = Math.max((state.dailyStudy.newWordIds || []).length - newSession.completedWordIds.length, 0);
  const reviewTotal = (state.dailyStudy.reviewWordIds || []).length;
  const completedReview = Math.min(reviewSession.completedWordIds.length, reviewTotal);
  const availableReview = Math.max(reviewTotal - completedReview, 0);
  const streak = state.studyStats?.current_streak || 0;
  const mastered = state.words.filter((word) => word.learned).length;
  const completedTotal = todayNew;
  els.studyNewCount.textContent = `${todayNew}/${dailyTarget}`;
  els.studyReviewCount.textContent = `${completedReview}/${dueOverdueTotal}`;
  els.studyStreakCount.textContent = streak;
  els.studyMasteredCount.textContent = mastered;
  els.entryNewCount.textContent = `${availableNew} ord idag`;
  els.entryReviewCount.textContent = reviewSession.completed && reviewTotal > 0
    ? `${completedReview} av ${reviewTotal} klara idag`
    : `${availableReview} ord kvar idag`;
  // "Due: N / Overdue: M / Estimated: X min" per SPK-HOM-001 §3.1 —
  // dueOverdueTotal is the real uncapped backlog, not just today's batch.
  if (els.entryReviewDetail) {
    els.entryReviewDetail.textContent = dueOverdueTotal > 0
      ? `Idag ${dueTodayCount} · Försenat ${overdueCount} · Ca ${Math.max(1, Math.round(dueOverdueTotal * 0.75))} min`
      : "";
  }
  if (els.studyWorkloadMessage) {
    els.studyWorkloadMessage.textContent = workload.reason;
    els.studyWorkloadMessage.hidden = !workload.reason;
  }
  if (els.dailyNewWordTargetSelect && document.activeElement !== els.dailyNewWordTargetSelect) {
    els.dailyNewWordTargetSelect.value = String(dailyTarget);
  }
  if (els.dailyNewWordTargetReadout) {
    els.dailyNewWordTargetReadout.textContent = `Mål/dag: ${dailyTarget}`;
  }
  if (els.startNewStudyBtn) {
    els.startNewStudyBtn.disabled = availableNew === 0 || newSession.completed;
    els.startNewStudyBtn.textContent = workload.allowedNewWords === 0 && dueOverdueTotal > 0 ? "Slutför repetition först" : "Börja lära";
  }
  if (els.startReviewStudyBtn) {
    els.startReviewStudyBtn.disabled = reviewTotal === 0;
    els.startReviewStudyBtn.textContent = reviewSession.completed && reviewTotal > 0 ? "Visa repetition" : "Börja repetera";
  }
  els.completeTodayCount.textContent = `${completedTotal} klara idag`;
  els.completeMasteredCount.textContent = `${mastered} lärda ord`;
  els.completeStreakCount.textContent = `${streak} dagar i rad`;
  const parts = [
    `Nyord ${todayNew}/${dailyTarget}`,
    reviewTotal > 0 ? `Repetition ${completedReview}/${dueOverdueTotal}` : "No review scheduled today",
    `Streak ${streak}`,
    `Lärt mig ${mastered}`,
  ];
  if (!state.currentQuiz && els.quizHint) {
    els.quizHint.textContent = parts.join(" · ");
  }
  els.studyCompletePanel.hidden = !(todayNew >= dailyTarget && dueOverdueTotal === 0 && !state.currentQuiz);
}

function setupHomeGreeting() {
  if (!els.homeGreeting) return;
  const title = document.createElement("span");
  const subtitle = document.createElement("span");
  title.textContent = "Hej!";
  subtitle.textContent = "Bra jobbat idag.";
  els.homeGreeting.replaceChildren(title, subtitle);
}

function renderProfileView() {
  renderAuthState();
}

function showProfilePage(page = "main") {
  const target = ["studies", "review", "settings"].includes(page) ? page : "main";
  if (els.profileMainPanel) els.profileMainPanel.hidden = target !== "main";
  if (els.profileStudiesPanel) els.profileStudiesPanel.hidden = target !== "studies";
  if (els.profileReviewPanel) els.profileReviewPanel.hidden = target !== "review";
  if (els.profileSettingsPanel) els.profileSettingsPanel.hidden = target !== "settings";
  if (els.profileSignedInGrid) els.profileSignedInGrid.dataset.profilePage = target;
  if (target === "studies") renderProfileStudiesBreakdown();
  if (target === "review") loadReviewQueuePage(0);
  if (state.activeView === "profileView") resetViewportScroll();
}

// SPK-DIC-001 §11 review gate, flag-only (2026-07-30 decision) — this is
// purely a way for Rachel to work through the ai_generated backlog over
// time; nothing here hides content, that already happens live via the
// review-status-badge in createWordCard.
const REVIEW_QUEUE_PAGE_SIZE = 50;

async function loadReviewQueuePage(offset) {
  if (!els.reviewQueueList) return;
  state.reviewQueueOffset = offset;
  els.reviewQueueList.replaceChildren();
  const loading = document.createElement("span");
  loading.className = "empty-state";
  loading.textContent = "Laddar…";
  els.reviewQueueList.append(loading);
  try {
    const { items, total } = await remoteDb.loadReviewQueuePage(offset, REVIEW_QUEUE_PAGE_SIZE);
    state.reviewQueueItems = items;
    state.reviewQueueTotalCount = total;
    renderReviewQueue();
  } catch (error) {
    console.warn("[SpråkLab] Failed to load review queue.", error);
    els.reviewQueueList.replaceChildren();
    const errorState = document.createElement("span");
    errorState.className = "empty-state";
    errorState.textContent = "Kunde inte ladda granskningskön just nu.";
    els.reviewQueueList.append(errorState);
  }
}

function renderReviewQueue() {
  const items = state.reviewQueueItems || [];
  const total = state.reviewQueueTotalCount || 0;
  const offset = state.reviewQueueOffset || 0;

  if (els.reviewQueueTotal) els.reviewQueueTotal.textContent = total;
  if (els.reviewQueuePageLabel) {
    const from = total ? offset + 1 : 0;
    const to = Math.min(offset + items.length, total);
    els.reviewQueuePageLabel.textContent = `${from}–${to} av ${total}`;
  }
  if (els.reviewQueuePrevBtn) els.reviewQueuePrevBtn.disabled = offset <= 0;
  if (els.reviewQueueNextBtn) els.reviewQueueNextBtn.disabled = offset + items.length >= total;
  if (els.reviewQueueMarkPageBtn) els.reviewQueueMarkPageBtn.disabled = !items.length;

  els.reviewQueueList.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("span");
    empty.className = "empty-state";
    empty.textContent = "Inget AI-genererat innehåll väntar på granskning. 🎉";
    els.reviewQueueList.append(empty);
    return;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "reading-sentence-row review-queue-row";
    const label = document.createElement("p");
    label.textContent = `${item.swedish} — ${item.chinese || "(ingen översättning)"}`;
    const markBtn = document.createElement("button");
    markBtn.type = "button";
    markBtn.className = "secondary-button";
    markBtn.textContent = "Markera som granskat";
    markBtn.addEventListener("click", async () => {
      markBtn.disabled = true;
      try {
        await remoteDb.markWordsReviewed([item.id]);
        await loadReviewQueuePage(state.reviewQueueOffset);
        const word = (state.words || []).find((w) => w.id === item.id);
        if (word) word.status = "human_reviewed";
      } catch (error) {
        console.warn("[SpråkLab] Failed to mark word reviewed.", error);
        alert(error.message || "Kunde inte markera som granskat.");
        markBtn.disabled = false;
      }
    });
    row.append(label, markBtn);
    els.reviewQueueList.append(row);
  });
}

async function markCurrentReviewPageReviewed() {
  const items = state.reviewQueueItems || [];
  if (!items.length || !els.reviewQueueMarkPageBtn) return;
  els.reviewQueueMarkPageBtn.disabled = true;
  els.reviewQueueMarkPageBtn.textContent = "Markerar…";
  try {
    await remoteDb.markWordsReviewed(items.map((item) => item.id));
    items.forEach((item) => {
      const word = (state.words || []).find((w) => w.id === item.id);
      if (word) word.status = "human_reviewed";
    });
    await loadReviewQueuePage(state.reviewQueueOffset);
  } catch (error) {
    console.warn("[SpråkLab] Failed to mark page reviewed.", error);
    alert(error.message || "Kunde inte markera sidan som granskad.");
  } finally {
    els.reviewQueueMarkPageBtn.textContent = "Markera alla på denna sida som granskade";
    els.reviewQueueMarkPageBtn.disabled = false;
  }
}

// "Xh Ymin"/"Ymin" formatter shared by every Mina studier duration stat
// (study sessions, Shadowing recordings) — mirrors the "18 h 25 min" style
// from the source design docs (Reviews/Mina-studier数据整合...-2026-08-09.md).
function formatMsAsDuration(ms) {
  const totalMinutes = Math.round(Math.max(0, Number(ms || 0) || 0) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

// Fills the "Mina studier" breakdown cards (persistence, CEFR distribution,
// review rating quality, reading/Shadowing/AI activity) — computed on
// demand when the subpage opens rather than on every renderAuthState()
// call, since it iterates the full word list (~10k+ words with the shared
// corpus) and fires a handful of aggregate queries (2026-08-09: expanded
// from the 2026-07-25 version per Reviews/Mina-studier数据整合与Nya-ord
// 设置迁移-评审与实施方案-2026-08-09.md — every new field below is either
// computed from data already loaded in state (state.words review_count,
// state.shadowingRecordings) or a zero-new-schema aggregate over an
// existing table (effective_study_time, study_sessions).
function renderProfileStudiesBreakdown() {
  const words = state.words || [];
  const reviewed = words.filter((word) => word.last_rating);
  const goodCount = reviewed.filter((word) => word.last_rating === "good").length;
  const hardCount = reviewed.filter((word) => word.last_rating === "hard").length;
  const againCount = reviewed.filter((word) => word.last_rating === "again").length;

  if (els.profileAccuracyRate) {
    els.profileAccuracyRate.textContent = reviewed.length ? `${Math.round((goodCount / reviewed.length) * 100)}%` : "–";
  }

  if (els.profileCefrBreakdown) {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const rows = levels
      .map((level) => {
        const inLevel = words.filter((word) => word.cefr_level === level);
        if (!inLevel.length) return null;
        const learned = inLevel.filter((word) => word.learned).length;
        const percent = Math.round((learned / inLevel.length) * 100);
        return { level, learned, total: inLevel.length, percent };
      })
      .filter(Boolean);
    els.profileCefrBreakdown.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Inga CEFR-nivåer registrerade ännu.";
      els.profileCefrBreakdown.append(empty);
    }
    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "profile-cefr-row";
      const label = document.createElement("span");
      label.className = "profile-cefr-row-label";
      label.textContent = row.level;
      const track = document.createElement("div");
      track.className = "profile-progress-track";
      const fill = document.createElement("div");
      fill.className = "profile-progress-fill";
      fill.style.width = `${row.percent}%`;
      track.append(fill);
      const count = document.createElement("span");
      count.className = "profile-cefr-row-count";
      count.textContent = `${row.learned}/${row.total}`;
      rowEl.append(label, track, count);
      els.profileCefrBreakdown.append(rowEl);
    });
  }

  if (els.profileRatingBreakdown) {
    els.profileRatingBreakdown.replaceChildren();
    const ratings = [
      { key: "good", label: "Kom ihåg", count: goodCount, fillClass: "profile-rating-fill-good" },
      { key: "hard", label: "Svårt", count: hardCount, fillClass: "profile-rating-fill-hard" },
      { key: "again", label: "Glömde", count: againCount, fillClass: "profile-rating-fill-again" },
    ];
    if (!reviewed.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Inga repetitioner ännu.";
      els.profileRatingBreakdown.append(empty);
    }
    ratings.forEach((rating) => {
      if (!reviewed.length) return;
      const percent = Math.round((rating.count / reviewed.length) * 100);
      const rowEl = document.createElement("div");
      rowEl.className = "profile-rating-row";
      const label = document.createElement("span");
      label.className = "profile-rating-row-label";
      label.textContent = rating.label;
      const track = document.createElement("div");
      track.className = "profile-progress-track";
      const fill = document.createElement("div");
      fill.className = `profile-progress-fill ${rating.fillClass}`;
      fill.style.width = `${percent}%`;
      track.append(fill);
      const count = document.createElement("span");
      count.className = "profile-rating-row-count";
      count.textContent = `${percent}% (${rating.count})`;
      rowEl.append(label, track, count);
      els.profileRatingBreakdown.append(rowEl);
    });
  }
  if (els.profileRatingHint) {
    els.profileRatingHint.textContent = reviewed.length
      ? `Baserat på ${reviewed.length} repeterade ord.`
      : "Börja repetera för att se din statistik här.";
  }

  if (els.profileReadingCount) els.profileReadingCount.textContent = state.readingItems.length;
  if (els.profileShadowingCount) els.profileShadowingCount.textContent = getShadowingItems().length;

  const totalReviews = words.reduce((sum, word) => sum + Math.max(0, Math.floor(Number(word.review_count || 0) || 0)), 0);
  if (els.profileReviewCount) els.profileReviewCount.textContent = totalReviews;

  const shadowingRecords = validShadowingRecordings();
  if (els.profileShadowingRecordings) els.profileShadowingRecordings.textContent = shadowingRecords.length;
  if (els.profileShadowingRecordedTime) {
    const recordedMs = shadowingRecords.reduce((sum, recording) => sum + Math.max(0, Number(recording.audio_duration_ms || 0) || 0), 0);
    els.profileShadowingRecordedTime.textContent = formatMsAsDuration(recordedMs);
  }

  renderProfileReadingStats();
  renderProfilePersistenceStats();
  renderProfileSessionStats();
  renderProfileAiUsage();
}

// Reuses the already-loaded reading item list + the same batched
// text_resources/text_analysis stats query the "Mina läsningar" list uses
// (loadReadingListStats/enhanceReadingListWithStats) — Mina studier just
// sums what that already fetches instead of adding a second query path.
async function renderProfileReadingStats() {
  if (!state.readingItemsLoaded) {
    state.readingItemsLoaded = true;
    try {
      state.readingItems = await remoteDb.loadReadingItems();
    } catch (error) {
      console.warn("[SpråkLab] Failed to load reading items for Mina studier.", error);
    }
    if (els.profileReadingCount) els.profileReadingCount.textContent = state.readingItems.length;
  }

  let markedSentences = 0;
  let notesTotal = 0;
  state.readingItems.forEach((item) => {
    const notes = item.notes || [];
    markedSentences += notes.length;
    notesTotal += notes.filter((note) => clean(note.note)).length;
  });
  if (els.profileReadingMarkedSentences) els.profileReadingMarkedSentences.textContent = markedSentences;
  if (els.profileReadingNotesTotal) els.profileReadingNotesTotal.textContent = notesTotal;

  if (state.readingItems.some((item) => item.text_resource_id)) {
    await enhanceReadingListWithStats().catch(() => {});
  }
  let wordsTotal = 0;
  let vocabTotal = 0;
  let exprTotal = 0;
  state.readingItems.forEach((item) => {
    const stats = item.text_resource_id ? state.readingListStats?.[item.text_resource_id] : null;
    if (!stats) return;
    wordsTotal += stats.wordCount || 0;
    vocabTotal += stats.vocabCount || 0;
    exprTotal += stats.exprCount || 0;
  });
  if (els.profileReadingWordsTotal) els.profileReadingWordsTotal.textContent = wordsTotal;
  if (els.profileReadingVocabTotal) els.profileReadingVocabTotal.textContent = vocabTotal;
  if (els.profileReadingExprTotal) els.profileReadingExprTotal.textContent = exprTotal;
}

// "Uthållighet" card — derived from effective_study_time, see
// loadEffectiveStudyTimeHistory's own comment in db.js for why this needed
// no new schema (the table already existed, just was never aggregated).
async function renderProfilePersistenceStats() {
  try {
    const history = await remoteDb.loadEffectiveStudyTimeHistory();
    if (els.profileCumulativeDays) els.profileCumulativeDays.textContent = history.totalDays;
    if (els.profileLongestStreak) els.profileLongestStreak.textContent = `${history.longestStreak} dagar`;
    if (els.profileActiveDaysWeek) els.profileActiveDaysWeek.textContent = `${history.activeDaysThisWeek} / 7`;
  } catch (error) {
    console.warn("[SpråkLab] Failed to load study time history.", error);
  }
}

// "Studiepass" card — same reasoning, study_sessions was already being
// written to on every Repetera/Lär dig nya ord session.
async function renderProfileSessionStats() {
  try {
    const summary = await remoteDb.loadStudySessionsSummary();
    if (els.profileSessionCount) els.profileSessionCount.textContent = summary.completedCount;
    if (els.profileSessionTime) els.profileSessionTime.textContent = formatMsAsDuration(summary.totalMs);
  } catch (error) {
    console.warn("[SpråkLab] Failed to load study sessions summary.", error);
  }
}

const AI_FEATURE_LABELS = {
  analysis: "Textanalys",
  summary: "Sammanfattning",
  ocr: "Foto-import",
  translate_sentence: "Översättning (mening)",
  translate_paragraph: "Översättning (stycke)",
  translate_full: "Översättning (hela texten)",
  missing_word_batch: "Nya ord (bakgrund)",
  key_expressions: "Uttryck (bakgrund)",
  reading_fast_layer: "Snabböversikt",
  vocab_worth_learning: "Ordurval (bakgrund)",
};

// Rough per-call minutes-saved estimate for "Tid sparad" (文稿① §6 —
// "SpråkLab har hjälpt dig spara ~48 timmar"). Not measured, a documented
// heuristic per call (looking up/typing/summarizing manually vs. one AI
// call) — Rachel can tune these constants directly if the number feels off.
const AI_TIME_SAVED_MINUTES = {
  analysis: 5,
  summary: 2,
  ocr: 3,
  missing_word_batch: 2,
  key_expressions: 2,
  reading_fast_layer: 1,
  vocab_worth_learning: 1,
};

// 规范§14/§21 — shows real usage/cost, not a hard limit (limits aren't
// enforced yet, single-user stage). Computed on demand when the subpage
// opens, same pattern as renderProfileStudiesBreakdown above.
async function renderProfileAiUsage() {
  try {
    const summary = await remoteDb.loadAiUsageSummary();
    if (!summary) return;
    if (els.profileAiCreditsToday) els.profileAiCreditsToday.textContent = summary.creditsToday;
    if (els.profileAiCreditsMonth) els.profileAiCreditsMonth.textContent = summary.creditsMonth;
    if (els.profileAiTimeSaved) {
      const minutesSaved = Object.entries(summary.byFeature).reduce(
        (sum, [feature, stats]) => sum + (AI_TIME_SAVED_MINUTES[feature] ?? 1) * stats.count,
        0,
      );
      els.profileAiTimeSaved.textContent = formatMsAsDuration(minutesSaved * 60000);
    }
    if (els.profileAiCostHint) {
      els.profileAiCostHint.textContent = `Cachträff: ${summary.cacheHitRate}% · Verklig kostnad denna månad: $${summary.costMonth.toFixed(3)}`;
    }
    if (els.profileAiFeatureBreakdown) {
      els.profileAiFeatureBreakdown.replaceChildren();
      const entries = Object.entries(summary.byFeature).sort((a, b) => b[1].credits - a[1].credits);
      if (!entries.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Ingen AI-användning denna månad ännu.";
        els.profileAiFeatureBreakdown.append(empty);
      }
      entries.forEach(([feature, stats]) => {
        const row = document.createElement("div");
        row.className = "profile-ai-feature-row";
        const label = document.createElement("span");
        label.textContent = AI_FEATURE_LABELS[feature] || feature;
        const value = document.createElement("span");
        value.textContent = `${stats.credits}p · ${stats.count}x`;
        row.append(label, value);
        els.profileAiFeatureBreakdown.append(row);
      });
    }
  } catch (error) {
    console.warn("[SpråkLab] Failed to load AI usage summary.", error);
  }
}

function getAuthDisplayEmail(user) {
  return clean(user?.email || user?.phone || "") || "Inte inloggad";
}

function getAuthDisplayName(user) {
  const metadata = user?.user_metadata || {};
  const fullName = clean(metadata.full_name || `${metadata.first_name || ""} ${metadata.last_name || ""}`);
  return fullName || clean(user?.email || "").split("@")[0] || "du";
}

function getAuthAvatarLabel(user) {
  const name = getAuthDisplayName(user);
  return clean(name).charAt(0).toLocaleUpperCase("sv-SE") || "👤";
}

function localDateKeyForTimestamp(value) {
  const timestamp = Number(value || 0) || 0;
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function profileDataScopeKey() {
  return state.auth.user?.id ? `user:${state.auth.user.id}` : "guest";
}

function readEffectiveStudyTimeStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_EFFECTIVE_STUDY_TIME_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function effectiveStudyDeviceId() {
  try {
    const existing = clean(localStorage.getItem(LOCAL_EFFECTIVE_STUDY_DEVICE_KEY));
    if (existing) return existing;
    const value = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(LOCAL_EFFECTIVE_STUDY_DEVICE_KEY, value);
    return value;
  } catch {
    if (!effectiveStudyEphemeralDeviceId) {
      effectiveStudyEphemeralDeviceId = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return effectiveStudyEphemeralDeviceId;
  }
}

function effectiveStudyTimezone() {
  try {
    return clean(Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";
  } catch {
    return "UTC";
  }
}

function effectiveStudyTimeMs(date = todayKey(), scope = profileDataScopeKey()) {
  const localMs = Math.max(0, Number(readEffectiveStudyTimeStore()?.[scope]?.[date] || 0) || 0);
  const accountId = state.auth.user?.id || "";
  if (!accountId || effectiveStudyCloudAccountId !== accountId) return localMs;
  const cloudRows = effectiveStudyCloudRows.get(date);
  if (!cloudRows) return localMs;
  const currentDeviceId = effectiveStudyDeviceId();
  let totalMs = 0;
  cloudRows.forEach((activeMs, deviceId) => {
    totalMs += deviceId === currentDeviceId ? Math.max(activeMs, localMs) : activeMs;
  });
  if (!cloudRows.has(currentDeviceId)) totalMs += localMs;
  return Math.max(0, totalMs);
}

function addEffectiveStudyTime(elapsedMs, date = todayKey(), scope = profileDataScopeKey()) {
  const increment = Math.max(0, Math.min(Number(elapsedMs || 0) || 0, EFFECTIVE_STUDY_MAX_TICK_MS));
  if (!increment) return;
  const store = readEffectiveStudyTimeStore();
  const scopeRows = store[scope] && typeof store[scope] === "object" ? store[scope] : {};
  scopeRows[date] = Math.max(0, Number(scopeRows[date] || 0) || 0) + increment;
  const recentDates = Object.keys(scopeRows).sort().slice(-31);
  store[scope] = Object.fromEntries(recentDates.map((key) => [key, scopeRows[key]]));
  try {
    localStorage.setItem(LOCAL_EFFECTIVE_STUDY_TIME_KEY, JSON.stringify(store));
  } catch {
    // Keep the profile usable if storage is unavailable.
  }
  scheduleEffectiveStudyTimeSync();
}

async function refreshEffectiveStudyTimeCloud(date = todayKey()) {
  const accountId = state.auth.user?.id || "";
  if (!accountId || navigator.onLine === false) return null;
  try {
    const snapshot = await remoteDb.loadEffectiveStudyTime({ date });
    if (!snapshot?.enabled || state.auth.user?.id !== accountId) return snapshot;
    effectiveStudyCloudAccountId = accountId;
    effectiveStudyCloudRows.set(
      date,
      new Map((snapshot.devices || []).map((row) => [clean(row.deviceId), Math.max(0, Number(row.activeMs || 0) || 0)])),
    );
    if (state.activeView === "profileView") renderProfileLearningCards();
    return snapshot;
  } catch (error) {
    console.warn("[SpråkLab] Could not load cloud study time.", error);
    return null;
  }
}

function scheduleEffectiveStudyTimeSync(delay = EFFECTIVE_STUDY_SYNC_INTERVAL_MS) {
  if (!state.auth.user?.id) return;
  effectiveStudySyncRequested = true;
  if (effectiveStudySyncTimerId || effectiveStudySyncPromise) return;
  effectiveStudySyncTimerId = window.setTimeout(() => {
    effectiveStudySyncTimerId = null;
    void syncEffectiveStudyTime();
  }, Math.max(0, delay));
}

async function syncEffectiveStudyTime({ refreshCloud = false } = {}) {
  const accountId = state.auth.user?.id || "";
  if (!accountId || navigator.onLine === false) return null;
  if (effectiveStudySyncPromise) {
    effectiveStudySyncRequested = true;
    return effectiveStudySyncPromise;
  }
  if (effectiveStudySyncTimerId) {
    window.clearTimeout(effectiveStudySyncTimerId);
    effectiveStudySyncTimerId = null;
  }
  effectiveStudySyncRequested = false;
  const date = todayKey();
  const deviceId = effectiveStudyDeviceId();
  const combinedMs = Math.max(0, Math.floor(effectiveStudyTimeMs(date, `user:${accountId}`) || 0));
  const localDeviceMs = Math.max(
    0,
    Math.floor(Number(readEffectiveStudyTimeStore()?.[`user:${accountId}`]?.[date] || 0) || 0),
  );
  if (!localDeviceMs) {
    if (refreshCloud) await refreshEffectiveStudyTimeCloud(date);
    return { enabled: true, activeMs: 0 };
  }
  effectiveStudySyncPromise = remoteDb.upsertEffectiveStudyTime({
    deviceId,
    date,
    activeMs: localDeviceMs,
    timezone: effectiveStudyTimezone(),
  }).then(async (result) => {
    if (state.auth.user?.id !== accountId || !result?.enabled) return result;
    effectiveStudyCloudAccountId = accountId;
    const rows = effectiveStudyCloudRows.get(date) || new Map();
    rows.set(deviceId, Math.max(localDeviceMs, Number(result.activeMs || 0) || 0));
    effectiveStudyCloudRows.set(date, rows);
    if (refreshCloud || combinedMs !== localDeviceMs) await refreshEffectiveStudyTimeCloud(date);
    if (state.activeView === "profileView") renderProfileLearningCards();
    return result;
  }).catch((error) => {
    console.warn("[SpråkLab] Effective study time is queued for a later sync.", error);
    return null;
  }).finally(() => {
    effectiveStudySyncPromise = null;
    if (effectiveStudySyncRequested) scheduleEffectiveStudyTimeSync(0);
  });
  return effectiveStudySyncPromise;
}

function isEffectiveStudyContext() {
  if (state.isLearningOpen || state.currentQuiz) return true;
  if (state.activeView !== "historyView") return false;
  const isRecording = Boolean(shadowingRecorder && shadowingRecorder.state === "recording");
  return isRecording || state.shadowingPlaybackState === "playing";
}

function validShadowingRecordings() {
  const seen = new Set();
  return (state.shadowingRecordings || []).filter((recording) => {
    const durationMs = Math.max(0, Number(recording.audio_duration_ms || 0) || 0);
    const key = clean(recording.id) || `${clean(recording.shadowing_item_id)}:${Number(recording.recorded_at || recording.created_at || 0) || 0}`;
    if (!key || durationMs <= 0 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function profileLearningSnapshot() {
  const today = todayKey();
  const studiedWordIds = new Set();
  let reviewCompletions = 0;
  state.words.forEach((word) => {
    if (word?.id && (word.first_studied_at || word.last_study_date)) studiedWordIds.add(word.id);
    reviewCompletions += Math.max(0, Math.floor(Number(word.review_count || 0) || 0));
  });
  const shadowingRecords = validShadowingRecordings();
  const totalXP =
    studiedWordIds.size * 10 +
    reviewCompletions * 5 +
    shadowingRecords.length * 30;
  const level = Math.floor(totalXP / PROFILE_XP_PER_LEVEL) + 1;
  const currentLevelXP = totalXP % PROFILE_XP_PER_LEVEL;
  const remainingXP = PROFILE_XP_PER_LEVEL - currentLevelXP;
  const planIsToday = state.dailyStudy?.date === today;
  const completedNewIds = planIsToday ? uniqueIds(state.dailyStudy?.completedNewWordIds || []) : [];
  const completedReviewIds = planIsToday ? uniqueIds(state.dailyStudy?.completedReviewWordIds || []) : [];
  const todayReviewedHistory = new Set(
    (state.history || [])
      .filter((entry) => entry.action === "reviewed" && localDateKeyForTimestamp(entry.created_at) === today)
      .map((entry) => clean(entry.id) || `${clean(entry.word_id)}:${Number(entry.created_at || 0) || 0}`)
      .filter(Boolean),
  );
  const todayNew = Math.max(
    completedNewIds.length,
    Math.max(0, Number(state.dailyProgress?.todayNewCount || 0) || 0),
  );
  const todayReview = Math.max(completedReviewIds.length, todayReviewedHistory.size);
  const todayShadowing = shadowingRecords.filter(
    (recording) => localDateKeyForTimestamp(recording.recorded_at || recording.created_at) === today,
  ).length;
  // Same "text_resource_id present + updated/created today" definition of
  // a completed reading already used by renderReadingShadowingEntryCard.
  const todayReading = (state.readingItems || []).filter(
    (item) => item.text_resource_id && localDateKeyForTimestamp(item.updatedAt || item.createdAt) === today,
  ).length;
  const activeMinutes = Math.max(0, Math.floor(effectiveStudyTimeMs(today) / 60000));
  const progress = Math.min(100, (activeMinutes / PROFILE_DAILY_GOAL_MINUTES) * 100);
  return {
    totalXP,
    level,
    currentLevelXP,
    remainingXP,
    activeMinutes,
    progress: Number.isFinite(progress) ? progress : 0,
    tasks: {
      newWords: todayNew >= DAILY_NEW_WORD_LIMIT,
      review: todayReview >= DAILY_NEW_WORD_LIMIT,
      shadowing: todayShadowing >= 1,
      reading: todayReading >= 1,
    },
  };
}

function setProfileGoalTask(element, complete) {
  if (!element) return;
  element.classList.toggle("complete", complete);
}

function renderProfileLearningCards() {
  const snapshot = profileLearningSnapshot();
  if (els.profileLevelValue) els.profileLevelValue.textContent = snapshot.level;
  if (els.profileLevelProgress) els.profileLevelProgress.textContent = `${snapshot.currentLevelXP} / ${PROFILE_XP_PER_LEVEL} XP`;
  if (els.profileXpBar) els.profileXpBar.style.width = `${(snapshot.currentLevelXP / PROFILE_XP_PER_LEVEL) * 100}%`;
  if (els.profileNextLevel) els.profileNextLevel.textContent = snapshot.level + 1;
  if (els.profileRemainingXp) els.profileRemainingXp.textContent = snapshot.remainingXP;
  if (els.profileDailyGoal) els.profileDailyGoal.textContent = `${snapshot.activeMinutes} / ${PROFILE_DAILY_GOAL_MINUTES} min`;
  if (els.profileGoalPercent) els.profileGoalPercent.textContent = `${Math.round(snapshot.progress)}%`;
  if (els.profileGoalRing) els.profileGoalRing.style.setProperty("--profile-goal-progress", `${snapshot.progress * 3.6}deg`);
  setProfileGoalTask(els.profileGoalNew, snapshot.tasks.newWords);
  setProfileGoalTask(els.profileGoalReview, snapshot.tasks.review);
  setProfileGoalTask(els.profileGoalShadowing, snapshot.tasks.shadowing);
  setProfileGoalTask(els.profileGoalReading, snapshot.tasks.reading);
  return snapshot;
}

function tickEffectiveStudyTime({ allowHidden = false } = {}) {
  const now = Date.now();
  const currentDateKey = todayKey();
  if (effectiveStudyLastDateKey && effectiveStudyLastDateKey !== currentDateKey) {
    void refreshEffectiveStudyTimeCloud(currentDateKey);
  }
  effectiveStudyLastDateKey = currentDateKey;
  const elapsed = now - effectiveStudyLastTickAt;
  effectiveStudyLastTickAt = now;
  if (elapsed <= 0 || elapsed > EFFECTIVE_STUDY_MAX_TICK_MS) return;
  if (!allowHidden && document.hidden) return;
  if (now - effectiveStudyLastInteractionAt > EFFECTIVE_STUDY_IDLE_LIMIT_MS) return;
  if (!isEffectiveStudyContext()) return;
  addEffectiveStudyTime(elapsed);
  if (state.activeView === "profileView") renderProfileLearningCards();
}

function setupEffectiveStudyTimeTracking() {
  if (effectiveStudyTimerId) return;
  const markInteraction = () => {
    effectiveStudyLastInteractionAt = Date.now();
  };
  ["pointerdown", "keydown", "touchstart"].forEach((type) => {
    document.addEventListener(type, markInteraction, { passive: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      tickEffectiveStudyTime({ allowHidden: true });
      void syncEffectiveStudyTime();
    }
    effectiveStudyLastTickAt = Date.now();
  });
  window.addEventListener("pagehide", () => {
    tickEffectiveStudyTime({ allowHidden: true });
    void syncEffectiveStudyTime();
  });
  effectiveStudyLastTickAt = Date.now();
  effectiveStudyLastInteractionAt = Date.now();
  effectiveStudyLastDateKey = todayKey();
  effectiveStudyTimerId = window.setInterval(tickEffectiveStudyTime, EFFECTIVE_STUDY_TICK_MS);
}

function setAuthMessage(message = "") {
  state.auth.message = clean(message);
  if (els.authMessage) els.authMessage.textContent = state.auth.message;
}

function formatProfileSyncTime(timestamp) {
  const value = Number(timestamp || 0) || 0;
  if (!value) return "Inte synkroniserat ännu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Inte synkroniserat ännu";
  const time = new Intl.DateTimeFormat("sv-SE", { hour: "2-digit", minute: "2-digit" }).format(date);
  const today = localDateKeyForTimestamp(Date.now());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const dateKey = localDateKeyForTimestamp(value);
  if (dateKey === today) return `Idag ${time}`;
  if (dateKey === localDateKeyForTimestamp(yesterdayDate.getTime())) return `Igår ${time}`;
  const calendarDate = new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `${calendarDate} ${time}`;
}

async function refreshProfileSyncSummary() {
  const status = await remoteDb.getSyncStatus().catch(() => ({ enabled: false, pending: 0, lastSyncedAt: 0 }));
  state.sync.pending = Number(status.pending || 0) || 0;
  state.sync.lastSyncedAt = Number(status.lastSyncedAt || 0) || state.sync.lastSyncedAt || 0;
  renderProfileSyncSummary();
}

function renderProfileSyncSummary() {
  if (!els.profileLastSyncValue) return;
  els.profileLastSyncValue.textContent = navigator.onLine === false
    ? "Offline"
    : state.auth.loading || state.sync.status === "syncing"
      ? "Synkroniserar..."
      : state.sync.pending > 0
        ? `${state.sync.pending} ändringar väntar`
        : formatProfileSyncTime(state.sync.lastSyncedAt);
}

async function syncPendingUserData({ reloadData = false } = {}) {
  if (!state.auth.user?.id || navigator.onLine === false || state.sync.status === "syncing") {
    renderProfileSyncSummary();
    return null;
  }
  state.sync.status = "syncing";
  renderProfileSyncSummary();
  try {
    await syncEffectiveStudyTime();
    const result = await remoteDb.flushPendingSync();
    state.dailyStudy = ensureDailyStudyPlan();
    const remoteDailyStudy = await ensureRemoteDailyStudySessions(state.dailyStudy);
    if (reloadData && result.completed > 0) await loadData();
    if (result.failed === 0 && (result.completed > 0 || remoteDailyStudy)) {
      await remoteDb.recordSuccessfulSync();
    }
    await refreshEffectiveStudyTimeCloud(todayKey());
    state.sync.status = result.failed > 0 ? "error" : "success";
    await refreshProfileSyncSummary();
    return result;
  } catch (error) {
    state.sync.status = "error";
    await refreshProfileSyncSummary();
    console.warn("[Min Ordbok] Pending sync failed.", error);
    return null;
  }
}

function renderAuthState() {
  const user = state.auth.user;
  const isSignedIn = Boolean(user?.id);
  const mastered = state.words.filter((word) => word.learned).length;
  const todayNew = Math.min(Number(state.dailyProgress?.todayNewCount || 0) || 0, Number(state.dailyNewWordTarget || 10) || 10);
  if (els.profileSignedOutCard) els.profileSignedOutCard.hidden = isSignedIn;
  if (els.profileSignedInGrid) els.profileSignedInGrid.hidden = !isSignedIn;
  if (!isSignedIn) showProfilePage("main");
  if (els.topbarAuthButton) {
    els.topbarAuthButton.dataset.signedIn = String(isSignedIn);
    els.topbarAuthButton.textContent = state.auth.loading ? "..." : isSignedIn ? getAuthAvatarLabel(user) : "Logga in";
    els.topbarAuthButton.setAttribute("aria-label", isSignedIn ? "Öppna profil" : "Logga in");
    els.topbarAuthButton.title = isSignedIn ? `Inloggad som ${getAuthDisplayEmail(user)}` : "Logga in";
    els.topbarAuthButton.disabled = state.auth.loading || state.auth.busy;
  }
  if (els.profileLoginButton) {
    els.profileLoginButton.textContent = "Logga in";
    els.profileLoginButton.disabled = state.auth.loading || state.auth.busy;
  }
  if (els.profileLogoutButton) {
    const label = els.profileLogoutButton.querySelector("span:first-child");
    if (label) label.textContent = state.auth.loading ? "Läser..." : "Logga ut";
    else els.profileLogoutButton.textContent = state.auth.loading ? "Läser..." : "Logga ut";
    els.profileLogoutButton.disabled = state.auth.loading || state.auth.busy;
  }
  if (els.profileAccountName) {
    const accountName = clean(user?.email || "").split("@")[0] || getAuthDisplayName(user);
    els.profileAccountName.textContent = state.auth.loading ? "Läser profil..." : `Hej, ${accountName}`;
  }
  if (els.profileAvatar) els.profileAvatar.textContent = getAuthAvatarLabel(user);
  if (els.profilePlanBadge) {
    els.profilePlanBadge.textContent = "Fortsätt mot flytande svenska! 🇸🇪";
  }
  if (els.profileAccountEmail) {
    els.profileAccountEmail.textContent = state.auth.loading
      ? "Verifierar session..."
      : isSignedIn
        ? getAuthDisplayEmail(user)
        : "Inte inloggad";
  }
  if (els.profileSyncStatus) {
    els.profileSyncStatus.textContent = state.auth.loading ? "Kontrollerar..." : isSignedIn ? "Aktiv" : "Inte ansluten";
  }
  renderProfileSyncSummary();
  if (els.profileStudyStats) {
    const streak = state.studyStats?.current_streak || 0;
    els.profileStudyStats.textContent = state.auth.loading ? "Laddar..." : `${streak} dagar i rad`;
  }
  renderProfileLearningCards();
  if (els.profileWordCount) els.profileWordCount.textContent = state.words.length;
  if (els.profileMasteredCount) els.profileMasteredCount.textContent = mastered;
  if (els.profileTodayActivity) els.profileTodayActivity.textContent = `${todayNew} nya ord`;
  if (els.profileStudyHint) {
    els.profileStudyHint.textContent = state.auth.loading
      ? "Hämtar statistik..."
      : `${mastered} lärda ord · ${todayNew} klara idag`;
  }
  if (els.profileSettingsSummary) {
    els.profileSettingsSummary.textContent = state.auth.loading
      ? "Läser inställningar..."
      : `Studieområde: ${state.studyScope || STUDY_SCOPE_ALL}`;
  }
  if (els.submitAuthBtn) {
    els.submitAuthBtn.disabled = state.auth.loading || state.auth.busy;
    els.submitAuthBtn.textContent = state.auth.busy
      ? state.auth.otpPending
        ? "Verifierar..."
        : "Skickar..."
      : state.auth.otpPending
        ? "Verifiera kod"
        : "Skicka kod";
  }
  if (els.authEmailStep) els.authEmailStep.hidden = state.auth.otpPending;
  if (els.authOtpStep) els.authOtpStep.hidden = !state.auth.otpPending;
  if (els.authLoginTab) els.authLoginTab.disabled = state.auth.otpPending || state.auth.busy;
  if (els.authSignupTab) els.authSignupTab.disabled = state.auth.otpPending || state.auth.busy;
  document.querySelectorAll("[data-auth-provider]").forEach((button) => {
    button.disabled = state.auth.loading || state.auth.busy;
  });
}

async function refreshAuthState({ reloadData = false } = {}) {
  const authState = await syncAuthState().catch((error) => {
    console.warn("[Min Ordbok] Failed to read auth state.", error);
    return { user: null };
  });
  const nextUser = authState?.user || (await getCurrentUser().catch(() => null));
  if (effectiveStudyCloudAccountId && effectiveStudyCloudAccountId !== nextUser?.id) {
    effectiveStudyCloudAccountId = "";
    effectiveStudyCloudRows.clear();
  }
  state.auth.user = nextUser;
  state.auth.loading = false;
  renderAuthState();
  await refreshProfileSyncSummary();
  if (reloadData) {
    await loadData();
    await syncPendingUserData({ reloadData: true });
  }
}

function setupAuthUiSync() {
  if (authUiSubscription || !supabase?.auth) return;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (effectiveStudyCloudAccountId && effectiveStudyCloudAccountId !== session?.user?.id) {
      effectiveStudyCloudAccountId = "";
      effectiveStudyCloudRows.clear();
    }
    state.auth.user = session?.user || null;
    state.auth.loading = false;
    if (!session?.user?.id) {
      state.sync = { status: "idle", pending: 0, lastSyncedAt: 0 };
    }
    renderAuthState();
    if (
      session?.user?.id &&
      appInitializationComplete &&
      ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)
    ) {
      queueMicrotask(() => void syncPendingUserData());
    }
  });
  authUiSubscription = data?.subscription || true;
}

function setAuthMode(mode = "login") {
  state.auth.mode = mode === "signup" ? "signup" : "login";
  state.auth.otpPending = false;
  state.auth.otpEmail = "";
  const isSignup = state.auth.mode === "signup";
  els.authLoginTab?.classList.toggle("active", !isSignup);
  els.authSignupTab?.classList.toggle("active", isSignup);
  els.authLoginTab?.setAttribute("aria-selected", String(!isSignup));
  els.authSignupTab?.setAttribute("aria-selected", String(isSignup));
  if (els.authSignupFields) els.authSignupFields.hidden = !isSignup;
  if (els.authHelperText) {
    els.authHelperText.textContent = isSignup
      ? "Skapa konto med din e-post. Vi skickar en säker verifieringskod."
      : "Vi skickar en säker inloggningskod till din e-post.";
  }
  renderAuthState();
}

function openAuthDialog(mode = "login") {
  if (!els.authDialog) return;
  setAuthMode(mode);
  setAuthMessage("");
  if (els.authEmailInput) {
    els.authEmailInput.value = clean(state.auth.user?.email || "");
    window.setTimeout(() => els.authEmailInput.focus(), 0);
  }
  if (!els.authDialog.open) els.authDialog.showModal();
}

function closeAuthDialog() {
  if (!els.authDialog?.open) return;
  els.authDialog.close();
}

function returnToAuthEmailStep() {
  state.auth.otpPending = false;
  state.auth.otpEmail = "";
  if (els.authOtpInput) els.authOtpInput.value = "";
  setAuthMessage("");
  setAuthMode(state.auth.mode);
  window.setTimeout(() => els.authEmailInput?.focus(), 0);
}

function getAuthRedirectUrl() {
  return isLocalDevelopmentOrigin() ? AUTH_REDIRECT_URL : `${window.location.origin}/`;
}

function withAuthTimeout(request, timeoutMs = 15000) {
  return Promise.race([
    request,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error("Anslutningen tog för lång tid. Försök igen.")), timeoutMs);
    }),
  ]);
}

async function signInWithAuthProvider(provider) {
  if (!provider || state.auth.loading || state.auth.busy) return;
  state.auth.busy = true;
  setAuthMessage("");
  renderAuthState();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: getAuthRedirectUrl() },
  });
  state.auth.busy = false;
  renderAuthState();
  if (error) setAuthMessage(error.message || "Kunde inte starta inloggningen.");
}

async function submitAuthForm(event) {
  event.preventDefault();
  if (state.auth.otpPending) {
    await verifyAuthOtp();
    return;
  }
  const email = clean(els.authEmailInput?.value || "");
  if (!email) {
    setAuthMessage("Ange din e-postadress.");
    return;
  }
  state.auth.busy = true;
  setAuthMessage("");
  renderAuthState();
  const redirectTo = getAuthRedirectUrl();
  try {
    const { error } = await withAuthTimeout(
      supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: state.auth.mode === "signup",
          data: state.auth.mode === "signup"
            ? {
                first_name: clean(els.authFirstNameInput?.value || ""),
                last_name: clean(els.authLastNameInput?.value || ""),
                full_name: clean(`${els.authFirstNameInput?.value || ""} ${els.authLastNameInput?.value || ""}`),
              }
            : undefined,
        },
      }),
    );
    if (error) {
      setAuthMessage(error.message || "Kunde inte skicka inloggningslänken.");
      return;
    }
    state.auth.otpPending = true;
    state.auth.otpEmail = email;
    if (els.authOtpInput) els.authOtpInput.value = "";
    setAuthMessage(`Ange verifieringskoden som skickades till ${email}.`);
    if (els.authHelperText) els.authHelperText.textContent = "Koden verifieras i den här appen och öppnar ingen annan webbläsare.";
    if (els.authEmailInput) els.authEmailInput.value = email;
  } catch (error) {
    setAuthMessage(error.message || "Kunde inte skicka inloggningslänken.");
  } finally {
    state.auth.busy = false;
    renderAuthState();
  }
}

async function verifyAuthOtp() {
  const email = clean(state.auth.otpEmail || els.authEmailInput?.value || "");
  const token = clean(els.authOtpInput?.value || "").replace(/\s+/g, "");
  if (!email || !/^\d{6,8}$/.test(token)) {
    setAuthMessage("Ange hela verifieringskoden från e-posten.");
    return;
  }
  state.auth.busy = true;
  setAuthMessage("");
  renderAuthState();
  try {
    const { data, error } = await withAuthTimeout(supabase.auth.verifyOtp({ email, token, type: "email" }));
    if (error) {
      setAuthMessage(error.message || "Koden kunde inte verifieras.");
      return;
    }
    state.auth.user = data?.user || null;
    state.auth.otpPending = false;
    state.auth.otpEmail = "";
    await refreshAuthState({ reloadData: true });
    closeAuthDialog();
    activateView("profileView");
  } catch (error) {
    setAuthMessage(error.message || "Koden kunde inte verifieras.");
  } finally {
    state.auth.busy = false;
    renderAuthState();
  }
}

async function handleAuthButtonClick() {
  if (state.auth.loading || state.auth.busy) return;
  if (state.auth.user?.id) {
    state.auth.busy = true;
    renderAuthState();
    const { error } = await supabase.auth.signOut();
    state.auth.busy = false;
    renderAuthState();
    if (error) {
      setAuthMessage(error.message || "Kunde inte logga ut.");
      return;
    }
    state.auth.user = null;
    setAuthMessage("");
    await syncAuthState().catch(() => {});
    await loadData();
    return;
  }
  openAuthDialog();
}

function renderNotebookOptions() {
  const notebooks = getNotebooks();
  const userNotebooks = getUserNotebooks().filter((notebook) => !sameCategory(notebook, DEFAULT_NOTEBOOK));
  if (state.selectedNotebook && !notebooks.includes(state.selectedNotebook)) state.selectedNotebook = "";
  renderSelect(els.notebookSelect, notebooks, state.selectedNotebook);
  renderSelect(els.notebookInput, [DEFAULT_NOTEBOOK, ...userNotebooks], state.selectedNotebook || DEFAULT_NOTEBOOK);
}

function openOrdlistaFromBooks() {
  state.libraryReturnView = "notebookView";
  state.selectedNotebook = "";
  state.exportNotebook = "all";
  state.query = "";
  state.generatedWord = null;
  state.filter = "all";
  state.favoriteCategory = "all";
  els.searchInput.value = "";
  resetListLimit("library");
  renderNotebookOptions();
  renderExportNotebookOptions();
  activateView("wordLibraryView");
}

function closeLibraryView() {
  const returnView = state.libraryReturnView || "";
  state.libraryReturnView = "";
  if (returnView === "notebookView") {
    state.selectedNotebook = "";
    resetListLimit("notebook");
    activateView("notebookView");
    return;
  }
  forceHomeView({ resetScroll: true });
}

function openLearnedNotebookFromBooks() {
  state.selectedNotebook = LEARNED_NOTEBOOK;
  state.exportNotebook = LEARNED_NOTEBOOK;
  resetListLimit("notebook");
  renderNotebookOptions();
  renderExportNotebookOptions();
  activateView("notebookView");
  renderNotebook();
  els.notebookDetailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ensureNotebookOption(name) {
  const notebook = normalizeNotebookName(name);
  if (!notebook) return DEFAULT_NOTEBOOK;
  if (![...els.notebookInput.options].some((option) => sameCategory(option.value, notebook))) {
    const option = document.createElement("option");
    option.value = notebook;
    option.textContent = notebook;
    els.notebookInput.append(option);
  }
  return notebook;
}

function renderExportNotebookOptions() {
  const notebooks = getNotebooks();
  if (state.exportNotebook !== "all" && !notebooks.includes(state.exportNotebook)) state.exportNotebook = "all";
  els.exportNotebookSelect.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Alla ord";
  els.exportNotebookSelect.append(allOption);
  notebooks.forEach((notebook) => {
    const option = document.createElement("option");
    option.value = notebook;
    option.textContent = notebook;
    option.selected = notebook === state.exportNotebook;
    els.exportNotebookSelect.append(option);
  });
  els.exportNotebookSelect.value = state.exportNotebook;
}

function renderSelect(select, values, selected) {
  select.replaceChildren();
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selected;
    select.append(option);
  });
}

function getFavoriteCategories() {
  return getNotebooks();
}

function getStudyScopeOptions() {
  const seen = new Set();
  const options = [
    { value: STUDY_SCOPE_ALL, label: "Ordlista" },
    ...getNotebooks().map((notebook) => ({ value: `notebook:${notebook}`, label: notebook })),
  ];
  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderStudyScopeOptions() {
  const options = getStudyScopeOptions();
  if (!options.some((option) => option.value === state.studyScope)) state.studyScope = STUDY_SCOPE_ALL;
  renderSelect(els.studyScopeSelect, options.map((option) => option.value), state.studyScope);
  [...els.studyScopeSelect.options].forEach((option) => {
    option.textContent = options.find((item) => item.value === option.value)?.label || option.value;
  });
}

function renderFavoriteCategoryFilter() {
  const isFavoriteFilter = state.filter === "favorite";
  els.favoriteCategoryFilterWrap.hidden = !isFavoriteFilter;
  const categories = getFavoriteCategories();
  if (state.favoriteCategory !== "all" && !categories.includes(state.favoriteCategory)) {
    state.favoriteCategory = "all";
  }
  els.favoriteCategoryFilter.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Alla favoriter";
  els.favoriteCategoryFilter.append(allOption);
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    els.favoriteCategoryFilter.append(option);
  });
  els.favoriteCategoryFilter.value = state.favoriteCategory;
}

function renderWords() {
  const visibleWords = getVisibleWords();
  els.wordList.replaceChildren();
  els.enrichSearchBtn.disabled = !state.query || visibleWords.length === 0;
  if (visibleWords.length === 0 && state.query) {
    els.wordList.append(createMissingWordState(state.query));
    return;
  }
  renderWordCollection(
    els.wordList,
    visibleWords,
    "Inga ord ännu. Lägg till ditt första ord.",
    state.query ? "search" : "library",
    "library",
  );
}

function createMissingWordState(query) {
  const panel = document.createElement("div");
  panel.className = "empty-state action-empty-state";

  const title = document.createElement("strong");
  title.textContent = "Ordet finns inte i din ordlista";

  const text = document.createElement("p");
  text.textContent = `Sökord: ${query}`;

  const actions = document.createElement("div");
  actions.className = "practice-actions";

  const addButton = document.createElement("button");
  addButton.className = "primary-button";
  addButton.type = "button";
  addButton.dataset.emptyAction = "add";
  addButton.textContent = "Lägg till ordet";

  const generateButton = document.createElement("button");
  generateButton.className = "secondary-button";
  generateButton.type = "button";
  generateButton.dataset.emptyAction = "generate";
  generateButton.textContent = "AI-generera ordkort";

  actions.append(addButton, generateButton);
  panel.append(title, text, actions);
  return panel;
}

function runSearch() {
  state.query = els.searchInput.value.trim();
  resetListLimit("library");
  if (state.generatedWord && clean(state.generatedWord.swedish).toLowerCase() !== state.query.toLowerCase()) {
    state.generatedWord = null;
  }
  renderWords();
  renderDictionary();
}

function runSearchAndOpenDetail() {
  runSearch();
  if (!state.query) return;
  const match = findBestSearchMatch();
  if (match) {
    openWordDetail(match.word, match.mode);
    return;
  }
  openMissingSearchDetail(state.query);
}

function openMissingSearchDetail(query) {
  els.detailDialog.dataset.sourceMode = "home-search";
  els.detailDialog.dataset.wordId = "";
  els.detailContent.replaceChildren(createMissingWordState(query));
  if (!els.detailDialog.open) els.detailDialog.showModal();
}

function findBestSearchMatch() {
  const query = normalizeSearchTerm(state.query);
  const visibleWords = getLibraryWordsForDisplay().filter((word) => wordMatchesQuery(word, query));
  const exactWord = visibleWords.find((word) => normalizeSearchTerm(word.swedish) === query);
  if (exactWord) return { word: exactWord, mode: "library" };
  const exactForm = visibleWords
    .filter((word) => wordMatchesExactSearchForm(word, query))
    .sort((a, b) => exactSearchRank(a, query) - exactSearchRank(b, query))[0];
  if (exactForm) return { word: exactForm, mode: "library" };

  const dictionaryMatches = getDictionaryMatches();
  const exactDictionary = dictionaryMatches.find((word) => normalizeSearchTerm(word.swedish) === query);
  if (exactDictionary) return { word: exactDictionary, mode: "dictionary" };
  const exactDictionaryForm = dictionaryMatches
    .filter((word) => wordMatchesExactSearchForm(word, query))
    .sort((a, b) => exactSearchRank(a, query) - exactSearchRank(b, query))[0];
  if (exactDictionaryForm) return { word: exactDictionaryForm, mode: "dictionary" };
  return null;
}

function renderDictionary() {
  const matches = getDictionaryMatches();
  const hasQuery = state.query.length > 0;
  const hasGenerated = Boolean(state.generatedWord);
  els.dictionaryPanel.hidden = !hasQuery && !hasGenerated;
  els.createFromSearchBtn.hidden = !hasQuery;
  if (!hasQuery && !hasGenerated) {
    els.dictionaryList.replaceChildren();
    return;
  }
  els.dictionaryList.replaceChildren();
  if (state.generatedWord) {
    els.dictionaryList.append(createWordCard(state.generatedWord, "generated"));
  }
  if (matches.length > 0) {
    matches
      .filter(
        (word) =>
          !state.generatedWord ||
          clean(word.swedish).toLowerCase() !== clean(state.generatedWord.swedish).toLowerCase(),
      )
      .forEach((word) => els.dictionaryList.append(createWordCard(word, "dictionary")));
    return;
  }
  if (!state.generatedWord) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `Den inbyggda ordboken har inte "${state.query}" ännu. Du kan skapa ett eget ordkort.`;
    els.dictionaryList.append(empty);
  }
}

function renderNotebook() {
  const inBook = Boolean(state.selectedNotebook);
  renderPinnedNotebookBooks();
  renderNotebookBooks();
  if (els.notebookExportPanel) els.notebookExportPanel.hidden = inBook;
  els.createNotebookPanel.hidden = inBook;
  els.pinnedBookPanel.hidden = inBook;
  els.bookListPanel.hidden = inBook;
  els.notebookDetailPanel.hidden = !inBook;
  els.notebookTitle.textContent = state.selectedNotebook || "Bok";
  if (inBook) {
    renderWordCollection(els.notebookList, getNotebookWords(), "Den här boken är tom.", "notebook", "notebook");
  } else {
    els.notebookList.replaceChildren();
  }
}

function renderPinnedNotebookBooks() {
  if (!els.notebookPinnedBookList) return;
  const pinnedBooks = [
    {
      id: "all",
      title: "Ordlista / Alla ord",
      count: getLibraryWordsForDisplay().length,
      subtitle: "Öppna hela ordlistan",
      active: state.activeView === "libraryView",
    },
    {
      id: "export",
      title: "Exportera ord",
      count: getLibraryWordsForDisplay().length,
      subtitle: "Välj bok",
      action: "export",
      active: false,
    },
  ];
  els.notebookPinnedBookList.replaceChildren(
    ...pinnedBooks.map((book) => {
      const button = document.createElement("button");
      button.className = "book-card";
      button.type = "button";
      if (book.id === "all") button.dataset.fixedBook = "all";
      else if (book.action) button.dataset.quickAction = book.action;
      else button.dataset.notebook = book.id;
      button.classList.toggle("active", book.active);
      const title = document.createElement("strong");
      title.textContent = book.title;
      const count = document.createElement("span");
      count.textContent = `${book.count} ord`;
      if (book.subtitle) count.title = book.subtitle;
      button.append(title, count);
      return button;
    }),
  );
}

function renderNotebookBooks() {
  const notebooks = [
    ...DEFAULT_BOOKSHELF_CATEGORIES,
    ...getUserNotebooks().filter((notebook) => !isLearnedNotebook(notebook) && !isFixedNotebook(notebook)),
  ];
  els.notebookBookList.replaceChildren();
  notebooks.forEach((notebook) => {
    const words = getNotebookWords(notebook);
    const button = document.createElement("button");
    button.className = "book-card";
    button.type = "button";
    button.dataset.notebook = notebook;
    button.classList.toggle("active", sameCategory(notebook, state.selectedNotebook));
    const title = document.createElement("strong");
    title.textContent = notebook;
    const count = document.createElement("span");
    count.textContent = `${words.length} ord`;
    button.append(title, count);
    els.notebookBookList.append(button);
  });
  if (notebooks.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Inga böcker ännu. Skapa din första bok.";
    els.notebookBookList.append(empty);
  }
}

function renderWordCollection(container, words, emptyText, mode = "library", limitKey = null) {
  container.replaceChildren();
  if (words.length === 0) {
    if (!emptyText) return;
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }
  const limit = limitKey ? state.listLimits[limitKey] || INITIAL_LIST_LIMIT : words.length;
  const visibleWords = words.slice(0, limit);
  const fragment = document.createDocumentFragment();
  visibleWords.forEach((word) => fragment.append(createWordCard(word, mode)));
  if (visibleWords.length < words.length && limitKey) {
    fragment.append(createLoadMoreState(words.length, visibleWords.length, limitKey));
  }
  container.append(fragment);
}

function createLoadMoreState(total, shown, limitKey) {
  const panel = document.createElement("div");
  panel.className = "load-more-state";
  const count = document.createElement("span");
  count.textContent = `Visar ${shown} av ${total}`;
  const button = document.createElement("button");
  button.className = "secondary-button";
  button.type = "button";
  button.dataset.action = "load-more";
  button.dataset.limitKey = limitKey;
  button.textContent = "Visa fler";
  panel.append(count, button);
  return panel;
}

function createWordCard(word, mode = "library") {
  const card = els.template.content.firstElementChild.cloneNode(true);
  const isRowMode = ["library", "search", "dictionary", "notebook", "generated"].includes(mode);
  const isLibraryListMode = ["library", "search", "notebook"].includes(mode);
  const isStudyDetailMode = ["detail", "detail-dictionary", "detail-generated"].includes(mode);
  const isDictionaryMode = mode === "dictionary" || mode === "detail-dictionary";
  card.dataset.id = word.id;
  card.dataset.swedish = word.swedish;
  card.dataset.mode = mode;
  if (isRowMode) card.classList.add("word-row");
  card.querySelector(".star-button").classList.toggle("active", word.favorite);
  card.querySelector("h3").classList.add("word-title");
  card.querySelector("h3").textContent = word.swedish;
  // Fraser/Uttryck entries keep a legacy part_of_speech value (often
  // "phrase") unrelated to the Fraser-vs-Uttryck distinction shown in that
  // catalog's own filter tabs — badge by object_type there instead so the
  // badge doesn't say "Fras" on something filed under Uttryck.
  card.querySelector(".pos-badge").textContent =
    word.object_type === "phrase" ? "Fras" : word.object_type === "expression" ? "Uttryck" : posBadgeLabel(word.pos);
  // SPK-DIC-001 §11 review gate, flag-only per Rachel's 2026-07-30 decision:
  // ai_generated content stays fully visible/searchable, just visibly marked
  // so it's not silently indistinguishable from human_reviewed/published entries.
  const reviewBadge = card.querySelector(".review-status-badge");
  if (reviewBadge) reviewBadge.hidden = word.status !== "ai_generated";
  card.querySelector(".meaning").textContent = word.chinese;
  card.querySelector(".english").textContent = word.english || "Svensk förklaring saknas";

  const details = card.querySelector(".detail-list");
  if (isRowMode) {
    card.querySelector(".star-button").hidden = true;
    card.querySelector(".english").hidden = true;
    details.hidden = true;
    card.querySelector(".meta-row").hidden = true;
    card.querySelector(".card-actions").hidden = !isLibraryListMode;
  } else if (isStudyDetailMode) {
    card.classList.add("study-word-card");
    card.querySelector(".star-button").hidden = true;
    card.querySelector(".english").hidden = true;

    // Five-layer progressive disclosure per SPK-DIC-001 §10: core info and
    // grammar/usage stay expanded (the words a learner needs immediately),
    // extended learning (synonyms/antonyms/word family/memory tip) starts
    // collapsed since it's optional depth, not required to understand the word.
    const coreGroup = addLayerGroup(details, "核心信息");
    addStudyDetail(coreGroup, "Ordklass", formatPosForStudy(word));
    if (clean(word.cefr_level)) addStudyDetail(coreGroup, "CEFR-nivå", clean(word.cefr_level));
    addStudyDetail(coreGroup, "Kinesisk betydelse", clean(word.chinese) || "Kinesisk betydelse saknas.");
    addStudyDetail(coreGroup, "Svensk förklaring", clean(word.english) || "Svensk förklaring saknas.");

    const grammarGroup = addLayerGroup(details, "语法变化");
    addStudyDetail(grammarGroup, "Grammatik", formatGrammarForStudy(word));
    formatPosSpecificGrammarExtras(word).forEach(({ label, value }) => addStudyDetail(grammarGroup, label, value));

    const usageGroup = addLayerGroup(details, "真实使用");
    addStudyDetail(usageGroup, "Exempel", formatExampleForStudy(word.example));
    addStudyDetail(usageGroup, "Fraser", createStudyCollocationList(word.collocations, word.example, word));
    if (word.usage_registers.length) addStudyDetail(usageGroup, "Användning", formatUsageRegisters(word.usage_registers));

    const extendedGroup = addLayerGroup(details, "扩展学习", { collapsible: true, expanded: false });
    extendedGroup.classList.add("extended-learning-group");
    addStudyDetail(extendedGroup, "Relaterade ord", createRelatedWordList(word.related_words));
    if (word.memory_tip) addStudyDetail(extendedGroup, "Minnesknep", word.memory_tip);

    enhanceGrammarSectionWithStructuredForms(card, word);
    enhanceExtendedLearningSection(card, word);
    enhanceUsageSectionWithExtraExamples(card, word);
  } else if (mode === "search" || mode === "dictionary") {
    card.classList.add("compact-word-card");
    addCompactDetail(details, "Böjning", summarizeForms(word.forms));
    addCompactDetail(details, "Exempel", formatExampleForStudy(word.example));
    addExpandableDetail(
      details,
      "Fraser",
      summarizeCollocations(word.collocations, word.example) || "Fraser saknas",
      createCollocationList(word.collocations, word.example),
    );
  } else {
    addDetail(details, "Böjning", createFormList(word.forms));
    addDetail(details, "Exempel", formatExampleForStudy(word.example));
    addDetail(details, "Fraser", createCollocationList(word.collocations, word.example));
  }

  const meta = card.querySelector(".meta-row");
  meta.append(createPill(word.learned ? "Lärt mig" : "Övar"));
  const addDictionaryButton = card.querySelector('[data-action="add-dictionary"]');
  const saveGeneratedButton = card.querySelector('[data-action="save-generated"]');
  const enrichButton = card.querySelector('[data-action="enrich"]');
  const editButton = card.querySelector('[data-action="edit"]');
  const deleteButton = card.querySelector('[data-action="delete"]');
  const wordNeedsEnrichment = needsEnrichment(word);
  enrichButton.textContent = "Komplettera";
  enrichButton.hidden = !wordNeedsEnrichment;
  if (isDictionaryMode) {
    const inLibrary = isWordInLibrary(word.swedish);
    card.querySelector(".star-button").hidden = true;
    addDictionaryButton.hidden = inLibrary;
    addDictionaryButton.textContent = "Lägg till";
    editButton.hidden = true;
    if (deleteButton) deleteButton.hidden = true;
    meta.append(createPill(inLibrary ? "Finns i ordlistan" : "Inbyggd ordbok"));
  } else if (mode === "detail-generated") {
    card.querySelector(".star-button").hidden = true;
    enrichButton.hidden = true;
    addDictionaryButton.hidden = true;
    saveGeneratedButton.hidden = isWordInLibrary(word.swedish);
    editButton.hidden = true;
    if (deleteButton) deleteButton.hidden = true;
    meta.append(createPill(isWordInLibrary(word.swedish) ? "Finns i ordlistan" : "AI-genererad"));
  } else if (isRowMode) {
    if (deleteButton) deleteButton.hidden = true;
    if (mode === "library") {
      enrichButton.remove();
      editButton.remove();
    }
    // The row opens a full detail view; actions live in that detail view.
  } else if (mode === "detail") {
    addDictionaryButton.hidden = true;
    saveGeneratedButton.hidden = true;
    editButton.hidden = true;
    if (deleteButton) deleteButton.hidden = true;
    enrichButton.hidden = !wordNeedsEnrichment;
    setupDetailActionBar(card, word);
  } else {
    if (isStudyDetailMode) setupDetailActionBar(card, word);
  }
  return card;
}

function setupDetailActionBar(card, word) {
  const actions = card.querySelector(".card-actions");
  const listenButton = actions.querySelector('[data-action="listen"]');
  actions.querySelector('[data-action="enrich"]')?.remove();
  actions.querySelector('[data-action="add-dictionary"]')?.remove();
  actions.querySelector('[data-action="save-generated"]')?.remove();
  actions.querySelector('[data-action="edit"]')?.remove();
  actions.querySelector('[data-action="delete"]')?.remove();
  listenButton.textContent = "Lyssna";
  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.dataset.action = "save";
  saveButton.className = "save-detail-button";
  saveButton.classList.toggle("active", isWordSaved(word));
  saveButton.textContent = isWordSaved(word) ? "Sparad" : "Spara";
  actions.append(saveButton);
}

function formatPosForStudy(word) {
  const label = posLabels[word.pos] || "Övrigt";
  return [word.pos_detail, label.toLowerCase()].filter(Boolean).join(" ");
}

// Renders one line per grammar fact instead of joining everything into a
// single run-on sentence (the old behavior — see Reviews/SPK-DIC-001
// _SprakLab_Word_Card_Content_Standard_v1.0 §11: structured grammar
// "不应全部塞入一个无结构文本字段"). This is the synchronous fallback,
// built from the flat `word.forms` text so the Grammatik section never
// renders empty while enhanceGrammarSectionWithStructuredForms's async
// fetch of the real word_forms table is still in flight.
function buildGrammarLinesFragment(lines) {
  const container = document.createElement("div");
  container.className = "grammar-lines";
  lines.forEach(({ label, value }) => {
    if (!clean(value)) return;
    const line = document.createElement("p");
    line.className = "grammar-line";
    if (label) {
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      line.append(strong);
    }
    line.append(document.createTextNode(value));
    container.append(line);
  });
  return container;
}

const USAGE_REGISTER_LABELS = {
  spoken: "muntligt",
  written: "skriftligt",
  formal: "formellt",
  informal: "informellt",
  everyday: "vardagligt",
};

function formatUsageRegisters(registers) {
  return registers.map((r) => USAGE_REGISTER_LABELS[r] || r).join(", ");
}

const PARTICIPLE_FUNCTION_TAG_LABELS = {
  adjektivisk: "形容词性",
  substantiverad: "名词化",
  adverbiell: "副词性",
  passiv_betydelse: "被动含义",
  lexicalized_adjective: "已词汇化形容词",
};

// POS-specific fields added by the 2026-07-26 SPK-DIC-001 corpus fill (see
// Reviews/SPK-DIC-001-完整标准核对与任务清单-2026-07-26.md §3-7) — these sit
// in the same "语法变化" layer as the Grammatik line above since they're all
// grammar facts, just not part of the structured word_forms table.
function formatPosSpecificGrammarExtras(word) {
  const lines = [];
  if (word.pos === "noun") {
    if (word.countability) lines.push({ label: "Countability", value: word.countability });
    if (word.grammar_note) lines.push({ label: "Grammar Note", value: word.grammar_note });
  } else if (word.pos === "verb") {
    if (word.transitivity) lines.push({ label: "Transitivitet", value: word.transitivity });
    if (word.passiv_s) lines.push({ label: "Passiv -s", value: word.passiv_s });
  } else if (word.pos === "adjective") {
    if (word.adverb_form) lines.push({ label: "Adverbform", value: word.adverb_form });
    if (word.comparison_type) lines.push({ label: "Comparison Type", value: word.comparison_type });
  } else if (word.pos === "presens_particip" || word.pos === "perfekt_particip") {
    if (word.function_tags.length) {
      lines.push({ label: "Function Tags", value: word.function_tags.map((t) => PARTICIPLE_FUNCTION_TAG_LABELS[t] || t).join(", ") });
    }
    if (word.meaning_note) lines.push({ label: "Meaning Note", value: word.meaning_note });
  }
  return lines;
}

function formatGrammarForStudy(word) {
  const items = splitForms(word.forms);
  if (items.length === 0) {
    const fallback = document.createElement("p");
    fallback.textContent = "Böjning saknas.";
    return fallback;
  }
  const lines = items.map((item) => {
    const [rawLabel, ...valueParts] = item.split(":");
    if (valueParts.length === 0) return { label: "", value: item.trim() };
    return { label: rawLabel.trim(), value: valueParts.join(":").trim() };
  });
  return buildGrammarLinesFragment(lines);
}

// Upgrades the synchronous flat-text Grammatik fallback above with the
// structured word_forms table once it loads (fetched after the card is
// already visible, same pattern as the edit dialog's word_forms fetch —
// see openWordDialog — so opening a word never waits on a network round
// trip). No-ops silently for words that haven't been backfilled into
// word_forms yet, leaving the flat-text fallback in place.
function enhanceGrammarSectionWithStructuredForms(card, word) {
  if (!word?.id) return;
  const posGroup = WORD_FORM_GROUPS_BY_POS[word.pos];
  if (!posGroup) return;
  remoteDb.loadWordForms(word.id).then((forms) => {
    if (!forms?.length || card.dataset.id !== word.id) return;
    const byType = new Map(forms.map((f) => [f.form_type, clean(f.form_value)]));
    const order = WORD_FORM_LINE_ORDER_BY_POS[posGroup] || [];
    const lines = order
      .filter((type) => byType.get(type))
      .map((type) => ({ label: WORD_FORM_LABELS[type] || type, value: byType.get(type) }));
    if (lines.length) {
      const section = card.querySelector(".grammar-section");
      section?.querySelector("p, .grammar-lines")?.remove();
      section?.append(buildGrammarLinesFragment(lines));
    }
    if (posGroup === "noun") applyGenusToTitle(card, byType.get("genus"));
  }).catch((error) => {
    console.warn("[SpråkLab] Failed to load structured word_forms for", word.id, error);
  });
}

// Appends any 2nd+ example sentences from learning_object_examples below
// the primary example_sv (SPK-DIC-001 wants >=2 examples; the bundled
// enrichment pass, 2026-07-25, prioritizes an idiomatic-usage sentence
// here when the word has one). Most words don't have extra rows yet, so
// this quietly does nothing until they're generated.
function enhanceUsageSectionWithExtraExamples(card, word) {
  if (!word?.id) return;
  remoteDb.loadWordExamples(word.id).then((examples) => {
    if (!examples.length || card.dataset.id !== word.id) return;
    const section = card.querySelector(".example-section");
    if (!section) return;
    examples.forEach((example) => {
      const sv = clean(example.example_swedish);
      if (!sv) return;
      const p = document.createElement("p");
      p.textContent = stripChineseExampleTranslation(sv);
      section.append(p);
      const zh = clean(example.example_chinese);
      if (zh) {
        const zhP = document.createElement("p");
        zhP.className = "example-translation";
        zhP.textContent = zh;
        section.append(zhP);
      }
    });
  }).catch((error) => {
    console.warn("[SpråkLab] Failed to load extra examples for", word.id, error);
  });
}

// "en"/"ett" shown next to the lemma in the title, per SPK-DIC-001 §3:
// "Genus 必须与 lemma 一同醒目展示，如 en bok、ett hus".
function applyGenusToTitle(card, genus) {
  if (!genus) return;
  const title = card.querySelector("h3.word-title");
  if (!title || title.dataset.genusApplied) return;
  const article = genus === "ett-ord" ? "ett" : genus === "en-ord" ? "en" : "";
  if (!article) return;
  title.textContent = `${article} ${title.textContent}`;
  title.dataset.genusApplied = "true";
}

function formatExampleForStudy(example) {
  const text = clean(example);
  if (!text) return "Exempel saknas.";
  return stripChineseExampleTranslation(text);
}

function formatStudyNote(word) {
  if (clean(word.note)) return clean(word.note);
  if (needsEnrichment(word)) return "Ordkortet behöver kompletteras med betydelse, exempel eller fraser.";
  return "Används ofta i studier, arbete och samtal.";
}

// One of the five progressive-disclosure layers in the study detail view
// (SPK-DIC-001 §10). Non-collapsible groups render as a plain labeled
// section; collapsible ones use native <details> so no JS toggle logic
// is needed. Returns the container to append addStudyDetail sections into.
function addLayerGroup(list, label, { collapsible = false, expanded = true } = {}) {
  if (collapsible) {
    const group = document.createElement("details");
    group.className = "detail-layer-group detail-layer-group-collapsible";
    group.open = expanded;
    const summary = document.createElement("summary");
    summary.className = "detail-layer-label";
    summary.textContent = label;
    group.append(summary);
    list.append(group);
    return group;
  }
  const group = document.createElement("div");
  group.className = "detail-layer-group";
  const heading = document.createElement("p");
  heading.className = "detail-layer-label";
  heading.textContent = label;
  group.append(heading);
  list.append(group);
  return group;
}

function addStudyDetail(list, term, content) {
  const section = document.createElement("section");
  section.className = "study-detail-section";
  if (term === "Kinesisk betydelse") section.classList.add("chinese-meaning-section");
  if (term === "Grammatik") section.classList.add("grammar-section");
  if (term === "Relaterade ord") section.classList.add("related-section");
  if (term === "Exempel") section.classList.add("example-section");
  const title = document.createElement("h4");
  title.textContent = `${term}：`;
  section.append(title);
  if (content instanceof Node) {
    section.append(content);
  } else {
    const text = document.createElement("p");
    text.textContent = content;
    section.append(text);
  }
  list.append(section);
}

function createStudyCollocationList(collocations, fallbackExample, sourceWord) {
  const items = splitCollocations(collocations, fallbackExample);
  if (items.length === 0) return document.createTextNode("Fraser saknas.");
  const list = document.createElement("ol");
  list.className = "study-collocation-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    const phrase = document.createElement("strong");
    const meaning = document.createElement("em");
    const example = document.createElement("span");
    phrase.textContent = item.phrase;
    meaning.textContent = item.meaning || "中文释义待补";
    example.textContent = item.example ? stripChineseExampleTranslation(item.example) : "Exempel saknas.";
    li.append(phrase, meaning, example);
    if (sourceWord?.id) {
      const promoteBtn = document.createElement("button");
      promoteBtn.type = "button";
      promoteBtn.className = "collocation-promote-button";
      promoteBtn.textContent = "+ Fraser";
      promoteBtn.dataset.action = "promote-collocation";
      promoteBtn.dataset.sourceWordId = sourceWord.id;
      promoteBtn.dataset.phrase = item.phrase;
      promoteBtn.dataset.meaning = item.meaning || "";
      promoteBtn.dataset.example = item.example || "";
      promoteBtn.dataset.cefrLevel = sourceWord.cefr_level || "";
      li.append(promoteBtn);
    }
    list.append(li);
  });
  return list;
}

async function handlePromoteCollocation(button) {
  const { sourceWordId, phrase, meaning, example, cefrLevel } = button.dataset;
  button.disabled = true;
  button.textContent = "…";
  try {
    const promoted = await remoteDb.promoteCollocationToPhrase({
      sourceWordId,
      phrase,
      meaning,
      exampleSv: example,
      cefrLevel,
    });
    phraseObjects.push(promoted);
    button.textContent = "✓ Tillagd";
  } catch (error) {
    console.warn("[SpråkLab] Failed to promote collocation to Fraser.", error);
    button.disabled = false;
    button.textContent = "Misslyckades, försök igen";
  }
}

function createRelatedWordList(related_words) {
  const items = splitRelatedWords(related_words);
  if (items.length === 0) return document.createTextNode("Relaterade ord saknas.");
  const list = document.createElement("dl");
  list.className = "related-word-list";
  items.forEach((item) => {
    const dt = document.createElement("dt");
    const word = document.createElement("span");
    const pos = document.createElement("span");
    const dd = document.createElement("dd");
    word.textContent = item.word;
    pos.className = "related-pos";
    pos.textContent = getRelatedWordPosLabel(item.word);
    dt.append(word, pos);
    dd.textContent = item.meaning;
    list.append(dt, dd);
  });
  return list;
}

// Same visual structure as createRelatedWordList above, but for typed rows
// from learning_object_relationships (already carry a real part_of_speech
// from the join, so no guessing needed like getRelatedWordPosLabel does).
function buildTypedRelatedList(items) {
  const list = document.createElement("dl");
  list.className = "related-word-list";
  items.forEach((item) => {
    const dt = document.createElement("dt");
    const word = document.createElement("span");
    const pos = document.createElement("span");
    const dd = document.createElement("dd");
    word.textContent = item.swedish;
    pos.className = "related-pos";
    pos.textContent = posLabels[item.pos] || "Övr.";
    dt.append(word, pos);
    dd.textContent = item.chinese || "";
    list.append(dt, dd);
  });
  return list;
}

// Adds a "Minnesknep" (memory tip) section when learning_object_translations
// has one, and upgrades the flat-text "Relaterade ord" section with proper
// Synonymer/Motsatsord/Ordfamilj sections once learning_object_relationships
// has typed data for this word — neither had a read path anywhere in the
// app before this (see Reviews/SPK-DIC-001-标准对照评估与实施建议.md §2).
// Same lazy-fetch-after-render pattern as
// enhanceGrammarSectionWithStructuredForms: the synchronous render above
// already shows a reasonable state (no "Minnesknep" section, generic flat
// "Relaterade ord"), this only upgrades it once the fetch resolves.
function enhanceExtendedLearningSection(card, word) {
  if (!word?.id) return;
  Promise.all([
    remoteDb.loadWordRelationships(word.id).catch((error) => {
      console.warn("[SpråkLab] Failed to load word relationships for", word.id, error);
      return [];
    }),
    remoteDb.loadWordTranslationDetail(word.id).catch((error) => {
      console.warn("[SpråkLab] Failed to load translation detail for", word.id, error);
      return null;
    }),
  ]).then(([relationships, translationDetail]) => {
    if (card.dataset.id !== word.id) return;
    const details = card.querySelector(".extended-learning-group") || card.querySelector(".detail-list");
    if (!details) return;

    if (relationships.length) {
      // word_family (added 2026-07-26 fill) is the same concept the app has
      // long labeled "Ordfamilj" via derived_from — same bucket, not a
      // separate section. particle_verb/reflexive (SPK-DIC-001 §4) get
      // their own sections.
      const byType = { synonym: [], antonym: [], derived_from: [], particle_verb: [], reflexive: [], related: [] };
      relationships.forEach((rel) => {
        const key = rel.type === "word_family" ? "derived_from" : rel.type;
        (byType[key] || byType.related).push(rel);
      });
      const relatedSection = details.querySelector(".related-section");
      const insertBefore = (term, items) => {
        if (!items.length || !relatedSection) return;
        const section = document.createElement("section");
        section.className = "study-detail-section related-section";
        const title = document.createElement("h4");
        title.textContent = `${term}：`;
        section.append(title, buildTypedRelatedList(items));
        relatedSection.before(section);
      };
      insertBefore("Synonymer", byType.synonym);
      insertBefore("Motsatsord", byType.antonym);
      insertBefore("Ordfamilj", byType.derived_from);
      insertBefore("Partikelverb", byType.particle_verb);
      insertBefore("Reflexivt", byType.reflexive);
      if (byType.related.length && relatedSection) {
        relatedSection.querySelector("p, .related-word-list")?.remove();
        relatedSection.append(buildTypedRelatedList(byType.related));
      }
    }

    // word.memory_tip (learning_objects column, filled for the whole corpus
    // 2026-07-26) is now the primary source and already rendered
    // synchronously above — this only covers the handful of older rows that
    // have a learning_object_translations.learning_tip but somehow no
    // memory_tip yet.
    if (!clean(word.memory_tip) && clean(translationDetail?.learning_tip)) {
      addStudyDetail(details, "Minnesknep", clean(translationDetail.learning_tip));
    }
  });
}

function openWordDetail(word, sourceMode = "library") {
  if (!word) return;
  renderWordDetail(word, sourceMode);
  if (!els.detailDialog.open) els.detailDialog.showModal();
}

function getOpenDetailWord() {
  const wordId = els.detailDialog.dataset.wordId;
  if (!wordId) return null;
  return (
    state.words.find((item) => item.id === wordId) ||
    dictionaryWords.find((item) => item.id === wordId) ||
    phraseObjects.find((item) => item.id === wordId) ||
    null
  );
}

function closeDetailMoreMenu() {
  if (els.detailMoreMenu) els.detailMoreMenu.hidden = true;
}

function moveDetailActionsToBar(card) {
  if (!els.detailActionBar) return;
  els.detailActionBar.replaceChildren();
  const actions = card.querySelector(".card-actions");
  if (!actions) {
    els.detailActionBar.hidden = true;
    return;
  }
  els.detailActionBar.append(actions);
  els.detailActionBar.hidden = false;
}

function updateDetailHeaderActions(word, sourceMode) {
  const canEdit = Boolean(word?.id);
  if (els.detailEditBtn) els.detailEditBtn.hidden = !canEdit;
  if (els.detailMoreBtn) els.detailMoreBtn.hidden = true;
  closeDetailMoreMenu();
  els.detailDialog.dataset.sourceMode = sourceMode;
}

function renderWordDetail(word, sourceMode = "library") {
  const detailMode =
    sourceMode === "dictionary" ? "detail-dictionary" : sourceMode === "generated" ? "detail-generated" : "detail";
  els.detailDialog.dataset.sourceMode = sourceMode;
  els.detailDialog.dataset.wordId = word.id || "";
  closeDetailMoreMenu();
  updateDetailHeaderActions(word, sourceMode);
  const card = createWordCard(word, detailMode);
  moveDetailActionsToBar(card);
  els.detailContent.replaceChildren(card);
}

function needsEnrichment(word) {
  return (
    !clean(word.chinese) ||
    clean(word.chinese) === "待补中文释义。" ||
    !clean(word.example) ||
    !clean(word.collocations) ||
    !clean(word.related_words)
  );
}

function addCompactDetail(list, term, text) {
  const item = document.createElement("div");
  item.className = "compact-detail";
  const label = document.createElement("strong");
  const value = document.createElement("span");
  label.textContent = term;
  value.textContent = text || "Saknas";
  item.append(label, value);
  list.append(item);
}

function addExpandableDetail(list, term, summaryText, expandedContent) {
  const details = document.createElement("details");
  details.className = "compact-detail expandable-detail";
  const summary = document.createElement("summary");
  const label = document.createElement("strong");
  const value = document.createElement("span");
  label.textContent = term;
  value.textContent = summaryText || "Visa";
  summary.append(label, value);
  details.append(summary, expandedContent);
  list.append(details);
}

function addDetail(list, term, content) {
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  if (content instanceof Node) {
    dd.append(content);
  } else {
    dd.textContent = content;
  }
  list.append(dt, dd);
}

function createFormList(forms) {
  const items = splitForms(forms);
  if (items.length === 0) return document.createTextNode("Saknas");
  const list = document.createElement("ul");
  list.className = "structured-list form-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    const [label, ...valueParts] = item.split(":");
    if (valueParts.length > 0) {
      const strong = document.createElement("strong");
      strong.textContent = `${label.trim()}:`;
      const span = document.createElement("span");
      span.textContent = valueParts.join(":").trim();
      li.append(strong, span);
    } else {
      li.textContent = item;
    }
    list.append(li);
  });
  return list;
}

function summarizeForms(forms) {
  const items = splitForms(forms);
  if (items.length === 0) return "Saknas";
  return items
    .slice(0, 4)
    .map((item) => item.replace(/\s*:\s*/g, ": "))
    .join(" · ");
}

function summarizeCollocations(collocations, fallbackExample) {
  const items = splitCollocations(collocations, fallbackExample);
  if (items.length === 0) return "";
  return items
    .slice(0, 2)
    .map((item) => item.phrase)
    .join(" · ");
}

function createCollocationList(collocations, fallbackExample) {
  const items = splitCollocations(collocations, fallbackExample);
  if (items.length === 0) return document.createTextNode("Fraser saknas");
  const list = document.createElement("ul");
  list.className = "structured-list collocation-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    const phrase = document.createElement("strong");
    const meaning = document.createElement("em");
    const example = document.createElement("span");
    phrase.textContent = item.phrase;
    meaning.textContent = item.meaning || "中文释义待补";
    example.textContent = item.example
      ? `Exempel: ${stripChineseExampleTranslation(item.example)}`
      : "Exempel saknas för den här frasen";
    li.append(phrase, meaning, example);
    list.append(li);
  });
  return list;
}

function splitForms(forms) {
  return clean(forms)
    .replace(/\s+\/\s+/g, "\n")
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCollocations(collocations, fallbackExample = "") {
  const text = clean(collocations);
  if (!text && clean(fallbackExample)) {
    return [
      {
        phrase: "Exempel",
        meaning: "",
        example: clean(fallbackExample),
      },
    ];
  }
  return text
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split(/\s+\|\s+|\s+—\s+|\s+-\s+/);
      const phrase = clean(parts[0]);
      const second = clean(parts[1]);
      const rest = clean(parts.slice(2).join(" - "));
      const hasThreePartFormat = parts.length >= 3;
      return {
        phrase,
        meaning: hasThreePartFormat ? second : "",
        example: hasThreePartFormat ? rest : second,
      };
    })
    .filter((item) => item.phrase);
}

function splitRelatedWords(related_words) {
  return clean(related_words)
    .split(/[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split(/\s+\|\s+|\s+—\s+|\s+-\s+/);
      return {
        word: clean(parts[0]),
        meaning: clean(parts.slice(1).join(" - ")),
      };
    })
    .filter((item) => item.word);
}

function getRelatedWordPosLabel(value) {
  const text = clean(value).toLowerCase();
  if (!text) return "övr.";
  const exact = dictionaryWords.find((word) => clean(word.swedish).toLowerCase() === text);
  if (exact) return posLabels[exact.pos] || "Övr.";
  const withoutParticle = text.split(/\s+/)[0];
  const firstWordMatch = dictionaryWords.find((word) => clean(word.swedish).toLowerCase() === withoutParticle);
  if (firstWordMatch) return posLabels[firstWordMatch.pos] || "Övr.";
  if (/^(att\s+)?[a-zåäö]+a$/i.test(text)) return "Verb";
  if (/^(en|ett)\s+/.test(text)) return "Substantiv";
  if (/[.!?]$/.test(text) || text.split(/\s+/).length > 2) return "Fras";
  return "Övr.";
}

function stripChineseExampleTranslation(text) {
  return clean(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !/^中文[:：]/.test(line))
    .join("\n");
}

function createPill(text) {
  const pill = document.createElement("span");
  pill.textContent = text;
  return pill;
}

function posBadgeLabel(pos) {
  return posLabels[pos] || "Övr.";
}

function isWordInLibrary(swedish) {
  return state.words.some((word) => clean(word.swedish).toLowerCase() === clean(swedish).toLowerCase());
}

function renderHistory() {
  const items = getFilteredHistory();
  els.historyList.replaceChildren();
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Ingen historik matchar filtret.";
    els.historyList.append(empty);
    return;
  }

  const limit = state.listLimits.history || INITIAL_HISTORY_LIMIT;
  const visibleItems = items.slice(0, limit);
  const fragment = document.createDocumentFragment();
  visibleItems.forEach((item) => {
    const article = document.createElement("article");
    article.className = "history-item";
    const date = new Intl.DateTimeFormat("sv-SE", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(item.created_at);
    article.innerHTML = `
      <div>
        <strong>${escapeHtml(item.swedish)}</strong>
        <span>${escapeHtml(actionLabels[item.action] || item.action)} · ${escapeHtml(posLabels[item.pos] || "Övrigt")}</span>
      </div>
      <time>${escapeHtml(date)}</time>
      <p>${escapeHtml(item.chinese || "")}</p>
    `;
    fragment.append(article);
  });
  if (visibleItems.length < items.length) {
    fragment.append(createLoadMoreState(items.length, visibleItems.length, "history"));
  }
  els.historyList.append(fragment);
}

function getShadowingItems() {
  const items = Array.isArray(state.shadowing) ? state.shadowing : [];
  return items
    .map((item) => shadowingStore.normalizeShadowingItem(item))
    .filter(Boolean)
    .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

function mergeShadowingItemsForApp(remoteItems = [], cachedItems = []) {
  const byId = new Map();
  [...cachedItems, ...remoteItems].forEach((item) => {
    const normalized = shadowingStore.normalizeShadowingItem(item);
    if (!normalized?.id) return;
    const existing = byId.get(normalized.id);
    if (!existing || Number(normalized.updatedAt || 0) >= Number(existing.updatedAt || 0)) {
      byId.set(normalized.id, normalized);
    }
  });
  return [...byId.values()].sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}

function getLatestShadowingRecording(itemId) {
  const id = clean(itemId);
  if (!id) return null;
  return (state.shadowingRecordings || [])
    .filter((recording) => recording.shadowing_item_id === id)
    .sort((a, b) => Number(b.recorded_at || b.created_at || 0) - Number(a.recorded_at || a.created_at || 0))[0] || null;
}

async function signedShadowingAudioUrl(bucket, path) {
  const bucketName = clean(bucket);
  const objectPath = clean(path);
  if (!bucketName || !objectPath) return "";
  const key = `${bucketName}:${objectPath}`;
  const cached = shadowingSignedUrlCache.get(key);
  if (cached?.expiresAt > Date.now() + 30_000) return cached.url;
  const url = await remoteDb.downloadShadowingAudioUrl({ bucket: bucketName, path: objectPath });
  if (url) {
    shadowingSignedUrlCache.set(key, {
      url,
      expiresAt: Date.now() + 55 * 60 * 1000,
    });
  }
  return url;
}

function standardAudioDescriptor(item = getSelectedShadowingItem()) {
  if (!item?.standard_audio_path) return null;
  return {
    bucket: item.standard_audio_bucket || SHADOWING_STANDARD_AUDIO_BUCKET,
    path: item.standard_audio_path,
    mimeType: item.standard_audio_mime_type || "audio/mpeg",
  };
}

function canSpeakShadowingText(item = getSelectedShadowingItem()) {
  return Boolean(item?.swedish && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
}

function recordingAudioDescriptor(recording = getLatestShadowingRecording(state.selectedShadowingId)) {
  if (!recording?.audio_path) return null;
  return {
    bucket: recording.audio_bucket || SHADOWING_RECORDINGS_BUCKET,
    path: recording.audio_path,
    mimeType: recording.audio_mime_type || "audio/webm",
  };
}

function shadowingRecordingExtension(mimeType = "") {
  const mime = clean(mimeType).toLowerCase().split(";")[0];
  if (mime === "audio/mp4" || mime === "audio/x-m4a") return "m4a";
  if (mime === "audio/mpeg") return "mp3";
  if (mime === "audio/ogg") return "ogg";
  if (mime === "audio/wav" || mime === "audio/x-wav") return "wav";
  return "webm";
}

function splitShadowingDisplayLines(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
  if (!normalized) return [];
  const sourceLines = normalized
    .replace(/\s+(?=(?:[-–—]\s+|["“]?[A-ZÅÄÖ][A-Za-zÅÄÖåäö0-9 .'-]{0,24}:))/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return sourceLines.flatMap((line) => {
    const sentences = line.match(/[^.!?。！？…]+(?:[.!?。！？…]+["”')\]]*)?/g);
    const cleaned = (sentences?.length ? sentences : [line])
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    return cleaned.length ? cleaned : [line];
  });
}

function renderShadowingTextLines(text, className) {
  const lines = splitShadowingDisplayLines(text);
  const fallback = clean(text) || "—";
  return (lines.length ? lines : [fallback])
    .map((line, index) => `<span class="${className}" data-shadowing-line="${index}">${escapeHtml(line)}</span>`)
    .join("");
}

function activeShadowingLineIndex(item) {
  const lines = splitShadowingDisplayLines(item?.swedish);
  if (lines.length <= 1) return 0;
  if (shadowingSpeechUtterance) {
    let cursor = 0;
    for (let index = 0; index < lines.length; index += 1) {
      cursor += lines[index].length + 1;
      if (shadowingSpeechCharacterIndex < cursor) return index;
    }
    return lines.length - 1;
  }
  const duration = Number(shadowingAudio.duration || 0);
  if (!duration) return 0;
  // Weight each line's time slice by its character count instead of
  // dividing the audio into N equal slices — an even split assumes every
  // sentence takes the same time to read, which drifts badly out of sync
  // as soon as sentence lengths vary (a 4-word sentence and a 40-word one
  // do not take equally long). Character count is still only an estimate
  // (no real per-sentence timing comes back from the TTS API), but tracks
  // actual speech duration far more closely than an equal split.
  const currentTime = Number(shadowingAudio.currentTime || 0);
  const totalChars = lines.reduce((sum, line) => sum + line.length, 0) || 1;
  let cursorChars = 0;
  for (let index = 0; index < lines.length; index += 1) {
    cursorChars += lines[index].length;
    if (currentTime < (cursorChars / totalChars) * duration) return index;
  }
  return lines.length - 1;
}

function updateShadowingActiveLine(item) {
  if (!els.shadowingSubtitle || !item) return;
  const activeIndex = activeShadowingLineIndex(item);
  const lines = [...els.shadowingSubtitle.querySelectorAll(".shadowing-subtitle-line")];
  lines.forEach((line, index) => line.classList.toggle("active", index === activeIndex && state.shadowingPlaybackState === "playing"));
  const activeLine = lines[activeIndex];
  if (activeLine && state.shadowingPlaybackState === "playing") {
    activeLine.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function updateShadowingProgressControl() {
  if (!els.shadowingAudioProgress) return;
  const duration = Number(shadowingAudio.duration || 0);
  els.shadowingAudioProgress.max = String(duration || 0);
  els.shadowingAudioProgress.value = String(Math.min(Number(shadowingAudio.currentTime || 0), duration || 0));
  els.shadowingAudioProgress.disabled = !duration;
}

function revokeShadowingRecordingObjectUrl() {
  if (state.shadowingRecordingBlob && state.shadowingRecordingUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(state.shadowingRecordingUrl);
  }
}

async function applyShadowingRecordingForItem(itemId) {
  const recording = getLatestShadowingRecording(itemId);
  const descriptor = recordingAudioDescriptor(recording);
  if (!descriptor) {
    if (state.shadowingRecordingBlob && state.shadowingRecordingItemId === itemId) return;
    revokeShadowingRecordingObjectUrl();
    state.shadowingRecordingUrl = "";
    state.shadowingRecordingMimeType = "";
    state.shadowingRecordingBlob = null;
    state.shadowingRecordingItemId = "";
    if (els.shadowingRecordingPlayer) {
      els.shadowingRecordingPlayer.pause();
      els.shadowingRecordingPlayer.removeAttribute("src");
      els.shadowingRecordingPlayer.hidden = true;
    }
    return;
  }
  revokeShadowingRecordingObjectUrl();
  state.shadowingRecordingUrl = await signedShadowingAudioUrl(descriptor.bucket, descriptor.path);
  state.shadowingRecordingMimeType = descriptor.mimeType;
  state.shadowingRecordingBlob = null;
  state.shadowingRecordingItemId = itemId;
  shadowingRecordingAudio.src = state.shadowingRecordingUrl;
  if (els.shadowingRecordingPlayer) {
    els.shadowingRecordingPlayer.src = state.shadowingRecordingUrl;
    els.shadowingRecordingPlayer.hidden = false;
  }
}

function getSelectedShadowingItem() {
  const items = getShadowingItems();
  if (items.length === 0) return null;
  const selected = items.find((item) => item.id === state.selectedShadowingId);
  return selected || items[0];
}

async function refreshShadowingState() {
  state.shadowing = mergeShadowingItemsForApp(remotePhase4Snapshot?.shadowingItems || []);
  const items = getShadowingItems();
  if (items.length === 0) {
    state.selectedShadowingId = "";
    return;
  }
  if (!items.some((item) => item.id === state.selectedShadowingId)) {
    state.selectedShadowingId = items[0].id;
  }
  void applyShadowingRecordingForItem(state.selectedShadowingId).then(() => renderShadowingPlayer());
}

// 2026-08-03, Rachel's decision: Shadowing becomes two separate pages, same
// split as Läsning got earlier this session — the text-input editor and
// the practice page (player/record/export). No prior precedent existed for
// this in Shadowing (all three panels used to be permanently visible
// together); these three functions are the toggle primitives.
function openShadowingEditor() {
  if (els.shadowingEditorPanel) els.shadowingEditorPanel.hidden = false;
  if (els.shadowingPlayerPanel) els.shadowingPlayerPanel.hidden = true;
  if (els.shadowingExportPanel) els.shadowingExportPanel.hidden = true;
  // The history list only makes sense while browsing/starting new practice
  // on Prepare — showing it under Practice too just repeated the item
  // you're already looking at (Rachel, 2026-08-09).
  if (els.shadowingHistorySection) els.shadowingHistorySection.hidden = false;
  closeShadowingMoreMenu();
  updateTopbarLibraryBack();
}

function openShadowingPractice(item, { generating = false } = {}) {
  if (item?.id) state.selectedShadowingId = item.id;
  if (els.shadowingEditorPanel) els.shadowingEditorPanel.hidden = true;
  if (els.shadowingPlayerPanel) els.shadowingPlayerPanel.hidden = false;
  if (els.shadowingExportPanel) els.shadowingExportPanel.hidden = false;
  if (els.shadowingGenerating) els.shadowingGenerating.hidden = !generating;
  if (els.shadowingHistorySection) els.shadowingHistorySection.hidden = true;
  renderShadowingPlayer();
  closeShadowingMoreMenu();
  updateTopbarLibraryBack();
}

// "✎ Redigera text" on Practice — same escape hatch Läsning's results page
// has (editReadingResultsText, reachable via readingMoreMenu there): the
// one thing removing the list's per-item Redigera button took away was a
// way to fix a typo in the source text without retyping it from scratch.
function editCurrentShadowingText() {
  const item = getSelectedShadowingItem();
  if (!item) return;
  populateShadowingForm(item);
  state.selectedShadowingId = item.id;
  openShadowingEditor();
  renderShadowing();
}

function closeShadowingMoreMenu() {
  if (els.shadowingMoreMenu) els.shadowingMoreMenu.hidden = true;
}

// 2026-08-11, Rachel's request: Ta bort on Practice's "⋯" menu — same
// logic as Läsning's results-page delete (deleteCurrentReadingItem):
// confirm() lives inside deleteShadowingItem already; only navigate back
// to Prepare if the delete actually went through (not cancelled).
async function deleteCurrentShadowingItemFromPractice() {
  const item = getSelectedShadowingItem();
  if (!item) return;
  await deleteShadowingItem(item.id);
  if (!getShadowingItems().some((row) => row.id === item.id)) openShadowingEditor();
}

// 2026-08-10, Rachel's request: Tillbaka on Practice moved into the
// top-right header slot (replacing "Till Bibliotek" there — see
// updateTopbarLibraryBack) and now always returns straight to Prepare,
// regardless of how Practice was reached (including the Läsning handoff).
function closeShadowingPractice() {
  shadowingAudio.pause();
  state.shadowingPlaybackState = "paused";
  openShadowingEditor();
}

function resetShadowingForm() {
  state.selectedShadowingId = "";
  if (els.shadowingItemId) els.shadowingItemId.value = "";
  if (els.shadowingTitleInput) els.shadowingTitleInput.value = "";
  if (els.shadowingSwedishInput) els.shadowingSwedishInput.value = "";
  if (els.shadowingChineseInput) els.shadowingChineseInput.value = "";
  if (els.shadowingAudioUrlInput) els.shadowingAudioUrlInput.value = "";
  if (els.shadowingAudioFileInput) els.shadowingAudioFileInput.value = "";
  if (els.shadowingCategoryInput) els.shadowingCategoryInput.value = "";
  if (els.shadowingLevelInput) els.shadowingLevelInput.value = "1";
  revokeShadowingRecordingObjectUrl();
  state.shadowingRecordingUrl = "";
  state.shadowingRecordingMimeType = "";
  state.shadowingRecordingBlob = null;
  state.shadowingRecordingItemId = "";
  state.shadowingPendingAudioSource = "";
  state.shadowingPendingAudioName = "";
  state.shadowingFlowStep = "paste";
  state.shadowingFlowText = "";
  state.shadowingFlowWordCount = 0;
  state.shadowingFlowReadTimeText = "";
  state.shadowingFlowUnknownWords = [];
  state.shadowingFlowSelectedUnknownWords = [];
  state.shadowingUnknownExpanded = false;
  updateShadowingAudioHint("");
  renderShadowingFlow();
}

function populateShadowingForm(item) {
  if (!item) {
    resetShadowingForm();
    return;
  }
  els.shadowingItemId.value = item.id;
  if (els.shadowingTitleInput) els.shadowingTitleInput.value = item.title || item.swedish || "";
  els.shadowingSwedishInput.value = item.swedish || "";
  els.shadowingChineseInput.value = item.chinese || "";
  els.shadowingAudioUrlInput.value = item.audio || item.audio_source || "";
  els.shadowingAudioFileInput.value = "";
  els.shadowingCategoryInput.value = item.category || "Ungrouped";
  els.shadowingLevelInput.value = String(normalizeShadowingLevel(item.level));
  if (els.shadowingVoiceSelect) {
    const voice = clean(item.tts_voice_id);
    els.shadowingVoiceSelect.value = [...els.shadowingVoiceSelect.options].some((option) => option.value === voice)
      ? voice
      : "sv-SE-SofieNeural";
    syncShadowingVoiceOptions();
  }
  revokeShadowingRecordingObjectUrl();
  state.shadowingRecordingUrl = "";
  state.shadowingRecordingMimeType = "";
  state.shadowingRecordingBlob = null;
  state.shadowingRecordingItemId = "";
  state.shadowingPendingAudioSource = "";
  state.shadowingPendingAudioName = "";
  state.shadowingFlowStep = item.swedish ? "preview" : "paste";
  state.shadowingFlowText = item.swedish || "";
  state.shadowingFlowWordCount = item.swedish ? segmentShadowingWords(item.swedish).length : 0;
  state.shadowingFlowReadTimeText = formatShadowingReadingTime(state.shadowingFlowWordCount);
  state.shadowingFlowUnknownWords = item.swedish ? collectShadowingUnknownWords(item.swedish) : [];
  state.shadowingFlowSelectedUnknownWords = state.shadowingFlowUnknownWords.map((entry) => entry.value);
  updateShadowingAudioHint(item.audio_file_name ? `Uppladdad fil: ${item.audio_file_name}` : item.audio || item.audio_source ? "Extern ljudkälla." : "Ingen ljudkälla ännu.");
  renderShadowingFlow();
}

function syncShadowingVoiceOptions() {
  const selectedVoice = els.shadowingVoiceSelect?.value || "sv-SE-SofieNeural";
  document.querySelectorAll("[data-shadowing-voice]").forEach((button) => {
    const active = button.dataset.shadowingVoice === selectedVoice;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function updateShadowingAudioHint(message = "") {
  if (els.shadowingAudioHint) {
    els.shadowingAudioHint.textContent = clean(message) || "Generate Audio / Läs upp kräver inloggning och AI Voice.";
  }
}

function normalizeShadowingFlowText(text) {
  return clean(text).replace(/\r\n?/g, "\n");
}

function segmentShadowingWords(text) {
  const input = normalizeShadowingFlowText(text);
  if (!input) return [];
  if (globalThis.Intl?.Segmenter) {
    const segmenter = new Intl.Segmenter("sv", { granularity: "word" });
    return [...segmenter.segment(input)].filter((part) => part.isWordLike).map((part) => part.segment);
  }
  return input.match(/[\p{L}ÅÄÖåäö]+(?:[-'][\p{L}ÅÄÖåäö]+)*/gu) || [];
}

function formatShadowingReadingTime(wordCount) {
  if (!wordCount) return "0 min";
  const minutes = Math.max(1, Math.ceil(wordCount / 180));
  return `${minutes} min`;
}

function collectShadowingUnknownWords(text) {
  const knownWords = new Set(state.words.map((word) => clean(word.swedish).toLocaleLowerCase("sv-SE")));
  const seen = new Set();
  const unknownWords = [];
  segmentShadowingWords(text).forEach((token) => {
    const normalized = clean(token).toLocaleLowerCase("sv-SE");
    if (!normalized || normalized.length < 2) return;
    if (seen.has(normalized)) return;
    if (knownWords.has(normalized)) return;
    seen.add(normalized);
    unknownWords.push({
      id: createId(),
      value: normalized,
      label: token,
    });
  });
  return unknownWords;
}

function renderShadowingFlow() {
  const text = normalizeShadowingFlowText(els.shadowingSwedishInput?.value || state.shadowingFlowText || "");
  const flowStep = state.shadowingFlowStep;
  const hasText = Boolean(text);
  const previewActive = flowStep === "preview" && hasText;
  const unknownPanelActive = state.shadowingUnknownExpanded && hasText;
  const wordCount = hasText ? segmentShadowingWords(text).length : 0;
  const readTimeText = formatShadowingReadingTime(wordCount);
  const unknownWords = unknownPanelActive ? collectShadowingUnknownWords(text) : [];
  const currentSelection = Array.isArray(state.shadowingFlowSelectedUnknownWords)
    ? state.shadowingFlowSelectedUnknownWords
    : null;
  const selectionSet = new Set(currentSelection || []);
  const nextSelection =
    currentSelection === null
      ? unknownWords.map((item) => item.value)
      : unknownWords.filter((item) => selectionSet.has(item.value)).map((item) => item.value);

  state.shadowingFlowText = text;
  state.shadowingFlowWordCount = wordCount;
  state.shadowingFlowReadTimeText = readTimeText;
  state.shadowingFlowUnknownWords = unknownWords;
  state.shadowingFlowSelectedUnknownWords = unknownPanelActive ? nextSelection : null;

  if (els.shadowingContinueBtn) {
    els.shadowingContinueBtn.textContent = "Shadowing";
    els.shadowingContinueBtn.disabled = false;
  }
  if (els.shadowingPreviewPanel) els.shadowingPreviewPanel.hidden = !previewActive;
  if (els.shadowingUnknownWordsPanel) els.shadowingUnknownWordsPanel.hidden = !unknownPanelActive;
  if (els.shadowingPreviewWordCount) els.shadowingPreviewWordCount.textContent = String(wordCount);
  if (els.shadowingPreviewReadTime) els.shadowingPreviewReadTime.textContent = readTimeText;
  if (els.shadowingPreviewText) els.shadowingPreviewText.textContent = text || "";
  if (els.shadowingUnknownWordsHint) {
    els.shadowingUnknownWordsHint.textContent = unknownWords.length
      ? `Välj de ord du vill lägga till. ${unknownWords.length} ord hittades.`
      : hasText ? "Inga okända ord hittades i texten." : "Klistra in text först.";
  }
  if (els.shadowingAddUnknownBtn) {
    const selectedCount = (state.shadowingFlowSelectedUnknownWords || []).length;
    els.shadowingAddUnknownBtn.disabled = !unknownPanelActive || unknownWords.length === 0 || selectedCount === 0;
    els.shadowingAddUnknownBtn.textContent = selectedCount > 0 ? `Lägg till valda ord (${selectedCount})` : "Lägg till valda ord";
  }
  if (els.shadowingPreviewPanel) {
    if (els.shadowingPreviewText) els.shadowingPreviewText.textContent = text || "";
  }
  if (els.shadowingUnknownWordsList) {
    els.shadowingUnknownWordsList.replaceChildren();
    if (unknownPanelActive && unknownWords.length > 0) {
      const fragment = document.createDocumentFragment();
      unknownWords.forEach((item) => {
        const label = document.createElement("label");
        label.className = "shadowing-unknown-word";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = (state.shadowingFlowSelectedUnknownWords || []).includes(item.value);
        checkbox.dataset.shadowingUnknownWord = item.value;
        const textWrap = document.createElement("span");
        const strong = document.createElement("strong");
        strong.textContent = item.label;
        const small = document.createElement("small");
        small.textContent = item.value;
        textWrap.append(strong, small);
        label.append(checkbox, textWrap);
        fragment.append(label);
      });
      els.shadowingUnknownWordsList.append(fragment);
    }
  }
  updateShadowingPlaybackUI();
}

async function continueShadowingFlow() {
  const text = normalizeShadowingFlowText(els.shadowingSwedishInput?.value || "");
  if (!text) {
    alert("Klistra in svensk text innan du fortsätter.");
    return;
  }
  if (els.shadowingSwedishInput) els.shadowingSwedishInput.value = text;
  state.shadowingFlowStep = "preview";
  state.shadowingFlowText = text;
  state.shadowingFlowSelectedUnknownWords = collectShadowingUnknownWords(text).map((item) => item.value);
  renderShadowingFlow();
  const savedItem = await saveShadowingItemFromForm();
  if (!savedItem) return;
  renderShadowingFlow();
  if (!standardAudioDescriptor(savedItem)) {
    updateShadowingAudioHint("Practice använder webbläsarens röst tills standardljud finns.");
  }
}

async function addSelectedShadowingWordsToVocabulary() {
  const selected = new Set(state.shadowingFlowSelectedUnknownWords || []);
  const candidates = (state.shadowingFlowUnknownWords || []).filter((item) => selected.has(item.value));
  if (candidates.length === 0) return;
  const currentWords = await readWords();
  const existing = new Set(currentWords.map((word) => clean(word.swedish).toLocaleLowerCase("sv-SE")));
  const wordsToAdd = candidates
    .filter((item) => !existing.has(item.value))
    .map((item) =>
      normalizeForSave({
        id: createId(),
        swedish: item.label,
        pos: "other",
        pos_detail: "",
        chinese: "",
        english: "",
        forms: "",
        example: "",
        collocations: "",
        related_words: "",
        note: "",
        notebook: "",
        book_names: [],
        tags: [],
      }),
    );
  if (wordsToAdd.length === 0) {
    alert("De valda orden finns redan i ordlistan.");
    return;
  }
  await replaceWords([...wordsToAdd, ...currentWords]);
  appendLocalHistory("created", wordsToAdd[0]);
  await loadData();
  renderShadowingFlow();
  alert(`${wordsToAdd.length} ord lades till i ordlistan.`);
}

function formatShadowingTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function currentShadowingAudioSource(item = getSelectedShadowingItem()) {
  return standardAudioDescriptor(item)?.path || "";
}

function updateShadowingPlaybackUI() {
  const item = getSelectedShadowingItem();
  const pendingText = normalizeShadowingFlowText(els.shadowingSwedishInput?.value || "");
  const hasStandardAudio = Boolean(standardAudioDescriptor(item));
  const hasSpeechFallback = canSpeakShadowingText(item);
  const canPlayStandard = hasStandardAudio || hasSpeechFallback;
  const hasRecording = Boolean(recordingAudioDescriptor() || (state.shadowingRecordingBlob && state.shadowingRecordingItemId === item?.id && state.shadowingRecordingUrl));
  if (els.shadowingPlayPauseBtn) els.shadowingPlayPauseBtn.textContent = state.shadowingPlaybackState === "playing" ? "Spelar" : "Spela";
  if (els.shadowingPlayPauseBtn) els.shadowingPlayPauseBtn.disabled = !item || !canPlayStandard;
  if (els.shadowingPauseBtn) els.shadowingPauseBtn.disabled = !item || !canPlayStandard;
  if (els.shadowingStopBtn) els.shadowingStopBtn.disabled = !item;
  if (els.shadowingSetABtn) els.shadowingSetABtn.disabled = !item;
  if (els.shadowingSetBBtn) els.shadowingSetBBtn.disabled = !item;
  if (els.shadowingToggleLoopBtn) els.shadowingToggleLoopBtn.disabled = !item;
  if (els.shadowingToggleAutoPauseBtn) els.shadowingToggleAutoPauseBtn.disabled = !item;
  if (els.shadowingToggleContinuousBtn) els.shadowingToggleContinuousBtn.disabled = !item;
  if (els.shadowingToggleSubtitlesBtn) els.shadowingToggleSubtitlesBtn.disabled = !item;
  if (els.shadowingToggleLoopBtn) els.shadowingToggleLoopBtn.classList.toggle("active", state.shadowingLoopEnabled);
  if (els.shadowingToggleAutoPauseBtn) els.shadowingToggleAutoPauseBtn.classList.toggle("active", state.shadowingAutoPause);
  if (els.shadowingToggleContinuousBtn) els.shadowingToggleContinuousBtn.classList.toggle("active", state.shadowingContinuous);
  if (els.shadowingToggleSubtitlesBtn) els.shadowingToggleSubtitlesBtn.classList.toggle("active", !state.shadowingShowSubtitles);
  if (els.shadowingRecordBtn) els.shadowingRecordBtn.disabled = !item || !navigator.mediaDevices?.getUserMedia || Boolean(shadowingRecorder);
  if (els.shadowingRecordBtn) els.shadowingRecordBtn.textContent = shadowingRecorder ? "Spelar in…" : "Spela in";
  if (els.shadowingPlayRecordingBtn) els.shadowingPlayRecordingBtn.disabled = !item || !hasRecording;
  if (els.shadowingExportStandardPlayBtn) els.shadowingExportStandardPlayBtn.disabled = !item || !canPlayStandard;
  if (els.shadowingExportRecordingPlayBtn) els.shadowingExportRecordingPlayBtn.disabled = !item || !hasRecording;
  if (els.shadowingCompareBtn) els.shadowingCompareBtn.disabled = !item || !hasRecording;
  if (els.shadowingStopRecordBtn) els.shadowingStopRecordBtn.disabled = !item || !shadowingRecorder;
  if (els.generateShadowingAudioBtn) els.generateShadowingAudioBtn.disabled = !item && !pendingText;
  if (els.downloadShadowingStandardBtn) els.downloadShadowingStandardBtn.disabled = !item || !hasStandardAudio;
  if (els.downloadShadowingRecordingBtn) els.downloadShadowingRecordingBtn.disabled = !item || !hasRecording;
  updateShadowingProgressControl();
  updateShadowingActiveLine(item);
}

function renderShadowing() {
  const items = getShadowingItems();
  if (items.length === 0) {
    state.selectedShadowingId = "";
  } else if (!items.some((item) => item.id === state.selectedShadowingId)) {
    state.selectedShadowingId = items[0].id;
  }
  state.shadowing = items;
  renderShadowingList();
  renderShadowingPlayer();
  renderShadowingFlow();
}

function renderShadowingList() {
  if (!els.shadowingList) return;
  const items = getShadowingItems();
  if (els.shadowingHistorySummary) els.shadowingHistorySummary.textContent = `Tidigare Shadowing (${items.length})`;
  els.shadowingList.replaceChildren();
  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Ingen Shadowing-träning ännu. Klistra in text ovan och klicka Continue.";
    els.shadowingList.append(empty);
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "shadowing-item-card";
    card.dataset.shadowingId = item.id;
    card.classList.toggle("active", item.id === state.selectedShadowingId);
    const header = document.createElement("button");
    header.type = "button";
    header.className = "shadowing-item-select";
    header.dataset.shadowingSelect = item.id;
    const title = document.createElement("strong");
    title.textContent = item.title || item.swedish || "Utan titel";
    const meta = document.createElement("span");
    meta.textContent = [item.category || "Ungrouped", shadowingLevelLabel(item.level)].filter(Boolean).join(" · ");
    const preview = document.createElement("p");
    // Shadowing is Swedish-only practice content — item.chinese on
    // Läsning-handoff items is the source article's whole-article Chinese
    // *summary*, not a per-sentence translation, so it never lined up with
    // whatever partial Swedish text was actually sent (see sendTextToShadowing).
    // A snippet of the real practice text is a more honest preview.
    preview.textContent = clean(item.swedish).slice(0, 80) || "Ingen text";
    header.append(title, meta, preview);
    const actions = document.createElement("div");
    actions.className = "shadowing-item-actions";
    // Redigera used to live here, but tapping a card already opens
    // Practice directly (listen/record/download) — a per-item "edit the
    // text" action on what's meant to be a finished recording didn't add
    // anything (Rachel, 2026-08-09). Fixing a typo in the source text now
    // lives as the quiet "✎ Redigera text" link on the Practice page
    // itself instead, same pattern as Läsning's editReadingResultsText.
    actions.innerHTML = `
      <button type="button" data-shadowing-action="delete" data-shadowing-id="${escapeHtml(item.id)}">Radera</button>
    `;
    card.append(header, actions);
    fragment.append(card);
  });
  els.shadowingList.append(fragment);
}

function renderShadowingPlayer() {
  const item = getSelectedShadowingItem();
  if (!item) {
    if (els.shadowingTitle) els.shadowingTitle.textContent = "Shadowing";
    if (els.shadowingLevelBadge) els.shadowingLevelBadge.textContent = "Level 1";
    if (els.shadowingSubtitle) {
      els.shadowingSubtitle.hidden = false;
      els.shadowingSubtitle.innerHTML = "<strong>Inget träningsinnehåll ännu.</strong><span>Klistra in text ovan och fortsätt för att skapa första träningskortet.</span>";
    }
    if (els.shadowingTime) els.shadowingTime.textContent = "0:00 / 0:00";
    updateShadowingProgressControl();
    if (els.shadowingLoopRange) els.shadowingLoopRange.textContent = "A-B: 0:00 - 0:00";
    if (els.shadowingRecordingPanel) els.shadowingRecordingPanel.hidden = true;
    if (els.shadowingRecordingPlayer) {
      els.shadowingRecordingPlayer.pause();
      els.shadowingRecordingPlayer.hidden = true;
    }
    if (els.shadowingPlayPauseBtn) els.shadowingPlayPauseBtn.disabled = true;
    if (els.shadowingStopBtn) els.shadowingStopBtn.disabled = true;
    if (els.shadowingSetABtn) els.shadowingSetABtn.disabled = true;
    if (els.shadowingSetBBtn) els.shadowingSetBBtn.disabled = true;
    if (els.shadowingToggleLoopBtn) els.shadowingToggleLoopBtn.disabled = true;
    if (els.shadowingToggleAutoPauseBtn) els.shadowingToggleAutoPauseBtn.disabled = true;
    if (els.shadowingToggleContinuousBtn) els.shadowingToggleContinuousBtn.disabled = true;
    if (els.shadowingToggleSubtitlesBtn) els.shadowingToggleSubtitlesBtn.disabled = true;
    if (els.shadowingRecordBtn) els.shadowingRecordBtn.disabled = true;
    if (els.shadowingCompareBtn) els.shadowingCompareBtn.disabled = true;
    if (els.shadowingLevelButtons) els.shadowingLevelButtons.replaceChildren();
    updateShadowingAudioHint("Klistra in text ovan för att börja.");
    updateShadowingPlaybackUI();
    return;
  }

  if (els.shadowingTitle) els.shadowingTitle.textContent = item.title || item.swedish || "Shadowing";
  if (els.shadowingLevelBadge) els.shadowingLevelBadge.textContent = shadowingLevelLabel(item.level);
  if (els.shadowingSubtitle) {
    const subtitlesHidden = !state.shadowingShowSubtitles || normalizeShadowingLevel(item.level) >= 5;
    els.shadowingSubtitle.hidden = false;
    els.shadowingSubtitle.classList.toggle("shadowing-subtitles-hidden", subtitlesHidden);
    // Shadowing practice is Swedish-only by design (Rachel, 2026-08-09) —
    // item.chinese (a Läsning-handoff artifact, see renderShadowingList's
    // comment) never rendered here anymore either.
    els.shadowingSubtitle.innerHTML = subtitlesHidden
      ? "<strong>字幕已隐藏</strong><span>切换级别或打开字幕查看文本。</span>"
      : `<strong>${renderShadowingTextLines(item.swedish, "shadowing-subtitle-line")}</strong>`;
    updateShadowingActiveLine(item);
  }
  if (els.shadowingAudioHint) {
    const audioLabel = item.standard_audio_path ? "Storage standard audio" : item.tts_status === "generating" ? "Genererar standardljud..." : "Ingen standardljud ännu";
    updateShadowingAudioHint(`Kategori: ${item.category || "Ungrouped"} · Ljud: ${audioLabel}`);
  }
  if (els.shadowingTime) {
    const duration = shadowingAudio.duration || 0;
    els.shadowingTime.textContent = `${formatShadowingTime(shadowingAudio.currentTime || 0)} / ${formatShadowingTime(duration)}`;
  }
  if (els.shadowingLoopRange) {
    els.shadowingLoopRange.textContent = `A-B: ${formatShadowingTime(state.shadowingLoopStart)} - ${formatShadowingTime(state.shadowingLoopEnd)}`;
  }
  if (els.shadowingRecordingPanel) {
    els.shadowingRecordingPanel.hidden = !(state.shadowingRecordingUrl || shadowingRecorder);
    if (els.shadowingRecordingStatus) {
      els.shadowingRecordingStatus.hidden = !state.shadowingRecordingUrl && !shadowingRecorder;
      els.shadowingRecordingStatus.textContent = shadowingRecorder ? "● Spelar in…" : "Audio";
      els.shadowingRecordingStatus.classList.toggle("recording", Boolean(shadowingRecorder));
    }
    if (els.shadowingRecordingPlayer) {
      els.shadowingRecordingPlayer.hidden = !(state.shadowingRecordingUrl || shadowingRecorder);
      if (state.shadowingRecordingUrl && els.shadowingRecordingPlayer.src !== state.shadowingRecordingUrl) {
        els.shadowingRecordingPlayer.src = state.shadowingRecordingUrl;
      }
    }
  }
  if (els.shadowingLevelButtons) {
    els.shadowingLevelButtons.replaceChildren(
      ...[1, 2, 3, 4, 5].map((level) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chip";
        button.dataset.shadowingLevel = String(level);
        button.classList.toggle("active", normalizeShadowingLevel(item.level) === level);
        button.textContent = String(level);
        button.title = shadowingLevelLabel(level);
        return button;
      }),
    );
  }
  updateShadowingPlaybackUI();
}

async function updateShadowingAudioSource(item) {
  const descriptor = standardAudioDescriptor(item);
  const source = descriptor ? await signedShadowingAudioUrl(descriptor.bucket, descriptor.path) : "";
  const currentSource = shadowingAudio.currentSrc || shadowingAudio.src || "";
  if (source && currentSource === source) {
    shadowingAudio.loop = false;
    return source;
  }
  shadowingAudio.src = source || "";
  shadowingAudio.loop = false;
  shadowingAudio.currentTime = 0;
  return source;
}

function closeShadowingPlayback() {
  shadowingAudio.pause();
  shadowingAudio.currentTime = 0;
  shadowingRecordingAudio.pause();
  shadowingRecordingAudio.currentTime = 0;
  els.shadowingRecordingPlayer?.pause();
  if (els.shadowingRecordingPlayer) els.shadowingRecordingPlayer.currentTime = 0;
  stopShadowingSpeech();
  stopShadowingRecording();
  shadowingComparisonQueued = false;
  state.shadowingPlaybackState = "paused";
  updateShadowingPlaybackUI();
}

function ensureSelectedShadowingItem() {
  const items = getShadowingItems();
  if (items.length === 0) return null;
  const selected = items.find((item) => item.id === state.selectedShadowingId) || items[0];
  state.selectedShadowingId = selected.id;
  return selected;
}

async function saveShadowingItemFromForm() {
  const title = clean(els.shadowingTitleInput?.value) || clean(els.shadowingSwedishInput?.value).split(/\n+/)[0] || "Shadowing";
  const swedish = clean(els.shadowingSwedishInput?.value);
  const chinese = clean(els.shadowingChineseInput?.value);
  const category = clean(els.shadowingCategoryInput?.value) || "Ungrouped";
  if (!swedish) {
    alert("Skriv svensk text innan du sparar.");
    return null;
  }
  const items = getShadowingItems();
  const existing = items.find((item) => item.id === els.shadowingItemId.value);
  const nextItem = shadowingStore.normalizeShadowingItem({
    ...(existing || {}),
    id: existing?.id || createId(),
    title,
    swedish,
    chinese,
    audio: "",
    audio_source: "",
    audio_file_name: existing?.standard_audio_path ? "Storage standard audio" : "",
    standard_audio_bucket: existing?.standard_audio_bucket || "",
    standard_audio_path: existing?.standard_audio_path || "",
    standard_audio_mime_type: existing?.standard_audio_mime_type || "",
    standard_audio_size_bytes: existing?.standard_audio_size_bytes || null,
    standard_audio_duration_ms: existing?.standard_audio_duration_ms || null,
    tts_provider: existing?.tts_provider || "elevenlabs",
    tts_voice_id: clean(els.shadowingVoiceSelect?.value) || existing?.tts_voice_id || "",
    tts_voice_name: els.shadowingVoiceSelect?.selectedOptions?.[0]?.textContent || existing?.tts_voice_name || "",
    tts_model_id: existing?.tts_model_id || "",
    tts_settings: existing?.tts_settings || {},
    tts_status: existing?.tts_status || "pending",
    tts_error: existing?.tts_error || "",
    category,
    level: normalizeShadowingLevel(els.shadowingLevelInput?.value || existing?.level || 1),
    createdAt: existing?.createdAt || existing?.created_at || Date.now(),
    updatedAt: Date.now(),
  });
  const remoteResult = await remoteDb.upsertShadowingItem(nextItem).catch((error) => {
    console.warn("[Shadowing] Remote item sync failed", error);
    return null;
  });
  if (remoteResult?.item) {
    remotePhase4Snapshot = {
      ...(remotePhase4Snapshot || {}),
      shadowingItems: mergeShadowingItemsForApp([remoteResult.item], remotePhase4Snapshot?.shadowingItems || []),
    };
  }
  state.shadowingPendingAudioSource = "";
  state.shadowingPendingAudioName = "";
  state.shadowingFlowStep = "preview";
  state.shadowingFlowText = swedish;
  state.shadowingFlowWordCount = segmentShadowingWords(swedish).length;
  state.shadowingFlowReadTimeText = formatShadowingReadingTime(state.shadowingFlowWordCount);
  state.shadowingFlowUnknownWords = collectShadowingUnknownWords(swedish);
  state.shadowingFlowSelectedUnknownWords = state.shadowingFlowUnknownWords.map((entry) => entry.value);
  const savedItem = remoteResult?.item ? shadowingStore.normalizeShadowingItem(remoteResult.item) : nextItem;
  if (remoteResult?.item) {
    await refreshShadowingState();
  } else {
    state.shadowing = mergeShadowingItemsForApp([savedItem], state.shadowing);
  }
  state.selectedShadowingId = savedItem.id;
  populateShadowingForm(savedItem);
  renderShadowing();
  return savedItem;
}

async function guideShadowingLogin() {
  const email = clean(prompt("Logga in för att generera standardljud. Ange din e-post så skickar vi en inloggningslänk."));
  if (!email) {
    alert("Du behöver logga in för att generera standardljud.");
    return "";
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.href,
    },
  });
  if (error) throw error;
  alert("Vi har skickat en inloggningslänk till din e-post. Öppna länken och försök sedan generera standardljud igen.");
  return "";
}

async function getShadowingAccessTokenOrGuide() {
  const token = await remoteDb.getCurrentAccessToken({ timeoutMs: 8000 });
  if (token) return token;
  return "";
}

function shadowingTtsErrorMessage(error) {
  const message = clean(error?.message);
  if (/ELEVENLABS_API_KEY|voiceId|AI Voice|TTS/i.test(message)) {
    return "AI Voice är inte konfigurerad för standardljud ännu. New Words fungerar fortfarande utan AI Voice.";
  }
  return message || "Kunde inte generera standardljud.";
}

function speakShadowingText(text, { onEnd } = {}) {
  const input = normalizeShadowingFlowText(text);
  if (!input || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    alert("Din webbläsare kan inte läsa upp texten.");
    return false;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(input);
  utterance.lang = "sv-SE";
  utterance.rate = 0.88;
  shadowingSpeechCharacterIndex = 0;
  utterance.onboundary = (event) => {
    if (shadowingSpeechUtterance !== utterance || !Number.isFinite(event.charIndex)) return;
    shadowingSpeechCharacterIndex = event.charIndex;
    renderShadowingPlayer();
  };
  utterance.onend = () => {
    if (shadowingSpeechUtterance !== utterance) return;
    shadowingSpeechUtterance = null;
    shadowingSpeechCharacterIndex = 0;
    state.shadowingPlaybackState = "paused";
    updateShadowingPlaybackUI();
    if (typeof onEnd === "function") onEnd();
  };
  utterance.onerror = () => {
    if (shadowingSpeechUtterance !== utterance) return;
    shadowingSpeechUtterance = null;
    shadowingSpeechCharacterIndex = 0;
    state.shadowingPlaybackState = "paused";
    updateShadowingPlaybackUI();
  };
  shadowingSpeechUtterance = utterance;
  state.shadowingPlaybackState = "playing";
  updateShadowingPlaybackUI();
  speechSynthesis.speak(utterance);
  return true;
}

function stopShadowingSpeech() {
  if (!("speechSynthesis" in window)) return;
  shadowingSpeechUtterance = null;
  shadowingSpeechCharacterIndex = 0;
  speechSynthesis.cancel();
}

// 2026-08-03: extracted from generateStandardShadowingAudio so both the
// manual "▶️ Shadowing" button and Reading's handoff (sendTextToShadowing)
// can trigger real audio generation without duplicating the TTS fetch and
// its speech-synthesis-fallback error handling. Behavior unchanged from
// before the extraction — success updates the item and autoplays; failure
// falls back to the browser's own speechSynthesis voice.
async function runShadowingTtsGeneration(item, text, token) {
  try {
    const response = await fetch("/api/shadowing/tts", {
      method: "POST",
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceId: clean(els.shadowingVoiceSelect?.value) || item.tts_voice_id || DEFAULT_ELEVENLABS_VOICE_ID,
        itemId: item.id,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Kunde inte generera standardljud.");
    if (payload.item || payload.dataUrl) {
      const updatedItem = shadowingStore.normalizeShadowingItem(payload.item || {
        ...item,
        audio: payload.dataUrl,
        audio_source: payload.dataUrl,
        audio_file_name: "ElevenLabs standard audio",
        standard_audio_bucket: "",
        standard_audio_path: payload.dataUrl,
        standard_audio_mime_type: payload.mimeType || "audio/mpeg",
        standard_audio_size_bytes: payload.sizeBytes || null,
        tts_provider: payload.provider || "elevenlabs",
        tts_voice_id: payload.voiceId || item.tts_voice_id || DEFAULT_ELEVENLABS_VOICE_ID,
        tts_model_id: payload.modelId || item.tts_model_id || "",
        tts_status: "ready",
        tts_error: "",
        updatedAt: Date.now(),
      });
      // The standard-audio storage path is deterministic per item
      // (userId/itemId/standard.mp3), so regenerating with a different
      // voice overwrites the exact same object. signedShadowingAudioUrl
      // caches its signed URL per bucket:path for up to 55 minutes, so
      // without this the player kept reusing the pre-regeneration URL —
      // same signed URL, same (browser-cached) audio bytes, new voice
      // never actually heard until the cache happened to expire.
      if (updatedItem.standard_audio_bucket && updatedItem.standard_audio_path) {
        shadowingSignedUrlCache.delete(`${updatedItem.standard_audio_bucket}:${updatedItem.standard_audio_path}`);
      }
      remotePhase4Snapshot = {
        ...(remotePhase4Snapshot || {}),
        shadowingItems: mergeShadowingItemsForApp([updatedItem], remotePhase4Snapshot?.shadowingItems || []),
      };
      if (payload.item) {
        await refreshShadowingState();
      } else {
        state.shadowing = mergeShadowingItemsForApp([updatedItem], state.shadowing);
      }
      state.selectedShadowingId = updatedItem.id;
      populateShadowingForm(updatedItem);
      if (els.shadowingGenerating) els.shadowingGenerating.hidden = true;
      renderShadowing();
      await playShadowingCurrentItem();
    }
  } catch (error) {
    console.error("[Shadowing] Standard audio generation failed", error);
    if (els.shadowingGenerating) els.shadowingGenerating.hidden = true;
    const message = shadowingTtsErrorMessage(error);
    if (speakShadowingText(text)) {
      updateShadowingAudioHint("Läser upp med webbläsarens röst. Standardljud kunde inte genereras ännu.");
    } else {
      updateShadowingAudioHint(message);
      alert(message);
    }
  }
}

async function generateStandardShadowingAudio() {
  let item = ensureSelectedShadowingItem();
  const text = normalizeShadowingFlowText(els.shadowingSwedishInput?.value || item?.swedish || "");
  if (!text) {
    alert("Skriv svensk text innan du genererar ljud.");
    return;
  }
  if (els.generateShadowingAudioBtn) {
    els.generateShadowingAudioBtn.disabled = true;
    els.generateShadowingAudioBtn.textContent = "Genererar...";
  }
  try {
    const token = await getShadowingAccessTokenOrGuide();
    if (!item?.id || clean(item.swedish) !== text) {
      item = await saveShadowingItemFromForm();
    }
    if (!item?.id) return;
    const remoteResult = await remoteDb.upsertShadowingItem({ ...item, swedish: text });
    if (remoteResult?.item) {
      item = shadowingStore.normalizeShadowingItem(remoteResult.item);
      remotePhase4Snapshot = {
        ...(remotePhase4Snapshot || {}),
        shadowingItems: mergeShadowingItemsForApp([item], remotePhase4Snapshot?.shadowingItems || []),
      };
      await refreshShadowingState();
      state.selectedShadowingId = item.id;
    }
    // 2026-08-03: navigate to the practice page immediately, generation
    // continues in the background (Rachel's confirmed decision, mirrors
    // Läsning's fast/deep pattern shipped earlier this session) — the
    // "Genererar ljud …" placeholder covers the gap.
    openShadowingPractice(item, { generating: true });
    await runShadowingTtsGeneration(item, text, token);
  } catch (error) {
    console.error("[Shadowing] Failed to prepare standard audio generation", error);
    alert(shadowingTtsErrorMessage(error));
  } finally {
    if (els.generateShadowingAudioBtn) {
      els.generateShadowingAudioBtn.disabled = false;
      els.generateShadowingAudioBtn.textContent = "▶️ Shadowing";
      updateShadowingPlaybackUI();
    }
  }
}

async function downloadStorageAudio(descriptor, filename) {
  if (descriptor?.path?.startsWith("data:")) {
    downloadBlob(dataUrlToBlob(descriptor.path), filename || "standard.mp3");
    return;
  }
  if (!descriptor?.bucket || !descriptor?.path) {
    alert("Ingen Storage-ljudfil finns att ladda ner.");
    return;
  }
  const blob = await remoteDb.downloadShadowingAudioBlob({
    bucket: descriptor.bucket,
    path: descriptor.path,
  });
  if (!blob) {
    alert("Kunde inte ladda ner ljudfilen.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || descriptor.path.split("/").pop() || "shadowing-audio";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded = ""] = String(dataUrl || "").split(",");
  const mime = header.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function downloadBlob(blob, filename) {
  if (!blob) {
    alert("Ingen ljudfil finns att ladda ner.");
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "shadowing-audio";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadStandardShadowingAudio() {
  const item = getSelectedShadowingItem();
  await downloadStorageAudio(standardAudioDescriptor(item), `${clean(item?.title || item?.swedish || "standard")}.mp3`);
}

async function downloadShadowingRecording() {
  const item = getSelectedShadowingItem();
  if (state.shadowingRecordingBlob && state.shadowingRecordingItemId === item?.id) {
    downloadBlob(state.shadowingRecordingBlob, `${clean(item?.title || "recording")}.webm`);
    return;
  }
  const recording = getLatestShadowingRecording(state.selectedShadowingId);
  await downloadStorageAudio(recordingAudioDescriptor(recording), `${clean(item?.title || "recording")}.webm`);
}

async function deleteShadowingItem(itemId) {
  const items = getShadowingItems();
  const item = items.find((row) => row.id === itemId);
  if (!item) return;
  if (!confirm(`Ta bort träningsinnehållet "${item.swedish}"?`)) return;
  await remoteDb.deleteShadowingItem(itemId).catch((error) => console.warn("[Shadowing] Remote delete failed", error));
  if (remotePhase4Snapshot?.shadowingItems) {
    remotePhase4Snapshot.shadowingItems = remotePhase4Snapshot.shadowingItems.filter((row) => row.id !== itemId);
  }
  await refreshShadowingState();
  if (els.shadowingItemId.value === itemId) resetShadowingForm();
  renderShadowing();
}

async function applyShadowingLevel(level, { persist = true } = {}) {
  const item = ensureSelectedShadowingItem();
  const normalized = normalizeShadowingLevel(level);
  state.shadowingLevel = String(normalized);
  if (els.shadowingLevelInput) els.shadowingLevelInput.value = String(normalized);
  if (!item) {
    renderShadowing();
    return;
  }
  if (persist) {
    const nextItem = shadowingStore.normalizeShadowingItem({ ...item, level: normalized, updatedAt: Date.now() });
    await remoteDb.upsertShadowingItem(nextItem).catch((error) => console.warn("[Shadowing] Remote level sync failed", error));
  }
  persistUserPreferences();
  renderShadowing();
}

function updateShadowingLoopBoundsFromAudio() {
  if (!Number.isFinite(shadowingAudio.duration) || shadowingAudio.duration <= 0) return;
  if (state.shadowingLoopEnd <= state.shadowingLoopStart) {
    state.shadowingLoopStart = 0;
    state.shadowingLoopEnd = shadowingAudio.duration;
  }
  if (state.shadowingLoopEnd > shadowingAudio.duration) state.shadowingLoopEnd = shadowingAudio.duration;
}

function setShadowingLoopPoint(point) {
  if (!Number.isFinite(shadowingAudio.currentTime)) return;
  if (point === "a") {
    state.shadowingLoopStart = shadowingAudio.currentTime;
    if (state.shadowingLoopEnd <= state.shadowingLoopStart) {
      state.shadowingLoopEnd = Math.max(state.shadowingLoopStart + 1, shadowingAudio.duration || state.shadowingLoopStart + 1);
    }
  } else {
    state.shadowingLoopEnd = Math.max(shadowingAudio.currentTime, state.shadowingLoopStart + 0.5);
  }
  renderShadowingPlayer();
}

async function playShadowingCurrentItem() {
  const item = ensureSelectedShadowingItem();
  if (!item) return;
  if (shadowingRecorder) return;
  const descriptor = standardAudioDescriptor(item);
  const source = descriptor ? await signedShadowingAudioUrl(descriptor.bucket, descriptor.path) : "";
  if (!source) {
    speakShadowingText(item.swedish);
    return;
  }
  stopShadowingSpeech();
  const currentSource = shadowingAudio.currentSrc || shadowingAudio.src || "";
  if (currentSource !== source) {
    await updateShadowingAudioSource(item);
  }
  updateShadowingLoopBoundsFromAudio();
  try {
    await shadowingAudio.play();
    state.shadowingPlaybackState = "playing";
    updateShadowingPlaybackUI();
  } catch (error) {
    console.warn("[Shadowing] Playback failed", error);
    alert("Kunde inte spela upp ljudfilen.");
  }
}

function pauseShadowingCurrentItem() {
  shadowingAudio.pause();
  stopShadowingSpeech();
  state.shadowingPlaybackState = "paused";
  updateShadowingPlaybackUI();
}

function stopShadowingCurrentItem() {
  pauseShadowingCurrentItem();
  if (shadowingAudio.src) {
    shadowingAudio.currentTime = 0;
  }
  state.shadowingSeeking = false;
  renderShadowingPlayer();
}

function handleShadowingAudioProgress() {
  if (state.shadowingSeeking) {
    renderShadowingPlayer();
    return;
  }
  if (!state.shadowingLoopEnabled || shadowingAudio.paused) {
    renderShadowingPlayer();
    return;
  }
  if (shadowingAudio.currentTime >= state.shadowingLoopEnd - 0.03) {
    if (state.shadowingAutoPause) {
      pauseShadowingCurrentItem();
      return;
    }
    state.shadowingSeeking = true;
    shadowingAudio.currentTime = Math.max(0, state.shadowingLoopStart);
    shadowingAudio.play().catch(() => undefined);
    window.setTimeout(() => {
      state.shadowingSeeking = false;
    }, 0);
  }
  renderShadowingPlayer();
}

async function playShadowingRecording() {
  if (!state.shadowingRecordingUrl) {
    await applyShadowingRecordingForItem(state.selectedShadowingId);
  }
  if (!state.shadowingRecordingUrl) return;
  shadowingRecordingAudio.pause();
  shadowingRecordingAudio.src = state.shadowingRecordingUrl;
  if (els.shadowingRecordingPlayer) {
    els.shadowingRecordingPlayer.src = state.shadowingRecordingUrl;
    els.shadowingRecordingPlayer.hidden = false;
    await els.shadowingRecordingPlayer.play();
    return;
  }
  try {
    await shadowingRecordingAudio.play();
  } catch (error) {
    console.warn("[Shadowing] Recording playback failed", error);
  }
}

async function compareShadowingPlayback() {
  const item = ensureSelectedShadowingItem();
  if (!item) return;
  if (!standardAudioDescriptor(item)) {
    if (state.shadowingRecordingUrl) {
      await playShadowingRecording();
    }
    return;
  }
  shadowingComparisonQueued = true;
  stopShadowingCurrentItem();
  await updateShadowingAudioSource(item);
  try {
    await shadowingAudio.play();
    state.shadowingPlaybackState = "playing";
    updateShadowingPlaybackUI();
  } catch {
    shadowingComparisonQueued = false;
  }
}

async function startShadowingRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    alert("Din webbläsare stöder inte inspelning.");
    return;
  }
  pauseShadowingCurrentItem();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  shadowingRecordStream = stream;
  shadowingRecordChunks = [];
  shadowingRecordingStartedAt = Date.now();
  const recorder = new MediaRecorder(stream);
  shadowingRecorder = recorder;
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) shadowingRecordChunks.push(event.data);
  };
  recorder.onstop = () => {
    const mime = recorder.mimeType || shadowingRecordChunks[0]?.type || "audio/webm";
    const blob = new Blob(shadowingRecordChunks, { type: mime });
    const selectedItem = getSelectedShadowingItem();
    const durationMs = shadowingRecordingStartedAt ? Math.max(0, Date.now() - shadowingRecordingStartedAt) : 0;
    revokeShadowingRecordingObjectUrl();
    state.shadowingRecordingMimeType = mime;
    state.shadowingRecordingBlob = blob;
    state.shadowingRecordingItemId = selectedItem?.id || "";
    state.shadowingRecordingUrl = URL.createObjectURL(blob);
    shadowingRecordingAudio.src = state.shadowingRecordingUrl;
    if (els.shadowingRecordingPlayer) {
      els.shadowingRecordingPlayer.src = state.shadowingRecordingUrl;
      els.shadowingRecordingPlayer.hidden = false;
    }
    shadowingRecordStream?.getTracks?.().forEach((track) => track.stop());
    shadowingRecordStream = null;
    shadowingRecorder = null;
    shadowingRecordChunks = [];
    shadowingRecordingStartedAt = 0;
    updateShadowingPlaybackUI();
    renderShadowingPlayer();
    if (selectedItem?.id) {
      const timestamp = Date.now();
      remoteDb.getCurrentAccountId()
        .then((userId) => {
          if (!userId) throw new Error("Logga in för att spara inspelningen.");
          const extension = shadowingRecordingExtension(mime);
          const path = `${userId}/${selectedItem.id}/${timestamp}.${extension}`;
          return remoteDb.saveShadowingRecordingWithAudio({
            bucket: SHADOWING_RECORDINGS_BUCKET,
            path,
            file: blob,
            contentType: mime,
            recording: {
              id: createId(),
              shadowing_item_id: selectedItem.id,
              audio_mime_type: mime,
              audio_size_bytes: blob.size,
              audio_duration_ms: durationMs,
              level: selectedItem.level,
              attempt_no: (state.shadowingRecordings || []).filter((row) => row.shadowing_item_id === selectedItem.id).length + 1,
            },
          });
        })
        .then((result) => {
          if (result?.recording) {
            state.shadowingRecordings = [
              result.recording,
              ...(state.shadowingRecordings || []).filter((row) => row.id !== result.recording.id),
            ];
            remotePhase4Snapshot = {
              ...(remotePhase4Snapshot || {}),
              shadowingRecordings: state.shadowingRecordings,
            };
            return applyShadowingRecordingForItem(selectedItem.id).then(() => {
              updateShadowingPlaybackUI();
              renderShadowingPlayer();
            });
          }
          return undefined;
        })
        .catch((error) => console.warn("[Shadowing] Remote recording sync failed", error));
    }
  };
  recorder.start();
  updateShadowingPlaybackUI();
  renderShadowingPlayer();
}

function stopShadowingRecording() {
  if (!shadowingRecorder) return;
  try {
    shadowingRecorder.stop();
  } catch {
    // Ignore recorder teardown failures.
  }
}

async function clearShadowingRecording() {
  const itemId = state.shadowingRecordingItemId || state.selectedShadowingId;
  const recordings = (state.shadowingRecordings || []).filter((row) => row.shadowing_item_id === itemId);
  await Promise.all(recordings.map(async (recording) => {
    const descriptor = recordingAudioDescriptor(recording);
    await remoteDb.deleteShadowingRecording(recording.id).catch((error) => console.warn("[Shadowing] Remote recording delete failed", error));
    if (descriptor?.bucket && descriptor?.path) {
      await remoteDb.deleteShadowingAudio(descriptor).catch((error) => console.warn("[Shadowing] Recording audio delete failed", error));
      shadowingSignedUrlCache.delete(`${descriptor.bucket}:${descriptor.path}`);
    }
  }));
  const removedIds = new Set(recordings.map((recording) => recording.id));
  state.shadowingRecordings = (state.shadowingRecordings || []).filter(
    (row) => row.shadowing_item_id !== itemId && !removedIds.has(row.id),
  );
  if (remotePhase4Snapshot?.shadowingRecordings) {
    remotePhase4Snapshot.shadowingRecordings = remotePhase4Snapshot.shadowingRecordings.filter(
      (row) => row.shadowing_item_id !== itemId && !removedIds.has(row.id),
    );
  }
  revokeShadowingRecordingObjectUrl();
  state.shadowingRecordingUrl = "";
  state.shadowingRecordingMimeType = "";
  state.shadowingRecordingBlob = null;
  state.shadowingRecordingItemId = "";
  shadowingRecordingAudio.pause();
  shadowingRecordingAudio.src = "";
  if (els.shadowingRecordingPlayer) {
    els.shadowingRecordingPlayer.pause();
    els.shadowingRecordingPlayer.removeAttribute("src");
    els.shadowingRecordingPlayer.load();
    els.shadowingRecordingPlayer.hidden = true;
  }
  updateShadowingPlaybackUI();
  renderShadowingPlayer();
}

function toggleShadowingSubtitles() {
  state.shadowingShowSubtitles = !state.shadowingShowSubtitles;
  persistUserPreferences();
  renderShadowingPlayer();
}

function toggleShadowingLoop() {
  state.shadowingLoopEnabled = !state.shadowingLoopEnabled;
  if (state.shadowingLoopEnabled && state.shadowingLoopEnd <= state.shadowingLoopStart) {
    state.shadowingLoopStart = 0;
    state.shadowingLoopEnd = Number.isFinite(shadowingAudio.duration) && shadowingAudio.duration > 0 ? shadowingAudio.duration : 0;
  }
  persistUserPreferences();
  renderShadowingPlayer();
}

function toggleShadowingAutoPause() {
  state.shadowingAutoPause = !state.shadowingAutoPause;
  persistUserPreferences();
  renderShadowingPlayer();
}

function toggleShadowingContinuous() {
  state.shadowingContinuous = !state.shadowingContinuous;
  persistUserPreferences();
  renderShadowingPlayer();
}

function advanceToNextShadowingItem() {
  const items = getShadowingItems();
  if (items.length === 0) return null;
  const currentIndex = items.findIndex((item) => item.id === state.selectedShadowingId);
  if (currentIndex < 0) return items[0];
  return items[(currentIndex + 1) % items.length] || null;
}

async function handleShadowingEnded() {
  state.shadowingPlaybackState = "paused";
  updateShadowingPlaybackUI();
  if (shadowingComparisonQueued && state.shadowingRecordingUrl) {
    shadowingComparisonQueued = false;
    await playShadowingRecording();
    return;
  }
  shadowingComparisonQueued = false;
  if (state.shadowingContinuous) {
    const next = advanceToNextShadowingItem();
    if (!next || next.id === state.selectedShadowingId) return;
    state.selectedShadowingId = next.id;
    renderShadowing();
    await playShadowingCurrentItem();
  }
}

async function saveWordFromForm() {
  let existing = state.words.find((word) => word.id === els.word_id.value);
  let isDuplicateUpdate = false;
  if (!existing) {
    const duplicate = state.words.find((word) => clean(word.swedish).toLocaleLowerCase("sv-SE") === clean(els.swedishInput.value).toLocaleLowerCase("sv-SE"));
    if (duplicate) {
      if (!confirm("Ordet finns redan. Vill du uppdatera det?")) return false;
      existing = duplicate;
      isDuplicateUpdate = true;
    }
  }
  const action = existing ? "updated" : "created";
  const selectedNotebook = ensureNotebookOption(els.notebookInput.value);
  rememberNotebookName(selectedNotebook);
  const selectedBookNames = sameCategory(selectedNotebook, DEFAULT_NOTEBOOK) ? [] : [selectedNotebook];
  // Structured word forms (comparative/participle/etc.) only apply to the
  // parts of speech listed in WORD_FORM_GROUPS_BY_POS — for everything else
  // the free-text "forms" textarea is the field of record, unchanged from
  // before. When structured fields are in use, they generate the display
  // text instead of reading the (hidden) textarea directly.
  const wordFormValues = collectWordFormValues();
  const formsText = WORD_FORM_GROUPS_BY_POS[els.posInput.value]
    ? buildFormsSummaryText(wordFormValues)
    : els.formsInput.value;
  const formValues = {
    ...existing,
    id: existing?.id || els.word_id.value || undefined,
    swedish: els.swedishInput.value,
    pos: els.posInput.value,
    pos_detail: els.pos_detailInput.value,
    ipa: els.ipaInput.value,
    cefr_level: els.cefrLevelInput.value,
    chinese: els.chineseInput.value,
    english: els.englishInput.value,
    forms: formsText,
    example: els.exampleInput.value,
    collocations: els.collocationsInput.value,
    related_words: els.related_wordsInput.value,
    note: els.noteInput.value,
    notebook: selectedNotebook,
    book_names: selectedBookNames,
    tags: els.tagInput.value,
  };
  const word = normalizeForSave(isDuplicateUpdate ? mergeWordFormValues(existing, formValues) : formValues);

  const words = (await readWords()).filter((item) => item.id !== word.id);
  await replaceWords([word, ...words]);
  remoteDb.saveWordForms(word.id, wordFormValues).catch((error) => {
    console.warn("[SpråkLab] Failed to save word_forms for", word.id, error);
  });
  appendLocalHistory(action, word);
  state.selectedNotebook = word.notebook;
  await loadData();
  if (state.currentQuiz?.id === word.id) {
    state.currentQuiz = state.words.find((item) => item.id === word.id) || state.currentQuiz;
  }
  if (state.studySession?.wordId === word.id) {
    renderStudySession();
  }
  if (state.wordDialogSourceDetailId === word.id) {
    renderWordDetail(state.words.find((item) => item.id === word.id) || word, els.detailDialog.dataset.sourceMode || "library");
  } else {
    refreshOpenDetail(word.id);
  }
  return true;
}

function mergeWordFormValues(existing, formValues) {
  const merged = { ...existing, id: existing.id, swedish: formValues.swedish || existing.swedish };
  [
    "pos",
    "pos_detail",
    "ipa",
    "cefr_level",
    "chinese",
    "english",
    "forms",
    "example",
    "collocations",
    "related_words",
    "note",
    "notebook",
    "book_names",
    "tags",
  ].forEach((key) => {
    if (Array.isArray(formValues[key]) ? formValues[key].length > 0 : clean(formValues[key])) merged[key] = formValues[key];
  });
  return merged;
}

function autofillWordFormFromPaste() {
  const parsed = parsePastedWordInfo(els.pasteWordInfoInput.value);
  if (!Object.values(parsed.fields).some(Boolean) && parsed.notes.length === 0) return;
  const setIfPresent = (input, value) => {
    if (clean(value)) input.value = clean(value);
  };
  setIfPresent(els.swedishInput, parsed.fields.swedish);
  if (parsed.fields.pos) els.posInput.value = parsed.fields.pos;
  showWordFormGroupForPos(els.posInput.value);
  setIfPresent(els.pos_detailInput, parsed.fields.pos_detail);
  setIfPresent(els.chineseInput, parsed.fields.chinese);
  setIfPresent(els.englishInput, parsed.fields.english);
  setIfPresent(els.formsInput, parsed.fields.forms);
  setIfPresent(els.exampleInput, parsed.fields.example);
  setIfPresent(els.collocationsInput, parsed.fields.collocations);
  setIfPresent(els.related_wordsInput, parsed.fields.related_words);
  if (parsed.fields.notebook) {
    const notebook = ensureNotebookOption(parsed.fields.notebook);
    els.notebookInput.value = notebook;
  }
  const note = [...parsed.notes, parsed.fields.note].map(clean).filter(Boolean).join("\n");
  setIfPresent(els.noteInput, note);
  autoResizeWordFormTextareas();
  alert("已自动填充，请检查后保存。");
}

function parsePastedWordInfo(text) {
  const lines = String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^\uFEFF/, "").trim());
  const fields = {
    swedish: "",
    pos: "",
    pos_detail: "",
    chinese: "",
    english: "",
    forms: "",
    example: "",
    collocations: "",
    related_words: "",
    notebook: "",
    note: "",
  };
  const notes = [];
  const sections = {
    chinese: [],
    english: [],
    forms: [],
    example: [],
    collocations: [],
    related_words: [],
    note: [],
    pos: [],
    notebook: [],
  };
  let activeField = "";
  let swedishCaptured = false;

  lines.forEach((rawLine, index) => {
    const line = clean(rawLine.replace(/^[\s\-*•\d.)]+/, ""));
    if (!line) {
      if (activeField && activeField !== "pos" && activeField !== "notebook" && activeField !== "swedish") {
        sections[activeField].push("");
      }
      return;
    }

    if (activeField === "collocations" && isExampleMarker(line)) {
      sections.collocations.push(line);
      return;
    }

    const heading = parsePastedHeading(line);
    if (heading) {
      activeField = heading.field;
      if (heading.inline) sections[heading.field].push(heading.inline);
      return;
    }

    if (!swedishCaptured && isLikelySwedishTitleLine(line, index, lines)) {
      fields.swedish = line;
      swedishCaptured = true;
      return;
    }

    if (activeField && sections[activeField]) {
      sections[activeField].push(line);
      return;
    }

    notes.push(line);
  });

  fields.chinese = joinParsedLines(sections.chinese);
  fields.english = joinParsedLines(sections.english);
  fields.forms = joinParsedLines(sections.forms);
  fields.example = joinParsedLines(sections.example);
  fields.collocations = normalizePastedCollocations(sections.collocations);
  fields.related_words = normalizeRelatedWordsText(joinParsedLines(sections.related_words));
  fields.note = joinParsedLines(sections.note);
  const parsedPos = parsePosField(joinParsedLines(sections.pos));
  fields.pos = parsedPos.pos;
  fields.pos_detail = clean([fields.pos_detail, parsedPos.detail].filter(Boolean).join(" "));
  const notebookValue = joinParsedLines(sections.notebook);
  if (notebookValue) fields.notebook = normalizeNotebookName(notebookValue);
  if (!fields.swedish && lines.length > 0) {
    const fallback = lines.find((line) => isLikelySwedishTitleLine(line, 0, lines));
    if (fallback) fields.swedish = fallback;
  }
  if (!fields.swedish && clean(text)) {
    const firstLine = lines.find(Boolean);
    if (firstLine) fields.swedish = firstLine;
  }
  return { fields, notes };
}

function parsePastedHeading(line) {
  const match = clean(line).match(/^(.+?)(?:\s*[:：]\s*(.*))?$/);
  if (!match) return null;
  const label = clean(match[1]).toLocaleLowerCase("sv-SE");
  const inline = clean(match[2]);
  const field = mapPastedHeadingToField(label);
  if (!field) return null;
  return { field, inline };
}

function mapPastedHeadingToField(label) {
  const normalized = clean(label).toLocaleLowerCase("sv-SE");
  const mappings = [
    ["svenska", "swedish"],
    ["swedish", "swedish"],
    ["ord", "swedish"],
    ["单词", "swedish"],
    ["ordklass", "pos"],
    ["词性", "pos"],
    ["pos", "pos"],
    ["detalj", "pos_detail"],
    ["详细词性", "pos_detail"],
    ["kinesisk betydelse", "chinese"],
    ["中文意思", "chinese"],
    ["中文解释", "chinese"],
    ["中文", "chinese"],
    ["svensk förklaring", "english"],
    ["瑞典语解释", "english"],
    ["förklaring", "english"],
    ["grammatik", "forms"],
    ["böjning", "forms"],
    ["forms", "forms"],
    ["例句", "example"],
    ["exempel", "example"],
    ["fraser", "collocations"],
    ["fasta fraser", "collocations"],
    ["固定搭配", "collocations"],
    ["relaterade ord", "related_words"],
    ["相关词", "related_words"],
    ["kommentar", "note"],
    ["备注", "note"],
    ["notebook", "notebook"],
    ["ordbok", "notebook"],
    ["kategori", "notebook"],
    ["分类", "notebook"],
  ];
  const exact = mappings.find(([key]) => normalized === key);
  if (exact) return exact[1];
  const includes = mappings.find(([key]) => normalized.includes(key));
  return includes?.[1] || "";
}

function joinParsedLines(lines = []) {
  return lines.map((line) => clean(line)).filter(Boolean).join("\n");
}

function isLikelySwedishTitleLine(line, index, lines) {
  const text = clean(line);
  if (!text || text.length > 90) return false;
  if (/[:：]/.test(text)) return false;
  if (looksLikeCjkText(text)) return false;
  if (index > 0 && clean(lines[index - 1]) === "") return true;
  return /^[\p{L}\p{N} .,'’\-…()\/]+$/u.test(text) && !/[。！？!?]/.test(text);
}

function normalizePastedCollocations(lines) {
  const blocks = [];
  let current = [];
  const pushCurrent = () => {
    const block = current.map((line) => clean(line)).filter(Boolean);
    if (block.length > 0) blocks.push(block);
    current = [];
  };

  (Array.isArray(lines) ? lines : String(lines || "").split("\n")).forEach((rawLine) => {
    const line = clean(rawLine);
    if (!line) {
      pushCurrent();
      return;
    }
    current.push(line);
  });
  pushCurrent();

  const items = [];
  blocks.forEach((block) => {
    const meaningful = block.filter((line) => !isExampleMarker(line));
    if (meaningful.length === 0) return;

    const structuredLines = meaningful.filter((line) => /\s+\|\s+|\s+—\s+|\s+-\s+/.test(line));
    if (structuredLines.length > 0) {
      structuredLines.forEach((line) => {
        const normalized = normalizeStructuredLine(line, { swedish: "" }, (phrase) => `${phrase} |  | `);
        if (clean(normalized)) items.push(normalized);
      });
      return;
    }

    const phrase = clean(meaningful[0]);
    if (!phrase) return;
    const tail = meaningful.slice(1);
    const exampleLines = tail.filter((line) => !looksLikeCjkText(line));
    const meaningLines = tail.filter((line) => looksLikeCjkText(line));
    const example = exampleLines.join("\n").trim();
    const meaning = meaningLines.join("\n").trim();
    items.push([phrase, meaning, example].join(" | "));
  });

  return items
    .map((item) => item.replace(/\s+\|\s+\|\s+$/g, " |  | "))
    .filter((item) => clean(item))
    .join("\n");
}

function isExampleMarker(line) {
  return /^exempel\b[:：]?$/i.test(clean(line)) || /^例句[:：]?$/i.test(clean(line));
}

function looksLikeCjkText(value) {
  return /[\u4e00-\u9fff]/.test(clean(value));
}

function parsePosField(value) {
  const text = clean(value).toLocaleLowerCase("sv-SE");
  const normalized = text.replace(/\s*\/\s*/g, " / ");
  const aliases = [
    ["verb", "verb"],
    ["substantiv", "noun"],
    ["noun", "noun"],
    ["名词", "noun"],
    ["adjektiv", "adjective"],
    ["adjective", "adjective"],
    ["形容词", "adjective"],
    ["adverb", "adverb"],
    ["副词", "adverb"],
    ["pronomen", "pronoun"],
    ["代词", "pronoun"],
    ["preposition", "preposition"],
    ["介词", "preposition"],
    ["konjunktion", "conjunction"],
    ["conjunction", "conjunction"],
    ["连词", "conjunction"],
    ["presens particip", "presens_particip"],
    ["现在分词", "presens_particip"],
    ["perfekt particip", "perfekt_particip"],
    ["完成分词", "perfekt_particip"],
    ["fras", "phrase"],
    ["phrase", "phrase"],
    ["短语", "phrase"],
    ["förkortning", "abbreviation"],
    ["abbreviation", "abbreviation"],
  ];
  const match = aliases.find(([label]) => normalized.includes(label));
  let detail = normalized;
  if (match) {
    detail = clean(normalized.replace(new RegExp(match[0], "i"), ""));
  }
  detail = detail.replace(/^[\s/|,;：:–—-]+|[\s/|,;：:–—-]+$/g, "").trim();
  return {
    pos: match?.[1] || (text ? "other" : ""),
    detail: detail || "",
  };
}

async function importEducationWords() {
  alert("Utbildningsorden läses nu från Supabase.");
}

async function importDocumentWords() {
  alert("Dokumentorden läses nu från Supabase.");
}

async function importWordPacks(packs, label) {
  const currentWords = await readWords();
  const existingKeys = new Set(
    currentWords.map((word) => wordKey(word)),
  );
  const wordsToImport = [];

  packs.forEach((pack) => {
    pack.words.forEach((entry) => {
      const word = normalizeForSave({
        ...entry,
        notebook: DEFAULT_NOTEBOOK,
        tags: entry.tags || entry.tag || pack.level,
      });
      const key = wordKey(word);
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        wordsToImport.push(word);
      }
    });
  });

  if (wordsToImport.length === 0) {
    alert(`${label} finns redan i dina ordböcker. Inga nya ord lades till.`);
    return;
  }

  await replaceWords([...wordsToImport, ...currentWords]);
  wordsToImport.forEach((word) => appendLocalHistory("created", word));

  state.selectedNotebook = "";
  state.filter = "all";
  state.query = "";
  els.searchInput.value = "";
  els.filterRow.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === "all");
  });
  await loadData();
  alert(`${wordsToImport.length} ord importerades till ${label}.`);
}

async function importWordsFrom4173() {
  if (!isLocalDevelopmentOrigin()) {
    alert("Flytt från lokal utvecklingsport är bara tillgänglig i lokal utveckling.");
    return;
  }
  if (location.port === "4173") {
    alert("Du kör redan källsidan. Öppna målappen i samma webbläsare och klicka där istället.");
    return;
  }

  const sourceOrigin = localOriginForPort("4173");
  const button = els.importFrom4173Btn;
  button.disabled = true;
  button.textContent = "Flyttar...";

  try {
    const payload = await requestWordsFromOrigin(sourceOrigin);
    const sourceWords = Array.isArray(payload.words) ? payload.words.map(normalizeWord) : [];
    const sourceHistory = Array.isArray(payload.history) ? payload.history : [];
    if (sourceWords.length === 0) {
      alert("Ingen ordlista hittades på 4173. Öppna http://localhost:4173/, gör en hård omladdning och försök igen.");
      return;
    }

    const currentWords = await readWords();
    const existingKeys = new Set(currentWords.map((word) => wordKey(word)));
    const mergedWords = [...currentWords];
    let added = 0;
    sourceWords.forEach((word) => {
      const key = wordKey(word);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      mergedWords.push(word);
      added += 1;
    });

    await replaceWords(mergedWords);
    const normalizedSourceHistory = sourceHistory.map(normalizeHistoryEntry).filter(Boolean);
    writeLocalHistory([...normalizedSourceHistory, ...readLocalHistory()]);
    normalizedSourceHistory.forEach((entry) => {
      if (!entry.word_id) return;
      void remoteDb.appendStudyHistory(entry.action, {
        id: entry.word_id,
        swedish: entry.swedish,
        chinese: entry.chinese,
        pos: entry.pos,
        pos_detail: entry.pos_detail,
        notebook: entry.notebook,
      }, {
        id: entry.id,
        created_at: entry.created_at,
      }).catch((error) => console.warn("[Min Ordbok] Remote transferred history sync failed.", error));
    });
    await loadData();
    alert(`Flytt från 4173 klar: ${added} nya ord. Totalt ${mergedWords.length} ord.`);
  } catch (error) {
    alert(`${error.message}\n\nKontrollera att http://localhost:4173/ körs och att båda sidorna har laddats om hårt.`);
  } finally {
    button.disabled = false;
    button.textContent = "";
  }
}

function requestWordsFromOrigin(sourceOrigin) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.hidden = true;
    iframe.src = `${sourceOrigin}/?transfer=${Date.now()}`;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Tidsgränsen nåddes innan 4173 skickade ordlistan."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      iframe.remove();
    }

    function onMessage(event) {
      if (event.origin !== sourceOrigin) return;
      if (event.data?.type !== "SWEDISH_VOCAB_EXPORT_RESPONSE") return;
      cleanup();
      resolve(event.data);
    }

    iframe.addEventListener("load", () => {
      iframe.contentWindow?.postMessage({ type: "SWEDISH_VOCAB_EXPORT_REQUEST" }, sourceOrigin);
    });
    iframe.addEventListener("error", () => {
      cleanup();
      reject(new Error("Kunde inte öppna sidan på 4173."));
    });
    window.addEventListener("message", onMessage);
    document.body.append(iframe);
  });
}

async function addDictionaryWordToLibrary(swedish) {
  const source = dictionaryWords.find((word) => clean(word.swedish).toLowerCase() === clean(swedish).toLowerCase());
  if (!source) return;
  const currentWords = await readWords();
  const exists = currentWords.some((word) => clean(word.swedish).toLowerCase() === clean(source.swedish).toLowerCase());
  if (exists) {
    alert("Ordet finns redan i din ordlista.");
    return;
  }
  const word = normalizeForSave({ ...source, notebook: state.selectedNotebook || source.notebook || DEFAULT_NOTEBOOK });
  await replaceWords([word, ...currentWords]);
  appendLocalHistory("created", word);
  await loadData();
  alert(`Tillagt i ordlistan: ${word.swedish}`);
}

// Shows the structured word_forms input group matching the given part of
// speech (index.html #wordFormsFields, groups tagged data-pos-group) and
// hides every other group, including the free-text fallback used by parts
// of speech with no structured forms (preposition/conjunction/phrase/
// abbreviation/other). See WORD_FORM_GROUPS_BY_POS and
// Reviews/Ordbok-词条字段规范（按词性）.md.
function showWordFormGroupForPos(pos) {
  if (!els.wordFormsFields) return;
  const targetGroup = WORD_FORM_GROUPS_BY_POS[pos] || "freetext";
  els.wordFormsFields.querySelectorAll(".word-forms-group").forEach((group) => {
    group.hidden = group.dataset.posGroup !== targetGroup;
  });
}

// Reads every [data-form-type] input inside the currently visible
// word-forms group and returns the non-empty ones as
// [{ form_type, form_value }, ...], ready to hand to remoteDb.saveWordForms.
function collectWordFormValues() {
  if (!els.wordFormsFields) return [];
  const visibleGroup = els.wordFormsFields.querySelector(".word-forms-group:not([hidden])");
  if (!visibleGroup) return [];
  return [...visibleGroup.querySelectorAll("[data-form-type]")]
    .map((input) => ({ form_type: input.dataset.formType, form_value: clean(input.value) }))
    .filter((entry) => entry.form_value);
}

// Fills the [data-form-type] inputs in the currently visible word-forms
// group from a [{ form_type, form_value }] list (as loaded from
// remoteDb.loadWordForms). Inputs for form types not present in `forms`
// are left blank.
function populateWordFormFields(forms = []) {
  if (!els.wordFormsFields) return;
  const visibleGroup = els.wordFormsFields.querySelector(".word-forms-group:not([hidden])");
  if (!visibleGroup) return;
  const valueByType = new Map(forms.map((entry) => [entry.form_type, entry.form_value]));
  visibleGroup.querySelectorAll("[data-form-type]").forEach((input) => {
    input.value = valueByType.get(input.dataset.formType) || "";
  });
}

// Builds the legacy flat "forms" summary text (the same "label: value" per
// line format the old free-text Böjning textarea used) from structured
// word-form values, so word.forms keeps working for every existing display
// path (e.g. the word detail view's Grammatik section) without those paths
// needing to know about word_forms yet.
function buildFormsSummaryText(forms = []) {
  const labelByType = WORD_FORM_TYPE_LABELS;
  return forms
    .filter((entry) => entry.form_value)
    .map((entry) => `${labelByType[entry.form_type] || entry.form_type}: ${entry.form_value}`)
    .join("\n");
}

const WORD_FORM_TYPE_LABELS = {
  genus: "Genus",
  declension_group: "Böjningsklass",
  singular_indefinite: "Obestämd singular",
  singular_definite: "Bestämd singular",
  plural_indefinite: "Obestämd plural",
  plural_definite: "Bestämd plural",
  infinitive: "Infinitiv",
  present: "Presens",
  preteritum: "Preteritum",
  supinum: "Supinum",
  imperative: "Imperativ",
  verb_group: "Verbgrupp",
  base_form: "Grundform",
  neuter_form: "Neutrum",
  plural_form: "Plural",
  definite_form: "Bestämd form",
  comparative: "Komparativ",
  superlative: "Superlativ",
  superlative_indefinite: "Superlativ (obestämd)",
  superlative_definite: "Superlativ (bestämd)",
  subject_form: "Subjektsform",
  object_form: "Objektsform",
  possessive_en: "Possessiv (en-ord)",
  possessive_ett: "Possessiv (ett-ord)",
  possessive_plural: "Possessiv (plural)",
  base_verb: "Grundverb",
  participle_form: "Particip-form",
  en_form: "En-form",
  ett_form: "Ett-form",
};

function openWordDialog(word) {
  state.wordDialogReturnView = word?.id ? "" : state.activeView || "homeView";
  state.wordDialogSourceDetailId =
    word?.id && els.detailDialog?.dataset.wordId === word.id
      ? word.id
      : "";
  renderNotebookOptions();
  els.form.reset();
  els.word_id.value = word?.id || "";
  els.dialogTitle.textContent = word?.id ? "Redigera ord" : "Lägg till ord";
  els.swedishInput.value = word?.swedish || "";
  els.posInput.value = word?.pos || "verb";
  els.pos_detailInput.value = word?.pos_detail || "";
  els.ipaInput.value = word?.ipa || "";
  els.cefrLevelInput.value = word?.cefr_level || "";
  els.chineseInput.value = word?.chinese || "";
  els.englishInput.value = word?.english || "";
  els.formsInput.value = word?.forms || "";
  els.exampleInput.value = word?.example || "";
  els.collocationsInput.value = word?.collocations || "";
  els.related_wordsInput.value = word?.related_words || "";
  els.noteInput.value = word?.note || "";
  els.pasteWordInfoInput.value = "";
  showWordFormGroupForPos(els.posInput.value);
  const editableNotebook = isLearnedNotebook(word?.notebook || state.selectedNotebook)
    ? DEFAULT_NOTEBOOK
    : word?.notebook || state.selectedNotebook || DEFAULT_NOTEBOOK;
  ensureNotebookOption(editableNotebook);
  els.notebookInput.value = editableNotebook;
  els.tagInput.value = tagsForInput(word?.tags || word?.tag || "");
  state.wordDialogSnapshot = getWordDialogSnapshot();
  setWordDialogOpen(true);
  els.dialog.showModal();
  autoResizeWordFormTextareas();
  els.swedishInput.focus();
  // Structured word forms live in a separate table (word_forms) and are
  // fetched per-word rather than bulk-loaded with the whole library (see
  // src/lib/db.js loadWordForms) — fetch them now, after the dialog is
  // already visible, so opening the dialog itself never waits on a network
  // round trip. Re-take the dirty-check snapshot once fields are filled so
  // simply opening a word with existing forms doesn't look "unsaved".
  if (word?.id) {
    remoteDb.loadWordForms(word.id).then((forms) => {
      if (els.word_id.value !== word.id) return;
      populateWordFormFields(forms);
      state.wordDialogSnapshot = getWordDialogSnapshot();
    }).catch((error) => {
      console.warn("[SpråkLab] Failed to load word_forms for", word.id, error);
    });
  }
}

function autoResizeWordTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 82)}px`;
}

function autoResizeWordFormTextareas() {
  [
    els.pasteWordInfoInput,
    els.chineseInput,
    els.englishInput,
    els.formsInput,
    els.exampleInput,
    els.collocationsInput,
    els.related_wordsInput,
    els.noteInput,
  ].forEach(autoResizeWordTextarea);
}

function getWordDialogSnapshot() {
  return JSON.stringify({
    swedish: els.swedishInput.value,
    pos: els.posInput.value,
    pos_detail: els.pos_detailInput.value,
    ipa: els.ipaInput.value,
    cefr_level: els.cefrLevelInput.value,
    chinese: els.chineseInput.value,
    english: els.englishInput.value,
    forms: els.formsInput.value,
    wordForms: collectWordFormValues(),
    example: els.exampleInput.value,
    collocations: els.collocationsInput.value,
    related_words: els.related_wordsInput.value,
    note: els.noteInput.value,
    notebook: els.notebookInput.value,
    tags: els.tagInput.value,
    paste: els.pasteWordInfoInput.value,
  });
}

function isWordDialogDirty() {
  return getWordDialogSnapshot() !== state.wordDialogSnapshot;
}

function closeWordDialogWithoutSaving() {
  if (els.discardWordDialog.open) els.discardWordDialog.close();
  if (els.dialog.open) els.dialog.close();
  setWordDialogOpen(false);
  state.wordDialogSnapshot = "";
  state.wordDialogReturnView = "";
  state.wordDialogSourceDetailId = "";
}

function requestCloseWordDialog() {
  if (!els.dialog.open) return;
  if (!isWordDialogDirty()) {
    closeWordDialogWithoutSaving();
    return;
  }
  if (!els.discardWordDialog.open) els.discardWordDialog.showModal();
}

function openWordDialogFromSearch() {
  const swedish = state.query.trim();
  if (!swedish) return;
  openWordDialog({
    swedish,
    pos: "verb",
    pos_detail: "",
    chinese: "",
    english: "",
    forms: "",
    example: "",
    collocations: "",
    related_words: "",
    notebook: state.selectedNotebook,
    tags: ["Eget ord"],
  });
}

function openGeneratedWordDialogFromSearch() {
  const swedish = state.query.trim();
  if (!swedish) return;
  openWordDialog(generateWordDraft(swedish));
}

async function showGeneratedWordFromSearch() {
  const swedish = state.query.trim();
  if (!swedish) {
    alert("Skriv först ett svenskt ord.");
    return;
  }
  setGenerateLoading(true);
  try {
    const entry = await fetchGeneratedWord(swedish);
    state.generatedWord = normalizeWord({
      ...entry,
      id: `generated-${Date.now()}`,
      notebook: state.selectedNotebook,
      tags: ["ChatGPT"],
    });
  } catch (error) {
    alert(`${error.message}\nOffline-utkast visas istället.`);
    state.generatedWord = normalizeWord({
      ...generateWordDraft(swedish),
      id: `generated-${Date.now()}`,
      notebook: state.selectedNotebook,
      tags: ["Offline-utkast"],
    });
  } finally {
    setGenerateLoading(false);
    renderDictionary();
    els.dictionaryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function fetchGeneratedWord(source) {
  if (!isLocalDevelopmentOrigin()) {
    throw new Error("AI-komplettering är inte aktiv i den statiska PWA-versionen.");
  }
  const word = typeof source === "string" ? source : source?.swedish;
  const token = await getAccessToken().catch(() => "");
  const response = await fetch("/api/generate-word", {
    method: "POST",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
    },
    body: JSON.stringify({ word, source: typeof source === "string" ? undefined : source }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Kunde inte kontakta ChatGPT-servern.");
  }
  if (!data.entry?.swedish) {
    throw new Error("ChatGPT-svaret saknade orddata.");
  }
  return data.entry;
}

function setGenerateLoading(isLoading) {
  els.generateWordBtn.disabled = isLoading;
  els.generateWordBtn.textContent = isLoading ? "Genererar..." : "AI-generera ordkort";
}

function setEnrichSearchLoading(isLoading, done = 0, total = 0) {
  els.enrichSearchBtn.disabled = isLoading || !state.query;
  els.enrichSearchBtn.textContent = isLoading ? `Kompletterar ${done}/${total}` : "Komplettera sökresultat";
}

async function saveGeneratedWordToLibrary() {
  if (!state.generatedWord) return;
  if (isWordInLibrary(state.generatedWord.swedish)) {
    alert("Ordet finns redan i din ordlista.");
    renderDictionary();
    return;
  }
  const word = normalizeForSave({
    ...state.generatedWord,
    id: undefined,
    tags: state.generatedWord.tags?.length ? state.generatedWord.tags : ["AI-genererad"],
    notebook: state.selectedNotebook || state.generatedWord.notebook || DEFAULT_NOTEBOOK,
  });
  await replaceWords([word, ...(await readWords())]);
  appendLocalHistory("created", word);
  state.generatedWord = null;
  await loadData();
  alert(`Sparat i ordlistan: ${word.swedish}`);
}

async function enrichWordCard(word, mode) {
  if (!word?.swedish) return;
  setCardActionLoading(word.swedish, true);
  try {
    const entry = await fetchGeneratedWord(word);
    const enriched = normalizeForSave({
      ...word,
      ...entry,
      id: word.id && !String(word.id).startsWith("generated-") ? word.id : undefined,
      notebook: mode === "dictionary" ? state.selectedNotebook || word.notebook : word.notebook,
      favorite: word.favorite,
      learned: word.learned,
      review_count: word.review_count,
      next_review_at: word.next_review_at,
      created_at: word.created_at,
      tags: word.tags?.length ? word.tags : entry.tags || entry.tag || ["AI-kompletterad"],
    });

    if (mode === "dictionary") {
      state.generatedWord = normalizeWord({
        ...enriched,
        id: `generated-${Date.now()}`,
        tags: enriched.tags?.length ? enriched.tags : ["AI-kompletterad"],
      });
      renderDictionary();
      return;
    }

    const currentWords = await readWords();
    const exists = currentWords.some((item) => item.id === enriched.id);
    if (exists) {
      await replaceWords(currentWords.map((item) => (item.id === enriched.id ? enriched : item)));
      appendLocalHistory("updated", enriched);
    } else {
      await replaceWords([enriched, ...currentWords]);
      appendLocalHistory("created", enriched);
    }
    await loadData();
  } catch (error) {
    alert(`${error.message}\n\nI den statiska PWA-versionen kan du lägga till eller redigera ord manuellt.`);
  } finally {
    setCardActionLoading(word.swedish, false);
  }
}

async function enrichCurrentSearchResults() {
  runSearch();
  const candidates = getVisibleWords().filter(needsEnrichment).slice(0, 10);
  if (!state.query) {
    alert("Sök efter ett ord först.");
    return;
  }
  if (candidates.length === 0) {
    alert("Sökresultatet har redan betydelse, exempel och fraser.");
    return;
  }

  const ok = confirm(`Komplettera ${candidates.length} ord i sökresultatet. Högst 10 ord behandlas åt gången. Fortsätta?`);
  if (!ok) return;

  setEnrichSearchLoading(true, 0, candidates.length);
  try {
    let currentWords = await readWords();
    for (let index = 0; index < candidates.length; index += 1) {
      const source = candidates[index];
      setEnrichSearchLoading(true, index + 1, candidates.length);
      const entry = await fetchGeneratedWord(source);
      const enriched = normalizeForSave({
        ...source,
        ...entry,
        id: source.id,
        notebook: source.notebook,
        favorite: source.favorite,
        learned: source.learned,
        review_count: source.review_count,
        wrong_count: source.wrong_count,
        last_reviewed: source.last_reviewed,
        next_review_at: source.next_review_at,
        created_at: source.created_at,
        tags: source.tags?.length ? source.tags : entry.tags || entry.tag || ["AI-kompletterad"],
      });
      currentWords = currentWords.map((item) => (item.id === enriched.id ? enriched : item));
      appendLocalHistory("updated", enriched);
    }
    await replaceWords(currentWords);
    await loadData();
    alert(`${candidates.length} ord har kompletterats.`);
  } catch (error) {
    alert(`${error.message}\n\nI den statiska PWA-versionen kan du lägga till eller redigera ord manuellt.`);
  } finally {
    setEnrichSearchLoading(false);
  }
}

function setBatchEnrichLoading(isLoading, done = 0, total = 0) {
  els.enrichNotebookBtn.disabled = isLoading;
  els.stopEnrichBtn.hidden = !isLoading;
  els.stopEnrichBtn.disabled = false;
  els.stopEnrichBtn.textContent = "Stoppa";
  els.enrichNotebookBtn.textContent = isLoading ? `Kompletterar ${done}/${total}` : "Komplettera saknade ord";
}

async function enrichSelectedNotebook({ skipConfirm = false } = {}) {
  const candidates = getNotebookWords().filter(needsEnrichment);
  if (candidates.length === 0) {
    alert("Den aktuella ordboken saknar inga betydelser, exempel eller fraser.");
    return;
  }
  if (!skipConfirm) {
    const ok = confirm(
      `Den aktuella ordboken har ${candidates.length} ord som behöver kompletteras.\n\nAI anropas ord för ord. Det kan ta tid och medföra API-kostnader. Färdiga ord sparas direkt och processen kan stoppas.\n\nFortsätta?`,
    );
    if (!ok) return;
  }

  state.stopBatchEnrich = false;
  setBatchEnrichLoading(true, 0, candidates.length);
  let completed = 0;
  try {
    let currentWords = await readWords();
    for (const source of candidates) {
      if (state.stopBatchEnrich) break;
      const entry = await fetchGeneratedWord(source);
      const enriched = normalizeForSave({
        ...source,
        ...entry,
        id: source.id,
        notebook: source.notebook,
        favorite: source.favorite,
        learned: source.learned,
        review_count: source.review_count,
        wrong_count: source.wrong_count,
        last_reviewed: source.last_reviewed,
        next_review_at: source.next_review_at,
        created_at: source.created_at,
        tags: source.tags?.length ? source.tags : entry.tags || entry.tag || ["AI-kompletterad"],
      });
      currentWords = currentWords.map((item) => (item.id === enriched.id ? enriched : item));
      await replaceWords(currentWords);
      appendLocalHistory("updated", enriched);
      completed += 1;
      setBatchEnrichLoading(true, completed, candidates.length);
    }
    await loadData();
    alert(state.stopBatchEnrich ? `Stoppat. ${completed} ord har kompletterats.` : `Klart. ${completed} ord har kompletterats.`);
  } catch (error) {
    await loadData();
    alert(`${error.message}\n\n${completed} lyckade ord har sparats. I den statiska PWA-versionen kan du lägga till eller redigera ord manuellt.`);
  } finally {
    state.stopBatchEnrich = false;
    setBatchEnrichLoading(false);
  }
}

function startAutoEnrichFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("autoEnrich") !== "1") return;
  params.delete("autoEnrich");
  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
  window.setTimeout(() => {
    enrichSelectedNotebook({ skipConfirm: true });
  }, 300);
}

async function deleteDuplicateWords() {
  const words = await readWords();
  const groups = new Map();
  words.forEach((word) => {
    const normalized = normalizeWord(word);
    const key = wordKey(normalized);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(normalized);
  });

  const duplicateGroups = [...groups.values()].filter((items) => items.length > 1);
  const duplicateCount = duplicateGroups.reduce((sum, items) => sum + items.length - 1, 0);
  if (duplicateCount === 0) {
    alert("Inga dubbletter hittades.");
    return;
  }

  const ok = confirm(`${duplicateGroups.length} grupper med dubbletter hittades. ${duplicateCount} dubblettposter kan tas bort.\n\nDen mest kompletta och senaste posten sparas. Fortsätta?`);
  if (!ok) return;

  const deduped = [];
  duplicateGroups.forEach((items) => {
    items.sort((a, b) => wordCompletenessScore(b) - wordCompletenessScore(a) || b.updated_at - a.updated_at);
    deduped.push(items[0]);
  });

  const duplicateKeys = new Set(duplicateGroups.map((items) => wordKey(items[0])));
  words.forEach((word) => {
    const normalized = normalizeWord(word);
    if (!duplicateKeys.has(wordKey(normalized))) deduped.push(normalized);
  });

  await replaceWords(deduped);
  await loadData();
  alert(`${duplicateCount} dubbletter har tagits bort. ${deduped.length} ord finns kvar.`);
}

function wordCompletenessScore(word) {
  let score = 0;
  if (word.chinese && word.chinese !== "待补中文释义。") score += 80 + Math.min(clean(word.chinese).length, 120);
  if (word.english) score += 30 + Math.min(clean(word.english).length, 80);
  if (word.forms) score += 25 + splitForms(word.forms).length * 4;
  if (word.example) score += 35 + splitMultilineItems(word.example).length * 8;
  if (word.collocations) score += 45 + splitCollocations(word.collocations).length * 12;
  if (word.related_words) score += 35 + splitRelatedWords(word.related_words).length * 10;
  if (word.favorite) score += 3;
  if (word.learned) score += 3;
  return score;
}

function setCardActionLoading(swedish, isLoading) {
  document.querySelectorAll(".word-card").forEach((card) => {
    if (clean(card.dataset.swedish).toLowerCase() !== clean(swedish).toLowerCase()) return;
    const button = card.querySelector('[data-action="enrich"]');
    if (!button) return;
    button.disabled = isLoading;
    button.textContent = isLoading ? "Kompletterar..." : "Komplettera";
  });
}

function generateWordDraft(swedish) {
  const exact = dictionaryWords.find((word) => clean(word.swedish).toLowerCase() === swedish.toLowerCase());
  if (exact) {
    return {
      ...exact,
      id: "",
      notebook: state.selectedNotebook,
      tags: ["AI-utkast"],
    };
  }

  const normalized = swedish.toLowerCase();
  const looksLikeVerb = normalized.endsWith("a");
  const articleMatch = normalized.match(/^(en|ett)\s+(.+)/);

  if (articleMatch) {
    const article = articleMatch[1];
    const noun = articleMatch[2];
    return {
      swedish,
      pos: "noun",
      pos_detail: article,
      chinese: `${swedish}：一个瑞典语名词，表示具体或抽象的人、事物、地点或概念。`,
      english: `${swedish}: ett svenskt substantiv som kan syfta på en person, sak, plats eller abstrakt idé.`,
      forms: guessNounForms(article, noun),
      example: `Jag använder ordet "${noun}" i en mening.`,
      collocations: `${noun} i vardagen | 日常生活中的 ${noun} | Jag hör ofta ordet "${noun}" i vardagen.`,
      related_words: "",
      notebook: state.selectedNotebook,
      tags: ["AI-utkast"],
    };
  }

  if (looksLikeVerb) {
    const stem = normalized.slice(0, -1);
    return {
      swedish,
      pos: "verb",
      pos_detail: "vt/vi",
      chinese: `${swedish}：一个瑞典语动词，表示动作、行为或状态。`,
      english: `${swedish}: ett svenskt verb som beskriver en handling, aktivitet eller ett tillstånd.`,
      forms: [
        `imperativ: ${stem}`,
        `infinitiv: ${normalized}`,
        `presens: ${stem}ar`,
        `preteritum: ${stem}ade`,
        `supinum: ${stem}at`,
      ].join("\n"),
      example: `Jag försöker ${normalized} varje dag.`,
      collocations: `${normalized} med någon | 和某人一起${normalized} | Jag brukar ${normalized} med en vän.`,
      related_words: "",
      notebook: state.selectedNotebook,
      tags: ["AI-utkast"],
    };
  }

  return {
    swedish,
    pos: "other",
    pos_detail: "kontrollera",
    chinese: `${swedish}：瑞典语词条，可作为待学习词保存并继续补充语义。`,
    english: `${swedish}: ett svenskt ord som kan sparas och kompletteras med mer information senare.`,
    forms: `${swedish}`,
    example: `Jag såg ordet "${swedish}" i en svensk text.`,
    collocations: `${swedish} i en text | 文本中的 ${swedish} | Jag såg "${swedish}" i en text.`,
    related_words: "",
    notebook: state.selectedNotebook,
    tags: ["AI-utkast"],
  };
}

function guessNounForms(article, noun) {
  if (article === "ett") {
    return [`ett ${noun}`, `${noun}et`, `${noun}`, `${noun}en`].join("\n");
  }
  return [`en ${noun}`, `${noun}en`, `${noun}er`, `${noun}erna`].join("\n");
}

async function updateWord(id, patch, action = "updated") {
  const word = state.words.find((item) => item.id === id);
  if (!word) return;
  const updated = normalizeForSave({ ...word, ...patch });
  writeLocalWordProgress(updated);
  await replaceWords((await readWords()).map((item) => (item.id === id ? updated : item)));
  await remoteDb.upsertUserWordProgress(updated);
  appendLocalHistory(action, updated);
  await loadData();
  if (action === "learned") updateStudyStatsForToday();
}

function updateWordInMemory(id, patch, action = "updated") {
  const word = state.words.find((item) => item.id === id);
  if (!word) return null;
  const updated = normalizeForSave({ ...word, ...patch });
  writeLocalWordProgress(updated);
  state.words = state.words.map((item) => (item.id === id ? updated : item));
  if (remoteLibrarySnapshot?.words) {
    remoteLibrarySnapshot = {
      ...remoteLibrarySnapshot,
      words: remoteLibrarySnapshot.words.map((item) => (item.id === id ? updated : item)),
    };
  }
  appendLocalHistory(action, updated);
  return updated;
}

function saveStudyWordProgressInBackground(word, action = "updated") {
  if (!word?.id) return;
  writeLocalWordProgress(word);
  void remoteDb.upsertUserWordProgress(word).catch((error) => {
    console.warn("[Min Ordbok] Background study progress sync failed.", error);
  });
  if (action === "learned") updateStudyStatsForToday();
}

async function setWordFavorite(word, favorite, category = getFavoriteCategory(word)) {
  saveFavoriteState(word, favorite, category);
  await updateWord(word.id, { favorite }, "favorite");
  refreshOpenDetail(word.id);
  const updated = state.words.find((item) => item.id === word.id);
  if (updated && state.saveSheetWordId === word.id) renderSaveSheet(updated);
}

async function setWordFavoriteCategory(word, category) {
  const normalizedCategory = normalizeFavoriteCategory(category);
  saveFavoriteState(word, true, normalizedCategory);
  if (word.favorite) {
    renderAll();
  } else {
    await updateWord(word.id, { favorite: true }, "favorite");
  }
  refreshOpenDetail(word.id);
  const updated = state.words.find((item) => item.id === word.id);
  if (updated && state.saveSheetWordId === word.id) renderSaveSheet(updated);
}

async function markWordLearned(word) {
  if (!word?.id) return;
  const now = Date.now();
  await updateWord(
    word.id,
    {
      status: "mastered",
      learned: true,
      mastered_at: word.mastered_at || now,
      first_studied_at: word.first_studied_at || now,
      last_studied_at: now,
      last_study_date: todayKey(),
      next_review_at: Number.MAX_SAFE_INTEGER,
    },
    "learned",
  );
  refreshOpenDetail(word.id);
  const updated = state.words.find((item) => item.id === word.id);
  if (updated && state.saveSheetWordId === word.id) renderSaveSheet(updated);
}

async function saveWordToNotebook(word, notebookName) {
  const notebook = normalizeNotebookName(notebookName);
  if (!word?.id || !notebook) return;
  if (isLearnedNotebook(notebook)) {
    await markWordLearned(word);
    return;
  }
  rememberNotebookName(notebook);
  const books = new Set(wordBookNames(word));
  books.add(notebook);
  await updateWord(
    word.id,
    {
      notebook,
      book_names: [...books],
    },
    "updated",
  );
  refreshOpenDetail(word.id);
  const updated = state.words.find((item) => item.id === word.id);
  if (updated && state.saveSheetWordId === word.id) renderSaveSheet(updated);
}

function refreshOpenDetail(wordId) {
  if (!els.detailDialog.open || !wordId || els.detailDialog.dataset.wordId !== wordId) return;
  const updated = state.words.find((item) => item.id === wordId);
  if (updated) renderWordDetail(updated, els.detailDialog.dataset.sourceMode || "library");
}

async function deleteWord(id) {
  const word = state.words.find((item) => item.id === id);
  if (!word) return;
  await replaceWords((await readWords()).filter((item) => item.id !== id));
  appendLocalHistory("deleted", word);
  await remoteDb.deleteRemoteWord(id);
  await loadData();
  if (els.detailDialog.open && els.detailDialog.dataset.wordId === id) {
    closeDetailMoreMenu();
    els.detailDialog.close();
  }
}

function speakWithBrowserVoice(text) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "sv-SE";
  utterance.rate = 0.88;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

async function speakSwedish(text) {
  const swedishText = clean(text);
  if (!swedishText) return;
  try {
    const cacheKey = swedishText.toLocaleLowerCase("sv-SE");
    let audioUrl = wordSpeechUrlCache.get(cacheKey);
    if (!audioUrl) {
      const response = await fetch("/api/shadowing/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: swedishText,
          voiceId: DEFAULT_ELEVENLABS_VOICE_ID,
          itemId: `word-${Date.now().toString(36)}`,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.dataUrl) throw new Error(payload.error || "Kunde inte generera ljud.");
      audioUrl = payload.dataUrl;
      wordSpeechUrlCache.set(cacheKey, audioUrl);
    }
    speechSynthesis?.cancel?.();
    wordSpeechAudio.pause();
    wordSpeechAudio.src = audioUrl;
    await wordSpeechAudio.play();
  } catch (error) {
    console.warn("[Min Ordbok] ElevenLabs word speech failed. Falling back to browser voice.", error);
    speakWithBrowserVoice(swedishText);
  }
}

function todayKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDayTimestamp(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Stage-based spaced repetition per SPK-LRN-001 §7/§8. Rating is derived
// from the spelling test outcome (see deriveStudyRating) rather than an
// explicit again/hard/good UI, per Rachel's 2026-07-25 decision to keep
// the existing "write the word" practice mechanic unchanged and layer the
// smarter interval math underneath it.
const STAGE_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60, 90];
const MAX_REVIEW_STAGE = STAGE_INTERVAL_DAYS.length - 1;

function deriveStudyRating(attempts, isCorrect) {
  if (!isCorrect) return "again";
  return attempts > 1 ? "hard" : "good";
}

// Returns { stage, intervalDays, nextReviewAt } for the word's *next*
// review, given its current stage and this session's rating.
function computeNextReview(currentStage, rating) {
  const stage = Math.max(0, Math.min(Number(currentStage || 0) || 0, MAX_REVIEW_STAGE));
  if (rating === "again") {
    return { stage: 0, intervalDays: 1, nextReviewAt: startOfDayTimestamp(1) };
  }
  if (rating === "hard") {
    const intervalDays = Math.max(1, Math.round(STAGE_INTERVAL_DAYS[stage] * 0.5));
    return { stage, intervalDays, nextReviewAt: startOfDayTimestamp(intervalDays) };
  }
  const nextStage = Math.min(stage + 1, MAX_REVIEW_STAGE);
  const intervalDays = STAGE_INTERVAL_DAYS[nextStage];
  return { stage: nextStage, intervalDays, nextReviewAt: startOfDayTimestamp(intervalDays) };
}

// Review-load-based new-word throttling, SPK-LRN-001 §10. Only the
// Normal/Moderate/Heavy/Backlog classification and its effect on new-word
// count is implemented — the spec's separate adaptive/manual workload
// mode toggle is intentionally out of scope for this pass (2026-07-25
// decision), so there is exactly one behavior, not a user setting.
function getWorkloadState(dueOverdueTotal, target) {
  const total = Number(dueOverdueTotal || 0) || 0;
  const dailyTarget = Number(target || 10) || 10;
  if (total <= 20) return { state: "normal", allowedNewWords: dailyTarget, reason: "" };
  if (total <= 30) {
    const allowed = Math.ceil(dailyTarget * 0.5);
    return { state: "moderate", allowedNewWords: allowed, reason: `Idag är repetitionerna fler än vanligt, nya ord minskade till ${allowed}.` };
  }
  return { state: total <= 50 ? "heavy" : "backlog", allowedNewWords: 0, reason: "Många repetitioner väntar — fokusera på dem innan nya ord." };
}

function sameCategory(a, b) {
  return normalizeNotebookName(a).toLocaleLowerCase("sv-SE") === normalizeNotebookName(b).toLocaleLowerCase("sv-SE");
}

function isLearnedNotebook(name) {
  return sameCategory(name, LEARNED_NOTEBOOK);
}

function isFixedNotebook(name) {
  return isLearnedNotebook(name) || FIXED_NOTEBOOKS.some((notebook) => sameCategory(name, notebook));
}

function isWordInLearnedNotebook(word) {
  return Boolean(word?.learned) || isLearnedNotebook(word?.notebook);
}

function wordBookNames(word) {
  const books = normalizeBookNames(firstDefined(word?.book_names, word?.bookNames, word?.books, []));
  const notebook = normalizeNotebookName(word?.notebook);
  if (notebook && notebook !== DEFAULT_NOTEBOOK && !isLearnedNotebook(notebook)) {
    books.push(notebook);
  }
  return [...new Set(books)].filter(Boolean);
}

function studyScopeMatches(word, scope = state.studyScope) {
  if (scope === STUDY_SCOPE_ALL) return true;
  if (scope === STUDY_SCOPE_FAVORITES) return word.favorite;
  if (scope === STUDY_SCOPE_LEARNED) return word.learned;
  if (scope.startsWith("notebook:")) {
    const category = scope.slice("notebook:".length);
    if (isLearnedNotebook(category)) return isWordInLearnedNotebook(word);
    if (sameCategory(category, "viktiga verb") && word.pos === "verb") return true;
    return (
      sameCategory(word.notebook, category) ||
      word.tags.some((tag) => sameCategory(tag, category))
    );
  }
  return true;
}

function eligibleStudyWords(scope = state.studyScope) {
  return getLibraryWordsForDisplay().filter(
    (word) => isStudyReadyWord(word) && !isWordInLearnedNotebook(word) && studyScopeMatches(word, scope),
  );
}

function isStudyReadyWord(word) {
  return Boolean(word?.id && clean(word.swedish) && clean(word.chinese));
}

function hasWordStudyHistory(word) {
  return Boolean(
    word.first_studied_at ||
      word.last_study_date ||
      word.last_reviewed ||
      Number(word.review_count || 0) > 0 ||
      Number(word.spelling_correct_count || 0) > 0,
  );
}

function eligibleReviewWords(scope = state.studyScope) {
  const today = todayKey();
  const dueIds = new Set(state.dailyProgress?.dueReviewWordIds || []);
  return getLibraryWordsForDisplay().filter((word) => {
    if (!isStudyReadyWord(word)) return false;
    if (!studyScopeMatches(word, scope)) return false;
    if (isWordInLearnedNotebook(word)) return false;
    if (word.last_review_date === today) return false;
    return dueIds.has(word.id);
  });
}

function uniqueIds(ids = []) {
  return [...new Set(ids.filter(Boolean))];
}

function studyDateValue(word) {
  return clean(word.last_study_date) || (word.first_studied_at ? new Date(word.first_studied_at).toISOString().slice(0, 10) : "");
}

function pickDailyNewWordIds(candidates, blockedIds, existingIds = []) {
  const existing = new Set(uniqueIds(existingIds));
  const validIds = new Set(candidates.map((word) => word.id));
  const ids = [...existing].filter((id) => validIds.has(id));
  const selected = new Set(ids);
  const groups = [
    ...primaryPos.map((pos) => candidates.filter((word) => word.pos === pos)),
    candidates.filter((word) => !primaryPos.includes(word.pos)),
  ].filter((group) => group.length > 0);

  let cursor = 0;
  while (ids.length < DAILY_NEW_WORD_LIMIT && groups.length > 0) {
    const group = groups[cursor % groups.length];
    const word = group.find((item) => !selected.has(item.id) && !blockedIds.has(item.id));
    if (word) {
      ids.push(word.id);
      selected.add(word.id);
    }
    if (groups.every((groupItems) => groupItems.every((item) => selected.has(item.id) || blockedIds.has(item.id)))) break;
    cursor += 1;
  }
  return ids.slice(0, DAILY_NEW_WORD_LIMIT);
}

function pickDailyReviewWordIds(candidates, blockedIds, existingIds = []) {
  const today = todayKey();
  const yesterday = todayKey(-1);
  const validIds = new Set(candidates.map((word) => word.id));
  const ids = uniqueIds(existingIds).filter((id) => validIds.has(id));
  const selected = new Set(ids);
  const studyDates = candidates
    .map(studyDateValue)
    .filter((date) => date && date < today)
    .sort((a, b) => b.localeCompare(a));
  const fallbackDate = studyDates.find((date) => date !== yesterday) || studyDates[0] || "";
  const ordered = [
    ...candidates.filter((word) => studyDateValue(word) === yesterday),
    ...candidates.filter((word) => fallbackDate && studyDateValue(word) === fallbackDate),
    ...candidates.filter((word) => studyDateValue(word) && studyDateValue(word) < today),
  ];
  ordered.forEach((word) => {
    if (ids.length >= DAILY_NEW_WORD_LIMIT) return;
    if (selected.has(word.id) || blockedIds.has(word.id)) return;
    ids.push(word.id);
    selected.add(word.id);
  });
  return ids.slice(0, DAILY_NEW_WORD_LIMIT);
}

function ensureDailyStudyPlan(scope = state.studyScope) {
  const date = todayKey();
  const existing = readDailyStudy();
  const storedLearnSession = readLearnDailySession(date);
  const candidates = eligibleStudyWords(scope);
  const scheduledReviewCandidates = eligibleReviewWords(scope);
  const studiedReviewCandidates = getLibraryWordsForDisplay().filter(
        (word) => studyScopeMatches(word, scope) && !isWordInLearnedNotebook(word) && hasWordStudyHistory(word) && studyDateValue(word) < date,
      );
  const reviewCandidatesAll = scheduledReviewCandidates.length > 0
    ? scheduledReviewCandidates
    : studiedReviewCandidates.length > 0
      ? studiedReviewCandidates
      : [];
  const todayNewWordIds = uniqueIds(state.dailyProgress?.todayNewWordIds || []);
  const todayNewCount = Number(state.dailyProgress?.todayNewCount || todayNewWordIds.length || 0) || 0;
  const dueOverdueTotal =
    (Number(state.dailyProgress?.overdueCount || 0) || 0) + (Number(state.dailyProgress?.dueTodayCount || 0) || 0);
  const workload = getWorkloadState(dueOverdueTotal, state.dailyNewWordTarget);
  const remainingNewLimit = Math.max(workload.allowedNewWords - todayNewCount, 0);
  const newCandidates = remainingNewLimit > 0
    ? candidates.filter((word) => !hasWordStudyHistory(word) && !todayNewWordIds.includes(word.id))
    : [];
  const availableWordIds = new Set(candidates.map((word) => word.id));
  const samePlan = existing.date === date && existing.scope === scope;
  const preservedCompletedReviewWordIds = samePlan
    ? uniqueIds(existing.completedReviewWordIds).filter((id) => availableWordIds.has(id))
    : [];
  const existingNewWordIds = samePlan
    ? uniqueIds(existing.newWordIds).filter((id) => availableWordIds.has(id))
    : [];
  const activeLearnWordIds = storedLearnSession
    ? storedLearnSession.wordIds.filter((id) => availableWordIds.has(id))
    : existingNewWordIds;
  const scheduledReviewWordIds = uniqueIds(state.dailyProgress?.dueReviewWordIds || [])
    .filter((id) => reviewCandidatesAll.some((word) => word.id === id))
    .slice(0, DAILY_NEW_WORD_LIMIT);
  const pickedReviewWordIds = pickDailyReviewWordIds(reviewCandidatesAll, new Set(), samePlan ? existing.reviewWordIds : []);
  const selectedReviewWordIds = scheduledReviewWordIds.length > 0
    ? scheduledReviewWordIds
    : pickedReviewWordIds.length > 0
      ? pickedReviewWordIds
      : reviewCandidatesAll.slice(0, DAILY_NEW_WORD_LIMIT).map((word) => word.id);
  const reviewWordIds = uniqueIds([
    ...preservedCompletedReviewWordIds,
    ...selectedReviewWordIds,
  ]).slice(0, DAILY_NEW_WORD_LIMIT);
  const newWordIds = activeLearnWordIds.length > 0
    ? activeLearnWordIds
    : pickDailyNewWordIds(
        newCandidates,
        new Set(reviewWordIds),
        [],
      ).slice(0, remainingNewLimit);
  const completedNewWordIds = uniqueIds([
    ...(storedLearnSession?.completedWordIds || []),
    ...todayNewWordIds,
    ...(samePlan ? uniqueIds(existing.completedNewWordIds) : []),
  ]).filter((id) => newWordIds.includes(id));
  const completedReviewWordIds = samePlan ? uniqueIds(existing.completedReviewWordIds).filter((id) => reviewWordIds.includes(id)) : [];
  const newSessionCompleted =
    newWordIds.length > 0 &&
    (Boolean(storedLearnSession?.completed) || completedNewWordIds.length >= newWordIds.length);

  const plan = {
    date,
    scope: storedLearnSession?.scope || scope,
    newWordIds,
    reviewWordIds,
    completedNewWordIds,
    completedReviewWordIds,
    spellingPassedWordIds: uniqueIds([
      ...(storedLearnSession?.spellingPassedWordIds || []),
      ...(samePlan ? uniqueIds(existing.spellingPassedWordIds) : []),
    ]).filter((id) => newWordIds.includes(id)),
    newSessionCompleted,
    reviewSessionCompleted: reviewWordIds.length > 0 && completedReviewWordIds.length >= reviewWordIds.length,
    completedAt: newSessionCompleted
      ? storedLearnSession?.completedAt || existing.completedAt || Date.now()
      : samePlan ? existing.completedAt || null : null,
  };
  writeDailyStudy(plan);
  const normalizedPlan = readDailyStudy();
  return normalizedPlan;
}

function getDailyQueue() {
  const plan = state.dailyStudy || ensureDailyStudyPlan();
  const newSession = readDailySession("new", plan);
  const reviewSession = readDailySession("review", plan);
  const ids = [
    ...(reviewSession.completed ? [] : plan.reviewWordIds || []),
    ...(newSession.completed ? [] : plan.newWordIds || []),
  ];
  const completed = new Set([...newSession.completedWordIds, ...reviewSession.completedWordIds]);
  return ids
    .map((id) => state.words.find((word) => word.id === id))
    .filter((word) => word && !isWordInLearnedNotebook(word) && !completed.has(word.id));
}

function pickQuizWord() {
  const queue = getDailyQueue();
  return queue[0] || null;
}

function getSessionIds(mode) {
  const plan = state.dailyStudy || ensureDailyStudyPlan();
  return mode === "review" ? plan.reviewWordIds || [] : plan.newWordIds || [];
}

function isDailySessionCompleted(mode, plan = state.dailyStudy || ensureDailyStudyPlan()) {
  return readDailySession(mode, plan).completed;
}

function setDailySessionCompleted(mode) {
  const plan = state.dailyStudy || ensureDailyStudyPlan();
  writeDailySession(mode, {
    ...readDailySession(mode, plan),
    completed: true,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

function getCompletedSessionIds(mode) {
  const plan = state.dailyStudy || ensureDailyStudyPlan();
  return readDailySession(mode, plan).completedWordIds;
}

function getSessionQueue(mode) {
  if (isDailySessionCompleted(mode)) return [];
  const completed = new Set(getCompletedSessionIds(mode));
  return getSessionIds(mode)
    .map((id) => getLibraryWordsForDisplay().find((word) => word.id === id))
    .filter((word) => word && isStudyReadyWord(word) && (mode === "review" || !isWordInLearnedNotebook(word)) && !completed.has(word.id));
}

function repairSessionPlanIfNeeded(mode) {
  const plan = state.dailyStudy || ensureDailyStudyPlan();
  if (isDailySessionCompleted(mode, plan)) return plan;
  const completed = new Set(getCompletedSessionIds(mode));
  const currentQueue = getSessionQueue(mode);
  const plannedRemaining = getSessionIds(mode).filter((id) => !completed.has(id));
  if (currentQueue.length > 0) return plan;
  if (plannedRemaining.length === 0 && mode === "review") return plan;

  if (mode === "review") {
    const reviewWordIds = pickDailyReviewWordIds(eligibleReviewWords(state.studyScope), completed, []);
    state.dailyStudy = {
      ...plan,
      reviewWordIds,
    };
  } else {
    const blockedIds = new Set([...(plan.reviewWordIds || []), ...completed]);
    const newCandidates = eligibleStudyWords(state.studyScope).filter((word) => !hasWordStudyHistory(word));
    const newWordIds = pickDailyNewWordIds(newCandidates, blockedIds, []);
    state.dailyStudy = {
      ...plan,
      newWordIds,
    };
  }
  writeDailyStudy(state.dailyStudy);
  state.dailyStudy = readDailyStudy();
  writeDailySession(mode, {
    mode,
    completedWordIds: [],
    spellingPassedWordIds: [],
    completed: false,
    updatedAt: Date.now(),
  }, state.dailyStudy);
  return state.dailyStudy;
}

function getPrimaryCollocation(word) {
  return splitCollocations(word.collocations, "").find((item) => clean(item.phrase) && clean(item.meaning)) || null;
}

async function startStudySession(mode) {
  if (!state.words.length) {
    alert("Ordlistan laddas fortfarande. Försök igen om en stund.");
    forceHomeView({ resetScroll: true });
    return;
  }
  state.dailyStudy = ensureDailyStudyPlan();
  if (mode === "new" && isDailySessionCompleted("new")) {
    showStudySessionComplete("new");
    return;
  }
  if (mode === "review" && getSessionIds("review").length === 0) {
    forceHomeView({ resetScroll: true });
    return;
  }
  repairSessionPlanIfNeeded(mode);
  const queue = getSessionQueue(mode);
  const total = getSessionIds(mode).length;
  if (total === 0) {
    forceHomeView({ resetScroll: true });
    return;
  }
  state.learningMode = mode;
  state.activeLearning = mode;
  state.isLearningOpen = true;
  state.spellingPassed = false;
  if (mode === "review" && isDailySessionCompleted(mode)) {
    state.studySession = {
      mode,
      stage: "complete",
      total,
      completedAtStart: getCompletedSessionIds(mode).length,
      wordId: null,
      result: null,
      spelling: createStudySpellingState(),
      sessionCompleted: true,
      remoteSessionId: state.dailyStudy?.remoteSessionIds?.[mode] || null,
    };
    els.studySessionDialog.hidden = false;
    if (!els.studySessionDialog.open) els.studySessionDialog.showModal();
    renderStudySession();
    void ensureRemoteStudySession(mode).then((remoteSession) => {
      if (state.studySession?.mode === mode && remoteSession?.id) {
        state.studySession.remoteSessionId = remoteSession.id;
      }
    });
    return;
  }
  const remoteSession = await ensureRemoteStudySession(mode);
  state.studySession = {
    mode,
    stage: isDailySessionCompleted(mode) ? "complete" : mode === "review" ? "spell" : "view",
    total,
    completedAtStart: getCompletedSessionIds(mode).length,
    wordId: queue[0]?.id || null,
    result: null,
    spelling: createStudySpellingState(),
    sessionCompleted: isDailySessionCompleted(mode),
    remoteSessionId: remoteSession?.id || state.dailyStudy?.remoteSessionIds?.[mode] || null,
  };
  els.studySessionDialog.hidden = false;
  if (!els.studySessionDialog.open) els.studySessionDialog.showModal();
  renderStudySession();
}

function currentStudySessionWord() {
  return getLibraryWordsForDisplay().find((word) => word.id === state.studySession?.wordId) || null;
}

function createStudySpellingState(overrides = {}) {
  return {
    attempts: 0,
    checked: false,
    correct: false,
    locked: false,
    feedback: "",
    showAnswer: false,
    ...overrides,
  };
}

function resetStudySessionSpelling(session = state.studySession) {
  if (!session) return;
  session.spelling = createStudySpellingState();
  state.spellingPassed = false;
  els.sessionWordInput.value = "";
  els.sessionCollocationInput.value = "";
}

function studySessionCanAdvance(session = state.studySession) {
  return Boolean(session?.spelling?.correct || session?.spelling?.locked);
}

function renderStudySession() {
  const session = state.studySession;
  if (!session) return;
  const queue = getSessionQueue(session.mode);
  const completed = getCompletedSessionIds(session.mode).length;
  const total = getSessionIds(session.mode).length;
  const word = currentStudySessionWord();
  els.studySessionTitle.textContent = session.mode === "review" ? "Repetera ord" : "Lär dig nya ord";
  els.studySessionProgress.textContent = queue.length === 0 ? `${completed}/${total || 0}` : `${Math.min(completed + 1, total || 1)} / ${total || 0}`;
  els.studySessionDialog.dataset.mode = session.mode;
  els.studySessionDialog.dataset.phase = session.sessionCompleted ? "complete" : session.stage;
  els.sessionCompletePanel.hidden = true;
  els.studySessionCard.hidden = false;
  els.studySessionCard.classList.toggle("session-card-host", session.stage === "view");
  els.sessionWordInputWrap.hidden = true;
  els.sessionCollocationInputWrap.hidden = true;
  els.studySessionFeedback.textContent = "";
  if (session.stage !== "spell") {
    els.sessionWordInput.value = "";
    els.sessionCollocationInput.value = "";
  }

  if (session.sessionCompleted || session.stage === "complete") {
    showStudySessionComplete(session.mode);
    return;
  }

  if (!state.words.length || total === 0) {
    closeStudySession();
    queueMicrotask(() => forceHomeView({ resetScroll: true }));
    return;
  }

  if (!word && queue.length > 0) {
    closeStudySession();
    queueMicrotask(() => forceHomeView({ resetScroll: true }));
    return;
  }

  if (!word || queue.length === 0) {
    showStudySessionComplete(session.mode);
    return;
  }

  renderStudySessionMoreMenu(word);

  if (session.stage === "view") {
    renderStudySessionFullWordCard(word);
    renderStudySessionActions([
      { label: "Lyssna", action: "listen", kind: "secondary" },
      { label: "Skriv ordet", action: "spell", kind: "primary" },
    ]);
    return;
  }

  if (session.stage === "spell") {
    renderStudySessionSpelling(word);
    const actions = session.mode === "review"
      ? [
          { label: "Lyssna", action: "listen", kind: "secondary" },
          { label: "Check", action: "check", kind: "secondary", disabled: Boolean(session.spelling?.locked || session.spelling?.correct) },
          { label: "Next", action: "next", kind: "primary", disabled: !studySessionCanAdvance(session) },
        ]
      : [
          { label: "Next", action: "next", kind: "primary" },
        ];
    renderStudySessionActions(actions);
    window.setTimeout(() => els.sessionWordInput.focus(), 0);
    return;
  }

  if (session.stage === "result-correct") {
    renderStudySessionResult(word, true);
    renderStudySessionActions([
      { label: "Lärt mig", action: "learned", kind: "secondary" },
      { label: "Nästa ord", action: "next", kind: "primary" },
    ]);
    return;
  }

  if (session.stage === "result-wrong") {
    renderStudySessionResult(word, false);
    renderStudySessionActions([
      { label: "Försök igen", action: "retry", kind: "secondary" },
      { label: "Visa ordet", action: "reveal", kind: "primary" },
    ]);
    return;
  }

  renderStudySessionFullWordCard(word);
  renderStudySessionActions([
    { label: "Lyssna", action: "listen", kind: "secondary" },
    { label: "Skriv ordet", action: "spell", kind: "primary" },
  ]);
}

function renderStudySessionFullWordCard(word) {
  const card = createWordCard(word, "detail");
  card.classList.remove("study-word-card");
  card.classList.add("session-full-word-card", "study-session-detail-card");
  card.querySelector(".meaning")?.setAttribute("hidden", "true");
  card.querySelector(".card-actions")?.remove();
  addStudyDetail(card.querySelector(".detail-list"), "Kategori", normalizeNotebookName(word.notebook) || DEFAULT_NOTEBOOK);
  els.studySessionCard.replaceChildren(card);
}

function renderStudySessionSpelling(word) {
  const session = state.studySession;
  const spelling = session?.spelling || createStudySpellingState();
  const panel = document.createElement("section");
  panel.className = "session-spell-panel";
  if (session?.mode === "review") {
    panel.innerHTML = `
      <p class="section-kicker">${escapeHtml(formatPosForStudy(word) || "Ordklass saknas.")}</p>
      <strong>${escapeHtml(word.chinese || "Kinesisk betydelse saknas.")}</strong>
      <span>${escapeHtml(word.english || "Svensk förklaring saknas.")}</span>
    `;
  } else {
    panel.innerHTML = `
      <p class="section-kicker">Skriv ordet</p>
      <strong>${escapeHtml(word.chinese || "Kinesisk betydelse saknas.")}</strong>
      <span>${escapeHtml(word.english || "Svensk förklaring saknas.")}</span>
    `;
  }
  els.sessionWordInputWrap.hidden = false;
  els.sessionWordInputWrap.classList.add("session-word-input");
  panel.append(els.sessionWordInputWrap);
  const feedback = document.createElement("p");
  feedback.className = "session-spell-feedback";
  feedback.textContent = spelling.feedback || `Attempts ${spelling.attempts}/${MAX_SPELLING_ATTEMPTS}`;
  panel.append(feedback);
  if (spelling.showAnswer) {
    const answer = document.createElement("p");
    answer.className = "session-spell-answer";
    answer.textContent = `Correct answer: ${word.swedish}`;
    panel.append(answer);
  }
  els.studySessionCard.replaceChildren(panel);
}

function renderStudySessionResult(word, correct) {
  const primaryCollocation = getPrimaryCollocation(word);
  const collocationAnswer = primaryCollocation ? `<small>${escapeHtml(primaryCollocation.phrase)}</small>` : "";
  const panel = document.createElement("section");
  panel.className = correct ? "session-result-panel session-result-correct" : "session-result-panel session-result-wrong";
  if (correct) {
    panel.innerHTML = `
      <p class="section-kicker">Rätt</p>
      <strong>${escapeHtml(word.swedish)}</strong>
      <span>${escapeHtml(word.chinese)}</span>
      ${collocationAnswer}
    `;
  } else {
    panel.innerHTML = `
      <p class="section-kicker">Rätt svar</p>
      <strong>${escapeHtml(word.swedish)}</strong>
      <span>${escapeHtml(word.chinese)}</span>
      ${collocationAnswer}
    `;
  }
  els.studySessionCard.replaceChildren(panel);
  els.studySessionFeedback.textContent = correct ? "Bra jobbat!" : `Rätt svar: ${word.swedish}`;
}

function renderStudySessionActions(actions = []) {
  const busy = Boolean(state.studySession?.busy);
  els.studySessionActions.replaceChildren(
    ...actions.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = item.kind === "primary" ? "primary-button" : "secondary-button";
      button.dataset.studyAction = item.action;
      button.textContent = item.label;
      button.disabled = busy || Boolean(item.disabled);
      return button;
    }),
  );
}

function clearStudySessionAdvanceTimer() {
  if (!studySessionAdvanceTimerId) return;
  window.clearTimeout(studySessionAdvanceTimerId);
  studySessionAdvanceTimerId = null;
}

function scheduleStudySessionAdvance(delay = 220) {
  clearStudySessionAdvanceTimer();
  studySessionAdvanceTimerId = window.setTimeout(() => {
    studySessionAdvanceTimerId = null;
    if (!state.studySession) return;
    goToNextStudyWord();
  }, delay);
}

function closeStudySessionMoreMenu() {
  els.studySessionMoreMenu.hidden = true;
}

function closeStudySession() {
  resetLearningSession();
  if (els.studySessionDialog.open) els.studySessionDialog.close();
  els.studySessionDialog.hidden = true;
  els.studySessionDialog.dataset.mode = "";
  els.studySessionDialog.dataset.phase = "";
}

function resetLearningSession() {
  clearStudySessionAdvanceTimer();
  closeStudySessionMoreMenu();
  state.studySession = null;
  state.learningMode = null;
  state.activeLearning = null;
  state.isLearningOpen = false;
  state.spellingPassed = false;
  els.sessionWordInput.value = "";
  els.sessionCollocationInput.value = "";
}

function renderStudySessionMoreMenu(word) {
  if (!word) return;
  const currentBook = isWordInLearnedNotebook(word) ? LEARNED_NOTEBOOK : normalizeNotebookName(word.notebook);
  const books = getNotebooks().filter((book) => !sameCategory(book, DEFAULT_NOTEBOOK));
  const uniqueBooks = new Map();
  [LEARNED_NOTEBOOK, ...books, currentBook !== DEFAULT_NOTEBOOK ? currentBook : ""].forEach((book) => {
    const normalized = normalizeNotebookName(book);
    if (normalized) uniqueBooks.set(normalized.toLocaleLowerCase("sv-SE"), normalized);
  });
  const orderedBooks = [...uniqueBooks.values()].filter(Boolean);
  orderedBooks.sort((a, b) => (isLearnedNotebook(a) ? -1 : isLearnedNotebook(b) ? 1 : a.localeCompare(b, "sv")));
  els.studySessionSaveBooks.replaceChildren(
    ...orderedBooks.map((book) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.sessionSaveBook = book;
      button.className = "study-session-save-button";
      button.classList.toggle("active", sameCategory(book, currentBook));
      button.textContent = book;
      return button;
    }),
    (() => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.sessionSaveBook = "__new__";
      button.className = "study-session-save-button";
      button.textContent = "Ny bok...";
      return button;
    })(),
  );
}

function showStudySessionComplete(mode) {
  const completed = getCompletedSessionIds(mode).length;
  setDailySessionCompleted(mode);
  const remoteSessionId = state.studySession?.remoteSessionId || state.dailyStudy?.remoteSessionIds?.[mode];
  if (remoteSessionId) {
    void remoteDb.completeStudySession(remoteSessionId).catch((error) => console.warn("[Min Ordbok] Remote study session completion failed.", error));
  }
  if (state.studySession) {
    state.studySession.stage = "complete";
    state.studySession.sessionCompleted = true;
    state.studySession.wordId = null;
    state.studySession.busy = false;
  }
  state.spellingPassed = false;
  state.currentQuiz = null;
  els.studySessionCard.hidden = true;
  els.sessionWordInputWrap.hidden = true;
  els.sessionCollocationInputWrap.hidden = true;
  closeStudySessionMoreMenu();
  els.studySessionActions.replaceChildren();
  els.studySessionProgress.textContent = "";
  els.studySessionFeedback.textContent = "";
  els.sessionCompletePanel.hidden = false;
  els.sessionCompleteTitle.textContent = mode === "review" ? "今天复习已完成" : "今天学习已完成";
  els.sessionCompleteText.textContent =
    mode === "review"
      ? "Dagens repetition är klar. Du kan stänga eller komma tillbaka senare."
      : "Dagens nya ord är klara. Du kan gå vidare till repetition eller komma tillbaka i morgon.";
  els.sessionCompleteCount.textContent = `${completed}/${getSessionIds(mode).length || 0}`;
  els.sessionCompleteMastered.textContent = `${state.words.filter((word) => word.learned).length} lärda ord`;
  if (els.startReviewFromCompleteBtn) els.startReviewFromCompleteBtn.hidden = mode === "review";
  renderStudyStats();
}

async function submitStudySessionAnswer() {
  const session = state.studySession;
  const word = currentStudySessionWord();
  if (!session || !word) return;
  if (session.busy) return;
  clearStudySessionAdvanceTimer();
  const spelling = session.spelling || createStudySpellingState();
  if (spelling.correct || spelling.locked) return;
  const isCorrect = normalizeSpelling(els.sessionWordInput.value) === normalizeSpelling(word.swedish);
  const attempts = isCorrect ? spelling.attempts : spelling.attempts + 1;
  session.spelling = createStudySpellingState({
    attempts,
    checked: true,
    correct: isCorrect,
    locked: !isCorrect && attempts >= MAX_SPELLING_ATTEMPTS,
    feedback: isCorrect
      ? "Correct"
      : attempts >= MAX_SPELLING_ATTEMPTS
        ? "Try again"
        : "Try again",
    showAnswer: !isCorrect && attempts >= MAX_SPELLING_ATTEMPTS,
  });
  state.spellingPassed = isCorrect;
  renderStudySession();
}

function validateLearnWordBeforeNext() {
  const session = state.studySession;
  const word = currentStudySessionWord();
  if (!session || !word || session.mode !== "new" || session.busy) return false;
  clearStudySessionAdvanceTimer();
  const spelling = session.spelling || createStudySpellingState();
  if (spelling.correct) return true;
  const isCorrect = normalizeSpelling(els.sessionWordInput.value) === normalizeSpelling(word.swedish);
  if (isCorrect) {
    session.spelling = createStudySpellingState({
      attempts: spelling.attempts,
      checked: true,
      correct: true,
      feedback: "Correct",
    });
    state.spellingPassed = true;
    return true;
  }
  session.spelling = createStudySpellingState({
    attempts: spelling.attempts + 1,
    checked: true,
    correct: false,
    locked: false,
    feedback: "Try again",
    showAnswer: false,
  });
  state.spellingPassed = false;
  renderStudySession();
  return false;
}

async function completeCurrentStudyWordFromSpelling() {
  const session = state.studySession;
  const word = currentStudySessionWord();
  if (!session || !word || !studySessionCanAdvance(session)) return;
  if (session.busy) return;
  clearStudySessionAdvanceTimer();
  session.busy = true;
  renderStudySession();
  const spelling = session.spelling || createStudySpellingState();
  const isCorrect = Boolean(spelling.correct);
  state.spellingPassed = isCorrect;
  const previousTodayNewCount = Number(state.dailyProgress?.todayNewCount || 0) || 0;
  const previousTodayNewWordIds = uniqueIds(state.dailyProgress?.todayNewWordIds || []);
  const now = Date.now();
  const nextReviewCount = session.mode === "review" ? Number(word.review_count || 0) + 1 : Number(word.review_count || 0);
  const rating = deriveStudyRating(spelling.attempts, isCorrect);
  const schedule = session.mode === "review" ? computeNextReview(word.review_stage, rating) : { stage: 0, nextReviewAt: startOfDayTimestamp(1) };
  const mastered = session.mode === "review" && schedule.stage >= MAX_REVIEW_STAGE;
  // Status enum per SPK-LRN-001 §4: new/learning/reviewing/relearning/mastered.
  const status =
    session.mode !== "review" ? "learning" : rating === "again" ? "relearning" : mastered ? "mastered" : "reviewing";
  const updated = updateWordInMemory(
    word.id,
    {
      status,
      learned: session.mode === "review" ? mastered : false,
      mastered_at: mastered ? word.mastered_at || now : word.mastered_at,
      first_studied_at: word.first_studied_at || now,
      last_studied_at: now,
      last_study_date: todayKey(),
      last_reviewed: session.mode === "review" ? now : word.last_reviewed,
      last_review_date: session.mode === "review" ? todayKey() : word.last_review_date,
      review_count: nextReviewCount,
      review_stage: session.mode === "review" ? schedule.stage : word.review_stage || 0,
      last_rating: session.mode === "review" ? rating : word.last_rating,
      lapse_count: session.mode === "review" && rating === "again" ? Number(word.lapse_count || 0) + 1 : word.lapse_count || 0,
      spelling_correct_count: word.spelling_correct_count + (isCorrect ? 1 : 0),
      wrong_count: word.wrong_count + (isCorrect ? 0 : MAX_SPELLING_ATTEMPTS),
      next_review_at: session.mode === "review" ? schedule.nextReviewAt : startOfDayTimestamp(1),
    },
    session.mode === "review" ? "reviewed" : "updated",
  );
  if (!updated) {
    session.busy = false;
    renderStudySession();
    return;
  }
  await markDailyCompleted(word.id);
  await remoteDb.upsertUserWordProgress(updated).catch((error) => {
    console.warn("[Min Ordbok] Study progress sync before advance failed.", error);
  });
  if (session.mode === "new") {
    const todayNewWordIds = uniqueIds([...previousTodayNewWordIds, word.id]);
    const todayNewCount = Math.max(previousTodayNewCount + (previousTodayNewWordIds.includes(word.id) ? 0 : 1), todayNewWordIds.length);
    state.dailyProgress = {
      ...(state.dailyProgress || {}),
      todayNewWordIds,
      todayNewCount,
    };
  } else {
    state.dailyProgress = {
      ...(state.dailyProgress || {}),
      dueReviewWordIds: uniqueIds(state.dailyProgress?.dueReviewWordIds || []).filter((id) => id !== word.id),
      dueReviewCount: Math.max(0, Number(state.dailyProgress?.dueReviewCount || 0) - 1),
    };
  }
  updateStudyStatsForToday();
  session.result = isCorrect ? "correct" : "wrong";
  session.busy = false;
  const progressAction = session.mode === "review" ? "reviewed" : "updated";
  renderStudyStats();
  if (isDailySessionCompleted(session.mode)) {
    showStudySessionComplete(session.mode);
    saveStudyWordProgressInBackground(updated, progressAction);
    return;
  }
  goToNextStudyWord();
  saveStudyWordProgressInBackground(updated, progressAction);
}

function goToNextStudyWord() {
  const session = state.studySession;
  if (!session) return;
  clearStudySessionAdvanceTimer();
  if (session.sessionCompleted || session.stage === "complete") {
    showStudySessionComplete(session.mode);
    return;
  }
  const next = getSessionQueue(session.mode)[0];
  if (!next) {
    showStudySessionComplete(session.mode);
    return;
  }
  state.studySession = {
    ...session,
    stage: session.mode === "review" ? "spell" : "view",
    result: null,
    spelling: createStudySpellingState(),
    busy: false,
    sessionCompleted: false,
    wordId: next.id,
  };
  state.spellingPassed = false;
  els.sessionWordInput.value = "";
  els.sessionCollocationInput.value = "";
  renderStudySession();
}

function retryStudyWord() {
  if (!state.studySession) return;
  clearStudySessionAdvanceTimer();
  state.studySession.stage = "spell";
  state.studySession.result = null;
  state.studySession.busy = false;
  resetStudySessionSpelling(state.studySession);
  renderStudySession();
  window.setTimeout(() => els.sessionWordInput.focus(), 0);
}

async function markCurrentStudyWordLearned() {
  const word = currentStudySessionWord();
  if (!word) return;
  clearStudySessionAdvanceTimer();
  try {
    await markWordLearned(word);
    await markDailyCompleted(word.id);
  } catch (error) {
    console.error("[Min Ordbok] Failed to mark word learned", error);
    renderStudySession();
    els.studySessionFeedback.textContent = "Kunde inte spara till Supabase. Försök igen.";
    return;
  }
  if (isDailySessionCompleted(state.studySession.mode)) {
    showStudySessionComplete(state.studySession.mode);
    return;
  }
  goToNextStudyWord();
}

function revealCurrentStudyWord() {
  if (!state.studySession) return;
  state.studySession.stage = "view";
  state.studySession.result = null;
  renderStudySession();
}

function resetSpellingUi() {
  state.spellingPassed = false;
  els.spellingWrap.hidden = true;
  els.spellingActions.hidden = true;
  els.reviewActions.hidden = true;
  els.spellingInput.value = "";
  els.spellingFeedback.textContent = "";
}

function setStudyStep(activeStep, completedSteps = []) {
  const completed = new Set(completedSteps);
  els.studySteps.querySelectorAll("[data-step]").forEach((item) => {
    const step = item.dataset.step;
    item.classList.toggle("active", step === activeStep);
    item.classList.toggle("done", completed.has(step));
  });
}

function startQuiz() {
  state.dailyStudy = ensureDailyStudyPlan();
  const word = pickQuizWord();
  state.currentQuiz = word;
  resetSpellingUi();
  els.answerBox.hidden = true;
  els.studyCompletePanel.hidden = true;
  els.viewStudyDetailBtn.disabled = !word;
  if (!word) {
    els.quizPrompt.textContent = "Bra jobbat!";
    setStudyStep(null, ["listen", "explain", "detail", "spell", "check"]);
    renderStudyStats();
    els.showAnswerBtn.disabled = true;
    return;
  }
  const isReview = state.dailyStudy.reviewWordIds?.includes(word.id);
  void ensureRemoteStudySession(isReview ? "review" : "new");
  els.quizPrompt.textContent = isReview ? "Repetera ordet" : "Nytt ord";
  els.quizHint.textContent = [isReview ? "Repetition" : "Nyord", posLabels[word.pos], word.pos_detail].filter(Boolean).join(" · ");
  els.showAnswerBtn.disabled = false;
  setStudyStep("listen");
  speakSwedish(word.swedish);
}

function showAnswer() {
  const word = state.currentQuiz;
  if (!word) return;
  els.answerBox.innerHTML = `
    <strong>${escapeHtml(word.chinese)}</strong><br>
    ${escapeHtml(word.english || "")}<br>
    <small>${escapeHtml(word.forms || "")}</small><br>
    <small>${escapeHtml(stripChineseExampleTranslation(word.example))}</small>
  `;
  els.answerBox.hidden = false;
  els.spellingWrap.hidden = false;
  els.spellingActions.hidden = false;
  els.viewStudyDetailBtn.disabled = false;
  setStudyStep("spell", ["listen", "explain"]);
  els.spellingInput.focus();
}

function normalizeSpelling(value) {
  return clean(value).toLocaleLowerCase("sv-SE");
}

function checkCurrentSpelling() {
  const word = state.currentQuiz;
  if (!word) return false;
  const isCorrect = normalizeSpelling(els.spellingInput.value) === normalizeSpelling(word.swedish);
  if (!isCorrect) {
    els.spellingFeedback.textContent = "Inte riktigt. Försök skriva ordet en gång till.";
    setStudyStep("spell", ["listen", "explain"]);
    return false;
  }
  state.spellingPassed = true;
  els.spellingFeedback.textContent = "Rätt stavat. Du kan markera ordet som Lärt mig.";
  els.reviewActions.hidden = false;
  setStudyStep("check", ["listen", "explain", "spell"]);
  return true;
}

async function markDailyCompleted(wordId) {
  const plan = state.dailyStudy || ensureDailyStudyPlan();
  const mode = plan.reviewWordIds?.includes(wordId) ? "review" : "new";
  const session = readDailySession(mode, plan);
  const completedWordIds = uniqueIds([...session.completedWordIds, wordId]).filter((id) => session.wordIds.includes(id));
  const spellingPassedWordIds = state.spellingPassed
    ? uniqueIds([...session.spellingPassedWordIds, wordId]).filter((id) => session.wordIds.includes(id))
    : session.spellingPassedWordIds;
  const completed = session.wordIds.length > 0 && completedWordIds.length >= session.wordIds.length;
  writeDailySession(mode, {
    ...session,
    completedWordIds,
    spellingPassedWordIds,
    completed,
    completedAt: completed ? session.completedAt || Date.now() : null,
    updatedAt: Date.now(),
  }, plan);
  const remoteSessionId = state.studySession?.remoteSessionId || state.dailyStudy?.remoteSessionIds?.[mode];
  if (remoteSessionId) {
    await remoteDb.saveStudySessionItem({
      sessionId: remoteSessionId,
      wordId,
      status: "completed",
      spellingPassed: state.spellingPassed,
      isCorrect: state.spellingPassed,
      answer: els.sessionWordInput?.value || els.spellingInput?.value || "",
      collocationAnswer: els.sessionCollocationInput?.value || "",
    }).catch((error) => console.warn("[Min Ordbok] Remote study item sync failed.", error));
  }
}

function updateStudyStatsForToday() {
  const today = todayKey();
  const yesterday = todayKey(-1);
  const stats = readStudyStats();
  if (stats.last_study_date !== today) {
    stats.current_streak = stats.last_study_date === yesterday ? (stats.current_streak || 0) + 1 : 1;
    stats.last_study_date = today;
  }
  stats.total_mastered = state.words.filter((word) => word.learned).length;
  state.studyStats = stats;
  writeStudyStats(stats);
}

async function recordQuiz(result) {
  const word = state.currentQuiz;
  if (!word) return;
  if (result === "known" && !state.spellingPassed) {
    checkCurrentSpelling();
    return;
  }
  const now = Date.now();
  const patch =
    result === "known"
      ? {
          learned: true,
          mastered_at: word.mastered_at || now,
          first_studied_at: word.first_studied_at || now,
          last_studied_at: now,
          last_study_date: todayKey(),
          last_reviewed: now,
          last_review_date: todayKey(),
          review_count: word.review_count + 1,
          spelling_correct_count: word.spelling_correct_count + 1,
          next_review_at: Number.MAX_SAFE_INTEGER,
        }
      : {
          learned: false,
          first_studied_at: word.first_studied_at || now,
          last_studied_at: now,
          last_study_date: todayKey(),
          wrong_count: word.wrong_count + 1,
          next_review_at: now,
        };
  await updateWord(
    word.id,
    patch,
    result === "known" ? "learned" : "reviewed",
  );
  await markDailyCompleted(word.id);
  updateStudyStatsForToday();
  startQuiz();
}

function createNotebook() {
  const name = prompt("Namn på ny ordbok");
  createNotebookByName(name);
}

function createNotebookByName(name) {
  const notebook = normalizeNotebookName(name);
  if (!notebook) return;
  if (isFixedNotebook(notebook)) {
    alert(`${notebook} finns redan som fast bok.`);
    return;
  }
  rememberNotebookName(notebook);
  state.selectedNotebook = "";
  state.exportNotebook = notebook;
  renderNotebookOptions();
  renderExportNotebookOptions();
  renderNotebook();
  alert(`Ordbok skapad: ${notebook}`);
}

function printNotebook() {
  const words = state.exportNotebook === "all" ? getLibraryWordsForDisplay() : getNotebookWords(state.exportNotebook);
  const title = state.exportNotebook === "all" ? "Alla ord" : `${state.exportNotebook} - ordlista`;
  closeBookExportDialog();
  openExportPreview(title, words, "words");
}

function openBookExportDialog() {
  renderExportNotebookOptions();
  if (!els.bookExportDialog?.open) els.bookExportDialog?.showModal();
}

function closeBookExportDialog() {
  els.bookExportDialog?.close();
}

function printLibrary() {
  const words = getWordsByExportPos(getLibraryWordsForDisplay());
  const label = state.exportPos === "all" ? "Alla ordklasser" : exportPosLabel(state.exportPos);
  openExportPreview(`Ordlista - ${label}`, words, "words");
}

function printHistory() {
  openExportPreview("Studiehistorik - A4 utskrift", getFilteredHistory(), "history");
}

function openExportPreview(title, items, type) {
  const rows =
    type === "history"
      ? items.map(historyPrintRow).join("")
      : items.map(wordPrintRow).join("");
  els.exportPreviewTitle.textContent = title;
  els.exportPreviewDialog.dataset.exportTitle = title;
  els.exportPreviewDialog.dataset.exportType = type;
  els.exportPreviewDialog.dataset.exportText = exportItemsText(title, items, type);
  els.exportPreviewContent.innerHTML = `
    <header class="export-preview-document-header">
      <h1>${escapeHtml(title)}</h1>
      <span>${items.length} ${type === "history" ? "händelser" : "ord"}</span>
    </header>
    ${
      items.length
        ? `<div class="export-preview-table-wrap"><table>${type === "history" ? historyHeader() : wordHeader()}${rows}</table></div>`
        : `<div class="empty-state">Inget innehåll att exportera.</div>`
    }
  `;
  if (!els.exportPreviewDialog.open) els.exportPreviewDialog.showModal();
}

async function shareExportPreview() {
  const title = els.exportPreviewDialog.dataset.exportTitle || "Ordlista";
  const text = els.exportPreviewDialog.dataset.exportText || "";
  if (navigator.share) {
    await navigator.share({ title, text });
    return;
  }
  if (navigator.clipboard && text) {
    await navigator.clipboard.writeText(text);
    alert("Exportinnehållet har kopierats.");
    return;
  }
  alert("Delning stöds inte i den här webbläsaren.");
}

function printExportPreview() {
  window.print();
}

function closeExportPreview() {
  els.exportPreviewDialog.close();
}

function closeBookActionMenu() {
  els.bookActionMenu.hidden = true;
  els.bookActionMenu.dataset.notebook = "";
}

function openBookActionMenu(notebook, x = window.innerWidth / 2, y = window.innerHeight / 2) {
  if (isFixedNotebook(notebook)) return;
  els.bookActionMenu.dataset.notebook = notebook;
  els.bookActionMenu.hidden = false;
  const left = Math.min(Math.max(12, x), window.innerWidth - 150);
  const top = Math.min(Math.max(12, y), window.innerHeight - 112);
  els.bookActionMenu.style.left = `${left}px`;
  els.bookActionMenu.style.top = `${top}px`;
}

async function renameNotebook(oldName) {
  if (isFixedNotebook(oldName)) {
    alert("Fasta böcker kan inte byta namn.");
    return;
  }
  const name = normalizeNotebookName(prompt("Nytt namn", oldName));
  if (!name || sameCategory(name, oldName)) return;
  if (isFixedNotebook(name)) {
    alert(`${name} finns redan som fast bok.`);
    return;
  }
  const notebooks = readNotebookNames().map((item) => (sameCategory(item, oldName) ? name : item));
  writeNotebookNames([...new Set(notebooks)]);
  const words = (await readWords()).map((word) =>
    sameCategory(word.notebook, oldName) ? normalizeForSave({ ...word, notebook: name }) : word,
  );
  await replaceWords(words);
  if (sameCategory(state.selectedNotebook, oldName)) state.selectedNotebook = name;
  if (sameCategory(state.exportNotebook, oldName)) state.exportNotebook = name;
  await loadData();
}

async function deleteNotebookByName(name) {
  if (isFixedNotebook(name)) {
    alert("Fasta böcker kan inte tas bort.");
    return;
  }
  if (!confirm(`Ta bort boken "${name}"? Orden finns kvar i Ordlista.`)) return;
  writeNotebookNames(readNotebookNames().filter((item) => !sameCategory(item, name)));
  const words = (await readWords()).map((word) =>
    sameCategory(word.notebook, name) ? normalizeForSave({ ...word, notebook: DEFAULT_NOTEBOOK }) : word,
  );
  await replaceWords(words);
  if (sameCategory(state.selectedNotebook, name)) state.selectedNotebook = "";
  if (sameCategory(state.exportNotebook, name)) state.exportNotebook = "all";
  await loadData();
}

function exportItemsText(title, items, type) {
  const lines = [title, ""];
  if (type === "history") {
    items.forEach((item) => {
      lines.push(`${new Date(item.created_at).toLocaleString("sv-SE")} | ${item.swedish} | ${actionLabels[item.action] || item.action}`);
    });
    return lines.join("\n");
  }
  items.forEach((word) => {
    lines.push(
      [
        word.swedish,
        [posLabels[word.pos], word.pos_detail].filter(Boolean).join(" "),
        simpleChineseMeaning(word.chinese),
        firstExample(word.example),
      ]
        .filter(Boolean)
        .join(" | "),
    );
  });
  return lines.join("\n");
}

function wordHeader() {
  return "<tr><th>Ord</th><th>Ordklass</th><th>Betydelse</th><th>Böjning</th><th>Exempel</th></tr>";
}

function historyHeader() {
  return "<tr><th>Tid</th><th>Ord</th><th>Händelse</th><th>Ordklass</th><th>Betydelse</th></tr>";
}

function wordPrintRow(word) {
  return `
    <tr>
      <td>${escapeHtml(word.swedish)}</td>
      <td>${escapeHtml([posLabels[word.pos], word.pos_detail].filter(Boolean).join(" · "))}</td>
      <td>${escapeHtml(simpleChineseMeaning(word.chinese))}</td>
      <td>${formatFormsForPrint(word.forms)}</td>
      <td>${escapeHtml(firstExample(word.example))}</td>
    </tr>
  `;
}

function exportPosLabel(pos) {
  if (pos === "other-pos") return "Övrigt";
  return posLabels[pos] || "Alla ordklasser";
}

function simpleChineseMeaning(value) {
  return clean(value).split(/\n|。|；|;/).map(clean).filter(Boolean)[0] || clean(value);
}

function firstExample(value) {
  const text = stripChineseExampleTranslation(value).split(/\n+/).map(clean).filter(Boolean)[0] || "";
  const sentence = text.match(/^.*?[.!?](?:\s|$)/u)?.[0];
  return clean(sentence || text);
}

function formatFormsForPrint(forms) {
  const items = splitForms(forms);
  if (items.length === 0) return "";
  return items.map((item) => `<div>${escapeHtml(item)}</div>`).join("");
}

function formatCollocationsForPrint(collocations, fallbackExample) {
  const items = splitCollocations(collocations, fallbackExample);
  if (items.length === 0) return "";
  return items
    .map(
      (item) =>
        `<div><strong>${escapeHtml(item.phrase)}</strong><br><span>${escapeHtml(item.meaning || "")}</span><br><span class="muted">Exempel: ${escapeHtml(stripChineseExampleTranslation(item.example))}</span></div>`,
    )
    .join("");
}

function historyPrintRow(item) {
  const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(item.created_at);
  return `
    <tr>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(item.swedish)}</td>
      <td>${escapeHtml(actionLabels[item.action] || item.action)}</td>
      <td>${escapeHtml([posLabels[item.pos], item.pos_detail].filter(Boolean).join(" · "))}</td>
      <td>${escapeHtml(item.chinese || "")}</td>
    </tr>
  `;
}

function escapeHtml(text) {
  return String(text || "").replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return map[char];
  });
}

function cleanupLegacyViewState() {
  removeStoredViewState();
}

function isSupabaseAuthCallbackLocation() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const authKeys = [
    "access_token",
    "code",
    "error",
    "error_code",
    "error_description",
    "expires_at",
    "expires_in",
    "refresh_token",
    "token_hash",
    "token_type",
    "type",
  ];
  return authKeys.some((key) => params.has(key) || hashParams.has(key));
}

function clearAuthCallbackLocation() {
  if (!isSupabaseAuthCallbackLocation()) return;
  window.history.replaceState({}, "", "/");
}

function normalizeStartupLocation() {
  if (isSupabaseAuthCallbackLocation()) return false;
  const pathname = window.location.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  const hash = window.location.hash.replace(/^#\/?/, "/").toLowerCase();
  const params = new URLSearchParams(window.location.search);
  const legacyKeys = new Set([
    "currentpage",
    "activeview",
    "activetab",
    "studymode",
    "currentstudyword",
    "currentreviewword",
    "studysession",
    "reviewsession",
    "modal",
    "route",
  ]);
  const routeValues = new Set([
    "study",
    "learn",
    "review",
    "add",
    "add-word",
    "addword",
    "new-word",
    "worddialog",
    "modal",
    "/study",
    "/learn",
    "/review",
    "/add",
    "/add-word",
    "/addword",
    "/new-word",
    "/worddialog",
    "/modal",
  ]);
  const hasLegacyState = [...params.entries()].some(([key, value]) => legacyKeys.has(key.toLowerCase()) || routeValues.has(String(value).toLowerCase()));
  const isIllegalRoute = pathname !== "/" || Boolean(hash) || routeValues.has(pathname) || routeValues.has(hash);
  const hasLaunchParams = ["v", "launch", "source"].some((key) => params.has(key));
  if (!isIllegalRoute && !hasLegacyState && !hasLaunchParams) return false;
  window.history.replaceState({}, "", "/");
  return true;
}

function enforceStartsideStartup({ resetScroll = true } = {}) {
  normalizeStartupLocation();
  cleanupLegacyViewState();
  closeTransientOverlays();
  forceHomeView({ resetScroll });
}

function waitForImageReady(image) {
  if (!image) return Promise.resolve();
  if (image.complete && image.naturalWidth > 0) {
    if (typeof image.decode === "function") {
      return image.decode().catch(() => undefined);
    }
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      image.removeEventListener("load", done);
      image.removeEventListener("error", done);
      resolve();
    };
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  });
}

// The single shared header button (topbarLibraryBack) also stands in for
// the Läsning results page's and Shadowing Practice page's own Tillbaka
// (Rachel, 2026-08-10: move those into this top-right slot instead of a
// second Tillbaka duplicated inside each panel). It swaps label/behavior
// based on which panel is actually visible right now; stays
// "Till Bibliotek" (→ libraryView) everywhere else eligible.
function updateTopbarLibraryBack() {
  if (!els.topbarLibraryBack) return;
  const eligible = ["notebookView", "wordLibraryView", "historyView", "fraserView", "readingView"].includes(state.activeView);
  els.topbarLibraryBack.hidden = !eligible;
  if (!eligible) return;
  const onReadingResults = state.activeView === "readingView" && els.readingAnalysisPanel && !els.readingAnalysisPanel.hidden;
  const onReadingEditorFromResults = state.activeView === "readingView" && state.readingEditorFromResults && els.readingEditorPanel && !els.readingEditorPanel.hidden;
  const onShadowingPractice = state.activeView === "historyView" && els.shadowingPlayerPanel && !els.shadowingPlayerPanel.hidden;
  if (onReadingResults) {
    els.topbarLibraryBack.textContent = "‹ Tillbaka";
    els.topbarLibraryBack.dataset.topbarBackMode = "readingResults";
  } else if (onReadingEditorFromResults) {
    els.topbarLibraryBack.textContent = "‹ Tillbaka";
    els.topbarLibraryBack.dataset.topbarBackMode = "readingEditor";
  } else if (onShadowingPractice) {
    els.topbarLibraryBack.textContent = "‹ Tillbaka";
    els.topbarLibraryBack.dataset.topbarBackMode = "shadowingPractice";
  } else {
    els.topbarLibraryBack.textContent = "Till Bibliotek";
    els.topbarLibraryBack.dataset.topbarBackMode = "";
  }
}

function activateView(viewId) {
  if (!viewId) return;
  closeTransientOverlays();
  if (viewId !== "historyView") closeShadowingPlayback();
  state.activeView = viewId;
  document.body.dataset.activeView = state.activeView;
  updateTopbarLibraryBack();
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === state.activeView);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === state.activeView);
  });
  resetViewportScroll();
  renderActiveView();
}

function forceHomeView({ resetScroll = true } = {}) {
  closeTransientOverlays();
  closeShadowingPlayback();
  state.activeView = "homeView";
  document.body.dataset.activeView = "homeView";
  if (els.topbarLibraryBack) els.topbarLibraryBack.hidden = true;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === "homeView");
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === "homeView");
  });
  if (resetScroll) resetViewportScroll();
  renderActiveView();
}

function resetViewportScroll() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  const main = document.querySelector("main");
  if (main) {
    main.scrollTop = 0;
    main.scrollLeft = 0;
  }
}

function closeTransientOverlays() {
  [
    els.dialog,
    els.detailDialog,
    els.saveSheetDialog,
    els.studySessionDialog,
    els.exportPreviewDialog,
  ].forEach((dialog) => {
    if (dialog?.open) dialog.close();
  });
  state.studySession = null;
  state.learningMode = null;
  state.activeLearning = null;
  state.isLearningOpen = false;
  state.currentQuiz = null;
  state.saveSheetWordId = null;
  state.wordDialogReturnView = "";
  setWordDialogOpen(false);
  closeDetailMoreMenu();
  closeReadingMoreMenu();
  closeShadowingMoreMenu();
  if (els.discardWordDialog?.open) els.discardWordDialog.close();
  els.studySessionDialog.hidden = true;
  els.studySessionDialog.dataset.mode = "";
  els.studySessionDialog.dataset.phase = "";
}

function isStandalonePwaLaunch() {
  return window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)")?.matches;
}

function setupShadowingAudio() {
  shadowingAudio.preload = "auto";
  shadowingAudio.addEventListener("timeupdate", handleShadowingAudioProgress);
  shadowingAudio.addEventListener("ended", () => {
    state.shadowingPlaybackState = "paused";
    updateShadowingPlaybackUI();
    void handleShadowingEnded();
  });
  shadowingAudio.addEventListener("pause", () => {
    state.shadowingPlaybackState = "paused";
    updateShadowingPlaybackUI();
  });
  shadowingAudio.addEventListener("play", () => {
    state.shadowingPlaybackState = "playing";
    updateShadowingPlaybackUI();
  });
  shadowingAudio.addEventListener("loadedmetadata", () => {
    updateShadowingLoopBoundsFromAudio();
    renderShadowingPlayer();
  });
  shadowingRecordingAudio.addEventListener("play", () => {
    state.shadowingPlaybackState = "playing";
    updateShadowingPlaybackUI();
  });
  shadowingRecordingAudio.addEventListener("pause", () => {
    state.shadowingPlaybackState = "paused";
    updateShadowingPlaybackUI();
  });
  shadowingRecordingAudio.addEventListener("ended", () => {
    state.shadowingPlaybackState = "paused";
    updateShadowingPlaybackUI();
  });
}

function forceStartsideOnPwaLaunch() {
  forceHomeView({ resetScroll: true });
}

// 2026-08-03: extracted from the [data-return-view="libraryView"] handler,
// the "go up to Bibliotek" behavior shared by every module's own Tillbaka.
function returnToLibraryView() {
  closeTransientOverlays();
  closeShadowingPlayback();
  state.activeView = "libraryView";
  document.body.dataset.activeView = "libraryView";
  updateTopbarLibraryBack();
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === "libraryView");
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === "libraryView");
  });
  window.scrollTo(0, 0);
  renderActiveView();
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.view === "notebookView") {
        state.selectedNotebook = "";
        resetListLimit("notebook");
      }
      if (tab.dataset.view === "profileView") showProfilePage("main");
      activateView(tab.dataset.view);
    });
  });
  document.querySelectorAll("[data-open-book]").forEach((button) => {
    button.addEventListener("click", () => {
      const viewId = button.dataset.openBook;
      if (viewId === "notebookView") {
        state.selectedNotebook = "";
        resetListLimit("notebook");
      }
      if (viewId === "readingView") closeReadingEditor();
      if (viewId === "historyView") openShadowingEditor();
      activateView(viewId);
    });
  });
  document.querySelectorAll("[data-return-view]").forEach((button) => {
    button.addEventListener("click", () => {
      // topbarLibraryBack doubles as Läsning results' and Shadowing
      // Practice's own Tillbaka when one of those panels is open (see
      // updateTopbarLibraryBack) — branch there before the generic
      // "go to Bibliotek" behavior below.
      if (button === els.topbarLibraryBack) {
        if (button.dataset.topbarBackMode === "readingResults") {
          closeReadingResults();
          return;
        }
        if (button.dataset.topbarBackMode === "readingEditor") {
          closeReadingEditorToResults();
          return;
        }
        if (button.dataset.topbarBackMode === "shadowingPractice") {
          closeShadowingPractice();
          return;
        }
      }
      const viewId = button.dataset.returnView;
      if (viewId === "libraryView") {
        returnToLibraryView();
        return;
      }
      activateView(viewId);
    });
  });

  els.searchInput.addEventListener("input", runSearch);
  els.searchInput.addEventListener("search", runSearch);
  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearchAndOpenDetail();
      els.searchInput.blur();
    }
  });
  els.searchBtn.addEventListener("click", runSearchAndOpenDetail);
  els.enrichSearchBtn.addEventListener("click", enrichCurrentSearchResults);
  els.generateWordBtn.addEventListener("click", async () => {
    runSearch();
    await showGeneratedWordFromSearch();
  });

  els.filterRow.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    resetListLimit("library");
    els.filterRow.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip === button));
    renderFavoriteCategoryFilter();
    renderWords();
    renderDictionary();
  });

  els.fraserTypeFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fraser-type]");
    if (!button) return;
    state.fraserTypeFilter = button.dataset.fraserType;
    resetListLimit("fraser");
    els.fraserTypeFilter.querySelectorAll(".chip").forEach((chip) => chip.classList.toggle("active", chip === button));
    renderFraserView();
  });

  els.newReadingBtn?.addEventListener("click", () => openReadingEditor(null));
  els.closeReadingEditorBtn?.addEventListener("click", closeReadingEditor);
  els.saveReadingBtn?.addEventListener("click", saveCurrentReadingItem);
  els.analyzeReadingBtn?.addEventListener("click", analyzeCurrentReadingItem);
  els.deleteReadingBtn?.addEventListener("click", deleteCurrentReadingItem);
  els.sendReadingToShadowingBtn?.addEventListener("click", sendCurrentReadingItemToShadowing);
  els.sendSelectedSentencesToShadowingBtn?.addEventListener("click", sendSelectedSentencesToShadowing);
  els.openInShadowingBtn?.addEventListener("click", sendCurrentReadingItemToShadowing);
  // 2026-08-10, Rachel's request: Redigera text/Exportera/Ta bort on the
  // results page consolidated into one "⋯" overflow menu (same toggle +
  // outside-click-close shape as studySessionMoreMenu/detailMoreMenu).
  els.readingMoreBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (els.readingMoreMenu) els.readingMoreMenu.hidden = !els.readingMoreMenu.hidden;
  });
  els.readingMoreMenu?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-reading-menu-action]")?.dataset.readingMenuAction;
    if (!action) return;
    closeReadingMoreMenu();
    if (action === "edit") editReadingResultsText();
    else if (action === "export") openReadingExportPreview();
    else if (action === "delete") deleteCurrentReadingItem();
  });
  els.readingTextToggleBtn?.addEventListener("click", () => {
    setReadingTextCollapsed(!els.readingTextInput.classList.contains("reading-text-collapsed"));
  });
  els.readingAnnotateToggleBtn?.addEventListener("click", () => {
    const item = state.readingItems.find((entry) => entry.id === els.readingItemId.value);
    if (!item || !els.readingAnnotateSection) return;
    const expanded = els.readingAnnotateSection.dataset.expanded === "true";
    els.readingAnnotateSection.dataset.expanded = expanded ? "false" : "true";
    renderReadingAnnotateSection(item);
  });
  els.readingAnnotateText?.addEventListener("click", (event) => {
    const span = event.target.closest(".reading-annotate-sentence");
    if (!span) return;
    toggleReadingSentenceHighlight(Number(span.dataset.sentenceIndex));
  });
  els.readingAnnotateText?.addEventListener(
    "blur",
    (event) => {
      const box = event.target.closest?.(".reading-annotate-note");
      if (!box) return;
      updateReadingSentenceNote(Number(box.dataset.sentenceIndex), box.value);
    },
    true,
  );
  els.readingShadowingEntryCard?.addEventListener("click", openReadingShadowingEntry);
  els.readingList?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-reading-id]");
    if (!card) return;
    const item = state.readingItems.find((entry) => entry.id === card.dataset.readingId);
    if (item) openReadingEditor(item);
  });
  els.readingKeyWords?.addEventListener("click", (event) => {
    const toggle = event.target.closest("[data-reading-word-id]");
    if (!toggle) return;
    markReadingItemViewedFromElement(toggle.closest("[data-reading-item-type]"));
    toggleReadingWordDetail(toggle);
  });
  els.readingKeyPhrases?.addEventListener("click", (event) => {
    const classifyBtn = event.target.closest("[data-reading-classify]");
    if (classifyBtn) {
      classifyReadingPhrase(classifyBtn);
      return;
    }
    const toggle = event.target.closest(".reading-phrase-card-toggle");
    if (!toggle) return;
    markReadingItemViewedFromElement(toggle.closest("[data-reading-item-type]"));
    toggleReadingPhraseDetail(toggle);
  });
  els.generateReadingSummaryBtn?.addEventListener("click", generateSummaryForCurrentReadingItem);
  els.readingTextInput?.addEventListener("input", updateReadingWordCountNote);
  // Bring Spara back the moment there's something new to persist — covers
  // manual edits and programmatic changes alike (photo import already
  // dispatches a real "input" event on readingTextInput after setting the
  // textarea's value, so it's covered here too, no separate call needed).
  els.readingTextInput?.addEventListener("input", () => { els.saveReadingBtn.hidden = false; });
  els.readingTitleInput?.addEventListener("input", () => { els.saveReadingBtn.hidden = false; });
  els.importReadingPhotoBtn?.addEventListener("click", () => els.readingPhotoFileInput?.click());
  els.readingPhotoFileInput?.addEventListener("change", handleReadingPhotoImport);

  els.favoriteCategoryFilter.addEventListener("change", (event) => {
    state.favoriteCategory = event.target.value;
    resetListLimit("library");
    renderWords();
  });

  els.addWordBtn.addEventListener("click", () => openWordDialog());
  els.closeLibraryBtn?.addEventListener("click", closeLibraryView);
  els.createFromSearchBtn.addEventListener("click", openWordDialogFromSearch);
  els.closeDetailBtn.addEventListener("click", () => {
    closeSaveSheet();
    closeDetailMoreMenu();
    els.detailActionBar?.replaceChildren();
    if (els.detailActionBar) els.detailActionBar.hidden = true;
    els.detailDialog.close();
  });
  els.detailDialog.addEventListener("close", () => {
    closeSaveSheet();
    closeDetailMoreMenu();
  });
  els.detailEditBtn?.addEventListener("click", () => {
    const word = getOpenDetailWord();
    if (word) openWordDialog(word);
  });
  els.detailMoreBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (els.detailMoreMenu.hidden) {
      els.detailMoreMenu.hidden = false;
    } else {
      closeDetailMoreMenu();
    }
  });
  els.detailMoreMenu?.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-detail-menu-action]")?.dataset.detailMenuAction;
    if (!action) return;
    event.preventDefault();
    const word = getOpenDetailWord();
    closeDetailMoreMenu();
    if (!word) return;
  });
  els.closeSaveSheetBtn.addEventListener("click", closeSaveSheet);
  els.saveSheetDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeSaveSheet();
  });
  els.saveSheetDialog.addEventListener("close", () => {
    state.saveSheetWordId = null;
  });
  els.saveSheetNewBookBtn.addEventListener("click", async () => {
    const name = normalizeNotebookName(prompt("Namn på ny bok", ""));
    if (!clean(name)) return;
    createNotebookByName(name);
    const word = state.words.find((item) => item.id === state.saveSheetWordId);
    if (word) {
      await setWordBookMembership(word, name, true);
    }
  });
  els.saveSheetBooks.addEventListener("click", async (event) => {
    const bookButton = event.target.closest("[data-save-book]");
    if (!bookButton) return;
    const word = state.words.find((item) => item.id === state.saveSheetWordId);
    if (!word) return;
    const book = bookButton.dataset.saveBook;
    const enabled = !bookButton.classList.contains("active");
    await setWordBookMembership(word, book, enabled);
  });
  els.saveSheetLearnedToggle.addEventListener("change", async (event) => {
    const word = state.words.find((item) => item.id === state.saveSheetWordId);
    if (!word) return;
    await setWordLearnedState(word, event.target.checked);
  });
  els.saveSheetFavoriteToggle.addEventListener("change", async (event) => {
    const word = state.words.find((item) => item.id === state.saveSheetWordId);
    if (!word) return;
    await setWordFavorite(word, event.target.checked);
  });
  els.createNotebookBtn.addEventListener("click", createNotebook);
  els.importEducationBtn?.addEventListener("click", importEducationWords);
  els.importDocumentBtn?.addEventListener("click", importDocumentWords);
  els.importDocumentTopBtn.addEventListener("click", importDocumentWords);
  els.importFrom4173Btn?.addEventListener("click", importWordsFrom4173);
  els.enrichNotebookBtn?.addEventListener("click", enrichSelectedNotebook);
  els.stopEnrichBtn?.addEventListener("click", () => {
    state.stopBatchEnrich = true;
    els.stopEnrichBtn.textContent = "Stoppar...";
    els.stopEnrichBtn.disabled = true;
  });
  els.dedupeWordsBtn?.addEventListener("click", deleteDuplicateWords);
  els.exportPosFilter.addEventListener("change", (event) => {
    state.exportPos = event.target.value;
  });
  els.exportNotebookSelect.addEventListener("change", (event) => {
    state.exportNotebook = event.target.value;
  });
  els.printLibraryBtn.addEventListener("click", printLibrary);
  els.printNotebookBtn.addEventListener("click", printNotebook);
  els.closeBookExportBtn?.addEventListener("click", closeBookExportDialog);
  els.bookExportDialog?.addEventListener("click", (event) => {
    if (event.target === els.bookExportDialog) closeBookExportDialog();
  });
  els.printHistoryBtn?.addEventListener("click", printHistory);
  els.shareExportPreviewBtn.addEventListener("click", () => {
    shareExportPreview().catch((error) => {
      if (error?.name !== "AbortError") alert(error.message || "Kunde inte dela.");
    });
  });
  els.printExportPreviewBtn.addEventListener("click", printExportPreview);
  els.closeExportPreviewBtn.addEventListener("click", closeExportPreview);
  els.closeExportPreviewActionBtn.addEventListener("click", closeExportPreview);
  els.resetDataBtn.addEventListener("click", () => {
    location.reload();
  });

  els.notebookSelect.addEventListener("change", (event) => {
    state.selectedNotebook = event.target.value;
    persistUserPreferences();
    resetListLimit("notebook");
    renderNotebookOptions();
    renderNotebook();
  });

  // 2026-08-11, Rachel's request: Redigera text/Ta bort on Practice
  // consolidated into one "⋯" overflow menu, same pattern as Läsning's
  // readingMoreMenu (toggle + outside-click-close + delegated actions).
  els.shadowingMoreBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (els.shadowingMoreMenu) els.shadowingMoreMenu.hidden = !els.shadowingMoreMenu.hidden;
  });
  els.shadowingMoreMenu?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-shadowing-menu-action]")?.dataset.shadowingMenuAction;
    if (!action) return;
    closeShadowingMoreMenu();
    if (action === "edit") editCurrentShadowingText();
    else if (action === "delete") deleteCurrentShadowingItemFromPractice();
  });
  els.newShadowingBtn?.addEventListener("click", () => {
    // 2026-08-03: was a partial inline reset that never cleared item
    // identity (shadowingItemId/selectedShadowingId) — harmless before the
    // editor/practice split, but now that Rensa can be followed by
    // Generate on genuinely new text, use the real shared reset so a
    // cleared textarea can't accidentally get saved as an update to the
    // previous item.
    resetShadowingForm();
    updateShadowingPlaybackUI();
    els.shadowingSwedishInput?.focus();
  });
  els.saveShadowingBtn?.addEventListener("click", saveShadowingItemFromForm);
  els.shadowingContinueBtn?.addEventListener("click", () => {
    continueShadowingFlow().catch((error) => {
      console.error("[Shadowing] Continue flow failed", error);
      alert(error.message || "Kunde inte fortsätta flödet.");
    });
  });
  els.shadowingAddUnknownBtn?.addEventListener("click", () => {
    addSelectedShadowingWordsToVocabulary().catch((error) => {
      console.error("[Shadowing] Add unknown words failed", error);
      alert(error.message || "Kunde inte lägga till orden.");
    });
  });
  els.generateShadowingAudioBtn?.addEventListener("click", () => {
    generateStandardShadowingAudio().catch((error) => {
      console.error("[Shadowing] Generate standard audio failed", error);
      alert(error.message || "Kunde inte generera standardljud.");
    });
  });
  els.shadowingAudioProgress?.addEventListener("input", (event) => {
    const nextTime = Number(event.target.value || 0);
    if (!Number.isFinite(nextTime) || !Number.isFinite(shadowingAudio.duration)) return;
    state.shadowingSeeking = true;
    shadowingAudio.currentTime = Math.min(Math.max(nextTime, 0), shadowingAudio.duration);
    renderShadowingPlayer();
  });
  els.shadowingAudioProgress?.addEventListener("change", () => {
    state.shadowingSeeking = false;
  });
  els.shadowingPlaybackRate?.addEventListener("change", (event) => {
    const rate = Number(event.target.value || 1);
    const playbackRate = Number.isFinite(rate) ? rate : 1;
    shadowingAudio.playbackRate = playbackRate;
    shadowingRecordingAudio.playbackRate = playbackRate;
    if (els.shadowingRecordingPlayer) els.shadowingRecordingPlayer.playbackRate = playbackRate;
  });
  els.shadowingVoiceSelect?.addEventListener("change", () => {
    els.shadowingVoiceSelect.closest("details")?.removeAttribute("open");
    syncShadowingVoiceOptions();
    const item = getSelectedShadowingItem();
    if (!item) return;
    item.tts_voice_id = els.shadowingVoiceSelect.value;
    item.tts_voice_name = els.shadowingVoiceSelect.selectedOptions?.[0]?.textContent || "";
  });
  document.querySelector(".shadowing-voice-options")?.addEventListener("click", (event) => {
    const voice = event.target.closest("[data-shadowing-voice]")?.dataset.shadowingVoice;
    if (!voice || !els.shadowingVoiceSelect) return;
    els.shadowingVoiceSelect.value = voice;
    els.shadowingVoiceSelect.dispatchEvent(new Event("change", { bubbles: true }));
  });
  syncShadowingVoiceOptions();
  els.downloadShadowingStandardBtn?.addEventListener("click", () => {
    downloadStandardShadowingAudio().catch((error) => {
      console.error("[Shadowing] Standard audio download failed", error);
      alert(error.message || "Kunde inte ladda ner standardljud.");
    });
  });
  els.downloadShadowingRecordingBtn?.addEventListener("click", () => {
    downloadShadowingRecording().catch((error) => {
      console.error("[Shadowing] Recording download failed", error);
      alert(error.message || "Kunde inte ladda ner inspelningen.");
    });
  });
  els.shadowingAudioFileInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 18 * 1024 * 1024) {
      alert("Ljudfilen är för stor för lokal lagring.");
      event.target.value = "";
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    state.shadowingPendingAudioSource = dataUrl;
    state.shadowingPendingAudioName = file.name;
    els.shadowingAudioUrlInput.value = file.name;
    updateShadowingAudioHint(`Uppladdad fil: ${file.name}`);
  });
  els.shadowingAudioUrlInput?.addEventListener("input", () => {
    state.shadowingPendingAudioSource = "";
    state.shadowingPendingAudioName = "";
  });
  els.shadowingSwedishInput?.addEventListener("input", () => {
    renderShadowingFlow();
    updateShadowingPlaybackUI();
  });
  els.shadowingUnknownWordsList?.addEventListener("change", (event) => {
    const checkbox = event.target.closest('[data-shadowing-unknown-word]');
    if (!checkbox) return;
    const value = checkbox.dataset.shadowingUnknownWord;
    const selected = new Set(state.shadowingFlowSelectedUnknownWords || []);
    if (checkbox.checked) {
      selected.add(value);
    } else {
      selected.delete(value);
    }
    state.shadowingFlowSelectedUnknownWords = [...selected];
    renderShadowingFlow();
  });
  els.shadowingLevelInput?.addEventListener("change", (event) => {
    state.shadowingLevel = event.target.value;
    persistUserPreferences();
  });
  els.shadowingToggleSubtitlesBtn?.addEventListener("click", toggleShadowingSubtitles);
  els.shadowingToggleLoopBtn?.addEventListener("click", toggleShadowingLoop);
  els.shadowingToggleAutoPauseBtn?.addEventListener("click", toggleShadowingAutoPause);
  els.shadowingToggleContinuousBtn?.addEventListener("click", toggleShadowingContinuous);
  els.shadowingPlayPauseBtn?.addEventListener("click", playShadowingCurrentItem);
  els.shadowingPauseBtn?.addEventListener("click", pauseShadowingCurrentItem);
  els.shadowingStopBtn?.addEventListener("click", stopShadowingCurrentItem);
  els.shadowingSetABtn?.addEventListener("click", () => setShadowingLoopPoint("a"));
  els.shadowingSetBBtn?.addEventListener("click", () => setShadowingLoopPoint("b"));
  els.shadowingRecordBtn?.addEventListener("click", async () => {
    try {
      await startShadowingRecording();
    } catch (error) {
      console.error("[Shadowing] Recording failed", error);
      alert(error.message || "Kunde inte starta inspelning.");
    }
  });
  els.shadowingStopRecordBtn?.addEventListener("click", stopShadowingRecording);
  els.shadowingPlayRecordingBtn?.addEventListener("click", () => {
    playShadowingRecording().catch((error) => {
      console.error("[Shadowing] Recording playback failed", error);
    });
  });
  els.shadowingExportStandardPlayBtn?.addEventListener("click", playShadowingCurrentItem);
  els.shadowingExportRecordingPlayBtn?.addEventListener("click", () => {
    playShadowingRecording().catch((error) => {
      console.error("[Shadowing] Recording playback failed", error);
    });
  });
  els.shadowingCompareBtn?.addEventListener("click", () => {
    compareShadowingPlayback().catch((error) => {
      console.error("[Shadowing] Compare playback failed", error);
    });
  });
  els.shadowingClearRecordingBtn?.addEventListener("click", () => {
    clearShadowingRecording().catch((error) => {
      console.error("[Shadowing] Clear recording failed", error);
    });
  });
  els.shadowingLevelButtons?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-shadowing-level]");
    if (!button) return;
    const level = button.dataset.shadowingLevel;
    const selected = ensureSelectedShadowingItem();
    if (!selected) {
      state.shadowingLevel = String(level);
      renderShadowingPlayer();
      return;
    }
    applyShadowingLevel(level, { persist: true }).catch((error) => console.error("[Shadowing] Level update failed", error));
  });
  els.shadowingList?.addEventListener("click", (event) => {
    const deleteButton = event.target.closest('[data-shadowing-action="delete"]');
    if (deleteButton) {
      deleteShadowingItem(deleteButton.dataset.shadowingId).catch((error) => console.error("[Shadowing] Delete failed", error));
      return;
    }
    const selectButton = event.target.closest("[data-shadowing-select]");
    if (!selectButton) return;
    const itemId = selectButton.dataset.shadowingSelect;
    const item = getShadowingItems().find((row) => row.id === itemId);
    if (!item) return;
    // Tapping a past item used to only update state.selectedShadowingId
    // (selectShadowingItem) without ever switching off the editor panel —
    // combined with .shadowing-scroll-area being force-hidden (see its
    // 2026-08-09 CSS fix), there was no way back into an existing item's
    // Practice/Export page (where standard-audio playback and the "Ladda
    // ner min inspelning" button live) once you navigated away from it.
    openShadowingPractice(item);
    void applyShadowingRecordingForItem(itemId).then(() => renderShadowingPlayer());
  });

  els.notebookPinnedBookList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fixed-book], [data-notebook], [data-quick-action]");
    if (!button) return;
    if (button.dataset.quickAction === "export") {
      openBookExportDialog();
      return;
    }
    if (button.dataset.fixedBook === "all") {
      openOrdlistaFromBooks();
      return;
    }
    const notebook = button.dataset.notebook;
    if (!notebook) return;
    if (sameCategory(notebook, LEARNED_NOTEBOOK)) {
      openLearnedNotebookFromBooks();
      return;
    }
    state.selectedNotebook = notebook;
    state.exportNotebook = notebook;
    persistUserPreferences();
    resetListLimit("notebook");
    renderNotebookOptions();
    renderExportNotebookOptions();
    renderNotebook();
    els.notebookDetailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  let suppressBookClick = false;
  els.notebookBookList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-notebook]");
    if (!button) return;
    if (suppressBookClick) {
      suppressBookClick = false;
      return;
    }
    state.selectedNotebook = button.dataset.notebook;
    state.exportNotebook = state.selectedNotebook;
    persistUserPreferences();
    resetListLimit("notebook");
    renderNotebookOptions();
    renderExportNotebookOptions();
    renderNotebook();
    els.notebookDetailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  let bookPressTimer = null;
  els.notebookBookList.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-notebook]");
    if (!button) return;
    bookPressTimer = window.setTimeout(() => {
      suppressBookClick = true;
      openBookActionMenu(button.dataset.notebook, event.clientX, event.clientY);
      bookPressTimer = null;
    }, 620);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((type) => {
    els.notebookBookList.addEventListener(type, () => {
      if (bookPressTimer) window.clearTimeout(bookPressTimer);
      bookPressTimer = null;
    });
  });
  els.notebookBookList.addEventListener("contextmenu", (event) => {
    const button = event.target.closest("[data-notebook]");
    if (!button) return;
    event.preventDefault();
    openBookActionMenu(button.dataset.notebook, event.clientX, event.clientY);
  });
  els.bookActionMenu.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-book-action]")?.dataset.bookAction;
    const notebook = els.bookActionMenu.dataset.notebook;
    if (!action || !notebook) return;
    closeBookActionMenu();
    if (action === "rename") await renameNotebook(notebook);
    if (action === "delete") await deleteNotebookByName(notebook);
  });
  els.backToBooksBtn.addEventListener("click", () => {
    state.selectedNotebook = "";
    resetListLimit("notebook");
    renderNotebook();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".book-action-menu") && !event.target.closest(".book-card")) closeBookActionMenu();
  });

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const saved = await saveWordFromForm();
    if (saved) {
      const returnView = state.wordDialogReturnView || "";
      state.wordDialogReturnView = "";
      state.wordDialogSnapshot = "";
      state.wordDialogSourceDetailId = "";
      setWordDialogOpen(false);
      els.dialog.close();
      if (returnView) activateView(returnView || "homeView");
    }
  });
  els.posInput.addEventListener("change", () => showWordFormGroupForPos(els.posInput.value));
  els.autofillWordBtn.addEventListener("click", autofillWordFormFromPaste);
  [
    els.pasteWordInfoInput,
    els.chineseInput,
    els.englishInput,
    els.formsInput,
    els.exampleInput,
    els.collocationsInput,
    els.related_wordsInput,
    els.noteInput,
  ].forEach((input) => {
    input.addEventListener("input", () => autoResizeWordTextarea(input));
  });
  els.closeWordDialogBtn.addEventListener("click", closeWordDialogWithoutSaving);
  els.cancelWordDialogBtn.addEventListener("click", closeWordDialogWithoutSaving);
  els.dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeWordDialogWithoutSaving();
  });
  els.dialog.addEventListener("close", () => {
    setWordDialogOpen(false);
  });
  els.continueEditingWordBtn.addEventListener("click", () => {
    els.discardWordDialog.close();
  });
  els.discardWordChangesBtn.addEventListener("click", closeWordDialogWithoutSaving);
  els.discardWordDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    els.discardWordDialog.close();
  });

  document.addEventListener("click", async (event) => {
    if (els.saveSheetDialog?.open && !event.target.closest("#saveSheetDialog") && !event.target.closest('[data-action="save"]')) {
      // Keep the sheet open only when interacting with it or the save button.
      closeSaveSheet();
    }

    const emptyAction = event.target.closest("[data-empty-action]")?.dataset.emptyAction;
    if (emptyAction === "add") {
      openWordDialogFromSearch();
      return;
    }
    if (emptyAction === "generate") {
      await showGeneratedWordFromSearch();
      return;
    }
    const loadMoreButton = event.target.closest('[data-action="load-more"]');
    if (loadMoreButton) {
      const limitKey = loadMoreButton.dataset.limitKey;
      increaseListLimit(limitKey);
      if (limitKey === "history") renderHistory();
      if (limitKey === "notebook") renderNotebook();
      if (limitKey === "library") renderWords();
      if (limitKey === "fraser") renderFraserView();
      return;
    }

    const card = event.target.closest(".word-card");
    const detailAction = event.target.closest("#detailActionBar [data-action]")?.dataset.action;
    if (!card && detailAction) {
      const word = getOpenDetailWord();
      if (!word) return;
      if (detailAction === "save") openSaveSheetForWord(word);
      if (detailAction === "listen") speakSwedish(word.swedish);
      return;
    }
    const promoteButton = event.target.closest('[data-action="promote-collocation"]');
    if (promoteButton) {
      await handlePromoteCollocation(promoteButton);
      return;
    }
    if (!card) return;
    const action = event.target.closest("[data-action]")?.dataset.action;
    const word =
      state.words.find((item) => item.id === card.dataset.id) ||
      (state.generatedWord && clean(state.generatedWord.swedish).toLowerCase() === clean(card.dataset.swedish).toLowerCase()
        ? state.generatedWord
        : null) ||
      dictionaryWords.find((item) => clean(item.swedish).toLowerCase() === clean(card.dataset.swedish).toLowerCase()) ||
      phraseObjects.find((item) => item.id === card.dataset.id);
    if (!word) return;
    if (!action && card.classList.contains("word-row")) {
      openWordDetail(word, card.dataset.mode);
      return;
    }
    if (action === "add-dictionary") {
      await addDictionaryWordToLibrary(word.swedish);
      return;
    }
    if (action === "save-generated") {
      await saveGeneratedWordToLibrary();
      return;
    }
    if (action === "enrich") {
      await enrichWordCard(word, card.dataset.mode);
      return;
    }
    if (action === "save") {
      openSaveSheetForWord(word);
      return;
    }
    const star = event.target.closest(".star-button");
    if (star) {
      await setWordFavorite(word, !word.favorite);
      return;
    }
    if (action === "listen") speakSwedish(word.swedish);
    if (action === "known") {
      await markWordLearned(word);
    }
    if (action === "edit") openWordDialog(word);
  });

  els.startNewStudyBtn.addEventListener("click", () => {
    startStudySession("new").catch((error) => {
      console.error("[Min Ordbok] Failed to start new study session", error);
      alert(error.message || "Kunde inte starta övningen.");
    });
  });
  els.startReviewStudyBtn.addEventListener("click", () => {
    startStudySession("review").catch((error) => {
      console.error("[Min Ordbok] Failed to start review session", error);
      alert(error.message || "Kunde inte starta repetition.");
    });
  });
  els.startQuizBtn.addEventListener("click", () => {
    startQuiz();
  });
  els.showAnswerBtn.addEventListener("click", showAnswer);
  els.viewStudyDetailBtn.addEventListener("click", () => {
    if (!state.currentQuiz) return;
    openWordDetail(state.currentQuiz, "library");
    setStudyStep("detail", ["listen", "explain"]);
  });
  els.studyScopeSelect.addEventListener("change", async (event) => {
    state.studyScope = event.target.value;
    state.dailyStudy = ensureDailyStudyPlan(state.studyScope);
    await persistDailyStudyPlan(state.dailyStudy);
    persistUserPreferences();
    state.currentQuiz = null;
    resetSpellingUi();
    els.answerBox.hidden = true;
    els.showAnswerBtn.disabled = true;
    els.viewStudyDetailBtn.disabled = true;
    setStudyStep(null);
    els.quizPrompt.textContent = "Redo att börja";
    renderStudyStats();
  });
  els.dailyNewWordTargetSelect?.addEventListener("change", async (event) => {
    state.dailyNewWordTarget = Number(event.target.value) || 10;
    persistUserPreferences();
    state.dailyStudy = ensureDailyStudyPlan(state.studyScope);
    await persistDailyStudyPlan(state.dailyStudy);
    renderStudyStats();
  });

  els.checkSpellingBtn.addEventListener("click", checkCurrentSpelling);
  els.spellingInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      checkCurrentSpelling();
    }
  });
  els.reviewActions.addEventListener("click", (event) => {
    const result = event.target.closest("[data-result]")?.dataset.result;
    if (result) recordQuiz(result);
  });
  els.closeStudySessionBtn.addEventListener("click", closeStudySession);
  els.closeSessionCompleteBtn.addEventListener("click", closeStudySession);
  els.startReviewFromCompleteBtn?.addEventListener("click", () => {
    closeStudySession();
    startStudySession("review").catch((error) => console.error("[Min Ordbok] Failed to start review from completion", error));
  });
  els.studySessionDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeStudySession();
  });
  els.studySessionDialog.addEventListener("close", closeStudySession);
  els.studySessionMoreBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    els.studySessionMoreMenu.hidden = !els.studySessionMoreMenu.hidden;
  });
  els.studySessionMoreMenu.addEventListener("click", async (event) => {
    const menuAction = event.target.closest("[data-session-menu-action]")?.dataset.sessionMenuAction;
    if (!menuAction) {
      const saveBook = event.target.closest("[data-session-save-book]")?.dataset.sessionSaveBook;
      if (!saveBook) return;
      const word = currentStudySessionWord();
      if (!word) return;
      closeStudySessionMoreMenu();
      if (saveBook === "__new__") {
        const name = normalizeNotebookName(prompt("Namn på ny bok", ""));
        if (!clean(name)) return;
        createNotebookByName(name);
        await saveWordToNotebook(word, name);
        return;
      }
      await saveWordToNotebook(word, saveBook);
      return;
    }
    event.preventDefault();
    const word = currentStudySessionWord();
    closeStudySessionMoreMenu();
    if (!word) return;
    if (menuAction === "learned") {
      await markCurrentStudyWordLearned();
    }
    if (menuAction === "edit") openWordDialog(word);
  });
  els.studySessionActions.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-study-action]")?.dataset.studyAction;
    if (!action) return;
    const word = currentStudySessionWord();
    if (!word) return;
    closeStudySessionMoreMenu();
    if (action === "listen") {
      speakSwedish(word.swedish);
      return;
    }
    if (action === "spell") {
      state.studySession.stage = "spell";
      state.studySession.result = null;
      resetStudySessionSpelling(state.studySession);
      renderStudySession();
      return;
    }
    if (action === "check") {
      await submitStudySessionAnswer();
      return;
    }
    if (action === "learned") {
      await markCurrentStudyWordLearned();
      return;
    }
    if (action === "next") {
      if (state.studySession?.stage === "spell") {
        if (state.studySession.mode === "new" && !validateLearnWordBeforeNext()) return;
        await completeCurrentStudyWordFromSpelling();
      } else {
        goToNextStudyWord();
      }
      return;
    }
    if (action === "retry") {
      retryStudyWord();
      return;
    }
    if (action === "reveal") {
      revealCurrentStudyWord();
      return;
    }
  });
  [els.sessionWordInput, els.sessionCollocationInput].forEach((input) => {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (state.studySession?.stage === "spell") {
          if (state.studySession.mode === "new") {
            if (validateLearnWordBeforeNext()) void completeCurrentStudyWordFromSpelling();
          } else {
            submitStudySessionAnswer();
          }
        }
      }
    });
  });
  document.addEventListener("click", (event) => {
    if (els.studySessionMoreMenu.hidden) return;
    if (event.target.closest("#studySessionMoreMenu") || event.target.closest("#studySessionMoreBtn")) return;
    closeStudySessionMoreMenu();
  });
  document.addEventListener("click", (event) => {
    if (els.detailMoreMenu?.hidden) return;
    if (event.target.closest("#detailMoreMenu") || event.target.closest("#detailMoreBtn")) return;
    closeDetailMoreMenu();
  });
  document.addEventListener("click", (event) => {
    if (els.readingMoreMenu?.hidden) return;
    if (event.target.closest("#readingMoreMenu") || event.target.closest("#readingMoreBtn")) return;
    closeReadingMoreMenu();
  });
  document.addEventListener("click", (event) => {
    if (els.shadowingMoreMenu?.hidden) return;
    if (event.target.closest("#shadowingMoreMenu") || event.target.closest("#shadowingMoreBtn")) return;
    closeShadowingMoreMenu();
  });
  els.profileLoginButton?.addEventListener("click", () => {
    handleAuthButtonClick().catch((error) => {
      console.error("[Min Ordbok] Auth action failed", error);
      setAuthMessage(error.message || "Kunde inte slutföra inloggningen.");
    });
  });
  els.topbarAuthButton?.addEventListener("click", () => {
    if (state.auth.user?.id) {
      showProfilePage("main");
      activateView("profileView");
      return;
    }
    openAuthDialog("login");
  });
  els.authLoginTab?.addEventListener("click", () => {
    setAuthMode("login");
    setAuthMessage("");
  });
  els.authSignupTab?.addEventListener("click", () => {
    setAuthMode("signup");
    setAuthMessage("");
  });
  els.authChangeEmailBtn?.addEventListener("click", returnToAuthEmailStep);
  els.authDialog?.addEventListener("click", (event) => {
    const provider = event.target.closest("[data-auth-provider]")?.dataset.authProvider;
    if (!provider) return;
    signInWithAuthProvider(provider).catch((error) => {
      console.error("[Min Ordbok] OAuth action failed", error);
      state.auth.busy = false;
      renderAuthState();
      setAuthMessage(error.message || "Kunde inte starta inloggningen.");
    });
  });
  els.profileSignupButton?.addEventListener("click", () => {
    openAuthDialog("signup");
  });
  els.profileGuestButton?.addEventListener("click", () => activateView("homeView"));
  els.profileSignedInGrid?.addEventListener("click", (event) => {
    const page = event.target.closest("[data-profile-page]")?.dataset.profilePage;
    if (page) {
      showProfilePage(page);
      return;
    }
    if (event.target.closest("[data-profile-back]")) showProfilePage("main");
  });
  els.profileStartCard?.addEventListener("click", () => {
    openAuthDialog("signup");
  });
  els.profileReadingHistoryBtn?.addEventListener("click", () => activateView("readingView"));
  els.reviewQueueMarkPageBtn?.addEventListener("click", markCurrentReviewPageReviewed);
  els.reviewQueuePrevBtn?.addEventListener("click", () => {
    loadReviewQueuePage(Math.max(0, (state.reviewQueueOffset || 0) - REVIEW_QUEUE_PAGE_SIZE));
  });
  els.reviewQueueNextBtn?.addEventListener("click", () => {
    loadReviewQueuePage((state.reviewQueueOffset || 0) + REVIEW_QUEUE_PAGE_SIZE);
  });
  els.profileLogoutButton?.addEventListener("click", () => {
    handleAuthButtonClick().catch((error) => {
      console.error("[Min Ordbok] Auth action failed", error);
      setAuthMessage(error.message || "Kunde inte slutföra inloggningen.");
    });
  });
  els.authForm?.addEventListener("submit", (event) => {
    submitAuthForm(event).catch((error) => {
      console.error("[Min Ordbok] Auth submit failed", error);
      state.auth.busy = false;
      renderAuthState();
      setAuthMessage(error.message || "Kunde inte skicka inloggningslänken.");
    });
  });
  els.closeAuthDialogBtn?.addEventListener("click", closeAuthDialog);
  els.authDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAuthDialog();
  });
}

function setupInstallPrompt() {
  if (!els.installBtn) return;
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    els.installBtn.hidden = false;
  });
  els.installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBtn.hidden = true;
  });
}

function setupCrossOriginTransfer() {
  if (!isLocalDevelopmentOrigin()) return;
  const allowedOrigins = new Set([window.location.origin, localOriginForPort("4174")]);
  window.addEventListener("message", async (event) => {
    if (event.data?.type !== "SWEDISH_VOCAB_EXPORT_REQUEST") return;
    if (!allowedOrigins.has(event.origin)) return;
    event.source?.postMessage(
      {
        type: "SWEDISH_VOCAB_EXPORT_RESPONSE",
        words: await readWords(),
        history: readLocalHistory(),
      },
      event.origin,
    );
  });
}

function deleteDatabaseByName(name) {
  return new Promise((resolve) => {
    if (!("indexedDB" in window)) {
      resolve();
      return;
    }
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function cleanupOfficialLocalData() {
  [
    LOCAL_WORDS_KEY,
    LOCAL_HISTORY_KEY,
    LOCAL_FAVORITES_KEY,
    LOCAL_NOTEBOOKS_KEY,
    LEGACY_NOTEBOOKS_KEY,
    LEGACY_PLAIN_USER_BOOKS_KEY,
    LEGACY_PLAIN_NOTEBOOKS_KEY,
    LEGACY_PLAIN_DAILY_STUDY_KEY,
    LOCAL_LEARNED_WORDS_KEY,
    LOCAL_CUSTOM_WORDS_KEY,
    LOCAL_DAILY_STUDY_KEY,
    LOCAL_DAILY_STUDY_SESSION_KEY,
    LOCAL_DAILY_REVIEW_SESSION_KEY,
    LOCAL_STUDY_STATS_KEY,
    LOCAL_STORAGE_SCHEMA_KEY,
    LOCAL_BACKUPS_KEY,
    "swedish-vocab-pwa.shadowing",
    "swedish-vocab-pwa.shadowingItems",
  ].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore cleanup failures.
    }
  });
  void deleteDatabaseByName(DB_NAME);
  void shadowingStore.clearShadowingStore();
}

async function resetAppData() {
  localStorage.clear();
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
  if ("indexedDB" in window) {
    await Promise.all([deleteDatabaseByName(DB_NAME), deleteDatabaseByName("spraklab-sync")]);
  }
  await shadowingStore.clearShadowingStore();
  await restoreBuiltInWordPacks();
  await applyManualRelatedWordExamples();
  await loadData();
  console.info("[Min Ordbok] Återställ data", {
    wordsLength: state.words.length,
    booksLength: getNotebooks().length,
    fromDefaultLibrary: true,
  });
  location.reload();
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter(
          (registration) =>
            registration.active?.scriptURL && !new URL(registration.active.scriptURL).pathname.endsWith("/sw.js"),
        )
        .map((registration) => registration.unregister()),
    );
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.replace("/");
    });
    const registration = await navigator.serviceWorker.register("./sw.js?v=63", { scope: "./" });
    await registration.update();
    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

function setupLayoutDiagnostics(force = false) {
  if (document.getElementById("layoutDiagnostics")) return;
  if (!force && new URLSearchParams(location.search).get("debug") !== "layout") {
    const brand = document.querySelector(".brand-lockup");
    if (!brand) return;
    let taps = 0;
    let resetTimer = 0;
    brand.addEventListener("click", () => {
      taps += 1;
      clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        taps = 0;
      }, 2500);
      if (taps >= 5) setupLayoutDiagnostics(true);
    });
    return;
  }

  const safeAreaProbe = document.createElement("div");
  safeAreaProbe.setAttribute("aria-hidden", "true");
  safeAreaProbe.style.cssText =
    "position:fixed;left:0;bottom:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
  document.body.append(safeAreaProbe);

  const panel = document.createElement("pre");
  panel.id = "layoutDiagnostics";
  panel.style.cssText =
    "position:fixed;inset:8px;z-index:2147483647;margin:0;padding:12px;overflow:auto;background:rgba(0,0,0,.9);color:#fff;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;user-select:text;-webkit-user-select:text";
  document.body.append(panel);

  const snapshots = {};
  const selectors = {
    html: document.documentElement,
    body: document.body,
    root: document.getElementById("root"),
    appShell: document.querySelector(".app-shell"),
    startupSplash: document.querySelector(".startup-splash"),
    appContent: document.querySelector("main"),
    bottomNav: document.querySelector(".tabbar"),
  };

  const measure = (label) => {
    const elements = {};
    for (const [name, element] of Object.entries(selectors)) {
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      elements[name] = {
        rect: {
          top: Number(rect.top.toFixed(2)),
          bottom: Number(rect.bottom.toFixed(2)),
          height: Number(rect.height.toFixed(2)),
        },
        computed: {
          height: style.height,
          minHeight: style.minHeight,
          paddingBottom: style.paddingBottom,
          marginBottom: style.marginBottom,
          bottom: style.bottom,
          position: style.position,
          backgroundColor: style.backgroundColor,
        },
      };
    }
    snapshots[label] = {
      viewport: {
        innerHeight: window.innerHeight,
        clientHeight: document.documentElement.clientHeight,
        visualViewportHeight: window.visualViewport?.height ?? null,
        screenHeight: window.screen.height,
        devicePixelRatio: window.devicePixelRatio,
        safeAreaInsetBottom: parseFloat(getComputedStyle(safeAreaProbe).paddingBottom) || 0,
        standalone: window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches,
      },
      elements,
    };
    panel.textContent = JSON.stringify(snapshots, null, 2);
  };

  measure("loading");
  const observer = new MutationObserver(() => {
    if (document.body.dataset.appReady === "ready") {
      requestAnimationFrame(() => measure("ready"));
      observer.disconnect();
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["data-app-ready"] });
  window.addEventListener("resize", () => measure("resize"), { passive: true });
  window.visualViewport?.addEventListener("resize", () => measure("visualViewportResize"), { passive: true });
}

async function bootstrapApp() {
  const authCallbackLaunch = isSupabaseAuthCallbackLocation();
  closeRestoredDialogsImmediately();
  try {
    if (localStorage.getItem("swedish-vocab-pwa.appBootVersion") !== APP_BOOT_VERSION) {
      localStorage.setItem("swedish-vocab-pwa.appBootVersion", APP_BOOT_VERSION);
      cleanupLegacyViewState();
    }
  } catch {
    // Ignore storage failures; startup cleanup still runs in memory.
  }
  normalizeStartupLocation();
  cleanupLegacyViewState();
  cleanupOfficialLocalData();
  bindEvents();
  setupShadowingAudio();
  setupHomeGreeting();
  setupAuthUiSync();
  window.addEventListener("spraklab:sync-status", (event) => {
    const detail = event.detail || {};
    if (detail.userId && detail.userId !== state.auth.user?.id) return;
    if (detail.status) state.sync.status = detail.status;
    if (detail.pending !== undefined) state.sync.pending = Math.max(0, Number(detail.pending || 0) || 0);
    if (detail.lastSyncedAt) state.sync.lastSyncedAt = Number(detail.lastSyncedAt) || state.sync.lastSyncedAt;
    renderProfileSyncSummary();
  });
  window.addEventListener("online", () => void syncPendingUserData({ reloadData: true }));
  window.addEventListener("offline", renderProfileSyncSummary);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void syncPendingUserData();
  });
  setupEffectiveStudyTimeTracking();
  setupInstallPrompt();
  setupCrossOriginTransfer();
  await refreshAuthState();
  clearAuthCallbackLocation();
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.addEventListener("pageshow", () => {
    closeRestoredDialogsImmediately();
    enforceStartsideStartup({ resetScroll: true });
  });
  window.addEventListener("hashchange", () => {
    enforceStartsideStartup({ resetScroll: true });
  });
  window.addEventListener("popstate", () => {
    enforceStartsideStartup({ resetScroll: true });
  });
  enforceStartsideStartup({ resetScroll: false });
  startupLoadingTimeoutId = window.setTimeout(() => {
    if (startupLoadingTimedOut) return;
    if (state.words.length > 0) return;
    if (lastWordLoadDebug.remoteReadOk && lastWordLoadDebug.remoteLength > 0) return;
    startupLoadingTimedOut = true;
    console.warn("[Min Ordbok] Vocabulary startup is still loading; keeping the current view open.");
  }, STARTUP_LOADING_TIMEOUT_MS);

  try {
    await loadData();
    if (state.auth.user?.id && remotePhase4Snapshot?.enabled && lastWordLoadDebug.remoteReadOk) {
      await remoteDb.recordSuccessfulSync();
    }
    await syncPendingUserData({ reloadData: true });
    await waitForImageReady(els.homeHeroImage);
  } catch (error) {
    console.error("[Min Ordbok] Startup failed", error);
    alert(error.message || "Kunde inte ladda Supabase-data.");
    state.words = [];
    state.history = [];
    state.favoriteStates = new Map();
    state.studyStats = readStudyStats();
    state.dailyStudy = null;
    state.shadowing = [];
    state.shadowingRecordings = [];
    renderAll();
  } finally {
    window.clearTimeout(startupLoadingTimeoutId);
    startupLoadingTimeoutId = null;
    startupLoadingTimedOut = false;
    normalizeStartupLocation();
    cleanupLegacyViewState();
    if (authCallbackLaunch && state.auth.user?.id) {
      activateView("profileView");
    } else if (isStandalonePwaLaunch()) {
      forceStartsideOnPwaLaunch();
    } else {
      enforceStartsideStartup({ resetScroll: true });
    }
    startAutoEnrichFromUrl();
    appInitializationComplete = true;
    document.body.dataset.appReady = "ready";
    void registerServiceWorker();
  }
}

setupLayoutDiagnostics();
void bootstrapApp();
