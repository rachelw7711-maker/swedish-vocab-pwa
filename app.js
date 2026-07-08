import * as remoteDb from "./src/lib/db.js?v=116";
import * as shadowingStore from "./src/lib/shadowing-store.js";
import { supabase } from "./src/lib/supabase.js";

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
const LOCAL_STUDY_STATS_KEY = "swedish-vocab-pwa.studyStats";
const LOCAL_STORAGE_SCHEMA_KEY = "swedish-vocab-pwa.storageSchemaVersion";
const LOCAL_BACKUPS_KEY = "swedish-vocab-pwa.backups";
const STORAGE_SCHEMA_VERSION = 1;
const DEFAULT_FAVORITE_CATEGORY = DEFAULT_NOTEBOOK;
const STUDY_SCOPE_ALL = "all";
const STUDY_SCOPE_FAVORITES = "favorites";
const STUDY_SCOPE_LEARNED = "learned";
const DAILY_NEW_WORD_LIMIT = 10;
const MAX_SPELLING_ATTEMPTS = 3;
const STARTUP_LOADING_TIMEOUT_MS = 30000;
const DEFAULT_STUDY_CATEGORIES = ["Ord om samhället", "viktiga verb"];
const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1"]);
const APP_BOOT_VERSION = "stable-start-20260526-5";
const SHADOWING_STANDARD_AUDIO_BUCKET = "shadowing-standard-audio";
const SHADOWING_RECORDINGS_BUCKET = "shadowing-recordings";
const DEFAULT_ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
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
  phrase: "Fras",
  abbreviation: "Förkortning",
  other: "Övrigt",
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
const allWordPacks = [];
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
  stopBatchEnrich: false,
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
const shadowingStageLabels = {
  1: "Level 1 Listen",
  2: "Level 2 Repeat",
  3: "Level 3 Assisted Shadowing",
  4: "Level 4 Real Shadowing",
  5: "Level 5 Blind Shadowing",
};

const els = {
  totalCount: document.querySelector("#totalCount"),
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
  backToBooksBtn: document.querySelector("#backToBooksBtn"),
  bookActionMenu: document.querySelector("#bookActionMenu"),
  historyList: document.querySelector("#historyList"),
  shadowingList: document.querySelector("#shadowingList"),
  shadowingItemId: document.querySelector("#shadowingItemId"),
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
  shadowingLoopRange: document.querySelector("#shadowingLoopRange"),
  shadowingRecordingPanel: document.querySelector("#shadowingRecordingPanel"),
  shadowingRecordingStatus: document.querySelector("#shadowingRecordingStatus"),
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
    chinese: clean(word.chinese),
    english: clean(word.english || ""),
    forms: clean(word.forms || ""),
    example: clean(word.example || ""),
    collocations: clean(word.collocations || ""),
    related_words: clean(firstDefined(word.related_words, word.relatedWords, "")),
    note: clean(firstDefined(word.note, word.comment, word.kommentar, "")),
    notebook,
    book_names: explicitBooks,
    tags,
    favorite: Boolean(word.favorite),
    status: clean(firstDefined(word.status, "")),
    learned: Boolean(word.learned),
    review_count: Number(firstDefined(word.review_count, word.reviewCount, 0)) || 0,
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

function readLocalArray(key) {
  return [];
}

function readBackedUpLocalArrays(key) {
  return [];
}

function backupLocalStorageValue(key) {
  return key;
}

function writeLocalJson(key, value) {
  return value;
}

function writeLocalArray(key, value) {
  return value;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Kunde inte läsa ljudfilen."));
    reader.readAsDataURL(file);
  });
}

function readLocalObject(key, fallback = {}) {
  return fallback;
}

