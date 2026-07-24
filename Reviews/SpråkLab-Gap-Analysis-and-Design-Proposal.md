# SpråkLab — Gap Analysis and Design Proposal

**Status: DRAFT — Pending Product Owner Review. Not an approved specification. No implementation authorized by this document.**

---

## 1. Document Purpose

This document is the second stage of the SpråkLab Current Product Review, following the three Current Audit files already on record (`Reviews/Current-Product-Audit.md`, `Reviews/Current-Design-System-Audit.md`, `Reviews/Current-Information-Architecture-Audit.md`). It combines:

1. **Gap Analysis** — a systematic account of inconsistencies, missing capabilities, risks, and technical debt in the current implementation, each traced to specific evidence in the codebase.
2. **Design Proposal** — professional recommendations (product, UX, IA, typography, color, accessibility, front-end engineering) for target standards SpråkLab could adopt, presented as options for Product Owner decision, not as approved direction.

This is a **decision-support document**, not an implementation plan and not a specification. Nothing in it is authorized for implementation until it passes through the approval gate described in §13.

## 2. Scope and Non-Scope

**In scope:** analysis and written recommendations only, covering the nine areas requested (product/learning experience, information architecture, typography, spacing/layout, color, components, feedback/status, responsive design, accessibility, naming/duplication/legacy).

**Explicitly out of scope for this document:**
- No application code was modified, refactored, or deleted.
- No components were changed, no pages or navigation were adjusted.
- No dependencies were installed or upgraded.
- No database, Supabase, API, or deployment configuration was touched.
- No recommendation in this document should be treated as an approved decision.
- No redesign reflects personal preference over the evidence gathered; where a recommendation is a judgment call rather than a direct implication of the evidence, this is stated explicitly.

## 3. Sources Reviewed

**Documents (read in full for this pass):**
- `Reviews/Current-Product-Audit.md` (212 lines)
- `Reviews/Current-Design-System-Audit.md` (136 lines)
- `Reviews/Current-Information-Architecture-Audit.md` (101 lines)

**Source code re-verified directly for this pass** (all figures below were re-derived from the live files, not copied from the prior audits without re-checking):
- `index.html` (981 lines)
- `app.js` (9,156 lines)
- `styles.css` (5,511 lines)
- `sw.js`, `manifest.webmanifest`, `src/lib/sync-outbox.js`, `agents/content-agent.md`

**Re-verification method:** targeted `grep`/count re-derivation of every quantitative claim reused from the prior audits (font-size/line-height/font-weight/padding/gap/border-radius/box-shadow distributions, `alert()`/`console.*` counts, logging-tag counts, `@media` breakpoints, `:disabled` selector count, custom-property count and usage count, touch-target dimensions, label/aria-label counts), plus new WCAG 2.2 contrast-ratio calculations for the ten most consequential color pairs in the current token set (relative-luminance formula, computed directly, not estimated). All figures quoted in §6 and §7 below reflect this re-verification pass, run against the current working tree. Every number differing from or extending the prior audits is marked as such.

## 4. Executive Summary

SpråkLab's current implementation is a single-developer-scale, mobile-only PWA that works end-to-end for its core loop (search → study session → Shadowing) but has never had a formal design system, a formal information-architecture decision, or a systematic accessibility pass. The three prior audits already established this in detail; this document's own re-verification confirms their findings were accurate and, in several places (typography and font-weight fragmentation, WCAG contrast, touch-target sizing), finds the underlying problem to be **larger** than the summary language in the prior audits suggested.

Four findings stand out as the most consequential for the stated goal of a long-term, multi-language, App-Store-ready platform:

1. **There is no shared feedback/error system.** 59 `alert()` calls do triple duty as validation errors, network failures, and success confirmations; roughly 30–40 background sync failures are silent (`console.warn`/`console.error` only, zero user-facing signal). For a product whose core promise is trustworthy long-term progress tracking, silent data-sync failure is a material product risk, not just a style inconsistency.
2. **Typography and spacing have no system at all**, not merely an inconsistent one: 172 `font-size` declarations resolve to 51 distinct values, and font-weight is expressed in 26 distinct values including non-standard numbers (`720`, `760`, `780`, `820`, `690`, `360`...) that do not correspond to any recognized type scale — strong evidence these values were copied verbatim from a design tool rather than authored against a scale.
3. **At least four color pairs in active use fail WCAG 2.2 AA contrast for normal-size text**, including the primary button's own white-on-accent text (3.55:1 against a 4.5:1 requirement) — this is not a theoretical accessibility nicety, it affects the single most-used button style in the app.
4. **The three-tab, no-routing, 430px-fixed-width navigation model was sized for a single-language dictionary app**, not for the multi-language, multi-module platform already committed to in the product's own long-term direction. This is the highest-leverage IA decision to make before Part II module specs multiply the amount of code built on top of the current pattern.

None of these findings imply the current implementation is unsound — it is functional, and several sub-systems (the word-card template, the sync outbox, the button base classes, native `<dialog>` usage, `aria-live` coverage) are genuinely well-built. The purpose of this document is to give the Product Owner a complete, evidence-based picture before Part II locks in more structure on top of what exists today.

## 5. Product Principles Used for Evaluation

**Provided product constraints for this review** — the following principles were supplied as evaluation criteria for this review. They were **not** found in this repository's own files (confirmed: `Growth First`, `System Before Features`, and `Specification First` return zero matches across all `.md`/`.js`/`.html` files in this repo outside the `Reviews/` audits themselves). They originate from the separate SpråkLab Official Design Specification material and prior conversation on record, not from anything checked into this codebase:

- Growth First
- System Before Features
- Simple for Users, Complex for the System
- Continuous Growth
- Specification First
- Fixed Learning Engine separated from language-specific standards
- User experience must stay simple while underlying data/learning logic can be rich
- Prioritize real learning problems over feature-for-feature's-sake additions
- The product must support long-term expansion, not just the current pages
- Swedish UI labels are the current default interface language
- Primary usage context is mobile PWA today, but tablet/desktop must not be ignored

These are used below as evaluation lenses (e.g., "does this gap block long-term expansion," "does this violate simple-for-users/complex-for-system") — they are not re-derived from the codebase, and no claim below should be read as "the codebase states this principle."

---

## 6. Gap Analysis

### 6.1 Product and Learning Experience

---

#### [PLE-001] Home page mixes a working study flow with a large dead legacy quiz system

**Area:** Product / Engineering

**Current Evidence:** `index.html:163-190` (`.practice-actions[hidden]` block); `app.js:7442-7585` (`startQuiz`, `showAnswer`, `checkCurrentSpelling`, `recordQuiz`); `app.js:7433-7440` (`setStudyStep`); `index.html:132-137` (`#studySteps`); live flow: `index.html:143-160` (`.study-entry-grid`) → `app.js:6850` (`startStudySession`) → `studySessionDialog` (`index.html:870-913`).

**Current Implementation:** Home renders two parallel "start studying" systems. The live one is the entry-grid → `startStudySession()` → dialog-based session flow, fully functional. The other is a full inline quiz UI (`.practice-actions`) permanently `hidden`, whose only entry point (`#startQuizBtn`) lives inside that same hidden container, and a 5-step progress indicator (`#studySteps`) whose only mutator is called exclusively from the dead quiz chain.

**Gap / Issue:** ~170 lines of markup plus the JS behind it render nothing and do nothing in the shipped product, yet remain fully present, coupled to real DOM ids, and indistinguishable from live code by inspection alone.

**User Impact:** None directly (users never see this path). Impact is entirely on future maintainers/AI agents, who will spend time understanding, and risk re-wiring, code that has already been superseded.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Home should contain exactly one study-entry mechanism. If the dialog-based session flow is the intended long-term pattern, the legacy inline quiz block should be formally retired (not silently deleted without confirmation — see §9 naming/legacy section for the Keep/Consolidate/Deprecate/Investigate/Candidate-for-removal framework).

**Rationale:** Directly serves "System Before Features" (one coherent system beats two overlapping ones) and reduces cognitive load for whoever specifies Part II's Daily Learning module next.

**Alternatives:** Option A — retire the inline quiz entirely, keep only the dialog flow. Option B — revive the inline quiz as an alternate "compact/inline" study mode alongside the dialog (some learning apps intentionally offer both a full-screen and inline quiz mode). Recommended: Option A, unless there is a specific product reason (found nowhere in current code or docs) to want an inline mode.

**Priority:** P2 — no functional or safety risk, but real maintainability/expansion cost.

**Effort:** S — deletion is mechanically simple; the only work is confirming no other code path depends on it.

**Dependencies:** None; independent of other decisions.

**Decision Required:** Should the legacy inline quiz UI be retired, and is there any reason to keep a non-dialog study mode?

