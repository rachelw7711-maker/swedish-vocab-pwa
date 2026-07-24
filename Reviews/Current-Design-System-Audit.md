# Current Design System Audit — SpråkLab

**Scope:** Read-only audit of the visual/component system as implemented today — color, typography, spacing/radius/shadow, buttons, cards, inputs/search/tabs/filters, shared templates, and loading/empty/error/offline states.

**Method:** Static audit of `styles.css` (5,511 lines), `index.html` (981 lines), `app.js` (9,156 lines). No build step, no CSS preprocessor, no component framework exists — every pattern below is hand-written CSS/HTML. All findings cited `file:line`.

**Status legend:** `stable` = consistent, token-based, reused correctly · `inconsistent` = a token/pattern exists but is bypassed elsewhere · `legacy` = defined in CSS but unused in current markup · `incomplete` = missing entirely (no token, no pattern) where one would be expected.

> **None of what follows should be read as "the design system." There currently is no formal design system — this document inventories what exists so Part I's Design Language chapter (SPK-FND-007) and a future Volume A design-system spec can decide, deliberately, what to keep, formalize, or replace.**

---

## 1. Color Tokens vs. Hard-Coded Colors

**Current implementation:** One `:root` block (`styles.css:1-26`) defines 25 custom properties — background/surface tones, `--ink`/`--muted` text colors, one `--accent`/`--accent-strong` green pair, `--gold`, `--danger`/`--danger-soft`, two shadow tokens, a blur token, and layout constants (`--topbar-height`, `--tabbar-height`, `--app-max-width: 430px`). `color-scheme: light` is hard-coded; **no dark-mode tokens and no `prefers-color-scheme` query exist anywhere** (confirmed: zero matches). Two more custom properties are declared outside `:root`, mid-file, rather than centrally (`--profile-goal-accent` `styles.css:1437`, `--profile-goal-progress` `styles.css:1537`).

Alongside these tokens, the file contains **148 hard-coded hex color occurrences (89 unique values)** and **192 `rgba()`/`rgb()` occurrences (108 unique value-strings)** used directly in selectors instead of referencing a token. The same visual "near-black ink" text color is independently hand-typed at least 6 different ways across the file (`#26302c`, `#2b302f`, `#2d3231`, `#303735`, `#1f2423`, `#22313f`) where `var(--ink)` (`#242827`, used correctly 45 times elsewhere) would apply. A "success/selected" green is independently hand-typed at least 3 slightly different ways for what is visually the same semantic state (`#e5f4ee`/`#23604d`, `#e7f3ed`/`#2d7145`, and a third pairing at the profile save-button). The focus ring (`styles.css:198-200`) uses an unrelated saturated blue (`rgba(0, 113, 227, 0.22)`) that doesn't match the green-based accent palette anywhere else.

- **Status:** `inconsistent`. The token set is not wrong, it's just inconsistently applied — roughly 1 in 3 color declarations in the file bypasses it.
- **Current state:** 25 root tokens, single light theme only, majority of color usage in the file does not reference them.
- **Inferred behavior:** looks like organic growth — new components were styled by eyeballing/copying nearby values rather than reusing variables, and no linting or review step catches the drift.
- **Missing decision:** whether SpråkLab commits to a token-only color policy (no raw hex/rgba in component rules) and whether dark mode is in scope for the App Store release (Apple review commonly expects apps to at least not look broken in dark mode, even if not fully supporting it).
- **Recommended review question:** should color tokens be expanded (e.g. semantic `--success`, `--success-soft` to stop the 3-way green duplication) and enforced, and is dark-mode support a v1 requirement given the App Store goal?

---

## 2. Typography System

