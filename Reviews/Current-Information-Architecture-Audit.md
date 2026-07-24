# Current Information Architecture Audit — SpråkLab

**Scope:** How the app is structurally organized and navigated today — the view map, bottom/top navigation, responsive/device behavior, and codebase-wide inconsistencies, duplicated components, and legacy naming. This is the structural companion to `Current-Product-Audit.md` (which covers what each page/module *does*) and `Current-Design-System-Audit.md` (which covers visual components).

**Method:** Static audit of `app.js` (9,156 lines), `index.html` (981 lines), `styles.css` (5,511 lines), plus `sw.js`, `manifest.webmanifest`, `src/lib/*`. All findings cited `file:line`.

**Status legend:** `stable` / `inconsistent` / `legacy` / `incomplete` — see the other two audit files for definitions; used identically here.

> **This document maps the current structure. It is not a recommendation for SpråkLab's future information architecture.** Several structural choices here (no URL routing, fixed 430px shell, dialog-heavy navigation) are exactly the kind of decision the Product Direction Review already flagged as needing explicit product-owner sign-off before Part II locks them in.

---

## 1. The View Map (Navigation Overview)

**Current implementation:** SpråkLab has no URL router. `state.activeView` + `activateView(viewId)` (`app.js:7927-7942`) is the entire navigation system — it toggles `.view.active` on `<section class="view">` elements and mirrors the id onto `document.body.dataset.activeView`. There is a **second, parallel "go home" implementation**, `forceHomeView()` (`app.js:7944-7958`), which duplicates most of `activateView()`'s body instead of calling it — a minor internal inconsistency, not a functional bug, but a maintenance risk (the two must be kept in sync by hand).

Six top-level views + eight dialog overlays exist (full inventory in the Product Audit, §1). The **effective navigation depth is inconsistent by module**: Home/Bibliotek/Profil are one tap from the tab bar; the word list, notebooks, and Shadowing are two taps deep (tab bar → Bibliotek card → view); word detail, add/edit, and study sessions are dialog overlays reachable from multiple different starting points.

- **Status:** `inconsistent` (duplicate home-navigation logic) and structurally `incomplete` in the sense that there is no deep-linking, no browser back/forward support, and no URL that represents "where you are" — confirmed by the app's own startup code actively normalizing/discarding location state (`normalizeStartupLocation()`, `cleanupLegacyViewState()`).
- **Current state:** confirmed no router; confirmed duplicate `activateView`/`forceHomeView` logic.
- **Inferred behavior:** the duplication suggests `forceHomeView()` was added later as a "hard reset to home" utility without refactoring to reuse `activateView()`.
- **Missing decision:** whether SpråkLab's future IA needs real routing. This matters concretely for two things already on record: (a) the App Store goal — native navigation stacks and deep links are standard iOS expectations; (b) Volume A's own stated principle of supporting "Discover → Understand → Learn → Review → Listen → Shadow → Read → Use → Assess" as a connected cycle, which is hard to represent faithfully in a router-less, tab-only structure.
- **Recommended review question:** should Part II's IA work introduce a real navigation/routing model (even a lightweight one) before more Part II modules are built on top of the current pattern, given how much harder this is to retrofit later?

---

## 2. Bottom Navigation and Top-Level Navigation

**Bottom tab bar** (`index.html:641-671`): exactly 3 tabs — Hemsida (home), Bibliotek, Profil. No badges, no notification dots, no responsive variant at any screen size (confirmed: the only `@media` rule touching `.tabbar` is the print stylesheet, which hides it — `styles.css:5455`). It renders identically, fixed to the bottom, at every viewport including desktop widths (see §3).

**Topbar** (`index.html:66-77`): brand lockup, a contextual "Till Bibliotek" back button (visible only on `notebookView`/`wordLibraryView`/`historyView`), and an auth button that doubles as "open login" (signed out) or "jump to Profil" (signed in). No global search, no notifications icon.

