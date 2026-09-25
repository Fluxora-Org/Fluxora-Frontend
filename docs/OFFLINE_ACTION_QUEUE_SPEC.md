# Offline Action-Queue Banner — CreateStreamModal

Design + engineering spec for what happens when a user submits step 3 of
`CreateStreamModal.tsx` while offline. Replaces the previous silent
hang/ambiguous-spinner behavior with an explicit "queued" state, an automatic
flush on reconnect, and a clear success/failure outcome.

## Scope

This covers **connectivity loss at submit time**, not full offline/PWA
support (service worker, asset caching, background sync). Full offline mode
is already deferred in `DESIGN_SPEC.md` ("PWA/offline mode: defer to Phase
3"); this spec stays inside that boundary — it only changes what happens to
a submission that's already in flight when the network isn't.

## State machine

| State | Trigger | UI | `isBusyCreating`\* | Close/Cancel |
|---|---|---|---|---|
| `submitted-online` | Click "Create stream" while online | Unchanged — existing submitting/pending/failed flow in `transaction-status-box` | yes | blocked |
| `submitted-offline-queued` | Click "Create stream" while offline | New `.offline-queue-banner` — "Queued — will submit when back online" | yes (blocks Back/Edit/re-submit) | **not blocked** |
| `queue-flushing-on-reconnect` | `online` event fires while queued | Reuses `.transaction-status-box` — "Back online. Submitting your queued stream to Stellar…" | yes | blocked |
| `queue-flush-success` | Flush's `createStream` resolves + poller confirms | Existing confirm effect fires: modal closes, success toast | yes → modal closes | n/a |
| `queue-flush-failure` | Flush's `createStream` rejects | New `.offline-queue-banner--failed` — error message + Retry / Edit details | no (return to editable) | not blocked |

\* `isBusyCreating` gates Back, the review-card Edit buttons, and the
footer submit button. It is intentionally a **superset** of a separate
`isActivelySubmitting` flag (submitting / confirming / flushing) that alone
gates Close/Cancel — see [Keyboard & focus](#keyboard--focus-behavior) below.

```
idle → (online)  → submitting → pending → confirmed / failed   [unchanged]
     → (offline) → queued ──(online event)──▶ flushing ─┬─▶ confirmed (poll) → success toast
                     ▲                                   └─▶ queue-failed → Retry ─┘
                     └────────────── Retry while still offline ─────────────┘
     queue-failed → Edit details → step 1 (payload discarded, form still holds the values)
```

## Why a local, in-memory queue

`src/lib/offlineActionQueue.ts` is a tiny module-level singleton
(`enqueueAction` / `dequeueAction` / `getQueuePosition` / `getQueueLength` /
`subscribeToQueue`), generic over payload type. It is **not persisted** to
`localStorage` — a full page reload clears it.

- This keeps the change small and testable, and matches the existing
  "defer full offline/PWA to Phase 3" decision — persistence across reloads
  is exactly the kind of durability that phase is meant to cover properly
  (with the eventual service worker / background sync), not a shortcut
  worth half-building here.
- It's a shared singleton (not local `useState` in the modal) specifically so
  **queue position** is meaningful if a user has more than one submission
  captured (e.g. two browser tabs). With a single queued item it always
  reads "1 of 1".
- The modal component stays mounted for the app's lifetime (`isOpen={false}`
  only skips rendering — see `CreateStreamModal.tsx` line
  `if (!isOpen) return null;`, which comes *after* all hooks/effects). That
  means the flush effect keeps running, and the flush still completes,
  even if the user closes the modal while a submission is queued.

## Accessibility

- **Immediate announcement**: the queued banner has `role="status"
  aria-live="polite"` and renders in the same synchronous state update that
  captures the submission — no debounce, no delay. A screen reader user gets
  "Queued — will submit when back online…" right away instead of silence.
- **Not color-alone**: every state pairs an icon (`aria-hidden`) + a text
  label + a color accent. Color is never the only signal.
- **Text contrast**: banner body copy uses `var(--text)` /
  `var(--text-secondary)` on `var(--surface-raised)` — the same
  high-contrast pairing `.transaction-status-box` already uses, verified
  >4.5:1 in both themes (see [Contrast](#contrast-verification)). Color
  (`var(--status-warning)` / `var(--danger)`) is scoped to the icon and the
  4px left border accent only — decorative, redundant with the text label.
- **Failure banner** uses `role="alert"` (assertive) since it's an
  unexpected, actionable outcome; the queued banner uses `role="status"`
  (polite) since it's an expected, non-urgent wait state.
- **Toast action**: the "View stream" action inside `ToastNotification` is a
  real `<button>` with visible focus (`:focus-visible` outline), not a
  `div onClick`. Activating it (click or Enter/Space) calls the same
  `onStreamCreated` callback the parent already uses, then dismisses the
  toast.

### Keyboard & focus behavior

- **While queued**: modal stays fully keyboard-operable. Close (✕) and
  Cancel remain enabled and reachable by Tab — a queued submission is just
  data captured locally, nothing is in flight, so there's no reason to trap
  the user in the modal. Back and the review-card Edit buttons are
  **disabled** while queued (and while flushing) — the payload was already
  snapshotted at submit time, so editing the form wouldn't change what gets
  submitted, and it would strand the "queued" UI referring to a filled-in
  form the user has since changed. `handleEditQueuedSubmission` (used only
  after a **failed** flush, once the payload is no longer queued) is the
  supported way back into the form.
- **While flushing / actively submitting**: Close/Cancel are blocked, same
  as today's online submitting/confirming behavior — unchanged.
- **Focus**: no forced focus moves are introduced. The banner appears inline
  in the existing scrollable step-3 body; it does not steal focus from
  whatever the user was doing. `useModalAccessibility`'s existing focus trap
  and Escape-to-close (gated by the same close/cancel guard) are untouched.

### Contrast verification

Computed against the WCAG relative-luminance formula for both themes'
`var(--surface-raised)`:

| Pairing | Light theme | Dark theme |
|---|---|---|
| `var(--text)` on `var(--surface-raised)` | ~15:1 | ~13:1 |
| `var(--text-secondary)` on `var(--surface-raised)` | ~6.4:1 | ~7.8:1 |

Both comfortably clear the 4.5:1 AA threshold for normal text, in both
themes. The icon/border accent colors (`var(--status-warning)`,
`var(--danger)`) are decorative-only and not relied on for the 4.5:1 text
check.

> **Note for reviewers**: while computing this, `.review-warning-box` and
> `.review-error-box` (existing, unrelated components) turned out to compute
> well under 4.5:1 in light theme — their text color is the same hue as
> their background tint. The new banner deliberately does **not** reuse
> that pattern (see below). Flagging it here rather than fixing it
> unprompted, since it's outside this task's scope and touches shipped
> components.

## Visual spec

### Queued state (`.offline-queue-banner`)

```
┌──────────────────────────────────────────────────────────┐
│ ⏱  Queued — will submit when back online                 │
│    You're offline. We saved your stream details on this  │
│    device and will submit them automatically the moment  │
│    your connection returns — no need to resubmit.         │
│    Queue position: 1 of 1                                │
└──────────────────────────────────────────────────────────┘
```

- Container: `border: 1px solid var(--border)`, `border-left: 4px solid
  var(--status-warning)`, `background: var(--surface-raised)`, `border-radius: 8px`.
- Icon: 18×18 clock outline, `color: var(--status-warning)`, `aria-hidden`.
- Title: `font-weight: 600`, `color: var(--text)`.
- Body copy: `color: var(--text)`.
- Position line: `color: var(--text-secondary)`, `font-size: 0.75rem`.
- Placement: step-3 body, directly above the existing submitting/pending/
  failed status boxes (`transaction-status-box`) and below the "By creating
  this stream…" warning box — same column, same width as those boxes.

### Flushing (reconnect in progress)

Reuses `.transaction-status-box` verbatim with new copy: "Back online.
Submitting your queued stream to Stellar…" — deliberately looks like the
existing "Submitting…" box so returning users recognize it as the same kind
of "hold on" state, not a new concept to learn.

### Flush-flush failure (`.offline-queue-banner--failed`)

```
┌──────────────────────────────────────────────────────────┐
│ ⚠  Your queued stream couldn't be submitted.              │
│    Insufficient balance to fund this stream.              │
│                                                            │
│    [ Retry now ]   [ Edit details ]                       │
└──────────────────────────────────────────────────────────┘
```

- Same container shape as the queued banner, `border-left-color:
  var(--danger)`, icon recolored to `var(--danger)`.
- Body line renders whatever message the failed submission actually
  produced (`getStreamErrorMessage`, the same helper the online path already
  uses) — no fabricated categorization in code. See
  [Failure copy guidance](#failure-copy-guidance-by-cause) for how to word
  the two example causes from the ticket.
- **Retry now** (`.offline-queue-banner__btn--primary`, same
  `--color-cta-primary-bg` treatment as the existing primary CTA):
  re-attempts with the *same* captured payload. If still offline, silently
  re-queues instead of erroring again.
- **Edit details** (`.offline-queue-banner__btn`, secondary/outline):
  discards the captured payload and returns to step 1 so the user can
  change amount/recipient/schedule before resubmitting.

### Success (toast)

No new banner — the modal closes exactly as it does for the online path
today (existing `transactionStatus.status === "confirmed"` effect). The
only change is the **toast**, which needs to reach a user who may not be
looking at the modal anymore (it can flush in the background after the
modal was closed):

```
✓ Success
  Your queued stream was submitted and confirmed on Stellar.
  View stream →
```

`ToastNotification` gained an optional inline action
(`actionLabel`/`onAction`, threaded through `ToastProvider.addToast`'s new
4th `action` parameter: `{ label, onClick }`). The action's `onClick` calls
the same `onStreamCreated` the parent already wires up to open
`StreamCreatedModal.tsx` (see `Streams.tsx`) — clicking it is a convenience
deep link, not a second code path.

## Failure copy guidance by cause

The code surfaces whatever `Error.message` the rejected `createStream` call
produced — it does not attempt to classify it. Recommended **copy**
guidance per likely cause (for whoever writes the RPC/contract-side error
messages):

| Cause | Recommended message pattern | Recommended primary action |
|---|---|---|
| Stale sequence number / nonce | "Your account sequence number changed while offline. Retrying will use a fresh one." | **Retry now** (usually just works) |
| Insufficient balance discovered late | "Insufficient balance to fund this stream." | **Edit details** (lower the deposit or top up first) |
| Network/RPC error on resubmission | Generic `createStream.error.generic` fallback | **Retry now** |

Both actions are always shown regardless of cause — this is a copy/emphasis
recommendation, not a code branch, since the client can't reliably
distinguish these without cooperation from `TransactionError.type` in
`src/lib/stellar/tx.ts`, which isn't fine-grained enough today (e.g. both a
stale-nonce and an insufficient-balance rejection can surface as `"rpc"`).

## Responsive

- 768px and below: banner padding tightens to `0.625rem 0.75rem`,
  `font-size: 0.75rem`; the Retry/Edit buttons keep `flex-wrap: wrap` and
  align to the start (same treatment as `.review-error-box` at this
  breakpoint) so they never force horizontal scroll.
- ≤360px: `font-size: 0.6875rem`, matching the existing very-small-phone
  overrides for `.review-warning-box` / `.review-error-box`.
- The banner sits inside `.modal-body-scroll` — the same scrollable column
  as the review cards — so it never overlaps or obscures the review summary
  above it; it just adds to the scroll length.

## Files changed

- `src/hooks/useOnlineStatus.ts` — new. Tracks `navigator.onLine` +
  `online`/`offline` window events.
- `src/lib/offlineActionQueue.ts` — new. In-memory singleton queue
  (enqueue/dequeue/position/length/subscribe).
- `src/hooks/useTransactionStatus.ts` — widened `TxStatus` with `queued` /
  `flushing` / `queue-failed` for a shared vocabulary with
  `CreateStreamModal`; the hook itself still only ever sets
  `pending`/`confirmed`/`failed` once a real tx hash exists.
- `src/components/CreateStreamModal.tsx` — offline branch at submit time,
  auto-flush effect, retry/edit-details handlers, banner rendering,
  close/cancel vs. busy-state guard split.
- `src/components/CreateStreamModal.css` — `.offline-queue-banner` and
  responsive overrides.
- `src/components/toast/ToastProvider.tsx`,
  `src/components/ToastNotification.tsx(.css)` — optional toast action
  (`actionLabel`/`onAction`), used for the "View stream" deep link.
- `src/i18n/en.ts` — new `createStream.queue.*` and two new button-label
  strings.

## Tests

- `src/lib/__tests__/offlineActionQueue.test.ts` — queue position/length/
  subscribe/dequeue semantics.
- `src/hooks/__tests__/useOnlineStatus.test.tsx` — seed + online/offline
  event transitions.
- `src/components/__tests__/ToastNotification.action.test.tsx` — action
  renders only when both props are set; click fires `onAction` then
  `onClose`.
- `src/components/__tests__/CreateStreamModal.offlineQueue.test.tsx` —
  captures instead of calling `createStream` while offline; announces the
  queued banner + position; Close stays operable and Back is blocked while
  queued; auto-flush success (calls `createStream` with the exact snapshot,
  fires `onStreamCreated`/`onClose`, and calls `addToast` with the
  View-stream action); auto-flush failure (shows the recoverable banner,
  Edit details returns to step 1).

## Known limitations (by design, matches existing "defer to Phase 3")

- Queue is per-tab/in-memory: a page reload while a submission is queued
  loses it silently (no persistence layer yet). If this needs to survive
  reload, treat it as scope for the deferred PWA/offline phase, not a patch
  here.
- No manual "cancel this queued submission" affordance — closing/canceling
  the modal does not remove it from the queue (it still flushes in the
  background, matching the "no need to resubmit" promise in the banner
  copy). Add one if product wants users to be able to abandon a queued
  submission outright.