**Suggested Phase:** Later Cleanup (or earlier, if Part II's Daily Learning spec wants to reason about Home with a clean slate).

---

#### [PLE-002] Home's search box behaves as "jump to a word," not live search, despite a live-search visual affordance

**Area:** Product / UX

**Current Evidence:** `index.html:97-105` (`#searchInput`/`#searchBtn`); `app.js:3335-3343` (`runSearch()`, updates `#wordList`/`#dictionaryList`, both inside the hidden `wordLibraryView`); `app.js:3345-3354` (`runSearchAndOpenDetail()`, the only path with a visible effect from Home, triggered by Enter/`#searchBtn`).

**Current Implementation:** Typing in the Home search box calls `runSearch()` on every keystroke, but the elements it updates are not visible on the Home screen. Only pressing Enter or tapping the search button produces any visible result — it opens the word-detail dialog directly for the best match.

**Gap / Issue:** The control is styled and positioned as a live-search field (a strong, near-universal UI convention), but functionally behaves as a single-shot "go to word" field. A user who pauses after typing partial input, expecting to see filtered results, sees nothing happen.

**User Impact:** Directly affects the "Discover" and "Understand" stages of the learning cycle — search is usually a primary discovery tool, and its behavior here is likely to read as broken/slow rather than intentional to a first-time user.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Either (a) give Home a real inline live-results list (consistent with the visual affordance), or (b) if "type and press enter to jump straight to a word" is the intended fast-path design, restyle the control to signal that more clearly (e.g., a "Go" affordance rather than a magnifying-glass live-search affordance) and reserve live filtered results for `wordLibraryView`.

**Rationale:** UX heuristic — interactive affordances should predict actual behavior (Nielsen's "match between system and the real world" / consistency heuristics).

**Alternatives:** Option A — inline live results on Home (more work, more consistent with affordance). Option B — keep jump-to-detail behavior, change the visual/microcopy to set correct expectations (less work). Recommended: Option B as a near-term fix, Option A as a longer-term Home redesign question tied to PLE-001.

**Priority:** P2.

**Effort:** S (Option B) / M (Option A).

**Dependencies:** Related to the broader Home redesign question in PLE-001 and the IA question of whether `wordLibraryView` should be reachable more directly from Home.

**Decision Required:** Is "search jumps to detail" the intended behavior, or should Home get real inline results?

**Suggested Phase:** Feature Implementation (Home module spec).

---

#### [PLE-003] Two inconsistent conventions for "not built yet" UI — honest placeholders vs. silently dead controls

**Area:** Product / UX

**Current Evidence:** Honest case: `index.html:219-233` (Läsning/Video Bibliotek cards — `disabled`, `.library-book-card--upcoming`, "Snart" badge, no `data-open-book`). Dishonest case: `index.html:418-420` (Profil "Exportera data" / "Språk och röst" / "Hjälp och support" — no `id`, no handler anywhere in `app.js`, full visual affordance including a chevron `›` implying navigation); `index.html:352` (Profil's 4th "Dagens mål" task, `aria-disabled="true"` but visually presented alongside 3 real, functioning task checks).

**Current Implementation:** Bibliotek marks unbuilt modules with a disabled state, a "Snart" badge, and no click target — a user cannot mistake these for working features. Profil's unbuilt settings rows have none of these signals — they look, and are keyboard/tap-reachable like, fully working controls.

**Gap / Issue:** Two different conventions exist in the same app for the same underlying situation (feature not yet built), one transparent to the user, one not.

**User Impact:** A user who taps "Exportera data" or "Hjälp och support" gets no feedback of any kind — not even an error — which reads as the app being broken, a materially worse experience than a clearly-labeled "coming soon" state.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Adopt one placeholder convention app-wide (disabled state + "Snart"/"Kommer snart" badge, matching the existing Bibliotek pattern) for any control with no backing implementation, until it is built.

**Rationale:** Directly serves "Simple for Users, Complex for the System" — the complexity of "this isn't built yet" should never be silently pushed onto the user as a confusing dead tap.

**Alternatives:** None materially different — this is a low-risk, high-clarity fix once a placeholder pattern is chosen (see Design Proposal §7.6 for a concrete component recommendation).

**Priority:** P1 — directly affects perceived reliability of the product, relevant to App Store review quality bar.

**Effort:** S.

**Dependencies:** Requires the placeholder/disabled component pattern proposed in §7 (Design Proposal, Component Taxonomy) to exist first, so the fix is consistent rather than another one-off.

**Decision Required:** Approve a single placeholder convention and apply it to the 3 dead Profil rows and the 4th Dagens-mål task.

**Suggested Phase:** Design System (component first) → Feature Implementation (apply to Profil).

---

#### [PLE-004] Fraser and Uttryck have no distinct product existence — architectural fork needed before Part II specs them

**Area:** Product / IA

**Current Evidence:** `index.html:762` (`<option value="phrase">Fras</option>`, one of 9 POS values); `app.js:115` (`posLabels.phrase = "Fras"`); `app.js:5681-5683` (`parsePosField` phrase aliases); `index.html:788-791` (`#collocationsInput`, labeled "Fraser," a per-word field, not a catalog); `app.js:10` (`FIXED_NOTEBOOKS` includes `"Nyttiga fraser"` as one of 4 empty default notebooks); zero matches for "Uttryck" as a notebook name, view, or schema anywhere in `app.js`/`index.html`.

**Current Implementation:** "Fraser" exists today only as (1) a POS value sharing the exact same card/detail pipeline as every other word, (2) a per-word collocations field, and (3) one of four empty default notebook buckets. "Uttryck" does not exist as a structure at all — only as ordinary Swedish dictionary content (the word "uttryck" itself).

**Gap / Issue:** SpråkLab's own Part II roadmap (already on file, referenced in the prior audits) lists `SPK-PRD-FRASER` and `SPK-PRD-UTTRYCK` as first-class functional modules, implying distinct Learning Object types per the four-layer architecture. Nothing in the current codebase supports that — building the roadmap's version from scratch would mean either migrating existing "Fras"-POS words and "Fraser" collocation data into new structures, or leaving two disconnected representations of the same underlying concept.

**User Impact:** No current user-facing impact (nothing is broken today). Impact is entirely forward-looking: this is a genuine fork in Part II's design, not a minor implementation detail, and picking wrong now is expensive to unwind once Fraser/Uttryck have their own Learning Object schema, UI, and user data.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Decide explicitly, before SPK-PRD-FRASER/SPK-PRD-UTTRYCK specs are written, whether they become genuinely distinct Learning Object types (per SPK-FND-005) or whether the roadmap should be redefined around what already structurally exists (POS value + collocations field + notebook).

**Rationale:** Directly serves "Specification First" — this is exactly the kind of fork that specification-first process exists to catch before implementation, not after.

**Alternatives:** Option A — distinct Learning Object types for Fraser/Uttryck (larger effort, matches the original roadmap's ambition, cleaner long-term data model). Option B — formalize the existing POS-value/collocations/notebook pattern as "what Fraser and Uttryck are" (smaller effort, less disruptive, but narrower — a "Fras" is currently just a word-shaped object, which may not suit true idiomatic expressions well). No recommendation given here — this is squarely a Product Owner call requiring domain judgment about how phrases/expressions should actually be learned, which is outside this document's evidence base.

**Priority:** P1 — blocks writing two of the roadmap's Part II module specs correctly.

**Effort:** Decision itself is S; downstream implementation is L–XL depending on the option chosen.

**Dependencies:** SPK-FND-005 (Learning Object Specification), the eventual SPK-PRD-FRASER/SPK-PRD-UTTRYCK specs.

**Decision Required:** Which option (A or B, or a hybrid) — Product Owner decision, not inferable from evidence alone.

**Suggested Phase:** Foundation / Feature Implementation (blocks Part II Fraser/Uttryck specs).

---

#### [PLE-005] Läsning and Video are empty placeholders — no implementation exists to build from

**Area:** Product

**Current Evidence:** `index.html:219-225` (Läsning card, disabled, no handler); `index.html:227-233` (Video card, disabled, no handler); zero occurrences of "video" anywhere in `app.js` (full-file case-insensitive search); the only reading-adjacent code (`document-vocab-data.js`, a static pre-extracted vocabulary dataset) is dictionary content, not a reading UI, and its import button is now a stub `alert()` (`app.js:5703-5705`).

**Current Implementation:** Both are single disabled cards with a cover image and a "Snart" badge. Nothing else exists.

**Gap / Issue:** Not a code defect — this is a confirmed, honest placeholder state (see PLE-003 for the contrast with Profil's dishonest placeholders). Flagged here purely as a scope-completeness finding: these two Part-II-roadmap modules have zero existing implementation to build incrementally from.

**User Impact:** None today (clearly marked as not-yet-available). Forward-looking: these represent full module specs and builds, not incremental extensions.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* No design proposal is offered here — Läsning and Video need their own SPK-PRD specs (already scoped at a roadmap level in Volume A Part II) before any design/engineering work.

**Rationale:** N/A — this entry exists to make the "nothing to build from" scope explicit for planning purposes, not to recommend a direction.

**Alternatives:** N/A.

**Priority:** P2 (as a documentation/scoping gap; the features themselves are P1/roadmap items outside this document's remit).

**Effort:** N/A (scope confirmation only).

**Dependencies:** SPK-PRD-LÄSNING, SPK-PRD-VIDEO (not yet written).

**Decision Required:** None from this document; noted for Part II planning sequencing.

**Suggested Phase:** Feature Implementation (future, per Part II roadmap sequencing already on file).

---

#### [PLE-006] Roughly half of Shadowing's designed control surface is implemented but invisible

**Area:** Product / Engineering

**Current Evidence:** `index.html:563-570` (`#shadowingSetABtn`, `#shadowingSetBBtn`, `#shadowingToggleLoopBtn`, `#shadowingToggleAutoPauseBtn`, `#shadowingToggleSubtitlesBtn`, `#shadowingToggleContinuousBtn`, `#shadowingCompareBtn` — all `class="... visually-hidden"`); working logic behind all of them (`app.js:5047-5058` loop points, `5298-5324` toggles, `5146-5165` compare); level system: `app.js:245` (`state.shadowingLevel = "1"`, never changeable — `els.shadowingLevelButtons`/`els.shadowingLevelBadge` referenced in `app.js:472,492` have no matching markup in `index.html`).

**Current Implementation:** AB-loop, comparison-against-standard-audio, continuous play, auto-pause, subtitle toggle, and the 1–5 difficulty level all have complete, working JavaScript behind them, but no visible control exists to reach any of them in the shipped UI — level is permanently stuck at "1" for every user.

**Gap / Issue:** This is a large, functioning feature set that no user can currently access, sitting silently behind CSS-hidden markup rather than being scoped in or explicitly deferred.

**User Impact:** Learners lose access to what look like deliberately-designed practice aids (looping a hard sentence, comparing their pronunciation to the standard, progressive difficulty) — these map directly onto the "Shadow" stage of the stated learning cycle and their absence weakens that stage specifically.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Formally scope these into the Part II Shadowing spec: either re-enable and (if needed) redesign the controls, or explicitly defer them with the code removed/flagged rather than left silently wired.

**Rationale:** "System Before Features" cuts both ways here — a half-hidden feature set is itself a form of accidental complexity the system is carrying without benefit to users today.

**Alternatives:** Option A — re-enable as-is (fastest, but the current control layout was seemingly hidden for a UX reason not documented anywhere, so this carries some risk of reintroducing whatever problem caused the hide). Option B — redesign the control surface as part of the Shadowing Part II spec (recommended, since it can incorporate the typography/spacing/component standards proposed in §7 rather than reusing a hidden legacy layout).

**Priority:** P1 — meaningful learning-experience gap directly tied to a core stated learning-cycle stage.

**Effort:** M (mostly UI/UX design + re-exposing already-working logic; the hard engineering work is already done).

**Dependencies:** Part II Shadowing module spec; Design System component standards (§7) if Option B is chosen.

**Decision Required:** Re-enable as-is vs. redesign; timing relative to other Part II priorities.

**Suggested Phase:** Feature Implementation (Shadowing module).

---

#### [PLE-007] No AI learning feature is reachable by any real user today

**Area:** Product

**Current Evidence:** `app.js:6009-6011` (`fetchGeneratedWord()` throws immediately unless `isLocalDevelopmentOrigin()`); confirmed in the earlier project-wide audit (this conversation) that no `/api/generate-word` serverless function exists under `api/` in the Vercel deployment, and `OPENAI_API_KEY` is absent from the pulled production environment.

**Current Implementation:** The only AI-adjacent feature in the product ("AI-generera ordkort," AI word-card generation) is dev-only by explicit code guard, and the production backend for it does not exist. No AI Teacher, conversation practice, writing correction, or personalized recommendation feature exists anywhere in the codebase.

**Gap / Issue:** SpråkLab's Part III roadmap (AI Teacher, AI conversation, writing practice, grammar correction, generated exercises) has zero existing foundation beyond this one dev-only, currently-broken-in-production word-generation helper.

**User Impact:** None today (feature is invisible to production users — the button exists in the UI but is not reachable there per the earlier full-project audit). Forward-looking: Part III AI features are a from-scratch build, not an extension.

**Recommended Standard:** N/A — scope confirmation, not a design recommendation; AI Teacher direction is explicitly one of the "not yet finalized" product decisions already on record.

**Rationale:** N/A.

**Alternatives:** N/A.

**Priority:** P3 (as a documentation gap; the underlying feature work is a Part III, later-phase item by the product's own roadmap).

**Effort:** N/A.

**Dependencies:** Part III AI Teacher spec (not yet written, explicitly deferred per the product's own open-decisions list).

**Decision Required:** None from this document.

**Suggested Phase:** Feature Implementation (Part III, later).

---

#### [PLE-008] Learning history/memory data is collected but has no surviving UI

**Area:** Product / Engineering

**Current Evidence:** `app.js:3996-4033` (`renderHistory()`, fully implemented); referenced elements `#historyList`, `#historyPosFilter`, `#historyActionFilter` (`app.js:447, 516-517`) do not exist anywhere in `index.html` (confirmed by direct search); `appendLocalHistory()` called roughly 15 times across `app.js` on word actions, meaning history rows are still being written and synced to Supabase's `study_history` table.

**Current Implementation:** `historyView`'s markup was fully repurposed for Shadowing at some point; the history-list rendering function and its filter state remain in `app.js`, unreachable, while the underlying data continues to accumulate silently.

**Gap / Issue:** A feature that maps directly onto the product's own "Learning Memory" concept (already defined at the Foundation level) is actively collecting user data server-side with no way for the user to ever see it.

**User Impact:** Users get no visibility into their own action history despite the product's stated principle that "learning history must be preserved and traceable" — the data exists, but the trace is invisible to the person it's about.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Decide explicitly whether to (a) revive word-action history as a real, visible feature — the most natural fit given data is already flowing — (b) formally retire it and stop writing to `study_history`, or (c) fold its data into Profil's "Mina studier" stats instead of a standalone history log.

**Rationale:** Directly tied to the stated principle that learning history and traceability must be preserved — right now the "preserved" half is true and the "traceable [to the user]" half is not.

**Alternatives:** See (a)/(b)/(c) above; no default recommended, since this is a genuine product-shape decision, not a pure engineering fix.

**Priority:** P1 — silently accumulating user data with no access path is close to a data-stewardship issue, not just a UX gap.

**Effort:** S (revive existing UI) to M (redesign as part of Profil stats).

**Dependencies:** Profil module spec (Part II), SPK-FND-004 (Learning Model / Learning Memory).

**Decision Required:** Revive, retire, or merge into Profil stats.

**Suggested Phase:** Feature Implementation (Profil / History).

---

#### [PLE-009] Word deletion is fully implemented with zero reachable UI path

**Area:** Product / Engineering

**Current Evidence:** `app.js:6470` (`async function deleteWord(id)`, fully implemented); `app.js:3591` (`card.querySelector('[data-action="delete"]')`, always `null` — no such element exists in `index.html:953-976`'s `wordCardTemplate`); zero other callers of `deleteWord` anywhere in `app.js` (confirmed by full-file search).

**Current Implementation:** The backend logic to delete a word is complete and correct, but no button, menu item, or gesture in the current UI can trigger it.

**Gap / Issue:** Either word deletion was deliberately removed from the UI (e.g., in favor of un-favorite/archive-only semantics for a shared dictionary) and the dead function should be retired, or its removal was accidental and the capability should be restored.

**User Impact:** Users cannot remove a word they added by mistake or no longer want, other than via the favorite/notebook system as a workaround (unconfirmed whether that's an adequate substitute — see Unknowns, §12).

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Confirm intent; if deletion should exist, wire it into the detail view's action bar (a natural fit alongside the existing Edit action); if not, retire `deleteWord()`.

**Rationale:** Directly serves "System Before Features" — a dangling, unreachable capability is itself a small piece of accidental complexity.

**Alternatives:** Restore vs. retire — genuinely a product call given SpråkLab's shared-dictionary model (per the earlier project audit, `words` rows are shared across users with open write RLS, which makes "delete" a materially different, higher-stakes action than in a single-user dictionary).

**Priority:** P2.

**Effort:** S either direction.

**Dependencies:** None blocking; worth resolving alongside the word-detail "more menu" dead stub noted in the Current Product Audit (§5.2), since deletion is a natural candidate for that menu.

**Decision Required:** Restore or formally retire word deletion.

**Suggested Phase:** Feature Implementation (Ordbok module).

---

#### [PLE-010] Word-list empty states are not filter-aware; Shadowing recordings have no empty state at all

**Area:** Product / UX

**Current Evidence:** `app.js:3296-3302` (`renderWords()` always passes the same emptyText, `"Inga ord ännu. Lägg till ditt första ord."`, regardless of active filter); `app.js:2286-2305` (`getVisibleWords()`, filter branches for `favorite`/`learned`/`due` all funnel into the same empty-state call); Shadowing: `app.js:4641` / `app.js:4600` (recording panel visibility toggled via the `hidden` attribute with no accompanying message at all, unlike every other list in the app).

**Current Implementation:** An empty *favorites* filter, an empty *learned* filter, and a genuinely empty library all show the identical "add your first word" message. Shadowing's recording list shows nothing at all when empty (no "you haven't recorded yet" message).

**Gap / Issue:** The favorites/learned empty-state copy actively misleads (it tells a user with 500 words and 0 favorites to "add their first word," when the correct action is to favorite one of their existing words). The Shadowing gap breaks the otherwise-consistent empty-state pattern used everywhere else.

**User Impact:** Minor but real confusion at a specific, frequently-hit moment (any new user's first visit to an empty favorites/learned/history filter).

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Empty-state copy should vary by active filter/context; Shadowing recordings should get a proper empty state matching the shared `.empty-state` pattern.

**Rationale:** Directly serves "Simple for Users" — correct, context-appropriate messaging is a small effort with a real day-one clarity payoff.

**Alternatives:** None materially different; this is a low-ambiguity fix once the shared empty-state component (Design Proposal §7.6) exists.

**Priority:** P2.

**Effort:** S.

**Dependencies:** Shared empty-state component pattern (already exists as `.empty-state`/`.action-empty-state`; just needs filter-aware copy variants).

**Decision Required:** Approve filter-aware empty-state copy variants (content/microcopy decision, likely delegable below Product Owner level once the pattern is approved).

**Suggested Phase:** Design System (component) → Feature Implementation (copy).

---

#### [PLE-011] Silent feedback failures undermine the product's core trust promise (learning-memory preservation)

**Area:** Product / Engineering (full technical detail in §6.7 Feedback and Status; this entry captures the product-experience angle)

**Current Evidence:** See §6.7 for the complete evidence base — 59 `alert()` sites, ~30–40 silent `console.warn`/`console.error`-only sync-failure paths, zero toast/banner component, offline/pending-sync status visible only inside Profil → Inställningar.

**Current Implementation:** A user's word edits, study-session progress, or Shadowing recordings can fail to sync to Supabase in the background with no visible indication anywhere outside a specific Profil sub-page the user would have no particular reason to visit.

**Gap / Issue:** This directly contradicts the product's own stated principle that learning history/memory must be preserved and trustworthy — a user has no way to know, in the moment, whether their progress today actually saved.

**User Impact:** Potentially severe and cumulative: silent data loss (or the *perception* of it, which is nearly as damaging to trust) directly undermines "Continuous Growth" and "learning history preserved" as lived product principles, not just a cosmetic gap.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.7 (Interaction and State Model) for the full recommended feedback system. At minimum, sync failures affecting user-entered data should surface *something* visible, and pending-sync status should not require a Profil-page visit to discover.

**Rationale:** This is the single clearest place in the whole audit where a design-system gap (§6.7) becomes a product-trust risk, not merely a consistency issue — flagged at Product level accordingly.

**Alternatives:** See §7.7 for the full toast/banner/inline/persistent-status model options.

**Priority:** **P0** — the only P0 in the Product/Learning-Experience area. This is the closest thing in this audit to a data-integrity-perception risk, and directly affects the core learning-memory promise.

**Effort:** M–L (requires the shared feedback component from the Design Proposal, plus wiring it into the sync/save paths already identified in §6.7).

**Dependencies:** Design Proposal §7.7 (Interaction and State Model) must be approved first.

**Decision Required:** Prioritize this ahead of purely cosmetic design-system work, given its trust/data-integrity dimension.

**Suggested Phase:** Design System (build the component) → Component Migration (wire into existing save/sync paths) — recommended as an early, not deferred, phase given the P0 rating.

---

### 6.2 Information Architecture

---

#### [IA-001] No URL routing, deep linking, or browser back/forward support

**Area:** IA / Engineering

**Current Evidence:** `app.js:7927-7942` (`activateView()`, the entire navigation mechanism — toggles `.view.active`, sets `document.body.dataset.activeView`); `app.js:55-75` (`LEGACY_VIEW_STATE_KEYS`, 17 keys evidencing a prior URL-param routing scheme); `app.js:7828` (`cleanupLegacyViewState()`, still run on every load per `app.js:9065, 9071, 9140`) — i.e., the app actively discards location-based state on every startup rather than reading it.

**Current Implementation:** Every screen transition is an in-memory state change with no corresponding URL. Reloading the page, sharing a link, or using the browser's back button cannot return a user to a specific view, notebook, or word.

**Gap / Issue:** No deep-linking capability exists at all — not to a specific word, notebook, Shadowing item, or Profil sub-page. Browser back/forward is not wired to app navigation.

**User Impact:** On the web/PWA, this means a user cannot bookmark or share a specific word or notebook, and reloading always returns to Home regardless of where they were. On a future native iOS build, an equivalent gap would mean no support for standard iOS deep-link/Universal Link patterns.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.8 (Responsive Model) is not the right home for this — see instead the routing options laid out immediately below in Option A/B, since this is a foundational, not a cosmetic, IA decision.

**Rationale:** Directly affects the stated principle that the product must support long-term expansion, not just current pages — every additional Part II module compounds the cost of retrofitting routing later, and the App Store goal implies eventual native deep-link support regardless.

**Alternatives:**
- **Option A — Introduce a lightweight client-side router now** (e.g., hash-based or History-API-based, mapping view/dialog state to URL) before more Part II modules are built on the current pattern. Cost: moderate, touches the navigation core (`activateView`, `bindEvents`) and needs careful handling of the existing dialog-overlay model. Benefit: deep links, shareable state, correct back-button behavior, a much smaller gap to close before any future native rewrite needs an equivalent navigation-stack concept.
- **Option B — Defer routing** until Part II's module count actually requires it, and accept the current no-routing model for now. Cost: every module built in the meantime adds more surface that will eventually need retrofitting. Benefit: no disruption to current velocity; correct if the product's next phase is genuinely still exploratory.
- **Recommended for consideration:** Option A, specifically because the product's own stated learning-cycle ("Discover → Understand → Learn → Review → Listen → Shadow → Read → Use → Assess") implies content that's meant to be revisited and cross-referenced across sessions — a pattern that benefits significantly from addressable state. This is a recommendation for Product Owner evaluation, not a decision.

**Priority:** P1 — not blocking today, but the cost of delay compounds with every new Part II module.

**Effort:** L — touches the core navigation mechanism and needs to preserve all existing dialog-overlay behavior.

**Dependencies:** Should be decided before Part II's IA work formally begins, per the user's own framing of this review's purpose.

**Decision Required:** Introduce routing now (and at what scope — full deep-linking, or just top-level views first) vs. defer.

**Suggested Phase:** IA (foundational decision) → Component Migration (implementation, if approved).

---

#### [IA-002] Duplicate "navigate home" implementations

**Area:** IA / Engineering

**Current Evidence:** `app.js:7927-7942` (`activateView()`); `app.js:7944-7958` (`forceHomeView()`, duplicates most of `activateView()`'s body rather than calling it).

**Current Implementation:** Two separate functions independently implement overlapping "switch to a view" logic.

**Gap / Issue:** A future change to view-switching behavior (e.g., adding routing per IA-001) must be made in two places or risks drifting; this has already partially happened once (the two functions are not identical).

**User Impact:** None directly today; pure maintainability risk.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Consolidate `forceHomeView()` to call `activateView()` internally, preserving its "hard reset" semantics as a parameter/flag rather than a separate reimplementation.

**Rationale:** Basic DRY engineering hygiene; low risk, low cost, prevents compounding drift especially if IA-001's routing work touches this code anyway.

**Alternatives:** None meaningfully different.

**Priority:** P3.

**Effort:** S.

**Dependencies:** Best done together with IA-001 if that is approved, since both touch the same functions.

**Decision Required:** None product-facing; flagged for engineering awareness.

**Suggested Phase:** Later Cleanup (or bundled into IA-001's implementation if approved).

---

#### [IA-003] The 3-tab bottom navigation has no structural room for the Part II module roadmap

**Area:** IA / Product

**Current Evidence:** `index.html:641-671` (`.tabbar`, exactly 3 items: Hemsida/Bibliotek/Profil); Bibliotek currently nests 4 modules (Ordbok/Shadowing/Läsning/Video) one level deeper as cards, with no CSS/JS mechanism for a 5th, 6th, or 7th top-level destination (Fraser, Uttryck, AI Teacher per the roadmap) beyond adding more Bibliotek cards.

**Current Implementation:** Global navigation is fixed at exactly 3 destinations; every other module lives inside Bibliotek's shelf or inside Profil's sub-pages.

**Gap / Issue:** The roadmap already names at minimum 7 Part II/III destinations (Ordbok, Fraser, Uttryck, Shadowing, Läsning, Video, AI Tutor) plus cross-cutting capabilities (Search, Listening — explicitly noted in the product's own Foundation material as possibly not standalone modules). The current structure can only accommodate this by nesting everything indefinitely inside Bibliotek, which risks Bibliotek itself becoming a second, un-navigable "junk drawer" level as more modules arrive.

**User Impact:** Forward-looking, not current: this is the single highest-leverage structural decision in the entire review, since every Part II module built without resolving it inherits whatever nesting pattern is chosen implicitly rather than deliberately.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Decide the target IA shape before more Part II modules are built.

**Rationale:** Directly serves "the product must support long-term expansion, not just current pages" — this is precisely the kind of decision that principle exists to force early.

**Alternatives:**
- **Option A — Keep 3 tabs, deepen Bibliotek.** Bibliotek becomes a true "library of libraries" — possibly with its own sub-navigation (categories/sections) rather than a single flat shelf. Lowest disruption to current navigation muscle memory; risk of Bibliotek becoming overloaded as module count grows past ~6-8.
- **Option B — Expand to 4-5 tabs**, promoting the most-used destinations (e.g., a "Studera" or "Öva" tab distinct from Bibliotek) to top level, keeping less-frequent modules nested. Matches common patterns in mature learning apps (Duolingo-style: Learn / Practice / Leaderboard / Profile). Moderate disruption; requires deciding which modules "deserve" top-level status, which is itself a product-priority question.
- **Option C — Introduce a secondary navigation layer** (e.g., a "More" tab, or a persistent side-rail on larger viewports per the responsive gap in §6.8) that scales independently of the primary tab bar. Lower disruption than B, but adds a layer of navigation depth some users may find less discoverable.
- **No option is recommended here** — this genuinely depends on which Part II modules the Product Owner expects to be highest-frequency destinations, which is outside this document's evidence base.

**Priority:** P1 — the single most consequential open IA question in this review.

**Effort:** Decision is S; implementation is M–L depending on option chosen, and compounds if deferred past the next 2-3 Part II modules.

**Dependencies:** Should precede or run alongside SPK-PRD specs for Fraser, Uttryck, Läsning, Video, AI Tutor.

**Decision Required:** Choose target IA shape (Option A/B/C or a variant) before Part II module builds proceed further.

**Suggested Phase:** IA (must precede further Feature Implementation on Part II modules).

---

#### [IA-004] Navigation depth is inconsistent across modules with no stated rule

**Area:** IA

**Current Evidence:** Home/Bibliotek/Profil: 1 tap from the tab bar. Word list (`wordLibraryView`), notebooks (`notebookView`), Shadowing (`historyView`): 2 taps (tab bar → Bibliotek card → view). Word detail, add/edit, study session, save-sheet: dialog overlays reachable from multiple different starting points (search, word cards, session flow) with no single canonical entry point.

**Current Implementation:** No documented or apparent rule governs how many taps a given piece of functionality should be from the tab bar.

**Gap / Issue:** This isn't necessarily wrong (depth-2 for secondary destinations is a common, reasonable pattern), but it's undocumented, meaning each new Part II module's placement will be decided ad hoc rather than against a stated rule.

**User Impact:** Low today (the current depth pattern is broadly reasonable); the risk is entirely about consistency going forward as more modules are added without a rule to check against.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Document an explicit navigation-depth rule as part of the IA-003 decision (e.g., "top-level tabs = depth 1; primary content modules = depth 2 via Bibliotek; transient actions = dialog overlay") so future modules have a rule to follow rather than a precedent to reverse-engineer.

**Rationale:** Low-cost documentation task that meaningfully de-risks every subsequent Part II module's IA placement.

**Alternatives:** None — this is a documentation/rule-setting task, not a design fork.

**Priority:** P2.

**Effort:** S (documentation only, once IA-003 is resolved).

**Dependencies:** IA-003 must be resolved first (the depth rule depends on the chosen tab-bar shape).

**Decision Required:** Approve a stated navigation-depth rule.

**Suggested Phase:** IA.

---

#### [IA-005] No tablet/desktop navigation model exists

**Area:** IA / Responsive (full breakpoint technical evidence in §6.8; this entry covers the navigation-specific angle)

**Current Evidence:** `styles.css:24` (`--app-max-width: 430px`); `styles.css:205-214` (`.app-shell` capped at that width on all viewports); the only `@media` rule touching `.tabbar` is the print stylesheet hiding it (`styles.css:5455`) — no tablet/desktop variant exists.

**Current Implementation:** On any viewport wider than ~430px, the entire app — including the bottom tab bar — renders as a fixed-width phone-shaped column centered in empty space. There is no side-navigation, rail, or wider-layout variant at any breakpoint.

**Gap / Issue:** The product's own stated constraint is that "primary usage context is mobile PWA today, but tablet/desktop must not be ignored" — the current implementation fully ignores it (not partially — zero tablet/desktop-specific navigation logic exists).

**User Impact:** Today: any user opening SpråkLab on an iPad or desktop browser gets a materially degraded, wasted-space experience. Forward-looking: the explicit App Store + iPad distribution goal makes this a near-term, not theoretical, gap.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.8 for a concrete responsive-model recommendation with tablet-specific navigation options.

**Rationale:** Directly contradicts the "must not be ignored" constraint as currently implemented; also directly relevant to the explicit iPad App Store goal.

**Alternatives:** See §7.8.

**Priority:** P1 — explicitly named in scope constraints and directly relevant to the stated iPad distribution goal.

**Effort:** L (a genuine tablet layout pass, not a minor breakpoint tweak).

**Dependencies:** Best sequenced after IA-003 (tab-bar shape), since a tablet nav model (e.g., side-rail) is easiest to design once the target set of top-level destinations is settled.

**Decision Required:** Is tablet/desktop layout in scope for the current design phase, or explicitly deferred to a later phase?

**Suggested Phase:** IA / Responsive Model (Design System phase), sequenced after IA-003.

---

#### [IA-006] Home tab's accessible name and visible label disagree

**Area:** IA / Accessibility

**Current Evidence:** `index.html:642` (`aria-label="Startsida"`) vs. `index.html:650` (`<span class="tab-label">Hemsida</span>`) — same control, two different Swedish words for "home page."

**Current Implementation:** A sighted user reads "Hemsida"; a screen-reader user hears "Startsida."

**Gap / Issue:** Small but concrete accessibility/consistency defect, most likely an incomplete rename (one string updated, the other missed).

**User Impact:** Minor for most users; a real (if small) confusion for screen-reader users cross-referencing spoken vs. any visually-referenced instructions (e.g., a support article saying "tap Hemsida").

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Use the same term for both — "Hemsida" is recommended for consistency with the visible label, unless "Startsida" is the intended canonical term, in which case update the visible label instead.

**Rationale:** WCAG 2.5.3 (Label in Name) expects the accessible name to contain the visible label text — this currently fails that criterion outright since the words don't overlap at all.

**Alternatives:** Either word is fine as the canonical term; what matters is picking one.

**Priority:** P2 (concrete WCAG failure, but narrow/low-severity in practice).

**Effort:** S — one-line fix.

**Dependencies:** None.

**Decision Required:** Which term is canonical ("Hemsida" or "Startsida")?

**Suggested Phase:** Later Cleanup (trivial fix, can bundle with any nearby Home-page work such as PLE-001/PLE-002).

---

### 6.3 Typography

This section was re-verified directly against `styles.css` for this document (not copied from the prior audit without re-checking) — the counts below were re-derived by this review and, in the case of font-weight, are more fragmented than the prior Design System Audit's summary suggested.

---

#### [TYP-001] No type-scale tokens exist; 172 font-size declarations resolve to 51 distinct raw values

**Area:** Typography / Design System

**Current Evidence:** Zero matches for `--font-size-*`/`--fs-*` anywhere in `styles.css` (confirmed by direct search, this pass). Full re-derived distribution of all 172 `font-size:` declarations in `styles.css` (top of distribution): `1rem`×15, `0.82rem`×12, `0.78rem`×12, `0.9rem`×9, `0.8rem`×9, `0.76rem`×8, `0.92rem`×7, `0.84rem`×7, `1.08rem`×6, `2rem`×5, `0.98rem`×5, `0.86rem`×5, `0.94rem`×4, `0.7rem`×4, `0.72rem`×4, `0.68rem`×4, `1.2rem`×3, `1.1rem`×3, `1.12rem`×3, `1.05rem`×3, `0.96rem`×3, `0.88rem`×3, plus 29 further values occurring 1-2 times each including two non-`rem` outliers (`16px`×2, `10pt`×1) and a fluid value (`clamp(1.45rem, 7vw, 2rem)`×1).

**Current Implementation:** Every component's font size was authored as an independent literal value. There is no scale to check a new value against, and no consistent step interval between neighboring sizes (e.g., `0.94/0.95/0.96/0.98/1.0/1.02rem` are six near-identical sizes within a 6% range, occurring at 6 different sites, that a type scale would normally collapse into 1-2 steps).

**Gap / Issue:** This is not "an inconsistent scale" — it is the complete absence of a scale. 51 distinct values for what should reasonably be 6-10 semantic sizes (per the candidate list requested for this review: Display, Page title, Section title, Card title, Body, Supporting body, Label, Button text, Input text, Caption, Metadata, Error/help text) is roughly 5-8x more raw values than a disciplined scale would produce.

**User Impact:** Indirect but real: inconsistent sizing between visually-similar elements (see TYP-003 for the concrete "card title" case) makes the interface feel less considered and makes it harder for a learner to build a reliable visual hierarchy for scanning (e.g., "the bigger bold text is always the word, the smaller text is always the meaning" — currently not reliably true across all card types).

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.2 for a full candidate type scale mapped against SpråkLab's current interface density and content types.

**Rationale:** A type scale is one of the highest-leverage, lowest-risk design-system investments available — it constrains future work without requiring a visual redesign of what already works.

**Alternatives:** See §7.2 for scale options.

**Priority:** P1 — the typography audit was explicitly named as a focus area for this review round, and the current state (51 raw values) is a larger gap than a "P2 consistency" framing would suggest.

**Effort:** L — defining the scale is S, but auditing and remapping 172 existing declarations onto it (even without a visual redesign, just consolidating near-duplicate values) is a substantial mechanical effort.

**Dependencies:** None blocking; independent of IA/routing decisions.

**Decision Required:** Approve a candidate type scale (§7.2) as the target, and decide whether remapping existing CSS onto it happens now or is deferred to a later Component Migration phase.

**Suggested Phase:** Design System (define scale) → Component Migration (remap existing declarations).

---

#### [TYP-002] Font-weight is expressed as 26 distinct raw numbers, many non-standard — strong evidence of unmediated design-tool export

**Area:** Typography / Design System / Engineering

**Current Evidence:** Full re-derived distribution of all `font-weight:` declarations in `styles.css`: `700`×17, `720`×13, `760`×12, `780`×8, `650`×7, `800`×5, `820`×4, `680`×4, `840`×3, `740`×3, `730`×3, `690`×3, `640`×2, `400`×2, `360`×2, plus 11 further single-occurrence values including `900`, `860`, `790`, `750`, `710`, `660`, `600`, `580`, `500`, `450`, `320`.

**Current Implementation:** CSS `font-weight` is conventionally expressed in multiples of 100 (100–900, matching named weights like Regular/Medium/SemiBold/Bold). This file instead contains weights like `720`, `760`, `780`, `820`, `690`, `360` — values that do not correspond to any standard weight step and are unlikely to have been typed by hand.

**Gap / Issue:** This is the clearest single piece of evidence in the whole audit that styling was authored by copying precise numeric output from a design tool (e.g., Figma's variable-font-weight slider, which permits arbitrary integer values) directly into CSS, rather than against any defined scale — and it happened repeatedly, not once. Practically, most system/variable fonts (including the declared `Inter` stack) do not reliably render meaningfully different results between e.g. `720` and `740` — these near-values are very likely visually indistinguishable in practice, meaning the fragmentation carries no visual benefit, only maintenance cost.

**User Impact:** No direct user-visible impact (the rendered weights likely collapse to very similar visual results); the impact is entirely on consistency and maintainability.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Adopt a small, standard set of font-weight steps (e.g., 400/500/600/700/800 — see §7.2) and remap all current values onto the nearest standard step.

**Rationale:** Removes non-standard values with no rendering benefit; makes the codebase legible to any future contributor or design tool without needing tribal knowledge of what `760` versus `780` was "supposed" to mean.

**Alternatives:** None meaningfully different — this is a low-ambiguity cleanup once a target weight set is chosen.

**Priority:** P2 — real but purely a consistency/maintainability issue, no direct user impact.

**Effort:** M (same remapping exercise as TYP-001, can be done together).

**Dependencies:** Should be done alongside TYP-001's remapping pass for efficiency.

**Decision Required:** Approve the target weight-step set (§7.2).

**Suggested Phase:** Design System → Component Migration.

---

#### [TYP-003] No global heading styles below `h2`; the "card title" semantic role has 5 conflicting treatments

**Area:** Typography

**Current Evidence:** `styles.css:2599-2604` (global `h1`: `font-size:1.58rem; line-height:1.12; font-weight:720`); `styles.css:2606-2610` (global `h2`: `font-size:1.08rem; font-weight:700`); zero global rule for `h3`–`h6` (confirmed, no matches). Five separately-defined "card title" `h3` treatments: `.study-complete h3` (`styles.css:2993-2997`, 1.16rem/720), `.study-entry-card h3` (`3074-3078`, 1.08rem/740), `.word-row h3` (`3937-3941`, 1rem/inherit/line-height 1.25), `.word-card h3` (`3979-3986`, 1.2rem/720/line-height 1.22), `.study-word-card h3` (`4645-4651`, 1.8rem/inherit/line-height 1.08).

**Current Implementation:** Every component that uses an `h3` as its title restyles it independently; there is no shared "card title" style. The size range across these five (1rem to 1.8rem, a 1.8x spread) is large enough that it's unlikely to be a deliberate emphasis hierarchy — it reads as five independent authoring decisions.

**Gap / Issue:** The single most-repeated visual role in the app (every word card, study card, and book card has a title) has the least consistency of any typographic element measured in this review.

**User Impact:** A learner scanning between, say, a word card and a study-session card sees the "same kind of thing" (a title) rendered at meaningfully different sizes/weights, which weakens the sense of a single coherent system — most noticeable to attentive/returning users rather than first-time users.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Define one "Card title" level in the type scale (§7.2) and apply it to all five current sites, allowing genuine exceptions (e.g., `.study-word-card h3` at 1.8rem might be a deliberate "hero word" emphasis during active study, not an accident) to be explicitly re-justified rather than silently inherited.

**Rationale:** This is the concrete, worked example of why TYP-001's abstract "no scale" finding matters in practice.

**Alternatives:** Option A — one single Card Title size for all five contexts (simplest, may lose intentional emphasis in the study-word-card case). Option B — two Card Title sub-levels (standard and "emphasized/hero," for contexts like active study review where a larger word is likely intentional). Recommended: Option B, since 1.8rem for the word being actively studied looks like plausible deliberate emphasis rather than drift, unlike the other four values which cluster much closer together and look like unintentional variance.

**Priority:** P1 — concrete, high-repetition inconsistency directly named in the review's typography focus.

**Effort:** M.

**Dependencies:** TYP-001 (type scale must be defined first).

**Decision Required:** Approve Option A vs. B (single vs. two-tier card title), and confirm whether the `.study-word-card` 1.8rem size is intentional emphasis (Unknown from code alone — see §12).

**Suggested Phase:** Design System → Component Migration.

---

#### [TYP-004] No confirmed support for Dynamic Type, browser zoom, or reduced-motion-adjacent accessibility text scaling; mixed units; multilingual text needs unaddressed

**Area:** Typography / Accessibility

**Current Evidence:** All font sizes are expressed in `rem` except two `16px` declarations and one `10pt` declaration (confirmed, this pass) — `rem` values do scale with the user's browser/OS base font size setting, which is a baseline positive (this is **Fact**, not assumption: `rem` is relative to the root `<html>` font-size, which browsers scale under system text-size settings). However: (a) the two `px` and one `pt` outlier will not scale, a small but real inconsistency; (b) there is no code evidence either way of iOS Dynamic Type support specifically, since this is a web/PWA context today and Dynamic Type is a native-iOS-only API — this is an **Unknown**, not a confirmed gap, until a native build exists; (c) `--chinese-font` (`styles.css:25`) is applied at only 7 specific sites (`styles.css:3504, 4017, 4187, 4707, 4715, 4742, 4787`) for Chinese-meaning text, meaning most of the interface's body text uses the Latin/Swedish font stack even in contexts that may render Chinese content, with no confirmed testing evidence of how Chinese glyphs render in the default `Inter`-first stack outside those 7 sites.

**Current Implementation:** Base relative-unit usage is good practice and already mostly followed (170 of 172 `font-size` declarations use `rem`). Multilingual text handling is narrow and manually applied rather than systematic.

**Gap / Issue:** Three distinct sub-issues: (1) two hard-coded non-scaling font sizes; (2) unconfirmed Dynamic Type behavior (Unknown, relevant once a native iOS target exists — see §7.9 and §12); (3) no systematic answer for how Swedish, Chinese, and (potentially future Language Pack) text should each be font-stacked, sized, and line-height'd, given CJK glyphs typically need different line-height/size relationships than Latin text to read comfortably at the same apparent size — this project has not defined a rule for that, only 7 manually-chosen exceptions.

**User Impact:** Low today (the app functions and is legible); the multilingual-typography gap becomes more consequential as more Chinese content-dense views are built (per PLE-008/PLE-009's history findings, and any future reading/Läsning content) and as additional Language Packs are added per the four-layer architecture, potentially introducing further scripts (e.g., a future Japanese pack).

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* (1) Convert the two `px`/one `pt` outliers to `rem`. (2) Explicitly mark iOS Dynamic Type support as an Unknown requiring a decision once native iOS work begins (do not silently assume web `rem`-scaling is equivalent). (3) Define a systematic rule for script-aware typography (which font stack, and whether line-height/size need script-specific adjustment) rather than continuing to add one-off `--chinese-font` sites — see Design Proposal §7.2 for a candidate rule.

**Rationale:** Small, low-risk fixes for (1); explicit unknown-flagging for (2) prevents false confidence; (3) directly serves the multi-language platform direction, since script-aware typography is exactly the kind of concern that belongs in the Language Pack layer's presentation rules, not ad hoc per-component CSS.

**Alternatives:** For (3): Option A — keep the current "flag specific sites for Chinese font" approach, just formalize it as a rule rather than case-by-case judgment calls. Option B — define this as a Language-Pack-level concern (per the four-layer architecture already agreed) so that future language packs bring their own typography rules rather than the Learning Engine's UI hard-coding script exceptions. Recommended: Option B is more consistent with the stated architecture, but is a larger scope decision properly belonging with the Foundation/Language Pack contract work already flagged in the Product Direction Review, not this document.

**Priority:** P2 for (1) [mechanical fix]; **Unknown/flag-only** for (2) [not actionable until native work begins]; P2 for (3) [real but not urgent while SpråkLab remains single-language].

**Effort:** S for (1); N/A for (2) until relevant; M for (3) if pursued now, or deferred at no cost if bundled into the future Language Pack contract work.

**Dependencies:** (3) depends on the Language Pack contract decisions already flagged as open in the Product Direction Review (this conversation, prior turn) — should not be decided in isolation from that work.

**Decision Required:** Approve (1) as a mechanical fix; acknowledge (2) as a tracked Unknown; decide whether (3) is addressed now or deferred to the Language Pack contract work.

**Suggested Phase:** Later Cleanup for (1); Foundation (Language Pack contract) for (3); (2) has no phase until native iOS work is scheduled.

---

### 6.4 Spacing and Layout

---

#### [SPC-001] No spacing scale exists; padding and gap values are dominated by plausible multiples but polluted by one-off values with no discernible system

**Area:** Spacing / Design System

**Current Evidence:** Zero matches for `--space-*`/`--spacing-*` tokens (confirmed, this pass). Re-derived `padding:` distribution (168 declarations): `0`×31, `0 12px`×10, `14px`×8, `12px`×6, `18px`×4, `16px`×4, `15px`×4, `10px`×4, `0 10px`×4, `9px 10px`×3, `8px`×3, `5px 9px`×3, `0 8px`×3, `0 22px`×3, `0 18px`×3, plus 20+ further values including several `calc(... + env(safe-area-inset-*))` compound values and one-offs like `17px`. Re-derived `gap:` distribution (192 declarations): `8px`×45, `10px`×32, `12px`×30, `6px`×17, `7px`×11, `4px`×10, `14px`×10, `5px`×6, `9px`×4, `18px`×4, `16px`×4, `0`×4, `3px`×3, `2px`×3, `15px`×3, plus a handful of larger/compound values.

**Current Implementation:** The dominant gap values (8/10/12/6/4px) are consistent with a roughly-4px-based system, which is a reasonable foundation already largely in place by convention if not by token. But the presence of `7px` (11 uses — nearly as common as `6px`), `9px`, `3px`, `11px`, `13px`, `17px` shows this "system" is not enforced — `.library-controls { padding: 13px }` sits directly beside `.search-panel { padding: 15px }` for two visually-parallel toolbar-like components (`styles.css`, confirmed adjacent in the design-system audit's citation).

**Gap / Issue:** Similar to typography — the underlying pattern is closer to a real system than the color/typography findings (roughly 60-70% of gap usage already clusters on 4px-multiples), meaning a formal token scale here is lower-risk and lower-effort to introduce than in other areas, since it mostly needs to *codify* an already-mostly-followed convention rather than invent one from scratch.

**User Impact:** Subtle visual unevenness between adjacent components (e.g., two toolbars with different padding) — noticeable mainly to attentive users, not a functional problem.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.3 for a candidate spacing scale that intentionally builds on the already-dominant 4px-multiple pattern rather than replacing it.

**Rationale:** Lower-risk, higher-confidence proposal than typography/color, precisely because the evidence shows an implicit system already mostly in place.

**Alternatives:** See §7.3.

**Priority:** P2.

**Effort:** M — remapping is more mechanical than typography since most values are already close to the proposed grid.

**Dependencies:** None blocking.

**Decision Required:** Approve the candidate spacing scale (§7.3).

**Suggested Phase:** Design System → Component Migration.

---

#### [SPC-002] No radius scale; box-shadow tokens exist but are bypassed roughly 77% of the time, including hand-retyped duplicates of the tokens' own values

**Area:** Spacing / Design System

**Current Evidence:** Re-derived `border-radius:` distribution (121 declarations): `999px`×27 (pill shape), `16px`×14, `14px`×11, `18px`×10, `12px`×10, `0`×10, `50%`×9, `10px`×8, `22px`×7, `24px`×4, `inherit`×2, `8px`×2, `20px`×2, `9px`×1, `13px`×1, plus 3 compound multi-corner values. Box-shadow: 61 total declarations, of which only 14 (23%) reference `var(--shadow)`/`var(--soft-shadow)`; the remaining 47 are hand-typed `rgba()` values, at least one of which (`.profile-snapshot-card`, cited in the prior Design System Audit) is a byte-for-byte duplicate of `--soft-shadow`'s own value typed out literally rather than referencing the variable.

**Current Implementation:** Border-radius has a somewhat sensible core (999px pills, a cluster around 12-18px for cards, 50% for circles) but 17 total distinct values with no naming/token structure to distinguish "intentional variation" from "accidental drift." Shadows have tokens that are actively being duplicated by hand rather than referenced, which is the strongest evidence in this section that the problem is process (no habit of checking for an existing token before writing a new value), not a lack of awareness that tokens exist.

**Gap / Issue:** Same category of gap as SPC-001, with the shadow-duplication finding being the most concrete illustration in the whole audit of "tokens exist, are being manually recreated instead of used."

**User Impact:** Subtle visual inconsistency in corner rounding and shadow depth between similar components; no functional impact.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.5 for a candidate radius/shadow token structure.

**Rationale:** Directly evidenced need — this isn't a hypothetical improvement, it's fixing an already-half-built system that's being bypassed.

**Alternatives:** See §7.5.

**Priority:** P2.

**Effort:** M.

**Dependencies:** None blocking.

**Decision Required:** Approve the candidate radius/shadow token structure (§7.5).

**Suggested Phase:** Design System → Component Migration.

---

#### [SPC-003] Fixed 430px content max-width with no tablet/desktop layout tier (cross-referenced from IA-005)

**Area:** Spacing / Layout / IA

**Current Evidence:** `styles.css:24` (`--app-max-width: 430px`); `styles.css:205-214` (`.app-shell`); confirmed via re-derivation this pass: exactly 7 `@media` rules exist in the entire stylesheet (`styles.css:2491, 2513, 2734, 5001, 5029, 5424, 5439`), using 5 distinct breakpoint values (620px, 380px, 360px, 430px, 560px) with no shared `--breakpoint-*` tokens, plus one `prefers-reduced-motion` query and one `print` query. Only one rule (`styles.css:5424`, `min-width: 560px`) widens anything for larger viewports, and it only affects the Bibliotek shelf grid.

**Current Implementation:** See IA-005 for the navigation-specific consequence; this entry covers the pure layout/spacing dimension — there is one content width for every device, and safe-area handling (`env(safe-area-inset-*)`, used 25 times, confirmed this pass — a genuine positive finding for iOS notch/home-indicator support) is the only place device-specific layout adaptation exists at all.

**Gap / Issue:** No layout tier exists between "phone" and "print." This is the same underlying gap as IA-005, restated here because it is fundamentally a spacing/layout-system gap (max-width, grid columns, content density) as much as a navigation gap.

**User Impact:** See IA-005.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.8 for a candidate responsive model including content-width tiers.

**Rationale:** See IA-005; restated here to ensure the Design Proposal's spacing/layout section addresses it directly rather than only the navigation angle.

**Alternatives:** See §7.8.

**Priority:** P1 (matches IA-005's priority — same underlying gap).

**Effort:** L.

**Dependencies:** Best sequenced with IA-003/IA-005.

**Decision Required:** Same as IA-005 — is tablet/desktop layout in scope now?

**Suggested Phase:** IA / Responsive Model, sequenced with IA-005.

---

### 6.5 Color

This section includes new WCAG 2.2 contrast-ratio calculations computed directly for this document (relative-luminance formula, not estimated) against the current token set — these figures are new evidence, not restated from the prior audits, which did not compute contrast ratios.

---

#### [COL-001] Four confirmed color pairs in active use fail WCAG 2.2 AA contrast for normal-size text, including the primary button's own text color

**Area:** Color / Accessibility

**Current Evidence (computed this pass):**

| Pair | Values | Contrast ratio | WCAG AA normal text (≥4.5:1) | WCAG AA large text (≥3:1) |
|---|---|---|---|---|
| White text on `--accent` (primary button / active chip fill) | `#ffffff` / `#6f8f80` | **3.55:1** | **FAIL** | Pass |
| `--muted` on `--bg` | `#747b7b` / `#f5f5f7` | **3.97:1** | **FAIL** | Pass |
| `--muted` on `--surface-solid` | `#747b7b` / `#ffffff` | **4.32:1** | **FAIL** | Pass |
| `--muted-blue` on `--bg` | `#7b8a9a` / `#f5f5f7` | **3.24:1** | **FAIL** | Pass |
| `--gold` (active-favorite star) on white | `#a76f00` / `#ffffff` | 4.27:1 | Borderline FAIL (needs 4.5) | Pass |

For comparison, pairs that **pass**: `--ink` on `--bg` (13.70:1), `--accent-strong` on white (5.52:1), `--danger` on `--danger-soft` (4.83:1), white on `--tab-active` (9.66:1), `--accent-strong` on `--accent-soft` (5.00:1, the POS-badge pairing).

Component sites using the failing pairs: `.primary-button`/`.chip.active` (`styles.css:2865-2872`, `background:var(--accent); color:#fff`) — this is the base style for **every primary call-to-action button in the app**; `--muted` is used broadly for secondary/supporting text throughout the app (e.g., meta rows, captions); `.star-button.active` (`styles.css:4235-4239`, `color:var(--gold)`) is the "favorited" star icon shown on every favorited word card.

**Current Implementation:** These color pairs are in active, widespread use exactly as shown — not edge cases.

**Gap / Issue:** SpråkLab's primary button — the single most-used interactive element in the product — fails WCAG AA contrast for its own label text at normal size (3.55:1 against a 4.5:1 requirement). `--muted`, used broadly for secondary text, fails against both backgrounds it's paired with.

**User Impact:** Real, not theoretical — users with low vision or in bright ambient light (a common real-world condition for a mobile PWA) may struggle to read primary button labels and muted/secondary text. This is also a concrete compliance-relevant risk: Apple's App Store review process and accessibility guidelines reference WCAG-aligned contrast expectations, and this is exactly the class of issue an App Store accessibility audit (automated or manual) is likely to flag.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Darken `--accent` for use as a button *fill* behind white text (or introduce a separate, darker `--accent-on-fill`/button-specific token — see §7.4), and darken `--muted` toward something closer to `#5c6363`-range (illustrative, not final) to clear 4.5:1 against both `--bg` and `--surface-solid`. Any change to brand accent color must preserve the brand's intended hue/character — this is explicitly a "keep the brand direction, fix the specific failing pairing" recommendation, not a request to redesign the palette.

**Rationale:** Directly addresses a real WCAG 2.2 AA failure on the product's single most-repeated interactive element, and is directly relevant to the explicitly-stated accessibility and App-Store-readiness goals.

**Alternatives:** Option A — darken the specific failing token values only (recommended; minimal, targeted, preserves brand hue). Option B — introduce entirely separate "on-fill" text-color tokens distinct from body-text tokens, used only for text-on-colored-background contexts (more flexible long-term, more upfront token-structure work). Recommended: start with Option A for the immediate fix, adopt Option B's structure as part of the broader token restructuring in §7.4 regardless, since it's good practice independent of this specific failure.

**Priority:** **P0** — this is a severe, confirmed accessibility defect (WCAG AA failure) on the single most-used component in the product, directly relevant to the App Store readiness goal already on record. This is one of two P0 findings in this entire document (the other being PLE-011, silent sync failures).

**Effort:** S for the specific token-value fixes; the values touch every primary button/active-chip/favorited-star instance simultaneously since they're already token-based (a rare case where the *existing* token usage makes the fix cheap, even though the token values themselves are wrong).

**Dependencies:** None blocking; can be fixed independently of any other decision in this document, though ideally validated alongside the full palette proposal in §7.4.

**Decision Required:** Approve specific replacement values (exact hex values are a design decision requiring visual review, not something this document should finalize) for `--accent` (as used behind white text), `--muted`, `--muted-blue`, and `--gold`.

**Suggested Phase:** Design System — recommended as an **early**, not deferred, item given the P0 rating, independent of the larger color-token restructuring work.

---

#### [COL-002] Hard-coded colors bypass the existing token set roughly one-third of the time; the same semantic color is independently re-typed multiple ways

**Area:** Color / Design System

**Current Evidence:** 25 root tokens exist (`styles.css:1-26`), used via `var(--...)` 230 times total across the file (confirmed this pass) — meaning token usage is real and substantial, not absent. Against that: 148 hard-coded hex occurrences (89 unique values) and 192 `rgba()`/`rgb()` occurrences (108 unique value-strings) bypass the tokens. The near-black "ink" text color is independently hand-typed at least 6 different ways (`#26302c`, `#2b302f`, `#2d3231`, `#303735`, `#1f2423`, `#22313f`) instead of `var(--ink)` (`#242827`, correctly used 45 times elsewhere). A "success/selected" green state is independently hand-typed at least 3 different ways (`#e5f4ee`/`#23604d`; `#e7f3ed`/`#2d7145`; a third pairing at the profile save-button) for what is visually one semantic state. The focus ring (`styles.css:198-200`, `rgba(0, 113, 227, 0.22)`) uses a saturated blue with no relationship to the green-based accent palette used everywhere else.

**Current Implementation:** No semantic color tokens exist beyond the base palette — there is no `--success`, `--warning`, `--info` token, so every place that needs a "positive/success" color re-derives one from scratch.

**Gap / Issue:** This is a token-adoption gap, not a token-existence gap — the infrastructure (25 tokens, `var()` used 230 times) is there and working in the majority case; the problem is that new component work consistently doesn't check for an existing token before writing a new value.

**User Impact:** Subtle visual inconsistency (three near-identical greens, six near-identical near-blacks) noticeable mainly on close visual comparison; the focus-ring color mismatch is more noticeable since focus rings appear on every keyboard-navigated interactive element and visibly clash with the rest of the palette.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.4 for a candidate expanded semantic token set (including `--success`/`--success-soft` to consolidate the three-way green duplication, and a focus-ring token drawn from the actual accent palette rather than an unrelated blue).

**Rationale:** Directly reduces future drift by giving component authors an explicit token to reach for instead of eyeballing a nearby value.

**Alternatives:** See §7.4.

**Priority:** P2 (distinct from COL-001, which is a contrast-failure/accessibility issue — this is a pure consistency issue).

**Effort:** L — full remapping of 148+192 hard-coded occurrences is a substantial mechanical effort, best done incrementally per component during Part II work rather than as one large pass.

**Dependencies:** §7.4 token structure must be approved first.

**Decision Required:** Approve the expanded semantic token set; decide whether remapping happens as a dedicated pass or incrementally during Part II component work.

**Suggested Phase:** Design System (define tokens) → Component Migration (incremental remap, recommended over a single large pass given the volume).

---

#### [COL-003] No dark-mode tokens or `prefers-color-scheme` support exists; no offline/sync-state color semantics defined

**Area:** Color / Accessibility / Product

**Current Evidence:** `styles.css:2` (`color-scheme: light` hard-coded); zero matches for `prefers-color-scheme` anywhere in `styles.css` (confirmed this pass). No color tokens exist for offline/syncing/pending-sync states specifically — the only offline-state signal found in the entire product (per PLE-011/§6.7) is plain text inside Profil, styled with the same default text color as everything around it, not a distinct color/badge treatment.

**Current Implementation:** Single, light-only theme. No visual/color distinction for sync-status states beyond text content itself.

**Gap / Issue:** Two related but distinct gaps: (1) no dark mode, which iOS users increasingly expect as a baseline and which Apple's App Store review has been known to comment on for apps with no dark-mode consideration at all (this is a judgment call for App Store readiness, not a hard requirement — see Unknowns, §12, since Apple does not universally reject light-only apps); (2) no color semantics for sync/offline states at all, which compounds the PLE-011 finding (the status is not just hard to find, it's visually undifferentiated from ordinary text even where it is shown).

**User Impact:** (1) is a preference/comfort gap for users who use system-wide dark mode. (2) compounds the trust-risk finding in PLE-011 — even the one place sync status *is* shown, it has no visual salience.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.4 for a dark-mode-ready token structure (defining tokens as semantic roles now, even before a dark theme is built, makes adding one later far cheaper) and offline/sync-state color semantics tied to the feedback system proposed in §7.7.

**Rationale:** Structuring tokens semantically now is nearly free; retrofitting dark-mode support onto 340 hard-coded color declarations later would not be.

**Alternatives:** Option A — build semantic tokens now, defer actually shipping a dark theme. Option B — defer both. Recommended: Option A, since the marginal cost of semantic (vs. purely literal) tokens is small and directly de-risks whatever the eventual dark-mode decision is.

**Priority:** P2 for dark mode itself (a scope/timing decision, not a defect); P1 for the offline/sync-state color-semantics gap (compounds a P0 finding elsewhere).

**Effort:** M for semantic token restructuring; L (deferred) for an actual dark theme.

**Dependencies:** §7.4 (color token structure); §7.7 (feedback/status system) for the sync-state color semantics specifically.

**Decision Required:** Is dark mode in scope for v1 or a later phase? Approve semantic-token restructuring regardless of that answer.

**Suggested Phase:** Design System (semantic tokens now); Later Cleanup or Feature Implementation (actual dark theme, if/when approved).

---

### 6.6 Components and Interaction States

---

#### [CMP-001] No disabled or destructive button states exist as reusable patterns

**Area:** Components / Accessibility

**Current Evidence:** Exactly one `:disabled` CSS selector exists in the entire stylesheet (`.shadowing-mode-tab:disabled`, `styles.css:1895-1898`, confirmed this pass) — and that class has zero usage in current markup (see CMP-003). None of the actually-used button classes (`.primary-button`, `.secondary-button`, `.icon-button`, `.search-button`) have any defined `:disabled` visual treatment. The only destructive-intent styling anywhere is a positional selector, `.card-actions button:last-child` (`styles.css:4259-4262`, applies danger colors to whichever button happens to be last in that specific container).

**Current Implementation:** `app.js` disables buttons in many places (every loading state cataloged in §6.7 — AI generation, TTS generation, enrich operations, auth submission), but visually a disabled button today looks identical to an enabled one aside from non-responsiveness to clicks.

**Gap / Issue:** Users have no visual signal that a button is temporarily inactive during an async operation, and there's no reusable way to mark a button as destructive other than a fragile last-child positional hack that breaks if button order changes.

**User Impact:** During any loading state (see §6.7), a user may tap a visually-normal-looking button and get no feedback at all as to why nothing happened — this compounds the loading-state inconsistency findings.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Define a `[disabled]`/`:disabled` visual treatment (reduced opacity + `cursor: not-allowed`, applied once to the shared button base classes) and a proper `.button--danger`/`.danger` modifier class to replace the positional last-child hack.

**Rationale:** Directly serves accessibility (WCAG 4.1.2 expects the disabled state of a control to be programmatically and visually determinable) and directly reduces the "silent failure" pattern found throughout §6.7.

**Alternatives:** None materially different for the disabled state. For destructive styling: Option A — a `.danger` modifier class applied explicitly wherever needed (recommended, explicit and robust). Option B — keep positional styling but make it safer (e.g., `[data-destructive]` attribute selector instead of `:last-child`) — smaller change, still implicit rather than explicit.

**Priority:** P1.

**Effort:** S — this is adding rules to already-shared base classes, not a structural change.

**Dependencies:** None blocking.

**Decision Required:** Approve disabled-state visual treatment and the `.danger`/destructive modifier approach (Option A recommended).

**Suggested Phase:** Design System.

---

#### [CMP-002] Card components are duplicated across at least 11 near-identical class definitions instead of one shared base

**Area:** Components

**Current Evidence:** `.word-card`, `.book-card`, `.shadowing-item-card` share near-identical recipes (14-15px padding, 18px radius, same border color, `var(--surface)`, `var(--soft-shadow)`) defined three separate times (confirmed, cross-referenced against the prior Design System Audit's citations). `.study-entry-card` is *almost* the same recipe but hand-retypes background/shadow instead of referencing the shared tokens (`rgba(255,255,255,.66)` instead of `var(--surface)`). The Profil section alone defines 8 further independent "card" classes (`.profile-card` [dead — see LEG-004], `.profile-snapshot-card`, `.profile-entry-card`, `.profile-detail-card`, `.profile-overview-card`, `.profile-start-card`, `.profile-level-card`, `.profile-daily-goal-card`).

**Current Implementation:** No shared `.card` base class exists anywhere; every feature area independently authored its own card recipe, several of which are near-identical to each other by coincidence rather than by shared code.

**Gap / Issue:** 11+ independently-maintained card recipes for what is visually one family of component, with confirmed silent drift in at least one case (`.study-entry-card`).

**User Impact:** Subtle inconsistency (see color/typography findings above for the same underlying pattern); the bigger cost is to future development velocity — every new Part II module that needs a "card" currently has 11 existing examples to copy from with no canonical one to reach for.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See Design Proposal §7.6 for a candidate base `.card` component with variant modifiers (e.g., `.card--compact`, `.card--elevated`) to replace the 11 current independent definitions.

**Rationale:** Directly serves "System Before Features" — consolidating to one base component with modifiers is exactly the kind of system investment that pays for itself across every future Part II module.

**Alternatives:** None materially different; the only real question is how aggressive the consolidation should be (see §7.6 for variant-count trade-offs, since over-abstracting into too few variants risks losing genuinely distinct visual needs — flagged explicitly as a risk in §10).

**Priority:** P1.

**Effort:** L — 11 existing definitions to reconcile, likely requires care to avoid visual regressions in components not directly being redesigned.

**Dependencies:** SPC-001/SPC-002 (spacing/radius/shadow tokens) should be resolved first, since the card component will consume them.

**Decision Required:** Approve the base `.card` + modifier approach in §7.6.

**Suggested Phase:** Design System (define) → Component Migration (consolidate existing 11).

---

#### [CMP-003] Three unrelated input treatments and two entirely dead tab implementations exist for what should be shared patterns

**Area:** Components

**Current Evidence:** Inputs: home/library search box (pill/search-style), auth dialog fields (boxed-dialog-style, `styles.css:4493-4499`), study-session spelling field (underline-style, `styles.css:3509-3517`) — three structurally different treatments sharing only a base `.field-label` wrapper class, not an input class. Tabs: the real, used pattern is `.tab` (bottom nav, 3 items) plus `.chip` (filters/notebook picker); two **additional**, entirely unused implementations exist in CSS — `.notebook-tab`/`.notebook-tab.active` (`styles.css:2828-2841`) and `.shadowing-mode-tab`/`.shadowing-mode-tabs` (`styles.css:1870-1902`, including the sole `:disabled` rule from CMP-001) — both confirmed zero matches in `index.html`/`app.js` this pass.

**Current Implementation:** The actual notebook picker uses `.chip` (`app.js:4659`), not `.notebook-tab`; nothing in the current UI uses `.shadowing-mode-tab` at all.

**Gap / Issue:** Two fully-styled, zero-usage CSS component definitions exist alongside the real, working patterns — dead weight in the stylesheet that risks being mistaken for available components by a future contributor (human or AI) searching the CSS for "how do I make a tab."

**User Impact:** None directly; pure maintainability/discoverability cost, and a direct contributor to CSS file size/complexity.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* (1) Define one shared input base style (§7.6) with the three current treatments becoming explicit, named variants rather than independent implementations. (2) Remove or consolidate the two dead tab implementations — see §9 (LEG framework) for the removal-safety framework applied to this specific case.

**Rationale:** Directly reduces the "build new instead of reuse" pattern found throughout this review.

**Alternatives:** For inputs: keep three variants as deliberate, named options (pill/boxed/underline) if each genuinely serves a different context (recommended, since the three current contexts — casual search, formal auth, embedded quiz — plausibly do warrant different visual treatment) vs. forcing to one. For dead tabs: delete outright (recommended, given zero usage and the existence of working alternatives) vs. keep as documented-but-unused for possible future reuse.

**Priority:** P2.

**Effort:** M for input consolidation into named variants; S for dead-tab removal (pending the standard removal-safety check in §9).

**Dependencies:** None blocking.

**Decision Required:** Approve named input variants; approve removal of `.notebook-tab`/`.shadowing-mode-tab`.

**Suggested Phase:** Design System (input variants) / Later Cleanup (dead tab removal).

---

#### [CMP-004] Several frequently-tapped icon controls are smaller than Apple's recommended touch-target size

**Area:** Components / Accessibility

**Current Evidence (measured directly this pass):** `.icon-button` (`styles.css:2612-2625`): `width: 42px; height: 42px`. `.star-button` (`styles.css:4221-4229`, the favorite-toggle shown on every single word card): `width: 32px; height: 32px`. Apple's Human Interface Guidelines recommend a minimum 44×44pt touch target; WCAG 2.2's Success Criterion 2.5.8 (Target Size, Minimum, AA) sets a floor of 24×24 CSS px with limited exceptions. The bottom-tab-bar `.tab` (`styles.css:384-399`) is 50px tall (`var(--tabbar-height)`) with `min-width: 0` and only `padding: 0 6px`, so its effective tap width is determined by its flex/grid sibling layout rather than a guaranteed minimum — not separately measured as a fixed value in this pass (flagged as **Unknown** pending a rendered-layout measurement, not assumed to be a problem).

**Current Implementation:** `.icon-button` at 42×42 is below Apple's 44pt guideline (though it passes the stricter WCAG 24px floor). `.star-button` at 32×32 is below both Apple's guideline and represents the largest gap of any interactive element measured in this review, on a control used at high frequency (every list card).

**Gap / Issue:** Two confirmed sub-44pt targets on frequently-used controls, one of them (favorite star) meaningfully undersized even against the more lenient WCAG floor's spirit (32px passes the literal 24px WCAG minimum but is the smallest interactive target found anywhere in the app, on one of its most-repeated elements).

**User Impact:** Real for users with limited fine motor control or larger fingers — mis-taps on a 32px target embedded in a dense list are a plausible, common frustration, and this directly affects the "favorite" action, a core organizing mechanic across Ordbok/Bibliotek.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Increase `.star-button` to at minimum 40×40 (ideally 44×44, matching Apple HIG) and `.icon-button` to 44×44, using a larger invisible hit-area (padding) rather than necessarily enlarging the visible icon glyph, if visual density is a concern.

**Rationale:** Directly serves the explicit App Store readiness and accessibility goals; the "invisible hit-area padding" technique is a standard mobile pattern that resolves the touch-target/visual-density tension without a visual redesign.

**Alternatives:** Option A — enlarge visible control + hit area together (simpler, changes visual density of card layouts). Option B — keep visible icon size, add invisible padding to reach 44×44 hit area (recommended, preserves current visual density while fixing the underlying accessibility gap).

**Priority:** P1 — confirmed, measurable accessibility gap on a high-frequency control, directly relevant to App Store readiness.

**Effort:** S (Option B) to M (Option A, if visual redesign of card density is also desired).

**Dependencies:** None blocking.

**Decision Required:** Approve target sizes and Option A vs. B.

**Suggested Phase:** Design System (define target sizes) → Component Migration.

---

### 6.7 Feedback and System Status

This is the technical detail underlying PLE-011's product-level framing; presented here as its own analysis per the review's required scope.

---

#### [FDB-001] `alert()` is overloaded across three unrelated purposes with no visual distinction

**Area:** Components / Feedback / Accessibility

**Current Evidence:** 59 `alert()` call sites in `app.js` (confirmed exact count, this pass). Used interchangeably for: validation errors (e.g., `app.js:4432` "Klistra in svensk text innan du fortsätter."), network/API failures surfaced via `error.message` (e.g., `app.js:6098, 6147, 6206, 8247, 8253, 8259, 8297, 8303, 8359, 8621, 8627, 9126`), and success confirmations (e.g., `app.js:4482, 5859, 6056, 6145, 7605`). One alert is in Chinese (`app.js:5448`, "已自动填充，请检查后保存。") inside an otherwise-Swedish dialog flow.

**Current Implementation:** Every one of these 59 calls produces an identical native browser modal dialog — same visual treatment, same blocking/interrupting behavior, regardless of whether the message is "this failed," "this worked," or "please fill in this field."

**Gap / Issue:** No toast/banner/snackbar component exists anywhere in the codebase (confirmed zero matches for these terms across `styles.css`/`app.js`/`index.html`, this pass). `alert()` is a blocking, disruptive UI pattern generally reserved for rare, critical interruptions — using it 59 times for routine feedback (including *success* messages) is a significant deviation from standard mobile/web UX practice, and native `alert()` styling cannot be themed to match the rest of the product at all.

**User Impact:** Every one of these 59 interactions forces a modal interruption requiring explicit dismissal, even for routine confirmations — a materially more disruptive experience than the rest of the product's otherwise-considered UI (native `<dialog>` usage elsewhere is more appropriate and less jarring). The lack of visual distinction between success and failure is a real usability cost — a user cannot tell at a glance, from styling alone, whether an alert is good or bad news.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Replace `alert()` with a proper feedback system per §7.7 — routine success/failure should use non-blocking toast/inline feedback; only genuinely critical, action-required situations should use a blocking dialog (and even then, a styled one, not the native browser `alert()`).

**Rationale:** Directly serves "Simple for Users, Complex for the System" — the complexity of routing different feedback types to appropriate UI treatments belongs in the system, not experienced by the user as 59 uniformly disruptive interruptions.

**Alternatives:** See §7.7 for the full feedback-type-to-UI-pattern mapping.

**Priority:** P1 (component/process finding; the specific silent-failure subset in FDB-002 is P0).

**Effort:** L — 59 call sites to individually triage into the correct new feedback pattern, not a single mechanical find-replace, since each needs its correct target (toast vs. inline vs. dialog) determined per §7.7's mapping.

**Dependencies:** §7.7 (feedback system) must be designed and approved first.

**Decision Required:** Approve the feedback-system design in §7.7; decide whether the 59-site migration happens as one project or incrementally per module during Part II work.

**Suggested Phase:** Design System (build feedback components) → Component Migration (incremental site-by-site replacement, recommended given the volume).

---

#### [FDB-002] Roughly 30-40 background sync/mutation failures produce zero user-facing feedback

**Area:** Feedback / Product / Engineering

**Current Evidence:** 30 `console.warn(` and 22 `console.error(` call sites confirmed in `app.js` this pass (exact re-derived counts). Representative silent-failure sites (background `.catch()` handlers with no escalation to any user-visible UI): `app.js:1059` (remote preferences sync), `1100` (remote study-plan sync), `1169/1188/1207` (remote session sync/repair), `1447` (remote word sync), `1542` (daily Supabase progress load), `1582` (remote history sync), `2098` (Phase-4 remote snapshot), `2852` ("Pending sync failed" — inside the top-level `syncPendingUserData()` orchestrator itself), `6394` (background study-progress sync), `7327` (study-progress sync before advance), `7530` (remote study-item sync), plus several Shadowing remote-mutation failures (`4745, 5012, 5032, 5244, 5266, 5268, 5799`).

**Current Implementation:** These are `.catch((error) => console.warn(...))` (or `console.error`) patterns with no further action — the failure is logged to the browser console (invisible to the end user in production) and nothing else happens.

**Gap / Issue:** This is the most severe finding in the entire review from a product-trust standpoint. A user's word edit, study-session progress, notebook change, or Shadowing recording can fail to reach Supabase, and the only place this could ever surface is a developer's browser console.

**User Impact:** Potential silent data loss, or at minimum the *risk* of it — a learner has no way to know whether "today's progress" actually saved, which directly undermines the product's own stated commitment to preserved, traceable learning history/memory (Learning Memory, per the Foundation material already on file). This is the clearest place in this entire document where a design-system gap becomes a core product-integrity risk.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* At minimum, any write operation representing user-entered data (word edits, study answers, recordings, notebook changes) that fails after retry should surface via the persistent/pending-sync status mechanism proposed in §7.7, and ideally an inline or toast notification at the moment of failure for user-initiated actions specifically (as distinct from best-effort background sync, where a persistent status indicator may be more appropriate than an interruption — see §7.7's full mapping).

**Rationale:** This is a direct, load-bearing consequence of the product's own principle that learning history must be preserved and trustworthy.

**Alternatives:** See §7.7.

**Priority:** **P0** — restated/detailed here as the technical basis for PLE-011's P0 rating; same underlying finding, presented with full evidence at the design-system level.

**Effort:** M–L, shared with FDB-001/PLE-011's effort estimate (this is the same body of work, described from the feedback-system angle here vs. the product-trust angle there).

**Dependencies:** §7.7 feedback system.

**Decision Required:** Same as PLE-011 — prioritize ahead of purely cosmetic work given the data-integrity dimension.

**Suggested Phase:** Design System (build) → Component Migration (wire into existing sync/save call sites) — recommended early given the P0 rating.

---

#### [FDB-003] Loading feedback is implemented independently per feature with six different Swedish words for "loading"

**Area:** Feedback / Design System

**Current Evidence:** Exactly one true spinner exists app-wide (`#startupSplash`, `index.html:56-64`, CSS spin animation `styles.css:112-125`), shown for up to 2.8s at startup only (`app.js:340-345`). Every other loading moment is an independently-implemented disabled-button + text-swap: "Genererar..." (AI generation, `app.js:6029-6032`), "Läser..."/"Laddar..."/"Kontrollerar..." (auth/profile-stats/sync-check, `app.js:2867-2916`), "Kompletterar N/M" (enrich operations, `app.js:6034-6037, 6153-6159`), "Synkroniserar..." (sync, `app.js:2822-2823`). No shared `.loading`/`.skeleton`/`.shimmer` CSS class exists beyond the one splash spinner (confirmed zero matches, this pass).

**Current Implementation:** Six independently-worded, independently-implemented "this is loading" signals, none sharing a component or a copy convention.

**Gap / Issue:** Beyond the pure inconsistency, the complete absence of skeleton/spinner treatment for in-page loading (word list loading, notebook loading) means the interface can appear frozen or empty during data fetches rather than visibly working.

**User Impact:** Minor-to-moderate — inconsistent wording is a polish issue; the lack of any visual loading treatment for list/content loading (as opposed to button-level loading) could read as the app being unresponsive during slower network conditions.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See §7.7 for a proposed loading-state model (button-level spinner/disabled pattern, standardized to one shared component and one consistent Swedish vocabulary item — e.g., always "Laddar…" — plus a skeleton/placeholder pattern for content-area loading).

**Rationale:** Directly serves "System Before Features" and the stated Swedish-UI-language-consistency expectation.

**Alternatives:** See §7.7.

**Priority:** P2.

**Effort:** M.

**Dependencies:** §7.7.

**Decision Required:** Approve one canonical loading-vocabulary term and component pattern.

**Suggested Phase:** Design System → Component Migration.

---

#### [FDB-004] Offline/pending-sync status has a well-built event system but exactly one, hard-to-find UI consumer

**Area:** Feedback / IA / Product

**Current Evidence:** `src/lib/sync-outbox.js` dispatches a `spraklab:sync-status` custom event at 5 distinct lifecycle points (queued, syncing, per-mutation success, batch success/error — `src/lib/sync-outbox.js:59-62, 89, 109, 152, 169, 190-197`). `app.js:9077-9083` is the **only** listener anywhere in the app, and it only updates two small text fields inside Profil → Inställningar (`els.profileLastSyncValue`, `els.profileSyncStatus`). `window.addEventListener("online"/"offline", ...)` (`app.js:9085-9086`) likewise only ever triggers a resync or that same Profil-page text update. The offline-status label itself, `"Offline"` (`app.js:2821`), is in English while its sibling states (`"Synkroniserar..."`, `"N ändringar väntar"`) are Swedish.

**Current Implementation:** A user whose device goes offline mid-session, or whose writes are queued for retry, receives zero visible signal anywhere except by specifically navigating into Profil's settings sub-page.

**Gap / Issue:** The underlying engineering (the outbox + event system) is sound and well-designed — this is purely a "the signal exists but nothing surfaces it where a user would see it" gap, and a genuinely easy one to close given the event infrastructure already exists.

**User Impact:** Same trust-risk category as FDB-002/PLE-011, specifically for the offline scenario — a user actively using the app offline (a stated, explicitly-supported scenario, given the product's PWA/offline-support principles) has no ambient awareness of that fact unless they go looking for it.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Promote sync/offline status to a global, always-reachable indicator (e.g., a small persistent badge near the topbar or tab bar) rather than a Profil-only detail — see §7.7 for the "Persistent status" pattern this maps to.

**Rationale:** Low engineering cost (the event system already fires everywhere needed; this is a new listener + a small UI element, not new plumbing) for a meaningful trust improvement.

**Alternatives:** Option A — persistent small badge/indicator visible from any screen (recommended, lowest-friction). Option B — one-time toast notification on state change only (lower visual footprint, but doesn't help a user who wants to check status proactively). Recommended: A, possibly combined with B for state *transitions* specifically.

**Priority:** P1 — same underlying trust category as the P0 findings, rated P1 rather than P0 specifically because the *infrastructure* already exists and the fix is comparatively cheap (distinguishing it from FDB-002, where entire failure paths currently have no user-facing outcome designed at all).

**Effort:** S–M.

**Dependencies:** §7.7 (persistent-status component pattern).

**Decision Required:** Approve global sync/offline indicator placement and design; fix the English/Swedish label inconsistency regardless.

**Suggested Phase:** Design System (component) → Component Migration (wire to existing event system — low effort since the event system is already firing correctly).

---

### 6.8 Responsive Design

The navigation and layout consequences of this area are covered in depth at IA-005 and SPC-003; this entry adds the specific breakpoint-technical evidence requested for this section.

---

#### [RSP-001] Seven `@media` rules use five different one-off breakpoint values with no shared scale, and are feature-siloed rather than global

**Area:** Responsive / Design System

**Current Evidence (confirmed this pass):** `styles.css:2491` (`max-width: 620px`, Shadowing-only — `.shadowing-mode-tabs`/`.shadowing-controls`/buttons); `styles.css:2513` (`max-width: 380px`, Shadowing-only, finer tweaks); `styles.css:2734` (`prefers-reduced-motion: reduce`, 3 selectors only — see A11Y-003); `styles.css:5001` (`max-width: 360px`, word-card/detail layout); `styles.css:5029` (`max-width: 430px`, the broadest rule — home hero, topbar padding, plus later in the same block card-actions/pos-badge/shadowing-controls); `styles.css:5424` (`min-width: 560px`, the **only** min-width rule in the file — Bibliotek shelf grid only); `styles.css:5439` (`print`). No `--breakpoint-*` custom properties exist anywhere (confirmed).

**Current Implementation:** Each feature area independently added its own breakpoint fine-tuning as needed, with no shared scale to draw from — 620/380/360/430/560 have no arithmetic or design-system relationship to each other.

**Gap / Issue:** This is the technical root cause of IA-005/SPC-003's navigation/layout findings — there is no responsive *system*, only five isolated, feature-specific adjustments.

**User Impact:** See IA-005; this entry is the supporting technical evidence.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* See §7.8 for a candidate breakpoint scale (2-3 shared breakpoint tokens) that the current 5 one-off values would map onto or be superseded by.

**Rationale:** A shared breakpoint scale is a prerequisite for any coherent tablet/desktop layout work (IA-005), not an independent nice-to-have.

**Alternatives:** See §7.8.

**Priority:** P1 (shares IA-005's priority — this is its technical dependency).

**Effort:** M once the tablet/desktop layout scope (IA-005) is decided; effort is largely determined by that decision, not by this finding alone.

**Dependencies:** Should be resolved together with IA-005/IA-003/SPC-003 as one coherent responsive-model decision, not independently.

**Decision Required:** Same as IA-005.

**Suggested Phase:** IA / Responsive Model.

---

### 6.9 Accessibility

Several positive findings are included here alongside gaps, since the review's evidence-based framing requires reporting what already works, not only what doesn't.

---

#### [A11Y-001] Confirmed WCAG contrast failures on core components (cross-reference)

**Area:** Accessibility / Color

See **COL-001** for full evidence and analysis (four confirmed AA contrast failures, including the primary button's own text). Listed here for completeness against the review's required accessibility coverage; not re-analyzed to avoid duplication. **Priority: P0** (same as COL-001).

---

#### [A11Y-002] Sub-44pt touch targets on frequently-used controls (cross-reference)

**Area:** Accessibility / Components

See **CMP-004** for full evidence and analysis (`.icon-button` 42×42, `.star-button` 32×32). Listed here for completeness. **Priority: P1** (same as CMP-004).

---

#### [A11Y-003] `prefers-reduced-motion` support exists but covers only 3 selectors

**Area:** Accessibility

**Current Evidence (confirmed this pass):** `styles.css:2734-2741`:
```css
@media (prefers-reduced-motion: reduce) {
  .hero-illustration,
  .home-animation,
  .mot-sverige-cutout {
    animation: none;
    transform: none;
  }
}
```
This is the entire scope of reduced-motion handling in the app — three decorative-illustration selectors only.

**Current Implementation:** Users who enable "Reduce Motion" (a common accessibility/vestibular-disorder accommodation) get their preference respected only for these three specific illustrations. Any other animated transitions in the app (dialog open/close, button press feedback, view transitions — none independently audited for animation presence in this pass, flagged as **Unknown** whether further motion exists elsewhere in `styles.css` beyond what was searched for this specific query) are not confirmed to respect the same preference.

**Gap / Issue:** Narrow, incomplete coverage of a real accessibility preference — good that it exists at all (a genuine positive finding relative to many small apps that implement none), but not comprehensive.

**User Impact:** Users with vestibular disorders or motion sensitivity who enable this OS-level preference get only partial relief.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Audit all `transition`/`animation` declarations in `styles.css` (not done as part of this specific pass — flagged as follow-up work, see §12) and extend the `prefers-reduced-motion` block to cover any non-essential motion found.

**Rationale:** WCAG 2.3.3 (Animation from Interactions, AAA — not a strict AA requirement, but good practice and directly relevant to the stated accessibility-from-design-stage principle).

**Alternatives:** None meaningfully different — this is a completeness/coverage task once the fuller animation inventory is done.

**Priority:** P2 (existing partial coverage lowers urgency relative to the P0/P1 findings above; still worth closing).

**Effort:** S–M, depending on how much additional motion the follow-up audit finds.

**Dependencies:** Requires the follow-up animation audit noted in §12 (Unknowns).

**Decision Required:** None blocking; approve the follow-up audit as scoped work.

**Suggested Phase:** Later Cleanup, or bundled into the Design System pass if the animation audit surfaces enough scope to warrant it.

---

#### [A11Y-004] 19 `<input>` elements have neither a visible `<label>` nor an `aria-label`

**Area:** Accessibility

**Current Evidence (confirmed this pass):** `index.html` contains 28 `<label>` elements and 39 `aria-label` attributes total (across all element types, not inputs specifically); cross-referencing `<input` occurrences against both, 19 `<input>` elements have neither a `for`-associated `<label>` nor a direct `aria-label` (counted via `grep -n "<input"` filtered against label/aria-label presence on the same line — **note:** this line-based method may undercount cases where a `<label>` wraps the input across multiple lines rather than using `for`, so this figure should be treated as an upper-bound estimate pending a more precise per-element audit, not a final number).

**Current Implementation:** A meaningful fraction of the app's form inputs may rely on placeholder text alone (which is not a reliable accessible-name source per WCAG, since placeholders disappear on input and are not consistently exposed to all assistive technology the same way a label is) or on visual/contextual proximity to a heading, without a programmatic label association.

**Gap / Issue:** Inputs without a programmatically-associated name are a common, well-documented screen-reader usability failure (a user tabbing through a form hears "edit text" with no indication of what to enter).

**User Impact:** Screen-reader users attempting to fill in unlabeled fields (word-edit form fields are the most likely candidates, given that form's size — 12+ fields per the Current Product Audit) would need to rely on surrounding context alone, which is unreliable via most screen-reader navigation modes (e.g., navigating by form-field shortcuts rather than reading linearly).

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Conduct a precise per-input audit (correcting for this pass's line-based counting limitation) and add `for`/`id` label associations or `aria-label` to every input found missing one.

**Rationale:** WCAG 1.3.1 (Info and Relationships) and 4.1.2 (Name, Role, Value) both require this; it is one of the most fundamental and well-understood accessibility requirements for forms.

**Alternatives:** None — this is a compliance baseline, not a design choice.

**Priority:** P1 — accessibility baseline gap, though effort/precision requires a proper follow-up audit before fixing (see Unknowns, §12, for the precision caveat).

**Effort:** S once the precise list of unlabeled inputs is confirmed (mechanical fix); the confirmation pass itself is S.

**Dependencies:** None blocking; independent, can proceed in parallel with other work.

**Decision Required:** Approve the follow-up precise audit and subsequent fix as scoped work.

**Suggested Phase:** Later Cleanup, or Design System if bundled with the input-variant consolidation in CMP-003.

---

#### [A11Y-005] Positive findings: native `<dialog>` usage, broad `aria-live` coverage, global `:focus-visible`, and iOS safe-area handling are already in place

**Area:** Accessibility (positive finding, not a gap)

**Current Evidence (confirmed this pass):** All 8 overlay dialogs use native `<dialog>.showModal()` (`app.js:1332, 3008, 3360, 3755, 5891, 5952, 6889/6911, 7617, 7654`), which provides browser-native focus trapping and Escape-to-close behavior without custom code. `aria-live="polite"` is used at 11 distinct sites for dynamic content (`index.html:57, 176, 293, 303, 368, 468, 636, 726, 855, 897, 929`), covering the startup splash, spelling feedback, word/dictionary/notebook lists, sync summary, Shadowing list, auth message, save-sheet, study-session feedback, and export preview. A global `:focus-visible` rule exists for `button`/`input`/`textarea`/`select` (`styles.css:197-200`). `env(safe-area-inset-*)` is used 25 times across the file, indicating deliberate iOS notch/home-indicator handling already in place.

**Current Implementation:** These four patterns are consistently and correctly applied across the app — this is a genuine accessibility/engineering strength, not a gap.

**Gap / Issue:** None — recorded as a Fact to ensure the Gap Analysis doesn't read as uniformly negative, and so future work builds on these strengths rather than accidentally regressing them. One related **Unknown**: whether focus correctly *returns* to the triggering element when a dialog closes is not confirmed by static reading alone (native `<dialog>` does not universally guarantee this across browsers without explicit handling) — flagged in §12 as requiring runtime testing, not assumed to be broken.

**User Impact:** Positive — these patterns materially help screen-reader and keyboard users already.

**Recommended Standard:** N/A — no change recommended; explicitly flagged to preserve during any Design System migration work (i.e., component consolidation in CMP-002/CMP-003 must not regress these existing patterns).

**Rationale:** N/A.

**Alternatives:** N/A.

**Priority:** N/A (informational).

**Effort:** N/A.

**Dependencies:** None.

**Decision Required:** None — informational; the one open item (focus-return on dialog close) is tracked as an Unknown in §12.

**Suggested Phase:** N/A.

---

### 6.10 Naming, Duplication and Legacy Code

Per the review instructions, no blanket removal recommendation is given — every item below is tagged **Keep / Consolidate / Deprecate / Investigate / Candidate for removal**, with removal-candidates requiring explicit verification conditions before any action.

---

#### [LEG-001] Four distinct internal naming identities coexist for the same product

**Area:** Naming / Engineering

**Current Evidence (confirmed this pass):** Brand (correct, user-facing): "SpråkLab" — `<title>` (`index.html:21`), manifest name (`manifest.webmanifest`), brand lockup (`index.html:71`). Old product name: "[Min Ordbok]" tags 31 `console.warn`/`console.error` calls (`app.js:342, 633, 1059, 1100, 1169, 1188, 1207, 1447, 1542, 1582, 2098, 2852, 2940`, and more through `app.js:9125`). Repo/package name: `"swedish-vocab-pwa"` baked into `DB_NAME` (`app.js:7`) and ~15 derived `localStorage` key constants (`app.js:17-30`). Sync-store name: `"spraklab-sync"`, the IndexedDB name in `src/lib/sync-outbox.js:1` — a fourth, independently-chosen name. A fifth, narrower convention, `[Shadowing]`, tags ~21 log sites; `[SpråkLab]` (the "correct" tag) is used only twice (`app.js:2597, 2650`).

**Current Implementation:** Five different naming/tagging conventions in simultaneous active use, none of which is used exclusively.

**Gap / Issue:** Purely an internal-consistency/legibility issue — no user-facing effect. Directly relevant to this project's stated working method (AI-assisted development, per `agents/*.md`), since inconsistent naming increases the chance of a future agent misreading intent or duplicating rather than reusing existing storage.

**User Impact:** None directly.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Normalize logging tags to `[SpråkLab]` throughout. Storage-key namespace (`swedish-vocab-pwa.*` vs. `spraklab-sync`) is **not** a pure rename — see LEG-002 for the specific removal-safety framing, since these are live storage keys with (unknown) existing user data behind them.

**Rationale:** Directly serves "System Before Features" as codebase hygiene; low cost, and specifically reduces risk for future AI-agent-assisted work on this codebase (self-referentially relevant, since this very document was produced by such an agent).

**Alternatives:** None materially different for the logging-tag normalization. For storage keys, see LEG-002.

**Priority:** P3 (logging tags — trivial, cosmetic); see LEG-002 for the storage-key sub-issue's own priority.

**Effort:** S (logging tags only).

**Dependencies:** None for logging tags; storage-key renaming depends on LEG-002's verification.

**Decision Required:** Approve logging-tag normalization to `[SpråkLab]`.

**Suggested Phase:** Later Cleanup.

**Tag:** Logging tags — **Consolidate**. Storage-key names — **Investigate** (see LEG-002).

---

#### [LEG-002] Storage-key naming inconsistency requires verification before any rename, given live user data risk

**Area:** Naming / Engineering / Data Integrity

**Current Evidence:** `DB_NAME = "swedish-vocab-pwa"` (`app.js:7`) underlies ~15 `localStorage` keys; `DB_NAME = "spraklab-sync"` (`src/lib/sync-outbox.js:1`) is a separate IndexedDB database name. Both are referenced together at cleanup time (`app.js:8931`), confirming the mismatch is known-but-unaddressed rather than accidental oversight in day-to-day operation.

**Current Implementation:** Two different storage namespaces for what is conceptually one app's local data.

**Gap / Issue:** Renaming either namespace outright would silently orphan any existing user's locally-stored data (their browser's `localStorage`/IndexedDB would still contain the old key names, and a renamed app would read empty state instead) — this is **not** a safe mechanical rename without a migration step.

**User Impact:** None from the naming itself; the *risk* is entirely in how a fix is executed — a careless rename could cause real (if likely minor, since Supabase is the authoritative store per the earlier project audit) local-state loss for existing users.

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* If normalized, must include a migration path (read old key names once, copy to new names, then stop referencing old ones) — not a bare rename.

**Rationale:** Direct application of the review's required "any deletion/removal suggestion must note verification conditions and risk" instruction.

**Alternatives:** Option A — leave as-is indefinitely (zero risk, permanent minor inconsistency). Option B — migrate with a compatibility shim (small risk if done carefully, resolves the inconsistency). Recommended: B, but only as low-priority cleanup, not urgent.

**Priority:** P3.

**Effort:** S–M (mostly in writing and testing the migration shim carefully, not in the rename itself).

**Dependencies:** None blocking; independent, low-priority.

**Decision Required:** Approve whether this is worth doing at all, given it's cosmetic-only with a small execution risk.

**Suggested Phase:** Later Cleanup.

**Tag:** **Investigate** (verify no other undiscovered dependency on either key name before any migration is scheduled).

---

#### [LEG-003] Legacy URL-routing migration code still runs on every app load

**Area:** Naming / Engineering / IA

**Current Evidence:** `app.js:55-75` (`LEGACY_VIEW_STATE_KEYS`, 17 keys); `app.js:7828` (`cleanupLegacyViewState()`); called at `app.js:9065, 9071, 9140` (three separate points in startup, confirmed this pass); plus 4 further `LEGACY_*` storage-key constants (`app.js:13-16`) and `normalizeLegacyNotebookName()` (`app.js:1623-1626`).

**Current Implementation:** On every single app load, the code actively checks for and discards state from what was evidently an earlier URL-parameter-based navigation scheme, predating the current in-memory view-state machine.

**Gap / Issue:** Confirms a prior significant navigation refactor occurred; the migration/cleanup code has never been retired even though it presumably reached "no more affected users" a long time ago (exact timing unknown — see §12).

**User Impact:** None (runs safely, defensively, with no observable effect for current users).

**Recommended Standard:** *Proposed — Pending Product Owner Approval.* Safe to remove once confirmed that no realistic remaining user could still be running a build old enough to have the pre-migration state cached (this is a judgment call about the app's update-adoption speed, which this document cannot determine from code alone).

**Rationale:** Direct application of the required removal-safety framework — flagged as a candidate, not unilaterally recommended for deletion.

**Alternatives:** None meaningfully different.

**Priority:** P3.

**Effort:** S.

**Dependencies:** None blocking.

**Decision Required:** Confirm it is safe to assume no users remain on pre-migration cached state (Product Owner judgment, not derivable from code).

**Suggested Phase:** Later Cleanup.

**Tag:** **Candidate for removal** — verification condition: confirm via analytics/support history (outside this document's evidence) that no active users are on a build old enough to need this migration path; if that cannot be confirmed, **Keep**.

---

#### [LEG-004] `historyView`/word-action-history orphaning (cross-reference)

**Area:** Naming / Product / IA

See **PLE-008** for full evidence and analysis (the `historyView` id renders 100% Shadowing content; the genuine word-action-history feature is orphaned with data still being collected). Listed here for the naming/legacy framework completeness required by this section.

**Tag:** The `historyView` id itself — **Deprecate** (rename to something Shadowing-accurate once the IA-001/IA-003 navigation work is scoped, to avoid a second rename if routing changes the view-naming scheme anyway). The orphaned history feature and its data — **Investigate** (Product Owner decision required per PLE-008: revive, retire, or merge into Profil stats — not a pure engineering call).

---

#### [LEG-005] Dead CSS: two unused tab implementations, one unused card class, and hidden-but-wired Shadowing controls (cross-references)

**Area:** Naming / Components

See **CMP-003** for `.notebook-tab`/`.shadowing-mode-tab` (zero markup usage, confirmed this pass). See **CMP-002** for `.profile-card` (dead — `index.html` only uses `.profile-card-label`, confirmed via the prior Design System Audit and spot-checked this pass). See **PLE-006** for the ~8 Shadowing controls that are CSS-hidden but fully wired in JS (AB-loop, compare, continuous, auto-pause, subtitle toggle, level selector) — these are **not** simple dead code, since their logic is live; they require a product decision (PLE-006), not a mechanical removal.

**Tag:** `.notebook-tab`, `.shadowing-mode-tab` — **Candidate for removal**, verification condition: confirm (already done, this pass) zero markup references exist; safe to remove with high confidence. `.profile-card` — **Candidate for removal**, same verification standard, already met. Hidden Shadowing controls — **Investigate** (per PLE-006, this is a product scoping decision, not dead code to delete — re-enabling is equally plausible as removal).

---

### Summary: Legacy/Duplication Disposition Table

*(Consolidated view of every item tagged in this section and cross-referenced elsewhere in this document; not a new analysis, only a rollup for at-a-glance reference.)*

| Item | Evidence | Tag | Verification condition before action |
|---|---|---|---|
| `[Min Ordbok]`/`[Shadowing]`/`[SpråkLab]` log tags | `app.js`, 54 sites total across 3 tags | Consolidate | None — safe, cosmetic-only rename to `[SpråkLab]` |
| `swedish-vocab-pwa`/`spraklab-sync` storage namespaces | `app.js:7`, `src/lib/sync-outbox.js:1` | Investigate | Requires a data-migration shim, not a bare rename |
| `LEGACY_VIEW_STATE_KEYS` + `cleanupLegacyViewState()` | `app.js:13-16, 55-75, 7828` | Candidate for removal | Confirm no active users remain on pre-migration builds |
| `historyView` id (renders Shadowing) | `index.html:472` | Deprecate | Rename when IA-001/IA-003 navigation work is scoped |
| Orphaned word-action-history feature + data collection | `app.js:3996-4033`, ~15 `appendLocalHistory()` call sites | Investigate | Product Owner decision (revive/retire/merge) — see PLE-008 |
| `.notebook-tab`, `.shadowing-mode-tab` CSS | `styles.css:2828-2841, 1870-1902` | Candidate for removal | Zero-usage confirmed this pass — ready to act once approved |
| `.profile-card` CSS | `styles.css:1086-1098` | Candidate for removal | Zero bare-class usage confirmed this pass — ready to act once approved |
| Hidden-but-wired Shadowing controls (AB-loop, compare, levels, continuous, auto-pause, subtitles) | `index.html:563-570` + supporting `app.js` logic | Investigate | Product decision required (re-enable vs. redesign vs. formally defer) — see PLE-006 |
| Legacy inline-quiz UI on Home | `index.html:163-190`, `app.js:7442-7585` | Investigate | Confirm no intended future use before removal — see PLE-001 |
| `deleteWord()` | `app.js:6470` | Investigate | Product decision required (restore UI path vs. retire) — see PLE-009 |
| Word-detail "more" menu (permanently hidden, empty stub) | `app.js:3783, 8141-8148` | Investigate | Confirm no unfinished feature was intended behind it |
| Admin/batch tooling (`importEducationWords`/`importDocumentWords` stubs, `enrichSelectedNotebook`, `deleteDuplicateWords`) | `app.js:5703-5705` + related | Keep | Currently safe no-ops; likely still useful as internal/dev tooling — no removal driver identified |
| PWA custom install-prompt capture | `app.js:8842-8857` | Keep | Safely no-ops without a button; low cost to leave until/unless an install-prompt UI is designed |

---

## 7. Design Proposal

**Every value, scale, and structure in this section is marked *Proposed — Pending Product Owner Approval*. Nothing here is an approved standard. Where meaningful alternatives exist, both are presented with a recommended option, not a decision.**

### 7.1 Proposed Design Foundations

The proposals below share four constraints, chosen specifically because the Gap Analysis evidence supports them (not as generic best practice):

1. **Anchor to what's already dominant, don't invent from nothing.** Several "no system" findings (spacing, typography) actually show an implicit system already followed 60-80% of the time (e.g., `1rem`/`8px`/`12px` are already the single most common values in their categories). Proposed scales below deliberately keep the already-dominant values as scale steps rather than replacing them, to minimize both visual change and remapping effort.
2. **Mobile-first, with an explicit tablet/desktop tier**, per the explicit constraint that tablet/desktop must not be ignored, and directly addressing IA-005/SPC-003/RSP-001.
3. **Token structure should anticipate the Learning Engine / Language Pack separation** already agreed at the architecture level (SPK-FND-003) — i.e., where a proposed rule might reasonably vary per target language or per learner's native language (e.g., script-aware typography, per TYP-004), this section flags that explicitly rather than baking a Swedish/Chinese-specific assumption into what should be Learning-Engine-level, language-agnostic tokens.
4. **Every fix is scoped to be additive/consolidating, not a visual redesign.** None of the following proposals ask to change SpråkLab's visual character (its green-based palette, its card-based layout, its overall density) — they ask to make the *existing* character consistent and systematized.

---

### 7.2 Proposed Typography Scale

**Status: Proposed — Pending Product Owner Approval.**

Candidate 12-level scale, addressing TYP-001/TYP-002/TYP-003/TYP-004. Base unit: `1rem = 16px` (browser default, already implicitly assumed by 170 of 172 current `font-size` declarations using `rem`).

| Level | Size | Weight | Line-height | Letter-spacing | Typical use | Mobile adjustment |
|---|---|---|---|---|---|---|
| **Display** | 2rem (32px) | 700 | 1.15 | normal | Hero/celebratory moments (e.g., study-session completion) — already exists at this exact value, used 5× today | None needed — already mobile-appropriate |
| **Page Title** | 1.5rem (24px) | 700 | 1.2 | normal | Top-level view headers (Bibliotek's "Vägar till Svenska," etc.) — close to current `h1` (1.58rem); rounding down slightly for a cleaner scale step | None |
| **Section Title** | 1.125rem (18px) | 700 | 1.25 | normal | Sub-section headers within a view — close to current `h2` cluster (1.08-1.12rem) | None |
| **Card Title** | 1rem (16px) | 600 | 1.25 | normal | Word-card/book-card/study-card titles — see Option A/B below for how this resolves TYP-003's 5-way conflict | None |
| **Card Title — Emphasized** | 1.375rem (22px) | 700 | 1.15 | normal | Reserved for deliberate emphasis contexts only (e.g., the active word during a study session) — see Option B below | None |
| **Body** | 1rem (16px) | 400 | 1.5 | normal | Primary reading content — Chinese meanings, Swedish explanations, example sentences. Already the single most common current value (15 uses) | None |
| **Supporting Body** | 0.875rem (14px) | 400 | 1.45 | normal | Secondary descriptive text, card subtitles | None |
| **Label** | 0.8125rem (13px) | 600 | 1.3 | 0.01em | Form field labels, tab labels, filter chip text | None |
| **Button Text** | 0.9375rem (15px) | 600 | 1 | normal | All button variants (primary/secondary/text/icon-adjacent labels) | None |
| **Input Text** | **1rem (16px) — fixed, non-negotiable minimum** | 400 | 1.4 | normal | All text-entry fields | **Critical constraint, not a preference: iOS Safari auto-zooms the viewport when a focused input's font-size is below 16px.** This is a concrete, well-documented mobile-web constraint directly relevant to this mobile-first PWA. One current textarea (`.shadowing-prepare-textarea`, `16px`, `styles.css`, one of the two current non-`rem` outliers noted in TYP-004) already appears to follow this rule — evidence someone on this project already knew about it — but it is not applied consistently to the auth-dialog or study-session inputs, which currently use smaller `rem` values that would trigger unwanted zoom on iOS. |
| **Caption** | 0.75rem (12px) | 400 | 1.35 | normal | Timestamps, meta-row secondary text | None |
| **Metadata** | 0.75rem (12px) | 500 | 1.3 | 0.02em | Pills/badges (POS badge, status pills) | None |
| **Error / Help Text** | 0.8125rem (13px) | 500 | 1.4 | normal | Inline validation, field help text, feedback messages (feeds into §7.7's feedback system) | None |

**Font-weight step set (resolves TYP-002):** Standardize on **400 / 500 / 600 / 700 / 800** — five steps, replacing the current 26 raw values. Every current non-standard value (e.g., `720`, `760`, `780`, `690`, `360`) should map to its nearest standard step; given system/variable-font rendering, this is expected to be visually indistinguishable from the current output in the large majority of cases (Unknown/needs visual QA per instance — see §12).

**Card Title resolution — Option A vs. Option B (resolves TYP-003):**
- **Option A — single Card Title level for all contexts.** Simpler, one fewer scale step. Risk: the current `.study-word-card h3` size (1.8rem) may represent deliberate emphasis during active study (the word being tested is visually the largest thing on screen), which Option A would flatten.
- **Option B — two-tier Card Title (standard + emphasized), as tabled above.** Preserves the plausible-intentional emphasis case while still consolidating the other four conflicting sites (currently 1rem/1.08rem/1rem/1.2rem) onto one standard value.
- **Recommended: Option B**, specifically because the emphasized case (study-word-card) is functionally distinct — it's the one word a learner is actively being tested on — whereas the other four sites (list-row titles, entry-card titles) serve the same functional role and should look the same. This is a recommendation for Product Owner evaluation, not a final decision.

**Multilingual/script-aware typography (resolves TYP-004's forward-looking sub-issue):**
- **Option A — keep Chinese-font-stack exceptions as manually-flagged sites**, formalized as a documented rule ("apply `--chinese-font` wherever Chinese meaning/content is the primary text of an element") rather than the current ad hoc 7-site list.
- **Option B — treat script/typography rules as a Language-Pack-layer concern** per the already-agreed four-layer architecture (SPK-FND-003), where a Language Pack (or the Native-Language-Support layer specifically) supplies its own typography rules (font stack, line-height adjustment for the target script) rather than the Learning Engine's shared CSS hard-coding exceptions per script.
- **Recommended for consideration: Option B**, as the more architecturally consistent choice given the platform's stated multi-language direction — but this is properly a Foundation/Language-Pack-contract-level decision (see the Product Direction Review already on record), not something this Design Proposal should finalize in isolation.

---

### 7.3 Proposed Spacing Scale

**Status: Proposed — Pending Product Owner Approval.**

Per the request to establish both layout tokens and component tokens, and per Foundation principle 1 (anchor to what's dominant): the current gap/padding data shows heavy, near-equal real usage across a *finer* grid than a clean 4/8-only system would suggest (`10px` alone is used 32 times — more than `12px`). The proposed scale therefore keeps that finer granularity rather than forcing a coarser "textbook" 4/8 scale that would require remapping a large number of already-consistent declarations.

**Base scale (single source of truth for both layout and component tokens):**

| Token | Value | Current usage this maps from (re-derived counts) |
|---|---|---|
| `--space-0` | 0 | 31 padding + 4 gap declarations already use bare `0` |
| `--space-1` | 2px | 3 gap uses; also absorbs stray `3px` (3 uses) |
| `--space-2` | 4px | 10 gap uses (already a clean step) |
| `--space-3` | 6px | 17 gap uses — high enough usage to warrant its own step rather than forcing to 4 or 8 |
| `--space-4` | 8px | 45 gap uses, 3 padding uses — the single most common spacing value in the file |
| `--space-5` | 10px | 32 gap uses — second most common; also absorbs stray `9px`/`11px` (4+2 uses) |
| `--space-6` | 12px | 30 gap uses, 6 padding uses |
| `--space-7` | 16px | 4 gap uses, 4 padding uses; also absorbs stray `15px`/`17px`/`13px` (3+2+1 uses) |
| `--space-8` | 20px | 2 gap uses; also absorbs stray `18px`/`22px` where not deliberately paired with a radius value |
| `--space-9` | 24px | absorbs current `0 22px`/`0 18px` padding clusters (3+3 uses) rounding to the nearest step |
| `--space-10` | 32px | 2 gap uses (larger section-level gaps) |
| `--space-11` | 48px | rare, large section/page-level spacing |

**Layout tokens** (page-level, built from the base scale): `--layout-page-margin: var(--space-7)` (16px), `--layout-section-gap: var(--space-9)` (24px), `--layout-content-max-width: 430px` *(current value, unchanged pending the responsive-model decision in §7.8 — this is not a spacing-scale question, it's the IA-005/RSP-001 decision)*.

**Component tokens** (built from the same base scale, named by role rather than raw value): `--component-card-padding: var(--space-6)` (12px, close to current dominant 12-14px card padding), `--component-list-item-gap: var(--space-4)` (8px), `--component-icon-gap: var(--space-3)` (6px, for icon-to-label spacing), `--component-form-field-gap: var(--space-6)` (12px), `--component-dialog-padding: var(--space-7)` (16px).

**What stays, what merges, what's a necessary exception:**
- **Keep as-is:** all values already landing on a proposed step (0, 4, 8, 10, 12px are already heavily dominant and require no remapping).
- **Merge:** low-frequency stray values (`3px→2px`, `5px→4px`, `9px/11px→10px`, `13px/15px/17px→16px`) — individually low-usage, safe to consolidate.
- **Necessary exceptions:** `calc(... + env(safe-area-inset-*))` compound values (used for iOS safe-area handling, confirmed 25 uses across the file) are correctly *not* pure spacing-scale values — they should remain as explicit `calc()` expressions layering a scale token onto the dynamic safe-area inset, e.g. `padding-bottom: calc(var(--space-6) + env(safe-area-inset-bottom))`, rather than being forced into a static token.

**Dialog spacing:** proposed to use `--component-dialog-padding` (16px) uniformly across all 8 current dialog overlays, replacing whatever ad hoc padding each currently uses individually (not independently re-audited per-dialog in this pass — flagged for the Component Migration phase to confirm actual current per-dialog values before remapping).

---

### 7.4 Proposed Color Token Structure

**Status: Proposed — Pending Product Owner Approval.** This section proposes *structure*, not final hex values — per the explicit instruction not to unilaterally redirect SpråkLab's brand direction, all example values below are illustrative starting points for Product Owner/design review, not final approved colors.

**Layer 1 — Primitive tokens** (the raw palette; mostly a continuation of the current 25 `:root` tokens, with the specific WCAG-failing values from COL-001 requiring updated hex values pending visual design review): `--color-bg`, `--color-surface`, `--color-surface-solid`, `--color-ink`, `--color-muted` *(needs a darker value per COL-001)*, `--color-accent`, `--color-accent-strong`, `--color-gold` *(needs a darker value per COL-001)*, `--color-danger`, `--color-danger-soft`.

**Layer 2 — Semantic tokens** (new — this is the structural gap identified in COL-002/COL-003; semantic tokens reference primitives, never raw hex, and are what components should actually consume):

| Semantic token | References | Purpose |
|---|---|---|
| `--text-primary` | `--color-ink` | Body/heading text |
| `--text-secondary` | `--color-muted` (corrected value) | Captions, metadata, supporting text |
| `--text-on-accent` | new, darker-than-current-accent-derived value | Text placed on `--color-accent` fills — directly resolves the COL-001 primary-button contrast failure by separating "accent as a background fill" from "accent as a text/icon color," which the current single `--accent` token conflates |
| `--surface-default` | `--color-surface` | Card/panel backgrounds |
| `--surface-raised` | `--color-surface-solid` | Dialogs, elevated surfaces |
| `--border-default` | derived from current `--line` | Card/input borders |
| `--focus-ring` | derived from `--color-accent-strong`, not an unrelated blue | Resolves COL-002's focus-ring mismatch — keeps focus indication visually part of the brand palette |
| `--state-success` / `--state-success-soft` | new | Consolidates the 3 independently-hand-typed "success/selected" greens found in COL-002 into one pair |
| `--state-warning` / `--state-warning-soft` | new | Not currently used anywhere in the app — proposed for future use (e.g., "sync pending" or validation-warning states in §7.7) rather than retrofitted onto an existing ad hoc color |
| `--state-error` / `--state-error-soft` | aliases `--color-danger`/`--color-danger-soft` | Renamed semantically; same values, clarifies intent at call sites |
| `--state-info` / `--state-info-soft` | new | For neutral informational states (e.g., "AI-generated content" badges) |
| `--state-disabled-text` / `--state-disabled-bg` | new | Resolves CMP-001's missing disabled-state definition |
| `--state-offline` | new, tied to `--state-warning` family | Feeds the offline/sync-status indicator proposed in §7.7/FDB-004 |

**Dark-mode readiness:** Layer 2 (semantic) tokens are the ones components consume; Layer 1 (primitive) tokens are the only ones that would need a second value set under a `:root[data-theme="dark"]`/`prefers-color-scheme: dark` block. Structuring the tokens this way now costs little and, per COL-003, makes an eventual dark theme (if approved) a primitive-value swap rather than a 340-declaration rewrite.

**WCAG AA contrast requirement for all new/changed values:** any new or changed color pairing introduced under this token structure should be checked against WCAG 2.2 AA (4.5:1 normal text / 3:1 large text and UI components) before being finalized — this is proposed as a standing rule for the token structure, not a one-time fix limited to the four pairs identified in COL-001.

---

### 7.5 Proposed Radius, Border and Shadow Structure

**Status: Proposed — Pending Product Owner Approval.**

**Radius scale**, consolidating the 17 current distinct values (SPC-002) into 6 named steps:

| Token | Value | Replaces (current values, re-derived counts) |
|---|---|---|
| `--radius-none` | 0 | `0` (10 uses — unchanged) |
| `--radius-sm` | 8px | `8px`/`9px`/`10px` (2+1+8 uses) |
| `--radius-md` | 12px | `12px`/`13px` (10+1 uses) |
| `--radius-lg` | 16px | `14px`/`16px` (11+14 uses) |
| `--radius-xl` | 20px | `18px`/`20px`/`22px`/`24px` (10+2+7+4 uses) |
| `--radius-full` | 999px | `999px` (27 uses, pills — unchanged) |
| `--radius-circle` | 50% | `50%` (9 uses, avatars/icon buttons — unchanged) |

Compound multi-corner values (e.g., `999px 999px 0 0` for bottom-sheet dialogs) remain as explicit exceptions built from the same tokens (e.g., `border-radius: var(--radius-full) var(--radius-full) 0 0`), not flattened into the scale.

**Shadow tokens**, extending the current 2-token set to give components a token to reach for at each elevation level (directly addressing SPC-002's finding that the existing tokens are bypassed 77% of the time, including hand-retyped duplicates):

| Token | Purpose | Starting point |
|---|---|---|
| `--shadow-none` | Flat/pressed states | none |
| `--shadow-sm` | Standard cards (word/book/notebook cards) | current `--soft-shadow` value, unchanged |
| `--shadow-md` | Dialogs, elevated panels | current `--shadow` value, unchanged |
| `--shadow-focus` | Focus-visible ring (replaces the mismatched blue in COL-002) | derived from `--focus-ring` semantic token |

**Border tokens:** `--border-width-default: 1px`, `--border-color-default` (derived from current `--line` token), `--border-color-strong` (new, for higher-contrast dividers where needed).

---

### 7.6 Proposed Component Taxonomy

**Status: Proposed — Pending Product Owner Approval.** This taxonomy directly addresses CMP-001/CMP-002/CMP-003 (buttons, cards, inputs/tabs) and the Current Design System Audit's "shared templates" finding (only one `<template>` exists today). It is presented as a target structure for Part II/Component Migration work, not a mandate to rebuild everything immediately.

| Component | Proposed variants | Proposed states | Resolves |
|---|---|---|---|
| **Button** | `primary`, `secondary`, `text`, `icon`, `danger` | default, hover/pressed, focus-visible, disabled, loading | CMP-001 (disabled/danger states), consolidates the currently-consistent primary/secondary/chip base |
| **Card** | base `.card` + modifiers `--compact` (list rows), `--elevated` (dialogs/panels), `--interactive` (clickable, e.g. Bibliotek shelf cards) | default, pressed (for interactive cards), disabled/placeholder (see below) | CMP-002 (11-way card duplication) |
| **Input** | `standard` (boxed, for forms/dialogs), `search` (pill, for search contexts), `inline` (underline, for embedded quiz/session contexts) | default, focus-visible, error, disabled | CMP-003 (3 unrelated treatments → 3 named, intentional variants) |
| **Tab** | `primary-nav` (bottom tab bar), `filter-chip` (existing `.chip`, unchanged) | active, inactive, disabled | CMP-003 (removes the 2 dead unused tab implementations, keeps the one real pattern plus the bottom-nav pattern as two named, intentional variants rather than 3 accidental ones) |
| **Dialog** | single base pattern (header + content + optional footer action bar) applied to all 8 current overlays | open/closed (native `<dialog>` handles this) | Standardizes currently-independent per-dialog padding/structure decisions |
| **Badge/Pill** | `pos` (part-of-speech badge), `status` (Lärt mig/Övar), `metadata` (counts, timestamps) | default only (badges are informational, not interactive) | Consolidates the current `.pos-badge` re-declaration pattern (5 separate override sites found in the Design System Audit) |
| **Empty State** | base + `action` (with buttons, e.g. "word not found") | context-aware copy per active filter (resolves PLE-010) | Extends the existing `.empty-state`/`.action-empty-state` pattern rather than replacing it — this is a genuine current strength to build on |
| **Placeholder / Coming Soon** | new component, applied to any not-yet-built control | disabled + "Snart" badge, matching Bibliotek's existing convention | Resolves PLE-003 (inconsistent placeholder signaling between Bibliotek and Profil) |
| **Feedback (Toast/Banner/Inline/Persistent)** | see §7.7 in full | see §7.7 | Resolves FDB-001/FDB-002/FDB-003/FDB-004, PLE-011, COL-003's offline-color gap |

**Templating approach:** consistent with the current app's no-build-tool constraint (confirmed: no bundler, no framework, per the original project audit), the recommended implementation approach is to extend the existing `<template>` pattern (currently used only for word cards) to the other high-repetition components identified above (card variants, dialog structure), rather than introducing a build step or framework — this keeps the proposal consistent with the project's existing engineering constraints rather than introducing new ones.

---

### 7.7 Proposed Interaction and State Model

**Status: Proposed — Pending Product Owner Approval.** This section directly resolves FDB-001/FDB-002/FDB-003/FDB-004 and PLE-011 — the highest-priority (P0) findings in this document. The core principle requested for this section — avoid routing every message through one mechanism — is applied as the primary organizing structure below.

**Decision table: which feedback pattern for which situation**

| Situation | Pattern | Behavior | Resolves |
|---|---|---|---|
| Routine success confirmation (word added, notebook created, export generated) | **Toast** | Non-blocking, auto-dismisses (~3s), bottom or top of screen, does not require acknowledgment | Replaces the ~5 current success-`alert()` sites (FDB-001) |
| Validation error tied to a specific field (empty required field, invalid format) | **Inline message** | Appears directly below/beside the field, styled (not the current unstyled plain paragraphs), color-coded via `--state-error` | Replaces spelling-feedback/study-session-feedback's current lack of color differentiation |
| Network/API failure for a **user-initiated** action (save word, generate TTS, AI generation) | **Toast or inline**, styled with `--state-error`, includes a retry affordance where applicable | Non-blocking but visually distinct from success toasts | Replaces the ~12 failure-`alert()` sites tied to explicit user actions |
| **Background** sync/mutation failure (the FDB-002 silent-failure category) | **Persistent status escalation** — increment the pending/error count in the persistent sync indicator (see below); additionally, if a failure persists past retry, escalate to a one-time banner | Not silent, but not disruptive either — matches the "best-effort background operation" nature while still guaranteeing visibility | **Directly resolves the P0 finding** — no background failure should remain purely console-only |
| Ongoing sync/offline state | **Persistent status indicator** | Small, always-reachable (not buried in Profil) — see §7.8 for placement options tied to the responsive model | Resolves FDB-004 |
| Destructive or irreversible action requiring explicit confirmation (e.g., a future delete-word action per PLE-009) | **Styled dialog** (native `<dialog>`, already the app's correct existing pattern — e.g. `discardWordDialog` is a good current example to extend, not replace) | Blocking, requires explicit choice | Distinguishes genuinely blocking decisions from routine feedback, which `alert()` currently conflates |
| Loading — button-level (AI generation, TTS generation, enrich, auth submit) | **Disabled button + spinner glyph + one standardized Swedish loading word** ("Laddar…", replacing the current 6 different words) | Button disabled, visually distinct from a normal disabled state (see CMP-001) | Resolves FDB-003 |
| Loading — content-area (word list, notebook list fetching) | **Skeleton placeholder** (new — none exists today beyond the one startup spinner) | Non-blocking, shows content-shaped placeholders | Resolves FDB-003's content-loading gap |
| AI-generated content status (per the product's stated principle that AI content must be reviewable/traceable) | **Persistent inline badge** on the content itself ("AI-genererad," using `--state-info`), not a transient toast | Stays visible as long as the content is displayed, not a one-time notification | Directly serves the "AI-generated content must be reviewable, editable, and traceable" principle from the Product Direction Review already on record |
| Authentication/session status | **Inline message within the auth dialog** (existing `.auth-message` pattern — already the single best-formed feedback element found in this review; extend this pattern rather than replace it) | Contextual to the auth flow | Preserves an existing strength |

**Explicit rule (per the review's own instruction to avoid toast-for-everything):** Toasts are reserved for *transient, non-critical, no-action-required* messages. Anything requiring the user to make a decision is a dialog. Anything describing an *ongoing* state (not a one-time event) is a persistent indicator, not a toast. Anything tied to a specific form field is inline, not a toast.

**Migration approach for the 59 current `alert()` sites:** triage each site into the table above during Component Migration (not a single mechanical replace, since correct classification matters — see FDB-001's effort note).

---

### 7.8 Proposed Responsive Model

**Status: Proposed — Pending Product Owner Approval.** Directly resolves IA-005/SPC-003/RSP-001, and requires Product Owner input on the underlying IA-003 (tab-bar scaling) decision, since the two are linked.

**Proposed breakpoint tokens**, replacing the current 5 one-off, feature-siloed values with a shared, named 3-tier scale:

| Token | Value | Tier |
|---|---|---|
| `--bp-compact` | up to 599px | Phone (current default/only supported tier) |
| `--bp-medium` | 600px – 1023px | Tablet (portrait and landscape) — **currently unsupported** |
| `--bp-expanded` | 1024px+ | Desktop / large tablet landscape — **currently unsupported** |

**Content width per tier:** `--bp-compact`: current 430px fixed shell, unchanged. `--bp-medium`/`--bp-expanded`: content width should grow, but the proposal explicitly does **not** recommend simply stretching the current single-column layout to fill a wide viewport (poor use of space, poor line-length for reading Swedish/Chinese text) — see navigation options below, which pair a wider shell with an actual layout change, not just a wider single column.

**Navigation scaling options (tied to IA-003 — presented here as the responsive-model consequence of each IA-003 option, not a new independent choice):**
- **If IA-003 Option A (keep 3 tabs)** is chosen: at `--bp-medium`+, the app could use the extra width for a wider Bibliotek grid (extending the one existing `min-width: 560px` rule, RSP-001) and a two-column word list, while keeping the bottom tab bar as-is.
- **If IA-003 Option B (expand to 4-5 tabs)** or **Option C (secondary nav layer)** is chosen: at `--bp-medium`+, the tab bar could convert to a left-side rail (a common, well-established tablet/desktop pattern), which naturally accommodates more top-level destinations than a bottom bar can on a phone.
- **No option is recommended here independent of the IA-003 decision** — the responsive navigation model should be chosen to match whichever IA-003 option is approved, not decided separately.

**Touch vs. pointer input:** at `--bp-medium`/`--bp-expanded`, the touch-target minimums proposed in §7.9 should still apply if the target device is a touch tablet (iPad); a desktop-mouse-specific relaxation of touch-target sizing is not recommended given the explicit iPad-inclusive App Store goal.

---

### 7.9 Proposed Accessibility Baseline

**Status: Proposed — Pending Product Owner Approval.** Consolidates all accessibility-related findings (COL-001, CMP-004, A11Y-001 through A11Y-005) into one baseline checklist for Part II work going forward.

| Requirement | Standard | Current status |
|---|---|---|
| Text contrast | WCAG 2.2 AA — 4.5:1 normal text, 3:1 large text/UI components, checked for every new/changed color pairing | **4 confirmed failures today** (COL-001) — fix proposed as an early item |
| Touch target size | Minimum 44×44pt (Apple HIG), never below WCAG 2.2's 24×24px floor | **2 confirmed sub-44pt controls today** (CMP-004) |
| Keyboard focus visibility | Every interactive element must have a visible `:focus-visible` state, drawn from the brand palette (not an unrelated color) | Partially met — global rule exists (A11Y-005, positive) but focus-ring color mismatches the palette (COL-002) |
| Form labels | Every input has a programmatic `<label for>` or `aria-label` | **Gap confirmed, ~19 inputs (upper-bound estimate)** — needs precise follow-up audit (A11Y-004) |
| Screen-reader live regions | Dynamic content (lists, feedback messages, status) uses `aria-live` | Already well-covered (11 sites, A11Y-005, positive) — extend to any new components (§7.6/§7.7) rather than regress |
| Reduced motion | `prefers-reduced-motion: reduce` disables all non-essential animation | Partially met — only 3 selectors covered today (A11Y-003); needs a full animation audit (flagged in §12) |
| Text zoom / relative units | Font sizes in `rem`, not fixed `px`/`pt` | Nearly fully met already (170/172 declarations) — 3 outliers to fix (TYP-004) |
| Input zoom prevention (iOS-specific) | All text inputs ≥16px to prevent unwanted Safari auto-zoom | **New requirement, not previously tracked** — see §7.2's Input Text level; currently inconsistently followed |
| Dialog focus management | Focus trapped within open dialog; focus returns to trigger element on close | Trapping: met via native `<dialog>` (A11Y-005, positive). Return-on-close: **Unknown**, needs runtime verification (§12) |
| Safe-area handling | Respect `env(safe-area-inset-*)` for notch/home-indicator | Already well-covered (25 uses, A11Y-005, positive) |
| Disabled-state indication | Visually and programmatically distinct disabled state on all interactive components | **Gap confirmed** — only 1 (unused) `:disabled` selector exists today (CMP-001) |

This baseline is proposed as a standing checklist to apply to every new Part II component going forward, not solely as a one-time remediation list for current findings.

---

## 8. Options Requiring Product Owner Decision

This section consolidates the genuine forks-in-the-road from across the Gap Analysis and Design Proposal — decisions with real Option A/B/C trade-offs, as distinct from §9's exhaustive priority list. Full detail and evidence for each is in the referenced issue ID.

1. **[IA-003] Bottom navigation shape** — keep 3 tabs and deepen Bibliotek (Option A) vs. expand to 4-5 top-level tabs (Option B) vs. add a secondary navigation layer (Option C). **The single highest-leverage open decision in this document** — affects IA-004, IA-005, SPC-003, RSP-001, and §7.8's responsive navigation proposal.
2. **[IA-001] URL routing / deep-linking** — introduce now (Option A) vs. defer until module count forces it (Option B).
3. **[IA-005 / §7.8] Tablet/desktop layout scope** — in scope for the current design phase (given the explicit iPad App Store goal) vs. explicitly deferred.
4. **[PLE-004] Fraser/Uttryck architectural shape** — distinct Learning Object types per the original roadmap (Option A) vs. formalize the existing POS-value/collocations/notebook implementation as the real definition (Option B). Blocks writing two Part II module specs correctly.
5. **[TYP-003] Card Title typography** — single unified size (Option A) vs. two-tier standard/emphasized (Option B, recommended for consideration).
6. **[COL-003] Dark mode** — build semantic tokens now and ship a dark theme (Option A, partial) vs. defer entirely (Option B). Recommended: build semantic tokens now regardless, defer only the actual dark theme.
7. **[COL-001 / §7.4] Color-token remediation approach** — fix only the 4 failing values (Option A, recommended) vs. restructure the full palette into semantic on-fill/on-surface tokens immediately (Option B).
8. **[CMP-003 / §7.6] Input variant consolidation** — keep 3 named, intentional input variants (recommended) vs. force to one universal input style.
9. **[PLE-008 / LEG-004] Word-action history** — revive as a visible feature (natural fit, data already flows) vs. formally retire and stop collection vs. merge into Profil's "Mina studier" stats.
10. **[PLE-009] Word deletion** — restore a UI path vs. formally retire the unreachable `deleteWord()` function.
11. **[PLE-003 / §7.6] Placeholder/"coming soon" convention** — apply Bibliotek's existing disabled+"Snart" pattern app-wide (recommended, low-risk) — included here because it requires Product Owner sign-off on treating currently-dead Profil rows as "not yet built" rather than investigating whether they were meant to work already (see §12 Unknowns).
12. **Sequencing of the two P0 findings (COL-001 contrast fixes, FDB-002/PLE-011 silent-sync-failure feedback system)** relative to the rest of the Design System work — recommended to be pulled forward as early, targeted fixes rather than waiting for the full component migration, given their severity (see §9).

## 9. Prioritized Recommendation Matrix

Full list of every formally identified issue, for at-a-glance planning. "Phase" refers to the six-stage taxonomy requested: Foundation / Design System / IA / Component Migration / Feature Implementation / Later Cleanup.

| ID | Title | Priority | Effort | Suggested Phase |
|---|---|---|---|---|
| PLE-011 | Silent feedback failures undermine learning-memory trust | **P0** | M-L | Design System (early) |
| COL-001 | WCAG AA contrast failures incl. primary button | **P0** | S | Design System (early) |
| PLE-003 | Inconsistent "not built yet" signaling | P1 | S | Design System → Feature Impl. |
| PLE-004 | Fraser/Uttryck architectural fork | P1 | S (decision) / L-XL (impl.) | Foundation / Feature Impl. |
| PLE-006 | Half of Shadowing's controls hidden | P1 | M | Feature Implementation |
| PLE-008 | Orphaned learning-history data collection | P1 | S-M | Feature Implementation |
| IA-001 | No routing/deep-linking | P1 | L | IA → Component Migration |
| IA-003 | 3-tab nav has no room for Part II modules | P1 | S (decision) / M-L (impl.) | IA |
| IA-005 | No tablet/desktop navigation model | P1 | L | IA / Responsive Model |
| SPC-003 | Fixed 430px width, no layout tier | P1 | L | IA / Responsive Model |
| RSP-001 | 5 one-off breakpoints, no shared scale | P1 | M | IA / Responsive Model |
| TYP-001 | No type-scale tokens, 51 raw font-size values | P1 | L | Design System → Component Migration |
| TYP-003 | 5-way "card title" inconsistency | P1 | M | Design System → Component Migration |
| CMP-001 | No disabled/danger button states | P1 | S | Design System |
| CMP-002 | 11-way card component duplication | P1 | L | Design System → Component Migration |
| CMP-004 | Sub-44pt touch targets (icon/star buttons) | P1 | S-M | Design System → Component Migration |
| FDB-001 | `alert()` overloaded for 3 purposes | P1 | L | Design System → Component Migration |
| FDB-002 | ~30-40 silent background sync failures | **P0** *(same as PLE-011)* | M-L | Design System (early) |
| FDB-004 | Offline/sync status has 1 buried UI consumer | P1 | S-M | Design System → Component Migration |
| A11Y-001 | Contrast failures (=COL-001) | **P0** | — | — |
| A11Y-002 | Touch targets (=CMP-004) | P1 | — | — |
| A11Y-004 | ~19 unlabeled inputs (upper-bound estimate) | P1 | S (post-audit) | Later Cleanup / Design System |
| PLE-001 | Legacy inline-quiz UI on Home | P2 | S | Later Cleanup |
| PLE-002 | Home search behaves as "jump," not live | P2 | S-M | Feature Implementation |
| PLE-005 | Läsning/Video placeholders (scope-only) | P2 | N/A | Feature Implementation (future) |
| PLE-009 | `deleteWord()` unreachable | P2 | S | Feature Implementation |
| PLE-010 | Empty states not filter-aware; Shadowing gap | P2 | S | Design System → Feature Impl. |
| IA-002 | Duplicate `activateView`/`forceHomeView` | P3 | S | Later Cleanup |
| IA-004 | Undocumented navigation-depth rule | P2 | S | IA |
| IA-006 | Home tab label/aria-label mismatch | P2 | S | Later Cleanup |
| TYP-002 | 26-way font-weight fragmentation | P2 | M | Design System → Component Migration |
| TYP-004 | Mixed units; multilingual typography rule gap | P2 (mechanical) | S / M | Later Cleanup / Foundation |
| SPC-001 | No spacing scale | P2 | M | Design System → Component Migration |
| SPC-002 | Radius/shadow tokens bypassed 77% | P2 | M | Design System → Component Migration |
| COL-002 | Hard-coded colors bypass tokens ~1/3 of the time | P2 | L | Design System → Component Migration |
| CMP-003 | 3 unrelated inputs + 2 dead tab implementations | P2 | M / S | Design System / Later Cleanup |
| FDB-003 | Loading states: 6 inconsistent implementations | P2 | M | Design System → Component Migration |
| A11Y-003 | `prefers-reduced-motion` covers only 3 selectors | P2 | S-M | Later Cleanup |
| PLE-007 | No AI feature reachable in production (scope-only) | P3 | N/A | Feature Implementation (later) |
| LEG-001 | 4-5 internal naming identities | P3 | S | Later Cleanup |
| LEG-002 | Storage-key namespace mismatch | P3 | S-M | Later Cleanup |
| LEG-003 | Legacy URL-routing migration code | P3 | S | Later Cleanup |

## 10. Risks and Trade-offs

**Risk of over-abstraction.** The Component Taxonomy (§7.6) and token structures (§7.2-§7.5) create real consolidation, but forcing too few variants onto genuinely different contexts (e.g., collapsing all 3 input styles into 1, or all card variants into one with no modifiers) risks losing intentional differences that may currently exist for good reason but weren't independently verified in this document (see §12 Unknowns — several "duplictotype" findings could not be confirmed as *unintentional* vs. deliberate). The proposals above consistently favor "consolidate to a small named set of intentional variants" over "consolidate to one," specifically to manage this risk — but every consolidation should be spot-checked visually before being finalized, not applied mechanically.

**Risk of remapping effort exceeding value.** TYP-001/TYP-002/COL-002/SPC-001/SPC-002's full remapping (of 172+230+340+ individual declarations) is large mechanical effort. The recommended mitigation, stated throughout §6/§7, is incremental remapping during Part II component work rather than one dedicated large-scale pass — this trades a slower rollout for lower risk of introducing visual regressions across the entire app at once.

**Risk of the P0 feedback-system fix being deprioritized behind "more visible" design-system work.** Toast/banner/color-token work is easy to see progress on; silent background-sync-failure fixes are invisible until they matter (i.e., until a user's data would otherwise have been silently lost). This document explicitly recommends pulling the two P0 items forward ahead of the broader Design System phase specifically to counter this risk (§8, item 12).

**Risk of the IA-003 navigation decision being made implicitly by accretion.** If Part II modules are built without an explicit IA-003 decision, the 3-tab/Bibliotek-nesting pattern will become the de facto answer by default, which may not be the right one — and reversing an implicit decision after several modules are built against it is far more expensive than deciding explicitly now.

**Risk specific to Fraser/Uttryck (PLE-004).** Choosing Option A (distinct Learning Object types) without validating against real phrase/expression content first risks over-engineering a schema for content that doesn't yet exist in the product; choosing Option B (formalize existing structures) risks under-serving genuinely idiomatic expressions that don't fit a word-shaped schema well. Recommended mitigation (not previously stated): pilot a small number of real Fraser/Uttryck entries against both candidate schemas before committing, rather than deciding purely in the abstract.

**Trade-off in the proposed spacing scale (§7.3).** Keeping a finer-grained scale (12 steps, including 2/6/10px) rather than a cleaner 4/8-only scale better matches current usage (lower remapping cost) but is a less "textbook" design-token scale and offers less forcing-function pressure toward visual consistency than a coarser scale would. This is a deliberate trade-off favoring lower migration risk over maximal consistency-forcing.

---

## 11. Proposed Specification Documents

If this Gap Analysis and Design Proposal is approved (in whole or in part, per §13's approval gate), the following formal specification documents are proposed as the next-stage deliverables — using the numbering families already established (`SPK-DES` for design regulations, `SPK-ENG` for engineering, per the numbering scheme on record). Each would formalize one section of §7 into an approved, versioned standard:

1. **SPK-DES-001 — Typography Specification**, formalizing §7.2's scale, weight steps, and the Card Title / multilingual-typography decisions from §8.
2. **SPK-DES-002 — Spacing and Layout Specification**, formalizing §7.3's scale and the layout/component token split.
3. **SPK-DES-003 — Color and Theming Specification**, formalizing §7.4's token structure, the COL-001 contrast fixes, and the dark-mode-readiness decision from §8.
4. **SPK-DES-004 — Radius, Border and Elevation Specification**, formalizing §7.5.
5. **SPK-DES-005 — Component Library Specification**, formalizing §7.6's taxonomy (Button, Card, Input, Tab, Dialog, Badge, Empty State, Placeholder) with full variant/state definitions and accessibility requirements per §7.9.
6. **SPK-DES-006 — Feedback and System Status Specification**, formalizing §7.7's decision table — recommended to be drafted **early**, ahead of the others, given the two P0 findings it resolves.
7. **SPK-ENG-001 — Information Architecture and Navigation Specification**, formalizing the IA-003/IA-001/IA-005 decisions once made — this is an engineering-facing spec but depends entirely on Product Owner decisions from §8, so cannot be written until those are resolved.
8. **SPK-DES-007 — Responsive Design Specification**, formalizing §7.8, dependent on spec #7 above.
9. **SPK-DES-008 — Accessibility Baseline Specification**, formalizing §7.9 as a standing, checkable requirement set for all future Part II component work.

**Sequencing note:** per §8/§10's risk discussion, SPK-DES-006 (Feedback) and the specific COL-001 contrast-value fixes (folded into SPK-DES-003) are recommended to be sequenced first, ahead of the others, given their P0 status — this is a recommendation for Product Owner sequencing approval, not an assumption this document is entitled to make unilaterally.

## 12. Questions and Unknowns

Per the instruction to distinguish confirmed fact from unresolved questions, the following could **not** be determined from static code review alone and require either a Product Owner decision, a runtime/QA verification pass, or information outside this document's evidence base:

1. **Whether the current 3 distinct input-field visual treatments (CMP-003) are deliberate context-specific design choices or accidental drift.** This document recommends treating them as intentional (formalizing into 3 named variants) but cannot confirm original intent from code alone.
2. **Whether dialog focus correctly returns to the triggering element on close** (A11Y-005) — native `<dialog>` behavior varies by browser/implementation detail not verifiable by static reading; requires runtime testing across target browsers/devices.
3. **iOS Dynamic Type support** (TYP-004) — not applicable/testable until a native iOS build exists; flagged as a tracked future requirement, not a current defect.
4. **The full scope of `transition`/`animation` declarations in `styles.css` beyond the specific `prefers-reduced-motion` block examined** (A11Y-003) — this pass searched specifically for the reduced-motion query and its covered selectors, but did not exhaustively audit every `transition`/`animation` declaration in the 5,511-line file for reduced-motion compliance; a dedicated follow-up audit is needed before A11Y-003 can be fully closed.
5. **The precise count and identity of `<input>` elements lacking an accessible name** (A11Y-004) — this pass's line-based grep method is an upper-bound estimate (~19), not a verified per-element audit; some may have labels associated via DOM wrapping rather than `for`/`id` that a line-based search would miss.
6. **Whether the favorite/notebook system is an adequate practical substitute for word deletion** (PLE-009) — this is a product-design judgment about user needs, not something derivable from the code.
7. **Whether any active users still hold pre-migration cached state that depends on `LEGACY_VIEW_STATE_KEYS`** (LEG-003) — requires analytics/support-history information outside this document's evidence base (static code) to answer.
8. **Whether the `.study-word-card h3` 1.8rem size (TYP-003) represents deliberate emphasis or is itself drift** — this document's Option B recommendation assumes the former based on its plausibility (it's the actively-studied word) but this is an inference, not a confirmed fact from the code or any design documentation found.
9. **Whether the 3 dead Profil settings rows (PLE-003) were ever functional and regressed, or were always placeholders scaffolded ahead of implementation** — the code shows no evidence either way (no comments, no version history examined as part of this pass); both are plausible.
10. **Whether Apple's current App Store review process would treat the current WCAG contrast failures (COL-001) or lack of dark mode (COL-003) as a hard rejection blocker** — this document treats them as best-practice/quality-bar risks worth fixing proactively, but does not claim knowledge of Apple's current specific review criteria, which is outside this document's evidence base and can change over time.
11. **Whether other card/button/tab visual variants not specifically flagged in this review (beyond the ones with confirmed zero-usage or confirmed drift) represent additional undiscovered duplication** — this review's component-level analysis (§6.6) covered the most significant/representative cases found; it does not claim to be an exhaustive enumeration of every one-off style declaration in a 5,511-line stylesheet.

## 13. Approval Gate

- **This document is an analysis and proposal. It is not a final, official specification.**
- **Every recommendation in this document is in Pending Review status.** Nothing above should be treated as approved product direction, design standard, or engineering plan.
- **No application code, component, page, navigation, dependency, database, Supabase configuration, API, or deployment configuration may be modified on the basis of this document alone.**
- **Upon Product Owner approval** (in whole or selectively, per section/ID), the approved items should be formalized into the official Specification documents proposed in §11.
- **Only after those formal Specifications are themselves approved** should a Migration Plan be produced, sequencing the actual engineering work (which existing code changes, in what order, with what testing/rollback approach).
- **Only after a Migration Plan is approved** should any implementation/code changes begin.
- No code was modified, no components were refactored, no pages or navigation were adjusted, no legacy code was deleted, no dependencies were installed or upgraded, and no database/Supabase/API/deployment configuration was touched in the production of this document.

## 14. Appendix: Evidence Index

**Re-derived quantitative facts (all counts independently re-verified against the current working tree for this document; where they refine or extend a prior audit's figure, that is noted inline in the relevant §6 entry):**

| Metric | Value | Source |
|---|---|---|
| `font-size` declarations / distinct values | 172 / 51 | `styles.css` |
| `font-weight` declarations / distinct values | (26 distinct values found) | `styles.css` |
| `line-height` declarations / distinct values | (25 distinct values found) | `styles.css` |
| `padding` declarations | 168 | `styles.css` |
| `gap` declarations | 192 | `styles.css` |
| `border-radius` declarations / distinct values | 121 / 17 (incl. compound) | `styles.css` |
| `box-shadow` declarations / token-referencing | 61 / 14 (23%) | `styles.css` |
| Root custom properties (`:root`) | 25 | `styles.css:1-26` |
| `var(--...)` usage sites | 230 | `styles.css` |
| `@media` rules / distinct breakpoint values | 7 / 5 | `styles.css:2491, 2513, 2734, 5001, 5029, 5424, 5439` |
| `:disabled` selectors | 1 (unused class) | `styles.css:1895-1898` |
| `alert()` call sites | 59 | `app.js` |
| `console.warn(` / `console.error(` / `console.log(` | 30 / 22 / 0 | `app.js` |
| `[Min Ordbok]` / `[SpråkLab]` / `[Shadowing]` log tags | 31 / 2 / 21 | `app.js` |
| WCAG 2.2 AA contrast failures (of 10 pairs checked) | 4 confirmed, 1 borderline | computed this pass (relative-luminance formula) |
| `.icon-button` / `.star-button` dimensions | 42×42px / 32×32px | `styles.css:2612-2625, 4221-4229` |
| `<label>` elements / `aria-label` attributes | 28 / 39 | `index.html` |
| `<input>` elements without label/aria-label (line-based estimate) | ~19 (upper bound) | `index.html` — see Unknown #5 |
| `aria-live` regions | 11 | `index.html` |
| `env(safe-area-inset-*)` usage | 25 | `styles.css` |
| `"Growth First"` / `"System Before Features"` / `"Specification First"` matches in repo (excl. `Reviews/`) | 0 | full repo search, confirmed this pass |

**Primary files reviewed for this document:** `index.html` (981 lines), `app.js` (9,156 lines), `styles.css` (5,511 lines), `sw.js`, `manifest.webmanifest`, `src/lib/sync-outbox.js`, `agents/content-agent.md`, plus the three Current Audit files listed in §3.

---

**End of document. Status: DRAFT — Pending Product Owner Review.**
