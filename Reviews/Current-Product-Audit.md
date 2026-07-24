# Current Product Audit — SpråkLab

**Scope:** Read-only audit of the existing application as implemented today. Covers page/route structure, Home/Bibliotek/Profil, dictionary list & entry structure, and the Shadowing/Läsning/Video/Fraser/Uttryck functional areas.

**Method:** Static code audit of `app.js` (9,156 lines), `index.html` (981 lines), `styles.css` (5,511 lines), `server.mjs`, `api/shadowing/tts.js`. No runtime/browser testing was performed as part of this pass. All findings are cited `file:line`.

**Status legend:** `stable` = matches its own intent, no contradictions found · `inconsistent` = works but conflicts with another part of the app · `legacy` = superseded, dead, or leftover from a prior design · `incomplete` = partially wired, visibly unfinished, or a placeholder.

> **This document describes what exists. It is not a recommendation of what SpråkLab's product structure should be.** Every finding below is either already flagged for product-owner review, or should be treated as an open question by default until Volume A Part II (Functional Specifications) formally decides it.

---

## 1. Routes / Pages

### 1.1 Current implementation

There is no URL router. Navigation is an in-memory state machine: `state.activeView` + `activateView(viewId)` (`app.js:7927-7942`) toggle `.view.active` on `<section class="view">` elements and mirror the value onto `document.body.dataset.activeView`. Six top-level views exist in `index.html`:

| View id | Purpose | Reached via | File:line |
|---|---|---|---|
| `homeView` | Start page: greeting, search, daily study panel | Default at load; tab click | `index.html:79-192` |
| `libraryView` | "Bibliotek" — 4-card shelf (Ordbok/Shadowing/Läsning/Video) | Tab click | `index.html:194-235` |
| `wordLibraryView` | Full word list / dictionary / export panel | `openOrdlistaFromBooks()` `app.js:3161-3173` | `index.html:237-304` |
| `profileView` | Profil — signed-out card or 3-subpage signed-in grid | Tab click; topbar avatar | `index.html:306-426` |
| `notebookView` | "Ordbok" shelf of notebooks/wordbooks | Ordbok card, `data-open-book="notebookView"` | `index.html:428-470` |
| `historyView` | **Renders Shadowing**, not history | Shadowing card, `data-open-book="historyView"` | `index.html:472-638` |

Eight `<dialog>` overlays exist on top of this (auth, add/edit word, discard-confirm, word detail, save-sheet, study session, export preview, book export) — all functional, none are full "pages."

- **Status:** `inconsistent` — the `historyView` id is a legacy leftover; its content is 100% Shadowing markup. A genuine "word action history" feature (`renderHistory()`, filters) still exists in `app.js` but has no markup to render into (see §7 and the Information Architecture audit for the full orphan analysis).
- **Review before becoming standard?** Yes — the six-view set and the view-state-machine navigation pattern (no deep links, no back/forward) is a foundational IA decision that Part II should either ratify or replace.

- **Current state:** 6 views, no URL routing, `historyView` id/content mismatch confirmed by direct inspection.
- **Inferred behavior:** the app was likely originally built with a "history" (word-action log) screen that was later repurposed for Shadowing without renaming the id or removing the now-orphaned history code.
- **Missing decision:** whether SpråkLab's future IA should introduce real URL routing (needed for any web deep-linking, and likely simpler to reason about on iOS with a navigation stack) — see SPK-FND future engineering specs.
- **Recommended review question:** Should Part II fix the `historyView` naming/content mismatch as pure cleanup, or does "word action history" need to come back as a real, separate feature first?

---

## 2. Home Page Structure

`homeView`, `index.html:79-192`. Top to bottom:

1. **Reset button** (`#resetDataBtn`, top-right) — labelled as a data-reset control but its handler is literally `() => location.reload()` (`app.js:8218-8220`). No data is ever cleared.
   - **Status:** `inconsistent`. **Current state:** button name implies destructive action; behavior is a soft reload. **Missing decision:** does the product want a real "reset local state" action here, or should this control be renamed/removed? **Review question:** what should this button actually do?

2. **Greeting** (`#homeGreeting`, "Hej! / Bra jobbat idag.") — static text set once at `setupHomeGreeting()` (`app.js:2468-2475`), not personalized or time-of-day aware despite reading like it should be.
   - **Status:** `incomplete`. **Review question:** should the greeting become dynamic (name, streak, time of day), or is static copy the intended final state?

3. **Hero illustration** — static decorative PNG, no logic attached. `stable`.

