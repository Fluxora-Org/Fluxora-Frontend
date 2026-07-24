# Streams Session Recovery — Design Spec

Status: Ready for engineering hand-off
Scope: `src/pages/Streams.tsx`, `src/components/CreateStreamModal.tsx`
Related: `docs/STREAMS_SESSION_RECOVERY_SPEC.md` (this doc), `src/lib/streamsSessionRecovery.ts`, `src/components/SessionRecoveryBanner.tsx`, `src/components/SessionPersistenceIndicator.tsx`

## 1. Problem

`Streams.tsx` holds a meaningful amount of transient UI state only in memory:

- `statusFilter`, `searchQuery`, `sortBy`
- `expandedStreamId`
- `currentPage`, `itemsPerPage`
- `CreateStreamModal`'s in-progress, unsubmitted form fields (recipient, deposit, rate, schedule)

An unexpected reload (crash, accidental refresh, browser/OS restart recovery) discards all of it. The user lands back on unfiltered defaults and, if they were mid-way through configuring a stream, loses that work entirely with no warning it happened.

This spec defines a session-recovery banner plus a lightweight persistence indicator that:

1. Continuously and silently remembers filter/search/pagination state (and a safe subset of an in-progress create-stream draft) to `localStorage`.
2. On the next load, if a saved snapshot exists, offers — but never silently applies — a restore.
3. Never restores anything that could imply a transaction was submitted or completed when it wasn't.

## 2. What is safe to restore vs. what must never be restored