**Current implementation:** No type-scale tokens exist (`--font-size-*` etc. — zero matches). One system font stack is declared once on `body` (`styles.css:144-146`: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`); no self-hosted fonts. A separate `--chinese-font` token exists and is applied at 7 specific sites for Chinese-meaning text.

172 `font-size` declarations use ~50 distinct raw values, with heavy fragmentation in the 0.94–1.08rem band (9 near-identical sizes — `0.94`, `0.95`, `0.96`, `0.98`, `1`, `1.02`, `1.05`, `1.06`, `1.08rem` — with no discernible step logic between them). Two declarations use `px`/`pt` instead of `rem` (inconsistent unit, not just inconsistent value). Global heading styles exist for `h1`/`h2` only (`styles.css:2599-2610`); **there is no global `h3`-`h6` rule at all** — every `h3` (used as the de facto "card title" across the app) is restyled locally, and the same semantic role ("card title") gets 5 different font-size/weight/line-height combinations across `.study-complete h3`, `.study-entry-card h3`, `.word-row h3`, `.word-card h3`, and `.study-word-card h3` (values ranging 1rem–1.8rem). Line-height similarly has 12 unique raw values with no scale.

- **Status:** `inconsistent`/`incomplete` — no scale exists, and the one semantic role that most needs consistency ("card title") has the most variation.
- **Missing decision:** a formal type scale (even a minimal 5–6 step one) and whether "card title" should be visually standardized across contexts or is deliberately meant to vary by card importance.
- **Recommended review question:** should Design Language (SPK-FND-007) define a concrete type scale as part of this project's next design-system pass?

---

## 3. Spacing, Radius, Border, Shadow

**Current implementation:** No spacing scale and no radius scale exist as tokens (zero matches for `--space-*`/`--radius-*`). Only the two shadow tokens from §1 exist. Padding (168 declarations) and gap (192 declarations) mostly cluster around plausible 4/8px-multiple values but are polluted by clear one-offs with no apparent system (`13px`, `17px`, `9px 10px`, `7px`, `11px`, `3px`) — e.g. `.library-controls { padding: 13px }` sits directly beside `.search-panel { padding: 15px }` for two visually-parallel components. Border-radius has 17 distinct raw values in active use with no token (`999px` for pills, `16/14/18/12/10/22/24/8/20/9/13px`, plus compound multi-corner values) — no way to tell which are intentional variation vs. accidental drift.

Box-shadow: only 23% of the 61 `box-shadow` declarations in the file actually reference the two existing tokens; the remaining 47 are bespoke `rgba()` values, several of which are near-identical hand-retyped copies of the token values themselves (e.g. `.profile-snapshot-card` at `styles.css:1414` uses the *exact* numeric value of `--soft-shadow` typed out literally instead of referencing the variable) — meaning the token exists and is even being unknowingly duplicated by hand, not deliberately avoided.

- **Status:** `inconsistent`.
- **Missing decision:** a formal spacing/radius scale.
- **Recommended review question:** is the current "mostly-8px-grid-with-exceptions" look intentional (some components genuinely need finer control) or should a strict token scale be introduced and enforced?

---

## 4. Button Variants

**Current implementation:** A reasonably coherent base set exists — `.primary-button`/`.secondary-button`/`.chip` share a base rule (`styles.css:2846-2851`, pill shape, 40px min-height), with primary/secondary/chip-active/icon/text/star/search variants layered on top (full list with file:line in the design-system research notes). This part of the system is the **most internally consistent** area found in the whole audit.

Gaps:
- **Only one `:disabled` selector exists in the entire stylesheet** (`.shadowing-mode-tab:disabled`, `styles.css:1895-1898`) and it's for a class that has zero usage in markup (see §6, legacy). None of the actually-used button classes (`.primary-button`, `.secondary-button`, `.icon-button`, `.search-button`) have a defined disabled visual state, despite `app.js` disabling buttons in many places (loading states, see §8) — a disabled button today just looks like a normal button with a non-functional click.
- **No dedicated "danger"/"destructive" button class exists.** The only destructive-intent styling in the file is a positional selector, `.card-actions button:last-child` (`styles.css:4259-4262`), which happens to apply danger colors to whichever button is last in that particular container — fragile, since it breaks if button order changes, and isn't reusable outside that one context.
- `.profile-primary-button` hard-codes a fourth distinct dark-green (`#2f473f`) instead of referencing `--accent-strong`.
- `.notebook-tab` (styles.css:2828-2841) is defined but has **zero usage** anywhere in `index.html`/`app.js` — the actual notebook picker uses `.chip` instead. Dead CSS.

- **Status:** `stable` for the core primary/secondary/chip/icon set; `incomplete` for disabled and danger states; `legacy` for `.notebook-tab`.
- **Recommended review question:** should disabled and destructive button states be formalized as reusable modifier classes before more of the app relies on ad hoc positional/inline styling for them?

---

## 5. Card Variants

**Current implementation:** `.word-card`, `.book-card`, and `.shadowing-item-card` are near-identical recipes (14-15px padding, 18px radius, same border color, `var(--surface)`, `var(--soft-shadow)`) — essentially the same card defined three separate times under different class names rather than sharing a base `.card` class. `.study-entry-card` is *almost* the same recipe but has its background/shadow hand-retyped instead of referencing the shared tokens, so it silently drifts (`rgba(255,255,255,.66)` instead of `var(--surface)`; a shadow value close to but not identical to `--soft-shadow`).

The Profil section alone defines **8 separate "card" classes** (`.profile-card`, `.profile-snapshot-card`, `.profile-entry-card`, `.profile-detail-card`, `.profile-overview-card`, `.profile-start-card`, `.profile-level-card`, `.profile-daily-goal-card`), each independently hand-tuned rather than composed from shared tokens — three different "soft card shadow" rgba strings across them that are all visually almost the same shadow but numerically distinct. `.profile-card` itself (`styles.css:1086-1098`) is **dead CSS** — `index.html` only ever uses `.profile-card-label`, never bare `.profile-card`.

- **Status:** `inconsistent` (duplicated near-identical recipes) with one confirmed `legacy` dead class.
- **Missing decision:** a shared base `.card` component with variant modifiers, versus the current pattern of one bespoke class per feature area.
- **Recommended review question:** given Bibliotek/Profil/word-list cards are visually meant to feel like the same family, should they be consolidated onto shared tokens/base class as part of the next design pass?

---

## 6. Input, Search, Tabs, Filter Patterns

**Current implementation:** No generic "text input" component exists — the three input contexts in the app (home/library search box, auth dialog fields, study-session spelling field) are three structurally different treatments (pill/search-style, boxed-dialog-style, underline-style) sharing only a base label-wrapper class, not an input class.

The primary tab bar (`.tabbar`/`.tab`, 3 items: Home/Bibliotek/Profil) is consistently used and the only real navigation-tab pattern in the app. Two **additional** tab-like implementations exist in CSS but are **entirely unused in markup**: `.notebook-tab` (see §4) and `.shadowing-mode-tab`/`.shadowing-mode-tabs` (`styles.css:1870-1902`, including the sole `:disabled` rule noted above) — both zero matches in `index.html`/`app.js`. This means three parallel "tab" implementations exist in the codebase for what should be one pattern; only one is actually reachable by a user.

Filtering is handled by a single, consistently-used `.chip`/`.filter-row` pattern (POS filters, notebook picker) — this part is `stable`.

- **Status:** `inconsistent` for inputs (three unrelated treatments, no shared base); `legacy` for the two unused tab implementations; `stable` for the filter-chip pattern.
- **Recommended review question:** should the two dead tab implementations be deleted, and should a shared text-input base component be introduced given three input contexts currently look and behave differently for what is conceptually the same control?

---

## 7. Shared UI Components / Templates

**Current implementation:** Exactly **one** `<template>` element exists in the entire app — `#wordCardTemplate` (`index.html:953-976`), used for every word-list card via JS cloning. Every other repeated visual block (the view sections, all 8 profile "cards," the 4 Bibliotek shelf cards, the Shadowing voice-option list) is copy-pasted markup with per-instance class variation rather than templated — which is the direct cause of the drift documented in §5 and §6 (each hand-copied block accumulates its own slightly different styling over time, since there's no single source of truth to edit).

- **Status:** `stable` for the one real template (word card); `incomplete`/`inconsistent` for everything else, which has no templating at all.
- **Recommended review question:** as Part II modules are built out, should more markup be templated (or componentized, if a framework/build step is introduced later), specifically to prevent the kind of card/button drift already found throughout this audit?

---

## 8. Loading, Empty, Error, and Offline States

### Loading states
Exactly **one true spinner** exists in the whole app — the startup splash screen (`#startupSplash`, `index.html:56-64`; CSS spin animation `styles.css:112-125`), shown for up to 2.8s (fallback timeout, `app.js:340-345`) while initial data loads. **Every other "loading" moment in the app is a disabled-button + text-swap**, implemented separately per feature with **inconsistent Swedish wording for the same concept** — "Genererar..." (AI generation), "Läser..." (auth), "Laddar..." (profile stats), "Kontrollerar..." (sync status check), "Kompletterar N/M" (enrich), "Synkroniserar..." (sync). No shared `.loading`/`.skeleton`/`.shimmer` CSS class exists anywhere (confirmed zero matches beyond the one splash spinner).

- **Status:** `incomplete`/`inconsistent`. **Recommended review question:** should a single shared loading component (spinner or skeleton) and consistent Swedish loading vocabulary be introduced, replacing the ~6 independently-worded text-swap implementations?

### Empty states
A shared `.empty-state`/`.action-empty-state` CSS pattern exists and is used reasonably consistently across word list, notebooks, built-in dictionary search, and export preview (dashed border, muted text, consistent "Inga X ännu…" copy pattern). Two gaps: (1) the word-list empty state shows the same generic "add your first word" message regardless of which filter is active — an empty **favorites** or **learned** filter shows the same text as a genuinely empty library, which is misleading; (2) **Shadowing recordings have no empty state at all** — the recording panel is simply hidden via the `hidden` attribute with no "you haven't recorded yet" message, breaking the pattern used everywhere else.

- **Status:** `inconsistent`. **Recommended review question:** should empty-state copy become filter-aware, and should Shadowing recordings get a proper empty state matching the rest of the app?

### Error states
**No toast/banner/snackbar component exists anywhere** (confirmed zero matches for these terms in CSS/JS/HTML). Errors surface through three uncoordinated patterns: (1) native `alert()` — **59 call sites**, used for validation errors, network/API failures, *and* success confirmations interchangeably, with no visual distinction between "this broke" and "this worked"; one alert is in Chinese while its surrounding dialog is Swedish (`app.js:5448`); (2) a handful of inline `textContent` message elements, only one of which (`.auth-message`) has a dedicated CSS class — the others (spelling feedback, study-session feedback) are unstyled plain paragraphs with no color differentiation between success/failure; (3) roughly 30-40 background sync/remote-mutation failures that only `console.warn`/`console.error` with **zero user-facing feedback** — a user whose data silently fails to sync in the background is never told.

- **Status:** `incomplete` — no coherent error-communication system exists.
- **Recommended review question:** given the App Store readiness goal and the product principle that AI/sync operations must be trustworthy, should a shared toast/inline-alert component be introduced to replace `alert()` and silent console failures? This is likely one of the higher-priority design-system gaps found in this audit, since silent sync failures directly risk data-loss perception.

### Offline states
A well-built `spraklab:sync-status` custom event system exists (`src/lib/sync-outbox.js`) with online/offline listeners wired in `app.js` (`app.js:9085-9086`). However, it has **exactly one UI consumer** in the entire app (`app.js:9077-9083`), which only ever updates two small text fields buried inside Profil's settings sub-page. **There is no app-wide offline banner, no tab-bar badge, no pending-sync indicator visible from Home, Bibliotek, or the word-detail view.** A user whose writes are queued while offline gets zero signal unless they specifically navigate into Profil → Inställningar. The one offline-status label itself ("Offline") is in English while its sibling states ("Synkroniserar...", "N ändringar väntar") are Swedish.

- **Status:** `incomplete`. **Recommended review question:** should offline/pending-sync status become a global, always-visible indicator (common in production apps, and arguably expected for an App Store submission that syncs user data), rather than a Profil-only detail?

---

## Open questions requiring product-owner decisions before these become official standards

1. Is a token-only color policy (no raw hex/rgba in component rules) worth enforcing, and is dark mode in scope for v1?
2. Should a formal type scale and a single "card title" treatment be defined?
3. Should spacing/radius/shadow move to an enforced token scale?
4. Should disabled and destructive button states become reusable classes?
5. Should word/book/shadowing/study-entry cards consolidate onto one base `.card` component?
6. Should the two dead tab implementations (`.notebook-tab`, `.shadowing-mode-tab`) be deleted, and should a shared input component be introduced?
7. Should a shared loading component and consistent loading vocabulary replace the current ~6 independent text-swap implementations?
8. Should empty states become filter-aware, and should Shadowing recordings get one?
9. **Highest-priority gap:** should a shared toast/inline-alert component replace `alert()` and silent console-only failures, given the data-integrity and trust implications?
10. Should offline/pending-sync status become a global indicator instead of Profil-only?