4. **Search panel** (`#searchInput`/`#searchBtn`) — typing calls `runSearch()` (`app.js:3335-3343`), which updates `#wordList`/`#dictionaryList`, but those elements live inside the hidden `wordLibraryView`, so live typing on Home produces no visible feedback on Home itself. Only Enter/`#searchBtn` triggers `runSearchAndOpenDetail()` (`app.js:3345-3354`), which opens the word-detail dialog for the best match (or a "not found" state).
   - **Status:** `inconsistent` — visually a live-search box, functionally a "jump to word" box.
   - **Missing decision:** should Home have real inline search results, or is "search box that opens a detail dialog" the intended pattern?
   - **Review question:** is the current search behavior on Home the intended UX, or a partial implementation of inline results?

5. **Practice panel** — the real study/practice surface:
   - 4 stat tiles (今日新词/今日复习/连续天数/累计掌握) — **Chinese-language labels**, driven by `renderStudyStats()` (`app.js:2426-2466`). See Swedish-terminology findings in §6 below and the Design System audit — the rest of Home is Swedish.
   - `#studyScopeSelect` ("Övningsurval") — functional, populated by `renderStudyScopeOptions()` (`app.js:3258-3265`).
   - `#studySteps` (5-step list, 3 of 5 items in Chinese, 2 in Swedish — see §6) — **fully inert**: its only mutator `setStudyStep()` (`app.js:7433-7440`) is only called from the legacy `startQuiz()` chain (see §7), which is unreachable from the current UI. Decorative dead markup in practice.
   - `.study-entry-grid` — the real entry points: "Lär dig nya ord" / "Repetera ord" → `startStudySession()` (`app.js:6850`) → opens `studySessionDialog`. **This is the actual, current study flow.**
   - `.practice-actions[hidden]` block (`index.html:163-190`) — an entire legacy inline-quiz UI (start quiz/show answer/spelling check/review actions), permanently hidden, fully superseded by `studySessionDialog`. ~170 lines of dead-in-practice markup + supporting JS.
   - **Status:** `legacy` for the hidden quiz block and the inert step list; `stable` for the entry-grid → session-dialog flow.
   - **Review question:** should the legacy inline-quiz block and the inert `#studySteps` be removed, or is there a plan to revive a step-by-step in-page quiz mode as an alternative to the dialog-based session flow?

---

## 3. Bibliotek Structure

`libraryView`, `index.html:194-235`. Single shelf, 4 cards, in order:

| Card | Target | Status |
|---|---|---|
| **Ordbok** | `notebookView` (notebook shelf, not the word list directly) | `stable`, but meta text `"Ordlista · Studier · 5944 ord"` is a **hard-coded static string** (`index.html:207`) never updated by JS — will silently go stale as the dictionary changes size. `incomplete`. |
| **Shadowing** | `historyView` | `stable`, functional. |
| **Läsning** | `disabled`, `.library-book-card--upcoming`, "Snart" badge, no `data-open-book` attribute | `incomplete` — confirmed placeholder only, no backing feature (see §7). |
| **Video** | `disabled`, same pattern, "Snart" badge | `incomplete` — confirmed placeholder only, zero backing code anywhere in `app.js` (grep for "video" returns 0 hits). |

Below Ordbok, `notebookView` shows: pinned quick-access cards ("Ordlista / Alla ord", "Exportera ord"), the four `FIXED_NOTEBOOKS` ("Nyttiga fraser", "Kraftverb", "Skatt-substantiv", "Superord", `app.js:10`) plus `LEARNED_NOTEBOOK` ("Lärt mig"), and any user-created notebooks. All four fixed notebooks ship with **zero pre-populated words** (confirmed: 0 matches for "Nyttiga fraser" etc. in both static data files) — they are empty buckets a user must manually assign words into.

- **Current state:** 2 of 4 Bibliotek modules are live (Ordbok, Shadowing); 2 are disabled placeholders (Läsning, Video) with no code behind them.
- **Inferred behavior:** Läsning and Video are intentionally scoped as "coming soon" — the disabled state and "Snart" badge look deliberate, not accidental.
- **Missing decision:** what Läsning and Video actually are, functionally (this is exactly what SPK-FND Part II is for — see the Product Direction Review already on file).
- **Missing decision:** what the fixed notebook names mean if SpråkLab becomes multi-language — "Kraftverb"/"Skatt-substantiv"/"Superord" are Swedish-pedagogy-specific category names, not generic notebook concepts.
- **Recommended review question:** should the fixed notebooks stay as hard-coded Swedish pedagogical categories, or become a Language-Pack-supplied concept (per the four-layer architecture already agreed in SPK-FND-003)?

---

## 4. Profil Structure