This is the load-bearing rule of the whole feature. Get this wrong and the banner becomes a liability (e.g., resuming a modal mid-signature, or implying a stream exists that doesn't).

| Safe to restore | Rationale |
|---|---|
| `statusFilter`, `searchQuery`, `sortBy` | Pure view state. Restoring is a convenience; wrong values are trivially correctable via visible controls. |
| `currentPage`, `itemsPerPage` | Same as above. |
| Create-stream draft fields: `recipient`, `depositAmount`, `accrualRate`, `duration`, `startTimeOption`, `customStartDate`, `cliffEnabled`, `cliffDate` | Free-form input the user typed but never submitted. No on-chain or backend side effect has occurred. |
| Which of step 1 / step 2 the draft was on | Lets the user resume where they were without re-entering data. Restoring is capped at step 2 — see below. |

| Never restore | Rationale |
|---|---|
| Step 3 (Review & Create) as the resumed step | Step 3 is where the user reviews immediately before signing. Resuming *directly into* review could read as "your stream is ready, everything's confirmed" when the user hasn't re-verified anything since the interruption. A restored draft always reopens at step 2 (rate & schedule) at the latest, requiring the user to consciously step forward into review again. |
| `submittedTxHash`, transaction/confirmation status, `isSubmitting`, `hasCompletedConfirmation` | These describe an in-flight or completed blockchain transaction. There is no safe way to "resume" a submitted transaction client-side — its real state lives on-chain / with the RPC. Restoring any of this could make the UI claim a transaction is pending or done when the actual state is unknown or different. |
| `expandedStreamId` (which card's deep-dive is expanded) | Low-value, purely decorative UI state; restoring it adds persistence-layer complexity (and a UI jump on load) for no user benefit. Deliberately left out of the persisted snapshot. |
| Any draft snapshot older than 24 hours | A day-old recipient address or deposit amount is stale enough that "restoring" it silently risks the user acting on outdated intent. Expired snapshots are discarded before the banner ever considers showing. |
| Anything from a session that ended in a **successful** stream creation | The moment `onStreamCreated` fires, the draft is cleared. A completed stream must never resurface as a "resume this draft" prompt. |
| Anything from a session the user explicitly closed (Cancel / × / Escape / backdrop click) | A deliberate close is the user telling us they're done with that draft. Only an *interruption* (no clean close event) should leave a snapshot behind — that's what distinguishes "crash recovery" from "nagging about closed dialogs." |

### Why this rule works as a crash detector

The draft snapshot is written continuously while the modal is open (debounced) and is **deleted** on every clean exit path: cancel, ×, Escape, backdrop click, and successful submission. The only way a draft can still be sitting in storage on the next page load is if none of those exit paths ran — i.e., the tab was killed, the browser crashed, or the OS/browser restored a stale session. This gives us crash detection without needing a `beforeunload` heuristic or a heartbeat.

## 3. States

```
                      ┌───────────────────────┐
                      │   no-prior-session     │  (nothing in storage, or
                      │   banner: hidden       │   expired / empty snapshot)
                      └───────────┬───────────┘
                                  │ mount, snapshot found & fresh
                                  ▼
                      ┌───────────────────────┐
        ┌────────────▶│  prior-session-       │
        │  ignored /   │  detected              │
        │  dismissed   │  banner: visible,      │
        │  (see below) │  "Restore" / "Start    │
        │              │  fresh" choice         │
        │              └─────┬────────────┬────┘
        │                    │            │
        │        clicks      │            │ clicks
        │        "Restore"   │            │ "Start fresh"
        │                    ▼            ▼
        │        ┌───────────────┐  ┌──────────────────────┐
        │        │   restored     │  │ dismissed-start-fresh │
        │        │  banner: brief │  │ banner: brief confirm │
        │        │  confirmation, │  │ then hidden. Storage  │
        │        │  filters/draft │  │ cleared entirely.     │
        │        │  applied.      │  └──────────────────────┘
        │        └───────┬───────┘
        │                │ auto-hides after ~5s, or × dismiss
        └────────────────┴──────────────────────────▶ hidden
```

State definitions:

- **no-prior-session** — On mount, `readStreamsSession()` finds nothing (first visit, cleared, or the stored snapshot is older than 24h / fails validation). Banner never renders. Autosave begins immediately so *this* session is captured going forward.
- **prior-session-detected** — A fresh, valid snapshot exists. Banner renders with the message, a summary of what would be restored, and the Restore / Start fresh choice. Autosave is **paused** (see §5) so the live default state doesn't overwrite the very snapshot being offered before the user decides.
- **restored** — User clicked **Restore**. Filters/search/sort/pagination are applied immediately. If the snapshot also contains a meaningful draft, the confirmation includes a secondary "Resume draft" action (see §4.3) rather than silently reopening the modal. Autosave resumes, now snapshotting the restored state. Banner auto-dismisses after ~5s or via ×.
- **dismissed-start-fresh** — User clicked **Start fresh**. Storage is cleared immediately (filters + draft). Brief confirmation, then hidden. Autosave resumes from the page's default state.
- **hidden (ignored)** — See §4.4.

## 4. Banner design

### 4.1 Copy & layout (prior-session-detected)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⟲  We restored your previous session                              [×]   │
│     Your filters and search from ~12 minutes ago are ready to bring      │
│     back. You also have an unsaved stream draft for a recipient.         │
│                                                                          │
│     [ Restore ]   [ Start fresh ]                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

- Title is intentionally the exact phrase requested: **"We restored your previous session."** Read literally this is a slight misnomer at the *detected* stage (nothing has been restored yet — it's an offer). We keep the requested title as the banner's headline because it reads naturally and matches the brief, and disambiguate with the body copy ("...are ready to bring back") plus the explicit Restore/Start‑fresh choice directly beneath it, so no user could read it as "this already happened silently."
- Body copy is generated from what's actually in the snapshot — don't claim a draft exists if there isn't one:
  - Filters only: "Your filters and search from ~12 minutes ago are ready to bring back."
  - Filters + draft: append "You also have an unsaved stream draft for a recipient." (never surface the raw recipient address/amount in the banner itself — see §6, avoid leaking sensitive-looking data into a low-attention surface).
- Relative time ("~12 minutes ago") uses the same elapsed-time phrasing style as the rest of the app (`getRelativeTime`-adjacent), computed from `snapshot.savedAt`.
- Primary action: **Restore** (`ui-primary-cta` / `streams-primary-button` visual weight).
- Secondary action: **Start fresh** (`streams-ghost-button` / `ui-secondary-control` visual weight) — never destructive-red; this is a normal, expected choice, not an error state.
- Dismiss (×) in the top-right corner is equivalent to "ignore" (§4.4), not "start fresh" — it must not clear storage.

### 4.2 Restored confirmation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ✓  Session restored                                               [×]   │
│     Filters, search, and sort are back the way you left them.            │
│     [ Resume draft stream → ]                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

- "Resume draft stream" only renders when `isDraftMeaningful(draft)` is true.
- Clicking it opens `CreateStreamModal` pre-filled via `initialDraft`, landing on the restored step (capped at step 2). The draft is intentionally **not** auto-opened on page load — reopening a modal without a direct user action is disorienting and reads as the page acting on its own; requiring one more click keeps the user in control of when a full-screen dialog appears.

### 4.3 Start-fresh confirmation

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Starting fresh — your previous filters and draft were cleared.          │
└──────────────────────────────────────────────────────────────────────────┘
```

Brief, low-emphasis, auto-hides after ~3s.

### 4.4 If the user ignores it

"Ignoring" covers two things: clicking × explicitly, or simply proceeding to use the page (changing a filter, typing a search, clicking into a stream, opening the create-stream modal) without clicking Restore or Start fresh.

Behavior in both cases is identical and deliberately quiet:

- The banner hides. No further nagging, no re-appearing on scroll, no repeat prompt later in the same page life.
- **Nothing is applied.** The page continues on its normal defaults; a direct interaction with a filter control is itself the user's "start fresh, on my terms" signal, so we honor it without a confirmation toast.
- The stored snapshot is **not explicitly wiped** at the moment of ignoring — but because autosave resumes immediately once the banner resolves (§5), the very next debounced write overwrites it with whatever the user is actually doing. In practice the old snapshot is superseded within ~500ms of the first interaction. We don't hard-clear on ignore because there's no harm in a fast follow-up write, and it avoids a special-cased "clear storage" call on every possible dismissal path.
- If the user never interacts with anything else on the page at all (closes the tab immediately), the original snapshot remains and will be offered again next visit — correct, since nothing changed.

## 5. Persistence indicator (always-on, pre-crash)

Requirement: users should understand their filters/search are being remembered *before* anything goes wrong, not just discover it via a recovery banner after the fact.

```
[ 🔍  Search streams...        ]  [All] [Active] [Paused] [Completed]  [Sort ▾]  ⟳
                                                                          ↑
                                                     persistence indicator (SessionPersistenceIndicator)
```

- Small icon (`Save`, from `lucide-react`) placed at the end of the filter/search row in `streams-list-head`, next to the sort control.
- Decorative icon is `aria-hidden`; the indicator element itself carries `role="img"` + `aria-label="Your filters and search are saved on this device"` plus a native `title` attribute so mouse users get the same text on hover.
- On each debounced autosave write, the indicator briefly (600ms) applies a `data-recently-saved="true"` pulse (opacity/scale transition only — respects `prefers-reduced-motion`) so there's a subtle, non-disruptive confirmation that a save happened. This is cosmetic only; the `aria-label` is static and doesn't change per-save (no aria-live spam for a background autosave).
- Autosave semantics (writes what the indicator represents):
  - Filters (`statusFilter`, `searchQuery`, `sortBy`, `currentPage`, `itemsPerPage`) are debounced-written (~500ms after the last change) any time the banner is not in the unresolved `prior-session-detected` state (see §2/§4.4 — writes must not clobber an offered-but-undecided snapshot).
  - The create-stream draft is debounced-written the same way whenever the modal is open and on step 1 or 2. It is written as `null` (cleared) the instant the modal closes via any path, or the instant a stream is successfully created.

## 6. Accessibility

- Banner container: `role="status"` + `aria-live="polite"` (announces on mount without interrupting other speech, consistent with `ZeroAccrualBanner`'s existing pattern in this codebase).
- Focus management: when the banner mounts (transitions from hidden → `prior-session-detected`), focus moves to the banner's heading (`tabIndex={-1}` + `.focus()` in a `useLayoutEffect`, matching the pattern already used in `TreasuryOnboarding.tsx`). This guarantees screen-reader and keyboard users notice the offer immediately rather than needing to discover it by tabbing around.
- All interactive elements (Restore, Start fresh, ×, Resume draft) are real `<button type="button">` elements — keyboard-reachable via Tab, activatable via Enter/Space, with visible `:focus-visible` rings using the existing `--focus-ring-*` tokens.
- Button labels are explicit, not icon-only: "Restore", "Start fresh", "Resume draft stream", and × carries `aria-label="Dismiss"`.
- Color is never the only signal: the restored/start-fresh/detected states are distinguished by icon + heading text + body copy, not by color alone (satisfies WCAG 1.4.1).
- Text/background combinations target **4.5:1** contrast minimum in both themes (see §8 token table) — verified against `--color-surface-default` / `--color-surface-elevated` backgrounds in both `:root` and `:root[data-theme="dark"]`.
- The persistence indicator's `aria-label` communicates its meaning without relying on the icon shape or a color cue alone.
- Reduced motion: the banner's enter/exit transition and the persistence indicator's "recently saved" pulse both collapse to an instant show/hide under `prefers-reduced-motion: reduce`, consistent with the existing `@media (prefers-reduced-motion: reduce)` block in `design-tokens.css`.

## 7. Responsive behavior

- The banner renders **below** the page hero and **above** the zero-accrual banner / summary grid — i.e., high enough to be seen immediately, but never competing with or displacing the primary heading.
- On mobile (`max-width: 640px`, matching `Streams.css`'s existing breakpoint), the banner switches from a single row (icon + copy + actions inline) to a stacked layout: icon+heading+dismiss on one line, body copy below, then full-width action buttons below that. This keeps its height bounded (no more than ~4 stacked lines) so it never pushes the search/filter row below the fold on common mobile viewport heights (tested at 375×667 and 390×844).
- The persistence indicator is always inline with the sort control and never wraps to its own line; on narrow viewports it remains a fixed 20×20px hit target next to the existing sort `Input`, not a new stacked row.

## 8. Tokens (reuse existing design-tokens.css — no new tokens introduced)

| Purpose | Token |
|---|---|
| Banner surface | `--color-surface-elevated` |
| Banner border | `--color-border-default` |
| Banner accent bar / icon | `--color-accent-secondary` (`#00d4aa` light / `#00d4aa` dark) |
| Heading text | `--color-text-primary` |
| Body text | `--color-text-secondary` |
| Restore (primary) button | `--color-cta-primary-bg` / `--color-cta-primary-text`, hover `--color-cta-primary-bg-hover` |
| Start fresh (secondary) button | `--color-cta-secondary-bg` / `--color-cta-secondary-border` / `--color-cta-secondary-text` |
| Focus ring | `--focus-ring-color`, `--focus-ring-shadow` |
| Spacing | `--space-md` / `--space-lg` / `--space-xl` |
| Radius | `--radius-lg` |
| Transition | `--transition-base`, disabled under reduced motion |

## 9. Data shape (implementation reference)

```ts
// src/lib/streamsSessionRecovery.ts
interface StreamsFilterSnapshot {
  statusFilter: string;
  searchQuery: string;
  sortBy: string;
  currentPage: number;
  itemsPerPage: number;
}

interface StreamDraftSnapshot {
  step: 1 | 2;                 // never 3 — see §2
  recipient: string;
  depositAmount: string;
  accrualRate: string;
  duration: string;
  startTimeOption: "now" | "custom";
  customStartDate: string;
  cliffEnabled: boolean;
  cliffDate: string;
}

interface StreamsSessionSnapshot {
  savedAt: number;              // epoch ms, drives the 24h expiry + "~X ago" copy
  filters: StreamsFilterSnapshot;
  draft: StreamDraftSnapshot | null;
}
```

Storage key: `fluxora_streams_session_v1` (versioned so a future shape change can be introduced without crashing on an old snapshot — unknown/malformed snapshots are discarded, not partially trusted).

## 10. Redlines / component map

| Element | Component | Notes |
|---|---|---|
| Banner | `src/components/SessionRecoveryBanner.tsx` + `session-recovery-banner.css` | Presentational; receives `state`, `savedAt`, `hasDraft`, callbacks. No storage access itself. |
| Persistence indicator | `src/components/SessionPersistenceIndicator.tsx` + `session-persistence-indicator.css` | Presentational; receives `recentlySaved: boolean`. |
| Storage/logic | `src/lib/streamsSessionRecovery.ts` | Pure functions: `readStreamsSession`, `writeStreamsSession`, `clearStreamsSession`, `isDraftMeaningful`, `isFilterSnapshotMeaningful`. Storage param is injectable (mirrors `src/lib/onboarding.ts`) for testability. |
| Orchestration | `src/pages/Streams.tsx` | Owns banner state machine, debounced autosave effects, wires `initialDraft` / `onDraftChange` into `CreateStreamModal`. |
| Draft plumbing | `src/components/CreateStreamModal.tsx` | New optional props `initialDraft?: StreamDraftSnapshot | null` and `onDraftChange?: (draft: StreamDraftSnapshot | null) => void`. No change to existing submission/validation logic. |

## 11. Explicitly out of scope

- Restoring `expandedStreamId` or `selectedStreamId`.
- Cross-tab sync (e.g., `storage` event listeners to live-update a second open tab). Single-tab recovery only.
- Server-side / account-level session recovery. This is a client-only, best-effort convenience layer, not a durability guarantee.
- Resuming a submitted-but-unconfirmed transaction's polling state across a reload (that remains a separate, larger problem — see `useTransactionStatus` — and is intentionally excluded per §2).