- **Status:** `stable` structurally (the 3-tab + contextual-back pattern is simple and consistently applied), but `incomplete` relative to the Foundation's stated ambition — there is no way to represent a 4th, 5th, 6th primary destination (Läsning, Video, Fraser, Uttryck, AI Teacher, etc. from the Part II roadmap) without either redesigning the tab bar or nesting everything deeper inside Bibliotek as it is today.
- **Naming mismatch:** the Home tab's `aria-label` says "Startsida" while its visible text says "Hemsida" (`index.html:642` vs `650`) — two different Swedish words for "home page" on the same control, most likely an incomplete rename. `inconsistent`.
- **Missing decision:** how the tab bar should scale as Part II modules (Läsning, Video, Fraser/Uttryck as possible standalone destinations, AI Teacher) are added — nested under Bibliotek indefinitely, or promoted to their own tabs/sections.
- **Recommended review question:** does the 3-tab structure need to be revisited now, before Part II adds more top-level modules, to avoid a costly IA rework later? This is the single most consequential open IA question raised by this audit.

---

## 3. Responsive Behavior (Mobile / Tablet / Desktop)

**Current implementation:** The app shell is **capped at a fixed 430px width at every viewport size** — `--app-max-width: 430px` (`styles.css:24`), applied via `.app-shell { width: min(100%, var(--app-max-width)); margin: 0 auto; }` (`styles.css:205-214`). On a tablet or desktop browser, the entire app renders as a narrow phone-shaped column centered on an otherwise empty page. There is no breakpoint anywhere that widens the shell, introduces a multi-column word list, or converts the bottom tab bar into a side/rail navigation.

Only 7 `@media` rules exist in the whole stylesheet, using **5 different breakpoint values with no shared scale** (620px, 380px, 360px, 430px, 560px — no evidence of `--breakpoint-*` tokens). They are also **feature-siloed rather than global**: 2 apply only to Shadowing, 2 apply mostly to word-detail/home, 1 (the only `min-width` rule in the file) applies only to the Bibliotek shelf grid. There is no single, coordinated responsive strategy — each feature area independently added its own fine-tuning as needed.

- **Status:** `incomplete` for genuine tablet/desktop support (does not exist); `inconsistent` for the mobile-breakpoint values themselves (5 one-off numbers, no scale).
- **Current state:** confirmed fixed 430px shell; confirmed 7 scattered, non-shared media queries.
- **Inferred behavior:** the app was built mobile-first and has never had a tablet/desktop design pass — this looks like a deliberate, if implicit, "phone-only for now" scope rather than a bug.
- **Missing decision:** whether tablet/desktop (or iPad, specifically, given the App Store goal explicitly includes iPad) is in scope for the current design phase, and if so, what the layout strategy is (wider shell? multi-column? sidebar nav?).
- **Recommended review question:** given the stated goal of iPad + iPhone App Store distribution, should tablet layout be scoped now as part of the Foundation/Design Language work, rather than discovered as a gap during iOS build-out?

---

## 4. Inconsistencies, Duplicated Components, and Legacy Naming (Codebase-Wide)

This section consolidates naming and duplication issues that span multiple modules — module-specific dead code (e.g. the hidden Shadowing controls, the orphaned quiz UI) is documented in the Product Audit; this section covers the ones that reveal something about the *codebase's history and layering*, which is directly relevant to how much technical debt Part II inherits.

### 4.1 Three parallel product-name identities in the code

- **"SpråkLab"** — the current, correct brand name, consistently used in all user-facing chrome (`<title>`, manifest, brand lockup).
- **"Min Ordbok"** — an old product name that still tags **31 `console.warn`/`console.error` calls** throughout `app.js` (e.g. `app.js:342, 633, 1059, 1100, 1169, 1188, 1207, 1447, 1542, 1582, 2098, 2852, 2940`, and more through `app.js:9125`).
- **"swedish-vocab-pwa"** — the repo/package name, baked into ~15 `localStorage` key constants (`DB_NAME = "swedish-vocab-pwa"` `app.js:7`, and derived keys at `app.js:17-30`) and separately into the IndexedDB name used by `src/lib/sync-outbox.js` (`DB_NAME = "spraklab-sync"` — note this is a **fourth, different** name, inconsistent even with the other two IndexedDB/localStorage identifiers). Both IndexedDB databases are referenced together at cleanup time (`app.js:8931`), so the mismatch is a known-but-unaddressed internal detail, not an oversight that breaks anything today.
- A separate `[Shadowing]`-tagged logging convention (~20 sites) coexists with both `[Min Ordbok]` and the 2 `[SpråkLab]`-tagged sites (`app.js:2597, 2650`).

- **Status:** `legacy`. **Current state:** 4 distinct naming identities confirmed in code (brand, old product name in logs, repo-name storage keys, sync-store name), none of which affects end users directly, but all of which affect anyone reading logs or debugging storage during development — including future AI agents (like this one) working on the codebase.
- **Recommended review question:** should a cleanup pass normalize all internal naming to "SpråkLab" (or a stable internal codename, if the product name is expected to keep evolving) as low-risk technical debt cleanup, ideally before Part II adds more code that copies the existing (inconsistent) conventions?

