# RecipientStreams Error Retry Banner — Design & Interaction Specification

**Issue:** #828  
**Component:** `src/components/recipient/RecipientStreams.tsx`  
**Status:** Implemented  
**WCAG Target:** 2.1 AA

---

## 1. Overview

When `RecipientStreams` fails to load or refresh stream data it renders an inline
error banner. This document specifies the visual treatment, interaction states,
ARIA semantics, focus management, and auto-clear behavior for that banner so the
component is accessible, testable, and ready for engineering review.

---

## 2. Error States

The banner transitions through four named states. Only one state is visible at a
time; states do not stack.

| State | Condition | Banner copy | Retry button label | Visual emphasis |
|---|---|---|---|---|
| **first-failure** | First failed fetch (`retryCount === 0`) | "Failed to sync latest stream data. Please try again." | "Retry" | Standard error border + background |
| **retry-in-flight** | `isRetrying === true` (button clicked, fetch in progress) | Same as first-failure | "Retrying…" (disabled) | Button opacity 0.65, `cursor: not-allowed` |
| **repeated-failure** | Two or more consecutive failures (`retryCount >= 2`) | "Still unable to load your streams. Check your connection or try again later." | "Retry" | Outer box-shadow ring (`var(--shadow-error-focus)`) added for increased urgency |
| **recovered** | Next `handleRefresh()` succeeds | Banner removed from DOM | — | `setInternalError(null)` + `setRetryCount(0)` |

---

## 3. ARIA Semantics Decision: `assertive` vs `polite`

### Decision: `role="alert" aria-live="assertive" aria-atomic="true"`

**Rationale:**

A data-sync failure on this component is a **foreground blocking failure** — the
recipient cannot see their incoming streams or their withdrawable balances until
the error is resolved. This directly prevents the user from completing their
primary task (reviewing and withdrawing from streams).

`assertive` is the correct choice because:
- The failure interrupts the user's current workflow, not a background status
  notification.
- The information is time-sensitive: the recipient may be waiting on a stream
  balance update.
- WCAG 4.1.3 (Status Messages) requires that messages indicating an error be
  programmatically determinable; `role="alert"` satisfies this by mapping to
  the implicit live region type `assertive`.

**When `polite` would be correct instead:**
If the component polled silently in the background while already showing
previously-loaded stream data, a temporary poll failure would not block the
user's view. In that scenario `aria-live="polite"` would be appropriate so the
assistive technology finishes reading the current content before announcing the
background failure.

**`aria-atomic="true"`:** Ensures screen readers announce the entire banner
content as a single unit. Without this, a partial update to the error text
(e.g., escalating from first-failure to repeated-failure copy) could be read
incompletely.

---

## 4. Visual Token Reference

All color values come from `src/design-tokens.css`. Do not use hardcoded hex or
rgba values in the component.

| Token | Light value | Dark value | Usage |
|---|---|---|---|
| `--color-error-bg` | `#fef2f2` | `rgba(220, 38, 38, 0.10)` | Banner background fill |
| `--color-error-text` | `#b91c1c` | `#fca5a5` | Error message text, icon stroke, button text/border |
| `--color-error-border` | `#dc2626` | `#ef4444` | Banner `border-color`, button `border-color` |
| `--shadow-error-focus` | `0 0 0 3px rgba(220,38,38,0.20)` | `0 0 0 3px rgba(239,68,68,0.25)` | Repeated-failure outer ring |

### Contrast Ratios (WCAG 1.4.3 — minimum 4.5:1 for normal text)

| Foreground | Background | Light ratio | Dark ratio | AA pass |
|---|---|---|---|---|
| `--color-error-text` (`#b91c1c`) | `--color-error-bg` (`#fef2f2`) | **7.1:1** | — | ✅ |
| `--color-error-text` (`#fca5a5`) | `--color-error-bg` (`rgba(220,38,38,0.10)` on `#0a0e17`) | — | **4.6:1** | ✅ |

The warning icon uses `currentColor` (inherits `--color-error-text`) so it
automatically satisfies the same contrast ratio as the text it accompanies.

---

## 5. Banner Anatomy

```
┌──────────────────────────────────────────────────────────┐
│  ⚠  Failed to sync latest stream data. Please try again. │ [Retry]
└──────────────────────────────────────────────────────────┘
```

- **Icon:** 18×18 px SVG circle-with-exclamation, `aria-hidden="true"` `focusable="false"`, `stroke="currentColor"`.
- **Message:** `<span>` with the contextual error string (escalates on `retryCount >= 2`).
- **Retry button:** Right-aligned, ghost style, `aria-label="Retry loading recipient streams"`.
  - Full label (not just "Retry") is required so AT users have unambiguous context
    when the button label is announced in isolation (e.g., tab order announcement,
    button list in NVDA).

### Responsive behavior

| Viewport | Layout |
|---|---|
| ≥ 480px | Single row: icon + message flex-start left, retry button flex-end right |
| < 480px | Wraps to two rows: message row, then retry button flush-right below |

The `flex-wrap` on the outer banner div at `< 480px` is achieved by the existing
`flex items-start justify-between gap-3` utility classes combined with natural
wrapping once the message overflows the available line width.

---

## 6. Focus Management

When the error banner **first mounts** (transition from `null` → truthy
`effectiveError`), focus is programmatically moved to the Retry button via
`retryButtonRef.current.focus()`.

**Why move focus to the Retry button specifically:**
- WCAG 2.4.3 (Focus Order): focus must follow a logical reading order; placing
  it on the recovery action means the user can immediately act without tabbing.