`profileView`, `index.html:306-426`. Two top-level states via `renderAuthState()` (`app.js:2857-2925`):

- **Signed-out card**: Logga in / Skapa konto / "Utforska som gäst" — the guest button (`app.js:8809`) just calls `activateView("homeView")`; it does not set any actual "guest mode" state. `inconsistent` — implies a guest mode that doesn't exist as a distinct state.
- **Signed-in, 3 sub-pages** (`showProfilePage()`, `app.js:2481-2488`):
  1. **Main**: avatar/name, XP/level card (formula: XP = studied-words×10 + review-completions×5 + shadowing-recordings×30, level = XP/1000+1, `app.js:2680-2725`), "Dagens mål" ring with 3 real task checks (new words/review/shadowing) **plus a 4th, permanently `aria-disabled` "Läsning" placeholder** (`index.html:352`) consistent with the disabled Läsning card in Bibliotek. Sync summary line. Two nav cards → Studies/Settings sub-pages.
  2. **Mina studier**: word count/streak/mastered stats, "Aktivitet idag", and a static "Utveckling och prestationer" card — **copy-only, no real achievement data wired in**. `incomplete`.
  3. **Inställningar**: account email, then 5 settings buttons — **only 2 of 5 are wired**: "Synkronisering" (text-only status, no click handler at all on the row) and "Logga ut" (functional). **"Exportera data", "Språk och röst", "Hjälp och support" have no id and no handler anywhere in `app.js`** — dead buttons with a chevron affordance implying they navigate somewhere, but they do nothing. `incomplete`.