function writeLocalObject(key, value) {
  return value;
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

function migrateNotebookStorage() {
  cleanupOfficialLocalData();
}

function migrateStorageSchema() {
  cleanupOfficialLocalData();
}

function readLocalWords() {
  return [];
}

function writeLocalWords(words) {
  return words;
}

function isBuiltInWord(word) {
  return Boolean(word?.id) && builtInWordIds.has(clean(word.id));
}

function syncUserDataSnapshots(words = state.words, { preserveExisting = false } = {}) {
  return words;
}

function favoriteKey(word) {
  return clean(word?.id) || [word?.notebook, word?.swedish, word?.pos].map(clean).join("::").toLowerCase();
}

function readFavoriteStates() {
  return new Map();
}

function writeFavoriteStates(states) {
  return states;
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
  return state.dailyStudy || {};
}

function writeDailyStudy(value) {
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
    updatedAt: Date.now(),
  };
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
    },
  }).catch((error) => console.warn("[Min Ordbok] Remote preferences sync failed.", error));
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
  const sessionIds = {};
  (snapshot.studySessions || []).forEach((session) => {
    if (session.mode) sessionIds[session.mode] = session.id;
  });
  const next = {
    ...plan,
    remotePlanId: snapshot.studyPlan?.id || plan.remotePlanId || null,
    remoteSessionIds: { ...(plan.remoteSessionIds || {}), ...sessionIds },
  };
  writeDailyStudy(next);
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
  writeFavoriteStates(state.favoriteStates);
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
  return {
    words: mergeWordLists(remoteWords),
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
  return normalizeWord({
    ...primary,
    favorite: primary.favorite || secondary.favorite,
    learned: primary.learned || secondary.learned,
    review_count: Math.max(primary.review_count || 0, secondary.review_count || 0),
    wrong_count: Math.max(primary.wrong_count || 0, secondary.wrong_count || 0),
    spelling_correct_count: Math.max(primary.spelling_correct_count || 0, secondary.spelling_correct_count || 0),
    first_studied_at: primary.first_studied_at || secondary.first_studied_at,
    last_studied_at: Math.max(primary.last_studied_at || 0, secondary.last_studied_at || 0) || null,
    last_reviewed: Math.max(primary.last_reviewed || 0, secondary.last_reviewed || 0) || null,
    last_study_date: primary.last_study_date || secondary.last_study_date,
    last_review_date: primary.last_review_date || secondary.last_review_date,
    next_review_at: Math.min(primary.next_review_at || Date.now(), secondary.next_review_at || Date.now()),
    mastered_at: primary.mastered_at || secondary.mastered_at,
  });
}