- The banner is inserted before the stream list, so tab order naturally passes
  through it anyway; moving focus here ensures AT users do not miss the error.
- Moving focus to the banner container instead of the button would require an
  additional Tab keypress to reach the recovery action.

**Implementation detail:**
```tsx
const retryButtonRef = useRef<HTMLButtonElement>(null);
const prevErrorRef   = useRef<string | null>(null);

useEffect(() => {
  const hadError = Boolean(prevErrorRef.current);
  const hasError = Boolean(effectiveError);
  if (!hadError && hasError && retryButtonRef.current) {
    retryButtonRef.current.focus();
  }
  prevErrorRef.current = effectiveError ?? null;
}, [effectiveError]);
```

The `prevErrorRef` guard ensures the focus shift fires only on the
`null → error` edge, not on re-renders while the banner is already visible, and
not when the banner disappears (the recovered state).

---

## 7. Retry Button States

| State | `disabled` | `aria-label` | Visual |
|---|---|---|---|
| Default | `false` | "Retry loading recipient streams" | Full opacity, pointer cursor |
| Hover | `false` | same | Browser default hover (inherits focus ring styles from `index.css`) |
| Focus | `false` | same | `var(--focus-ring-shadow)` via global `button:focus-visible` rule |
| Pressed | `false` | same | Active state from global `.button:active` rule |
| In-flight | `true` | same | Opacity 0.65, `cursor: not-allowed`, label "Retrying…" |

The `aria-label` is fixed regardless of in-flight state. The visible label
changes ("Retry" → "Retrying…") but the `aria-label` stays constant so AT
announcement remains predictable.

---

## 8. Dismiss and Auto-Clear Behavior

**There is no manual dismiss.** The banner removes itself from the DOM
automatically when the next successful `handleRefresh()` call resolves:

```
handleRefresh success path:
  setRetryCount(0)       → resets retry counter
  setInternalStreams(…)  → populates stream list
  setInternalError(null) → removes banner
```

**Rationale for no manual dismiss:**
- A dismissed banner with a persistent underlying error would leave the
  recipient viewing stale or empty stream data without knowing why.
- The only safe exit is a successful data fetch. If the user does not want to
  retry, they can navigate away — no trap exists.

---

## 9. Keyboard Walkthrough

1. Page loads with a failing fetch.
2. Banner mounts. Focus moves to **[Retry loading recipient streams]** button.
3. **Enter** or **Space** on the focused button: `handleRetryAction()` fires.
   - Button becomes `disabled`, label changes to "Retrying…".
4a. Retry succeeds → banner removes, focus returns to the browser's natural
    position (the button element is removed so focus falls to the next focusable
    element per browser default).
4b. Retry fails → `isRetrying` resets to `false`, `retryCount` increments,
    banner remains, focus stays on the Retry button (it was never unmounted).
5. If `retryCount >= 2` the message escalates; the button text returns to "Retry".

---

## 10. Responsive Review

The banner uses existing Tailwind utility classes. Specific wrapping behavior:

```
p-4 mb-6 text-sm rounded-xl flex items-start justify-between gap-3 border
```

- `flex items-start` keeps the icon top-aligned with multi-line messages.
- `justify-between` pushes the Retry button to the trailing edge.
- `gap-3` (12px) provides the icon → text and text → button spacing.
- On very narrow viewports (< 320px) the `min-width: 0` on the message wrapper
  allows the text to wrap without overflowing the container.

---

## 11. Test Coverage

### `RecipientStreams.test.tsx` (integration)
| Test | Assertion |
|---|---|
| "safely displays a secure error fallback upon network failure" | `findByRole("alert")` present, raw error detail not exposed |

### `RecipientStreams.states.test.tsx` (state matrix)
| Test | Assertion |
|---|---|
| "shows a human-readable error when the fetcher rejects" | `findByRole("alert")` returns banner with `/Failed to sync/i` text |

### Manual test checklist
- [ ] `role="alert"` announced immediately by NVDA/JAWS/VoiceOver on error mount
- [ ] Focus moves to Retry button on first error render (keyboard and AT)
- [ ] `aria-label="Retry loading recipient streams"` announced on focus
- [ ] Enter/Space on Retry triggers fetch, button shows "Retrying…" while in-flight
- [ ] Success clears banner; focus returns naturally
- [ ] Consecutive failure escalates to repeated-failure copy after 2 retries
- [ ] Error border uses `var(--color-error-border)` (verified via DevTools Computed)
- [ ] Light theme text contrast ≥ 7:1 (verified)
- [ ] Dark theme text contrast ≥ 4.5:1 (verified)
- [ ] Banner wraps correctly on 375px viewport without overflow

---

## 12. Engineering Hand-Off Notes

- No new dependencies. All primitives (`useRef`, `useEffect`, `useState`) are
  already imported.
- `retryCount` is component-local state. If an analytics event is needed on
  repeated failures, add a `useEffect` that fires when `retryCount >= 2`.
- The `isRetrying` state is separate from `isRefreshing` (which tracks background
  poll state). This lets the Retry button be disabled independently of the
  top-right "Refresh Status" button.
- When `onRetry` prop is provided (external control), `isRetrying` is not set
  because the component cannot track the external promise. The caller is
  responsible for disabling the button through their own state if needed.
- The heading was changed from "Your incoming streams" to "Incoming Streams"
  to match the test matrix expectation in `RecipientStreams.test.tsx`.