### 4.2 Evidence of a prior routing/storage migration, not fully cleaned up

`app.js` contains an explicit `LEGACY_VIEW_STATE_KEYS` list of 17 old routing/dialog-state keys (`app.js:55-75`) from what was evidently a prior **URL-parameter-based** navigation scheme, cleaned up via `cleanupLegacyViewState()` (`app.js:7828`) which still runs on every single app load (`app.js:9065, 9071, 9140`). Combined with 4 more explicit `LEGACY_*` storage-key constants (`app.js:13-16`) and dedicated legacy-notebook-name normalization functions (`normalizeLegacyNotebookName()` `app.js:1623-1626`), this confirms the app has already been through at least one significant navigation/storage refactor (URL-param routing → the current in-memory view-state machine) without fully retiring the old code paths.

- **Status:** `legacy`, but currently harmless (defensive, runs safely on every load).
- **Recommended review question:** is it safe to assume no users still have the old URL-param-based state cached (given how long this migration code has been running), such that this cleanup code and the associated legacy key constants could finally be deleted?

### 4.3 The `historyView` id/content mismatch and its orphaned sibling feature

Already noted in the Product Audit: `historyView` (`index.html:472`) renders 100% Shadowing content. This alone is a naming leftover, but it has a real consequence — a **separate, genuine "word action history" feature** (`renderHistory()` `app.js:3996-4033`, `getFilteredHistory()`, history/POS/action filter state) still exists in `app.js`, fully implemented, but the DOM elements it needs (`#historyList`, `#historyPosFilter`, `#historyActionFilter`) **do not exist anywhere in `index.html`** — they were presumably removed when the view was repurposed for Shadowing. `appendLocalHistory()` is still called roughly 15 times across `app.js` on every word action, meaning history data is still being recorded and synced to Supabase, it just can no longer be viewed by the user at all.

- **Status:** `legacy`/`incomplete` — data is being collected for a feature with no remaining UI.
- **Missing decision:** whether "word action history" as a user-visible feature should be revived (it maps naturally onto Volume A's "Learning Memory" concept already defined in SPK-FND-004), formally retired (stop collecting the data), or folded into Profil's "Mina studier" stats instead.
- **Recommended review question:** should this orphaned history data collection continue silently, or does it need a decision either way before Part II specs Profil/history properly?

### 4.4 Duplicate/near-duplicate structural patterns

- Two independent "tab" CSS implementations (`.notebook-tab`, `.shadowing-mode-tab`) exist with zero usage in markup, alongside the one real tab pattern actually in use (`.tab` for the bottom bar, `.chip` for everything chip-like) — see Design System Audit §6 for detail. Flagged here because it's a symptom of the same "build a new pattern per feature instead of reusing one" tendency visible throughout the codebase.
- Several inline-feedback mechanisms (auth message, spelling feedback, study-session feedback, shadowing hint) independently implement "show the user a short status line," only one of which has a shared CSS class.

- **Status:** `inconsistent` across the board — this is a pattern of behavior across the codebase (build locally rather than reuse), not a single isolated bug, and it's the main reason the Design System Audit's card/button/tab findings look the way they do.
- **Recommended review question:** as Part II specs are written, should each module spec explicitly call out which shared components it must reuse (rather than allowing another one-off implementation), to break this pattern going forward?

---

## Open questions requiring product-owner decisions before these become official standards

1. Should real routing/deep-linking be introduced before more Part II modules build on the current view-state-machine pattern?
2. Does the 3-tab bottom nav need to be revisited now, given Part II's planned module count (Ordbok/Fraser/Uttryck/Shadowing/Läsning/Video/AI Tutor, per the existing roadmap)?
3. Is tablet/iPad layout in scope for the current design phase, given the explicit App Store + iPad goal?
4. Should internal naming (Min Ordbok / swedish-vocab-pwa / spraklab-sync / SpråkLab) be normalized as a cleanup pass?
5. Is it safe to delete the legacy URL-routing migration code, or are there still users on old cached state?
6. Should "word action history" be revived as a real feature (it already has data flowing into it), formally retired, or merged into Profil's stats?
7. Should Part II module specs explicitly mandate component reuse to prevent further one-off pattern duplication?