- **Current state:** Profil's account/XP/settings shell is coherent and mostly functional, but 3 of 5 settings rows and the "Dagens mål" 4th task are non-functional placeholders presented identically to working controls (same visual affordance, no visible "coming soon" signal — unlike Bibliotek's Läsning/Video, which at least show a "Snart" badge).
- **Inferred behavior:** these look like scaffolded-ahead-of-implementation UI rather than deliberate placeholders, since (unlike Läsning/Video) there's no "Snart" signal telling the user they're inert.
- **Missing decision:** what "Exportera data", "Språk och röst", and "Hjälp och support" are meant to do, and whether they belong to Learning Engine (account/privacy/export — likely, given GDPR principles already on file) or are out of scope for now.
- **Recommended review question:** should non-functional settings rows be visually marked as disabled/"coming soon" (consistency with Bibliotek's pattern) until they're implemented, given the App Store readiness goal?

---

## 5. Dictionary List & Entry Structure

### 5.1 List structure

Rendered via `createWordCard(word, mode)` (`app.js:3534-3629`) from the single `<template id="wordCardTemplate">` in the codebase (`index.html:953-976`), through the generic `renderWordCollection()` (`app.js:3499-3517`, pagination via `INITIAL_LIST_LIMIT=80`/`LIST_LIMIT_STEP=80`, `app.js:130-131`). Five list "modes" share this one template: `library`, `search`, `dictionary` (built-in, not-yet-added words), `notebook`, `generated` (AI preview).

Card fields: word title, POS badge (`posLabels` map, `app.js:108-118`), Chinese meaning, Swedish explanation (`word.english`, fallback "Svensk förklaring saknas" — the field is internally named `english` but holds a **Swedish** explanation, per existing project convention already flagged in `agents/content-agent.md`), favorite star, "Lärt mig"/"Övar" status pill.

- **Status:** `stable` — one consistent template, consistently used, is a genuinely well-factored part of the app.
- **Note:** there is **no delete button in the template at all** (`data-action="delete"` is queried for but never exists in markup, `app.js:3591`) — all delete-hiding logic is defensively-guarded dead code. `deleteWord(id)` (`app.js:6470`) has **zero callers anywhere in the codebase** — a fully implemented feature with no UI path to trigger it. `legacy`/`incomplete`.
- **Recommended review question:** was word deletion intentionally removed from the UI (e.g. in favor of "un-favorite"/archive-only semantics), or is this a regression that should be restored?

### 5.2 Detail structure

`#detailDialog` (`index.html:827-839`), built via `renderWordDetail()` → `createWordCard(word, detailMode)` (`app.js:3788-3798`). Field order for a normal library word: title + POS badge → Chinese meaning (`.meaning`) → "Ordklass" → **"Kinesisk betydelse" (word.chinese again)** → "Svensk förklaring" → "Grammatik" (verb forms/other inflections) → "Exempel" → "Fraser" (collocations) → "Relaterade ord".

- **Status:** `inconsistent` — the Chinese meaning is shown **twice** in the same detail view (once as the standalone `.meaning` paragraph, once again under the "Kinesisk betydelse" term), because the paragraph isn't hidden in study-detail mode (`app.js:3548, 3563`).
- **Status:** `legacy` — the detail dialog's "⋯ more" menu button is **unconditionally hidden** by `updateDetailHeaderActions()` (`app.js:3783`) with nothing anywhere re-enabling it, and its own click handler has no action logic beyond closing itself even if reached — a dead stub end to end.
- **Recommended review question:** was the "more" menu intentionally retired (its actions folded into the footer action bar), and should the dead menu markup/handler be removed, or is there unfinished work behind it (e.g. delete, duplicate, report)?
- Notebook assignment happens through a separate "Save sheet" dialog, not inline in the detail view — worth confirming this two-step pattern (open detail → tap Save → pick notebook) is the intended flow versus inline assignment.

---

## 6. Shadowing, Läsning, Video, Fraser, Uttryck

### 6.1 Shadowing — `historyView`, `index.html:472-638`

The most functionally complete non-dictionary module. Text import, standard TTS playback (Azure primary / ElevenLabs fallback, via `/api/shadowing/tts`), recording (real `MediaRecorder` + Supabase Storage upload), and unknown-word extraction into vocabulary (`Intl.Segmenter`-based) are all **fully wired end-to-end**. `stable`.

However, roughly half of the designed control surface is implemented but **invisible**: AB-loop, comparison-against-standard-audio, continuous play, auto-pause, and the subtitles toggle all have live, working JS logic, but their buttons carry `class="visually-hidden"` in the markup (`index.html:563-570`) rather than being removed. The 1–5 difficulty-level system has a data model and level-dependent behavior (e.g. subtitles force-hidden at level ≥5) but **no visible control exists to change it at all** — the level selector and level-badge elements referenced in `app.js` don't exist in `index.html`. Level is permanently stuck at "1" from the user's perspective.

- **Status:** `incomplete` for the hidden-control set and the level system; `stable` for the visible Play/Pause/Record/Stop + unknown-word flow.
- **Missing decision:** is the simplified visible control set (Play/Pause/Record/Stop only) the intended v1 UX, with AB-loop/compare/levels planned for later — or was this an accidental regression during a redesign?
- **Recommended review question:** should the hidden Shadowing controls be formally scoped into Part II's Shadowing spec (re-enabled, redesigned, or explicitly deferred), rather than left silently wired-but-invisible?

### 6.2 Läsning (Reading)

**No reading feature exists anywhere in the codebase.** Confirmed via full-codebase grep: the only artifacts are (a) the disabled Bibliotek card (`index.html:219-225`, "Snart" badge, no click handler, no `data-open-book`), and (b) a matching disabled item in Profil's "Dagens mål" list (`index.html:352`). There is no OCR, PDF import, pasted-text reading UI, or comprehension-exercise logic. The unrelated `document-vocab-data.js` (a static, pre-built vocabulary dataset extracted from course textbooks, 6.7MB) is sometimes confusable with "reading" but is purely a dictionary-content source, not a reading UI — its associated import button (`#importDocumentBtn`/`#importDocumentTopBtn`) now just shows a stub `alert("Dokumentorden läses nu från Supabase.")` (`app.js:5703-5705`) and does nothing.

- **Status:** `incomplete` (placeholder only).
- **Missing decision:** entire feature scope — this is squarely SPK-PRD-LÄSNING territory per the Foundation roadmap (Part II).

### 6.3 Video

**Only a single disabled card exists** (`index.html:227-233`), with zero backing logic — `app.js` contains **zero** occurrences of the word "video" in any form (confirmed by case-insensitive grep across the whole file). This is the cleanest of the four "Snart" placeholders: no partial backend, no dead code, nothing beyond one disabled button with a cover image.

- **Status:** `incomplete` (placeholder only, but the cleanest one — no cleanup debt).

### 6.4 Fraser (Phrase) and Uttryck (Expression)

**Neither exists as a dedicated product module.** Both terms are currently used only as:

1. A **part-of-speech value** ("Fras") in the word-edit form — a phrase-POS word is stored and rendered through the exact same pipeline as any other word, with no phrase-specific fields or layout.
2. A **label for the per-word collocations field** — every word has a "Fraser" field showing phrase/meaning/example triples for that one word (not a phrase catalog).
3. **"Nyttiga fraser"**, one of the four fixed (empty) notebook names described in §3 — an ordinary notebook, not a distinct schema.

"Uttryck" does not appear anywhere as a notebook name, view, or feature — only as ordinary dictionary content (the Swedish word "uttryck" itself, and its use inside other entries' example text).

- **Status:** `incomplete` — both are pre-Foundation placeholders/side-effects of existing structures, not real modules, despite appearing as first-class concepts in the Volume A roadmap (SPK-PRD-FRASER, SPK-PRD-UTTRYCK).
- **Recommended review question:** should Fraser/Uttryck be built as genuinely distinct Learning Object types (per SPK-FND-005) with their own schema, or should the existing "Fras" POS value + collocations field be formalized as the actual implementation of these two modules (i.e., redefine the roadmap to match what's structurally already there, rather than building new parallel structures)? This is a real architectural fork and should be decided before Part II specs for these two modules are written.

---

## 7. Swedish UI Terminology (Summary — full inventory in Information Architecture Audit §6)

Core navigation and most of the app is in Swedish (`Bibliotek`, `Profil`, `Ordbok`, `Lärt mig`, `Nyttiga fraser`, `Kraftverb`, `Skatt-substantiv`, `Superord`, etc.). However:

- Home's 4 study-metric stat tiles and 3 of 5 study-step items are in **Chinese**, not Swedish, sitting directly beside Swedish labels on the same screen (`index.html:112-137`).
- Shadowing's section headings ("Prepare", "Practice", "Export") and several hidden legacy buttons ("Set A"/"Set B"/"A-B Loop"/"Compare") are in **English**.
- The export-preview dialog's action row (分享/打印/关闭) is entirely Chinese while its own header is Swedish.
- The tab bar's Home button has two different Swedish words for "home" depending on whether you read the `aria-label` ("Startsida") or the visible label ("Hemsida") — likely an incomplete rename.

- **Status:** `inconsistent` — three languages (Swedish, Chinese, English) appear as UI chrome (not translated content) within single screens.
- **Missing decision:** SPK-FND-007 (Design Language) commits to "Language Consistency" as a principle but doesn't yet specify what language the UI chrome itself should be in for a Chinese-speaking learner of Swedish — Swedish-only chrome with Chinese content, or bilingual chrome.
- **Recommended review question:** should all UI chrome (buttons, labels, headings — as opposed to dictionary *content*) standardize on one language, and if so, which? This directly affects Native Language Support layer design and is worth resolving before Part II locks in per-module copy.

---

## 8. Features in UI but not fully implemented

(Cross-reference — full detail under each module above and in the Design System audit's states section.)

- Home: legacy inline-quiz block, inert study-step indicator, static/non-personalized greeting, search box that behaves as "jump to word" not live results.
- Bibliotek: Läsning, Video (explicit "Snart" placeholders — the honest case).
- Profil: 3 of 5 settings rows, 4th "Dagens mål" task, "achievements" card — inert placeholders with no "coming soon" signal (the less-honest case, since they look identical to working controls).
- Word detail: "more" menu (permanently hidden, empty stub if ever reached).
- Shadowing: AB-loop, compare, continuous play, auto-pause, subtitle toggle, 1–5 level selector — implemented, invisible.

## 9. Features implemented in code but not visible in main navigation

- `deleteWord()` — fully implemented, zero UI path.
- Word-action history (`renderHistory()`, `#historyList`/`#historyPosFilter`/`#historyActionFilter`) — orphaned; the markup it needs no longer exists in `index.html` after `historyView` was repurposed for Shadowing.
- Admin/batch tooling: `importEducationWords`/`importDocumentWords` (now stubs), `enrichSelectedNotebook`, `deleteDuplicateWords` — implemented, no reachable buttons in the current UI.
- PWA custom install-prompt capture (`setupInstallPrompt()`) — implemented, no install button exists in markup, safely no-ops.

---

## Open questions requiring product-owner decisions before these become official standards

1. Is the six-view, dialog-heavy, no-URL-routing navigation model the one SpråkLab wants going forward (into Part II and eventual iOS), or should Part II specify real routing?
2. What should happen to the ~170 lines of legacy inline-quiz UI on Home — delete, or is there a reason it's still there?
3. Is "guest mode" a real state SpråkLab wants, or should the "Utforska som gäst" button be relabeled to match what it actually does (dismiss to Home)?
4. What are Läsning and Video, concretely — this audit found literally nothing to build on for either beyond a disabled card.
5. Are Fraser and Uttryck meant to become distinct Learning Object types, or should the roadmap be redefined around the existing POS-value/collocations-field/fixed-notebook implementation?
6. What language should UI chrome be in, consistently?
7. Was word deletion intentionally removed from the UI?
8. Should currently-dead Profil settings rows be visually marked inert until built, matching the Bibliotek "Snart" convention?