function initialLibraryWords() {
  return [];
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

async function refreshDailyProgress() {
  state.dailyProgress = await remoteDb.loadDailyWordProgress({
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
  await refreshDailyProgress();
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
  state.favoriteStates = readFavoriteStates();
  state.words = words
    .map(normalizeWord)
    .map(applyFavoriteState)
    .sort((a, b) => b.updated_at - a.updated_at);
  syncUserDataSnapshots(state.words, { preserveExisting: true });
  state.history = history.sort((a, b) => b.created_at - a.created_at);
  state.studyStats = readStudyStats();
  state.dailyStudy = applyRemoteStudyState(ensureDailyStudyPlan(state.studyScope), remotePhase4Snapshot);
  void persistDailyStudyPlan(state.dailyStudy);
  state.shadowingRecordings = remotePhase4Snapshot?.shadowingRecordings || [];
  state.shadowing = mergeShadowingItemsForApp(remotePhase4Snapshot?.shadowingItems || []);
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
  if (swedish.startsWith(query)) return 1;
  if (swedish.includes(query)) return 2;
  if (index.some((entry) => entry === query)) return 3;
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
  if (state.activeView === "notebookView") {
    renderNotebook();
    return;
  }
  if (state.activeView === "historyView") {
    renderShadowing();
    return;
  }
  renderWords();
  renderDictionary();
}

function renderStats() {
  const words = getLibraryWordsForDisplay();
  els.totalCount.textContent = words.length;
  els.learnedCount.textContent = words.filter((word) => word.learned).length;
  els.dueCount.textContent = words.filter(isDue).length;
}

function renderStudyStats() {
  state.dailyStudy = ensureDailyStudyPlan();
  if (!state.dailyStudy) return;
  const newSession = readDailySession("new", state.dailyStudy);
  const reviewSession = readDailySession("review", state.dailyStudy);
  const todayNew = Math.min(Number(state.dailyProgress?.todayNewCount || 0) || 0, DAILY_NEW_WORD_LIMIT);
  const todayReview = Math.min(Number(state.dailyProgress?.dueReviewCount || 0) || 0, DAILY_NEW_WORD_LIMIT);
  const streak = state.studyStats?.current_streak || 0;
  const mastered = state.words.filter((word) => word.learned).length;
  const completedTotal = todayNew;
  els.studyNewCount.textContent = `${todayNew}/${DAILY_NEW_WORD_LIMIT}`;
  els.studyReviewCount.textContent = `${todayReview}/${DAILY_NEW_WORD_LIMIT}`;
  els.studyStreakCount.textContent = streak;
  els.studyMasteredCount.textContent = mastered;
  els.entryNewCount.textContent = `Today's New Words: ${todayNew}/${DAILY_NEW_WORD_LIMIT}`;
  els.entryReviewCount.textContent = todayReview > 0
    ? `Today's Review: ${todayReview}/${DAILY_NEW_WORD_LIMIT}`
    : "No review scheduled today";
  if (els.startNewStudyBtn) els.startNewStudyBtn.disabled = todayNew >= DAILY_NEW_WORD_LIMIT || newSession.completed;
  if (els.startReviewStudyBtn) els.startReviewStudyBtn.disabled = todayReview === 0 || reviewSession.completed;
  els.completeTodayCount.textContent = `${completedTotal} klara idag`;
  els.completeMasteredCount.textContent = `${mastered} lärda ord`;
  els.completeStreakCount.textContent = `${streak} dagar i rad`;
  const parts = [
    `Nyord ${todayNew}/${DAILY_NEW_WORD_LIMIT}`,
    todayReview > 0 ? `Repetition ${todayReview}/${DAILY_NEW_WORD_LIMIT}` : "No review scheduled today",
    `Streak ${streak}`,
    `Lärt mig ${mastered}`,
  ];
  if (!state.currentQuiz && els.quizHint) {
    els.quizHint.textContent = parts.join(" · ");
  }
  els.studyCompletePanel.hidden = !(todayNew >= DAILY_NEW_WORD_LIMIT && todayReview === 0 && !state.currentQuiz);
}

function setupHomeGreeting() {
  if (!els.homeGreeting) return;
  els.homeGreeting.innerHTML = "<span>Hej!</span><span>Bra jobbat idag.</span>";
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
  activateView("libraryView");
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
  const query = state.query.toLowerCase();
  const visibleWords = getVisibleWords();
  const exactWord = visibleWords.find((word) => clean(word.swedish).toLowerCase() === query);
  if (exactWord) return { word: exactWord, mode: "library" };
  if (visibleWords.length > 0) return { word: visibleWords[0], mode: "library" };

  const dictionaryMatches = getDictionaryMatches();
  const exactDictionary = dictionaryMatches.find((word) => clean(word.swedish).toLowerCase() === query);
  if (exactDictionary) return { word: exactDictionary, mode: "dictionary" };
  if (dictionaryMatches.length > 0) return { word: dictionaryMatches[0], mode: "dictionary" };
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
  card.querySelector(".pos-badge").textContent = posBadgeLabel(word.pos);
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
    addStudyDetail(details, "Ordklass", formatPosForStudy(word));
    addStudyDetail(details, "Kinesisk betydelse", clean(word.chinese) || "Kinesisk betydelse saknas.");
    addStudyDetail(details, "Svensk förklaring", clean(word.english) || "Svensk förklaring saknas.");
    addStudyDetail(details, "Grammatik", formatGrammarForStudy(word));
    addStudyDetail(details, "Exempel", formatExampleForStudy(word.example));
    addStudyDetail(details, "Fraser", createStudyCollocationList(word.collocations, word.example));
    addStudyDetail(details, "Relaterade ord", createRelatedWordList(word.related_words));
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

function formatGrammarForStudy(word) {
  const items = splitForms(word.forms);
  if (items.length === 0) return "Böjning saknas.";
  if (word.pos === "verb") {
    const forms = {
      imperativ: "",
      infinitiv: clean(word.swedish),
      presens: "",
      preteritum: "",
      supinum: "",
    };
    items.forEach((item) => {
      const [rawLabel, ...valueParts] = item.split(":");
      if (valueParts.length === 0) return;
      const label = rawLabel.trim().toLowerCase();
      const value = valueParts.join(":").trim();
      if (label.includes("imperativ")) forms.imperativ = value;
      if (label.includes("infinitiv")) forms.infinitiv = value;
      if (label.includes("presens")) forms.presens = value;
      if (label.includes("preteritum")) forms.preteritum = value;
      if (label.includes("supinum")) forms.supinum = value;
    });
    const ordered = [forms.imperativ && `${forms.imperativ}!`, forms.infinitiv, forms.presens, forms.preteritum, forms.supinum]
      .filter(Boolean);
    return ordered.length ? `${ordered.join("/")}.` : `${items.join("/")}.`;
  }
  return `${items.map((item) => item.replace(/\s*:\s*/g, ": ")).join("/")}.`;
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

function addStudyDetail(list, term, content) {
  const section = document.createElement("section");
  section.className = "study-detail-section";
  if (term === "Kinesisk betydelse") section.classList.add("chinese-meaning-section");
  if (term === "Grammatik") section.classList.add("grammar-section");
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

function createStudyCollocationList(collocations, fallbackExample) {
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
    list.append(li);
  });
  return list;
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

function openWordDetail(word, sourceMode = "library") {
  if (!word) return;
  renderWordDetail(word, sourceMode);
  if (!els.detailDialog.open) els.detailDialog.showModal();
}

function getOpenDetailWord() {
  const wordId = els.detailDialog.dataset.wordId;
  if (!wordId) return null;
  return state.words.find((item) => item.id === wordId) || dictionaryWords.find((item) => item.id === wordId) || null;
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

function recordingAudioDescriptor(recording = getLatestShadowingRecording(state.selectedShadowingId)) {
  if (!recording?.audio_path) return null;
  return {
    bucket: recording.audio_bucket || SHADOWING_RECORDINGS_BUCKET,
    path: recording.audio_path,
    mimeType: recording.audio_mime_type || "audio/webm",
  };
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
    return;
  }
  revokeShadowingRecordingObjectUrl();
  state.shadowingRecordingUrl = await signedShadowingAudioUrl(descriptor.bucket, descriptor.path);
  state.shadowingRecordingMimeType = descriptor.mimeType;
  state.shadowingRecordingBlob = null;
  state.shadowingRecordingItemId = itemId;
  shadowingRecordingAudio.src = state.shadowingRecordingUrl;
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

function selectShadowingItem(itemId) {
  const items = getShadowingItems();
  const selected = items.find((item) => item.id === itemId) || items[0] || null;
  state.selectedShadowingId = selected?.id || "";
  void applyShadowingRecordingForItem(state.selectedShadowingId).then(() => renderShadowingPlayer());
  renderShadowing();
}

function resetShadowingForm() {
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

function updateShadowingAudioHint() {
  if (els.shadowingAudioHint) els.shadowingAudioHint.textContent = "AI voice is under development";
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
    els.shadowingContinueBtn.textContent = "Starta shadowing";
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
  await generateStandardShadowingAudio();
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
  const hasStandardAudio = Boolean(standardAudioDescriptor(item));
  const hasRecording = Boolean(recordingAudioDescriptor() || (state.shadowingRecordingBlob && state.shadowingRecordingItemId === item?.id && state.shadowingRecordingUrl));
  if (els.shadowingPlayPauseBtn) els.shadowingPlayPauseBtn.textContent = "Spela";
  if (els.shadowingPlayPauseBtn) els.shadowingPlayPauseBtn.disabled = !item || !hasStandardAudio;
  if (els.shadowingPauseBtn) els.shadowingPauseBtn.disabled = !item || !hasStandardAudio;
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
  if (els.shadowingPlayRecordingBtn) els.shadowingPlayRecordingBtn.disabled = !item || !hasRecording;
  if (els.shadowingExportStandardPlayBtn) els.shadowingExportStandardPlayBtn.disabled = !item || !hasStandardAudio;
  if (els.shadowingExportRecordingPlayBtn) els.shadowingExportRecordingPlayBtn.disabled = !item || !hasRecording;
  if (els.shadowingCompareBtn) els.shadowingCompareBtn.disabled = !item || !hasRecording;
  if (els.shadowingStopRecordBtn) els.shadowingStopRecordBtn.disabled = !item || !shadowingRecorder;
  if (els.generateShadowingAudioBtn) els.generateShadowingAudioBtn.disabled = !item;
  if (els.downloadShadowingStandardBtn) els.downloadShadowingStandardBtn.disabled = !item || !hasStandardAudio;
  if (els.downloadShadowingRecordingBtn) els.downloadShadowingRecordingBtn.disabled = !item || !hasRecording;
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
    preview.textContent = item.chinese || "无中文翻译";
    header.append(title, meta, preview);
    const actions = document.createElement("div");
    actions.className = "shadowing-item-actions";
    actions.innerHTML = `
      <button type="button" data-shadowing-action="edit" data-shadowing-id="${escapeHtml(item.id)}">Redigera</button>
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
    if (els.shadowingLoopRange) els.shadowingLoopRange.textContent = "A-B: 0:00 - 0:00";
    if (els.shadowingRecordingPanel) els.shadowingRecordingPanel.hidden = true;
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
    els.shadowingSubtitle.innerHTML = subtitlesHidden
      ? "<strong>字幕已隐藏</strong><span>切换级别或打开字幕查看文本。</span>"
      : `<strong>${escapeHtml(item.swedish || "—")}</strong><span>${escapeHtml(item.chinese || "—")}</span>`;
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
      els.shadowingRecordingStatus.textContent = shadowingRecorder ? "正在录音" : state.shadowingRecordingUrl ? "已录音" : "尚未录音";
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
    tts_voice_id: existing?.tts_voice_id || "",
    tts_voice_name: existing?.tts_voice_name || "",
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

async function generateStandardShadowingAudio() {
  const item = ensureSelectedShadowingItem();
  if (!item?.id) {
    alert("Spara texten innan du genererar standardljud.");
    return;
  }
  const text = clean(els.shadowingSwedishInput?.value) || clean(item.swedish);
  if (!text) {
    alert("Skriv svensk text innan du genererar ljud.");
    return;
  }
  if (els.generateShadowingAudioBtn) {
    els.generateShadowingAudioBtn.disabled = true;
    els.generateShadowingAudioBtn.textContent = "Generating...";
  }
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const token = sessionData?.session?.access_token || "";
    if (!token) throw new Error("Logga in för att generera standardljud.");
    await remoteDb.upsertShadowingItem({ ...item, swedish: text });
    const response = await fetch("/api/shadowing/tts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        voiceId: item.tts_voice_id || DEFAULT_ELEVENLABS_VOICE_ID,
        itemId: item.id,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Kunde inte generera standardljud.");
    if (payload.item) {
      const updatedItem = shadowingStore.normalizeShadowingItem(payload.item);
      remotePhase4Snapshot = {
        ...(remotePhase4Snapshot || {}),
        shadowingItems: mergeShadowingItemsForApp([updatedItem], remotePhase4Snapshot?.shadowingItems || []),
      };
      await refreshShadowingState();
      state.selectedShadowingId = updatedItem.id;
      populateShadowingForm(updatedItem);
      renderShadowing();
    }
  } catch (error) {
    console.error("[Shadowing] Standard audio generation failed", error);
    alert(error.message || "Kunde inte generera standardljud.");
  } finally {
    if (els.generateShadowingAudioBtn) {
      els.generateShadowingAudioBtn.textContent = "Generate Standard Audio";
      updateShadowingPlaybackUI();
    }
  }
}

async function downloadStorageAudio(descriptor, filename) {
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
    alert("Generera standardljud först.");
    return;
  }
  await updateShadowingAudioSource(item);
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
  speechSynthesis?.cancel?.();
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
          const path = `${userId}/${selectedItem.id}/${timestamp}.webm`;
          return remoteDb.uploadShadowingAudio({
            bucket: SHADOWING_RECORDINGS_BUCKET,
            path,
            file: blob,
            contentType: mime,
            upsert: true,
          });
        })
        .then((upload) => remoteDb.upsertShadowingRecording({
          shadowing_item_id: selectedItem.id,
          audio_bucket: upload.bucket,
          audio_path: upload.path,
          audio_mime_type: mime,
          audio_size_bytes: blob.size,
          audio_duration_ms: durationMs,
          level: selectedItem.level,
          attempt_no: (state.shadowingRecordings || []).filter((row) => row.shadowing_item_id === selectedItem.id).length + 1,
        }))
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
}

function stopShadowingRecording() {
  if (!shadowingRecorder) return;
  try {
    shadowingRecorder.stop();
  } catch {
    // Ignore recorder teardown failures.
  }
}

function clearShadowingRecording() {
  revokeShadowingRecordingObjectUrl();
  state.shadowingRecordingUrl = "";
  state.shadowingRecordingMimeType = "";
  state.shadowingRecordingBlob = null;
  state.shadowingRecordingItemId = "";
  shadowingRecordingAudio.pause();
  shadowingRecordingAudio.src = "";
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
  const formValues = {
    ...existing,
    id: existing?.id || els.word_id.value || undefined,
    swedish: els.swedishInput.value,
    pos: els.posInput.value,
    pos_detail: els.pos_detailInput.value,
    chinese: els.chineseInput.value,
    english: els.englishInput.value,
    forms: els.formsInput.value,
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
  els.chineseInput.value = word?.chinese || "";
  els.englishInput.value = word?.english || "";
  els.formsInput.value = word?.forms || "";
  els.exampleInput.value = word?.example || "";
  els.collocationsInput.value = word?.collocations || "";
  els.related_wordsInput.value = word?.related_words || "";
  els.noteInput.value = word?.note || "";
  els.pasteWordInfoInput.value = "";
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
    chinese: els.chineseInput.value,
    english: els.englishInput.value,
    forms: els.formsInput.value,
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
  forceHomeView({ resetScroll: true });
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
  const response = await fetch("/api/generate-word", {
    method: "POST",
    headers: { "content-type": "application/json" },
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

function speakSwedish(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "sv-SE";
  utterance.rate = 0.88;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
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

function nextReviewTimestamp(reviewCount, isCorrect) {
  if (!isCorrect) return startOfDayTimestamp(1);
  const intervals = [1, 2, 4, 7, 14, 30, 60];
  const index = Math.max(0, Math.min(Number(reviewCount || 1) - 1, intervals.length - 1));
  return startOfDayTimestamp(intervals[index]);
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
  return getLibraryWordsForDisplay().filter((word) => !isWordInLearnedNotebook(word) && studyScopeMatches(word, scope));
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
  const candidates = eligibleStudyWords(scope);
  const reviewCandidatesAll = eligibleReviewWords(scope);
  const todayNewWordIds = uniqueIds(state.dailyProgress?.todayNewWordIds || []);
  const todayNewCount = Number(state.dailyProgress?.todayNewCount || todayNewWordIds.length || 0) || 0;
  const remainingNewLimit = Math.max(DAILY_NEW_WORD_LIMIT - todayNewCount, 0);
  const newCandidates = remainingNewLimit > 0
    ? candidates.filter((word) => !hasWordStudyHistory(word) && !todayNewWordIds.includes(word.id))
    : [];
  const availableWordIds = new Set(candidates.map((word) => word.id));
  const samePlan = existing.date === date && existing.scope === scope;
  const existingNewWordIds = samePlan
    ? uniqueIds(existing.newWordIds).filter((id) => availableWordIds.has(id))
    : [];
  const reviewWordIds = uniqueIds(state.dailyProgress?.dueReviewWordIds || [])
    .filter((id) => reviewCandidatesAll.some((word) => word.id === id))
    .slice(0, DAILY_NEW_WORD_LIMIT);
  const newWordIds = pickDailyNewWordIds(
    newCandidates,
    new Set(reviewWordIds),
    samePlan ? existingNewWordIds : [],
  ).slice(0, remainingNewLimit);
  const completedNewWordIds = todayNewWordIds;
  const completedReviewWordIds = samePlan ? uniqueIds(existing.completedReviewWordIds).filter((id) => reviewWordIds.includes(id)) : [];

  const plan = {
    date,
    scope,
    newWordIds,
    reviewWordIds,
    completedNewWordIds,
    completedReviewWordIds,
    spellingPassedWordIds: samePlan ? uniqueIds(existing.spellingPassedWordIds).filter((id) => newWordIds.includes(id)) : [],
    newSessionCompleted: todayNewCount >= DAILY_NEW_WORD_LIMIT,
    reviewSessionCompleted: reviewWordIds.length > 0 && completedReviewWordIds.length >= reviewWordIds.length,
    completedAt: samePlan ? existing.completedAt || null : null,
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
  if (mode === "new" && Number(state.dailyProgress?.todayNewCount || 0) >= DAILY_NEW_WORD_LIMIT) return true;
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
    .filter((word) => word && (mode === "review" || !isWordInLearnedNotebook(word)) && !completed.has(word.id));
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
    renderStudySessionActions([
      ...(session.mode === "review" ? [{ label: "Lyssna", action: "listen", kind: "secondary" }] : []),
      { label: "Check", action: "check", kind: "secondary", disabled: Boolean(session.spelling?.locked || session.spelling?.correct) },
      { label: "Next", action: "next", kind: "primary", disabled: !studySessionCanAdvance(session) },
    ]);
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
  const nextMasteryLevel = Math.min(5, Math.max(0, nextReviewCount));
  const mastered = session.mode === "review" && isCorrect && nextMasteryLevel >= 5;
  const status = !isCorrect ? "needs_review" : mastered ? "mastered" : "learning";
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
      spelling_correct_count: word.spelling_correct_count + (isCorrect ? 1 : 0),
      wrong_count: word.wrong_count + (isCorrect ? 0 : MAX_SPELLING_ATTEMPTS),
      next_review_at: session.mode === "review" ? nextReviewTimestamp(nextReviewCount, isCorrect) : startOfDayTimestamp(1),
    },
    session.mode === "review" ? "reviewed" : "updated",
  );
  if (!updated) {
    session.busy = false;
    renderStudySession();
    return;
  }
  markDailyCompleted(word.id);
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
    markDailyCompleted(word.id);
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

function markDailyCompleted(wordId) {
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
    void remoteDb.saveStudySessionItem({
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
  markDailyCompleted(word.id);
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

function normalizeStartupLocation() {
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

function activateView(viewId) {
  if (!viewId) return;
  closeTransientOverlays();
  if (viewId !== "historyView") closeShadowingPlayback();
  state.activeView = viewId;
  document.body.dataset.activeView = state.activeView;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === state.activeView);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === state.activeView);
  });
  window.scrollTo(0, 0);
  renderActiveView();
}

function forceHomeView({ resetScroll = true } = {}) {
  closeTransientOverlays();
  closeShadowingPlayback();
  state.activeView = "homeView";
  document.body.dataset.activeView = "homeView";
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

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.view === "notebookView") {
        state.selectedNotebook = "";
        resetListLimit("notebook");
      }
      activateView(tab.dataset.view);
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
    resetAppData().catch((error) => {
      console.error("[Min Ordbok] Reset failed", error);
      alert(error.message || "Kunde inte återställa data.");
    });
  });

  els.notebookSelect.addEventListener("change", (event) => {
    state.selectedNotebook = event.target.value;
    persistUserPreferences();
    resetListLimit("notebook");
    renderNotebookOptions();
    renderNotebook();
  });

  els.newShadowingBtn?.addEventListener("click", () => {
    if (!clean(els.shadowingSwedishInput?.value)) {
      els.shadowingSwedishInput?.focus();
      return;
    }
    state.shadowingUnknownExpanded = !state.shadowingUnknownExpanded;
    renderShadowingFlow();
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
    if (state.shadowingFlowStep === "preview" || state.shadowingUnknownExpanded) renderShadowingFlow();
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
  els.shadowingClearRecordingBtn?.addEventListener("click", clearShadowingRecording);
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
    const editButton = event.target.closest('[data-shadowing-action="edit"]');
    if (editButton) {
      const item = getShadowingItems().find((row) => row.id === editButton.dataset.shadowingId);
      if (item) {
        populateShadowingForm(item);
        state.selectedShadowingId = item.id;
        renderShadowing();
      }
      return;
    }
    const selectButton = event.target.closest("[data-shadowing-select]");
    if (!selectButton) return;
    selectShadowingItem(selectButton.dataset.shadowingSelect);
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
    if (!card) return;
    const action = event.target.closest("[data-action]")?.dataset.action;
    const word =
      state.words.find((item) => item.id === card.dataset.id) ||
      (state.generatedWord && clean(state.generatedWord.swedish).toLowerCase() === clean(card.dataset.swedish).toLowerCase()
        ? state.generatedWord
        : null) ||
      dictionaryWords.find((item) => clean(item.swedish).toLowerCase() === clean(card.dataset.swedish).toLowerCase());
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
        if (state.studySession?.stage === "spell") submitStudySessionAnswer();
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
}

function setupInstallPrompt() {
  if (!els.installBtn) return;
  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    els.installBtn.hidden = false;
  });
  els.installBtn.addEventListener("click", async () => {
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
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = resolve;
      request.onerror = resolve;
      request.onblocked = resolve;
    });
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
        .filter((registration) => registration.active?.scriptURL && !registration.active.scriptURL.endsWith("/sw.js"))
        .map((registration) => registration.unregister()),
    );
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      location.replace("/");
    });
    const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
    await registration.update();
    if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}

async function bootstrapApp() {
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
  setupInstallPrompt();
  setupCrossOriginTransfer();
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
    if (isStandalonePwaLaunch()) {
      forceStartsideOnPwaLaunch();
    }
    startAutoEnrichFromUrl();
    enforceStartsideStartup({ resetScroll: true });
    document.body.dataset.appReady = "ready";
    await registerServiceWorker();
  }
}

void bootstrapApp();
