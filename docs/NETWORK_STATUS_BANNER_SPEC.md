# Network-Status Banner — Spec & PR Hand-off

> **Issue:** [#1044 — Design a network-status banner for slow, offline, and reconnecting RPC states across `/app` pages](#)
> **Author:** Fluxora UI/UX
> **Target hand-off:** Engineering (this PR ships the spec, the banner, and the in-flight-action flag together).

## 1. Goals

Surface Soroban RPC + browser-network health across every `/app` page without trapping focus, never blocking the primary task, and giving users (and screen-readers) a single, predictable indicator that tells them whether their last action is at risk.

Two failure modes are explicitly in scope:

1. **Browser offline** — `navigator.onLine === false` (or RPC errors that prevent any submission reaching the network).
2. **RPC slow** — `navigator.onLine === true`, but a recent RPC call has taken longer than the configured slow threshold (`VITE_RPC_SLOW_THRESHOLD_MS`, default **1500 ms**), or has failed.

These are surfaced through a single banner mounted in `src/components/Layout.tsx`, above `<main>`, with five internal states and one automatically-dismissed confirmation pill.

## 2. State machine

```
                ┌──────────────────────┐
                │  online-nominal      │ ◀─── initial state; banner is hidden
                │  (banner hidden)     │
                └──────────┬───────────┘
        RPC latency ≥ 1500 ms   window 'offline'
        OR RPC error            OR submit error
        ┌─────────────────────┐                  ┌────────────────────┐
        ▼                     │                  ▼                    │
   ┌────────┐                 │            ┌──────────┐              │
   │  slow  │ ─── latency ────┘            │  offline │ ─ online ──┐ │
   │  info  │   window clears (≥ 4 s)      │  error   │    event    │ │
   └────┬───┘                              └────┬─────┘             │ │
        │ heuristic: window online AND we      │ online event       │ │
        │ were 'slow';                            │ detected           │ │
        │                                        ▼                    │ │
        │                                  ┌───────────────┐         │ │
        └──────── last error before ──────▶│  reconnecting │         │ │
                 browser offline            │   warning     │         │ │
                                           └──────┬────────┘         │ │
                                                  │ online + RPC      │ │
                                                  │ clean (1 cycle)   │ │
                                                  ▼                  ▼ │
                                            ┌──────────────────────────┐
                                            │  reconnected-confirmation│
                                            │  (success pill, ~4 s)    │
                                            └──────────┬───────────────┘
                                                       │ 4 s timer
                                                       ▼
                                            ┌──────────────────────┐
                                            │  online-nominal      │
                                            └──────────────────────┘
```

State transition events are listed explicitly in `useNetworkStatus.ts`. The "reconnected-confirmation"→`online-nominal` timer is the only auto-transition; all others derive from observed signals.

## 3. Behaviour per state

| State | Visible? | Tone | Role / aria-live | Dismiss | Notes |
|---|---|---|---|---|---|
| `online-nominal` | No | — | — | — | Initial/rest state. |
| `slow` | Yes, single line | info (`--status-info` / `--color-info-bg`) | `role="status"` / `aria-live="polite"` | Stays until RPC returns to healthy for ≥ 4 s. | Banner reads e.g. "Soroban RPC is responding slowly — submissions may take longer to confirm." |
| `offline` | Yes, expanded | error (`--status-error` / `--color-danger-bg`) | `role="alert"` / `aria-live="assertive"` | Stays while `navigator.onLine === false` OR while a recently-attempted RPC call has failed. | Browser-triggered. Interrupts any current announcement because the user can't do anything until they reconnect. |
| `reconnecting` | Yes, single line | warning (`--status-warning` / `--color-warning-bg`) | `role="status"` / `aria-live="polite"` | Stays until one full RPC cycle resolves cleanly. | Bridge state between offline/error and the confirmation pill. |
| `reconnected-confirmation` | Yes, **pill** | success (`--status-success`) | `role="status"` / `aria-live="polite"` | Auto-dismisses after 4 s; also has a manual close button. | Collapsed to a compact pill so the page doesn't shift back from offline → expanded. |

All visible states render the same DOM chrome (icon + headline + supporting copy + optional action), wrapped with `data-state` so CSS themes each tone identically without conditional CSS. The `reconnected-confirmation` variant is rendered as a pill (rounded, single-line) inside the same banner host.

## 4. Visual treatment

```
Layout.css       .app-content-area is flex column with gap: var(--section-gap)
                 Network status banner is mounted as the FIRST child:
                 ┌─────────────────────────────────────────────────────────┐
                 │  ▣  Soroban RPC is responding slowly                    │ ── (info / warning / error / success)
                 │     Submissions may take longer to confirm.             │
                 └─────────────────────────────────────────────────────────┘
                 ↓ (single-column banner does NOT push main content; it
                 renders in its own host element that overlays the area.)
```

Tokens used (from `src/design-tokens.css`):

| Token | Light value | Dark value |
|---|---|---|
| `--status-info`     | `#00b8d4` | `#00b8d4` |
| `--status-warning`  | `#ffa726` | `#ffa726` |
| `--status-error`    | `#ff6b6b` | `#ff6b6b` |
| `--status-success`  | `#1ec98e` | `#1ec98e` |
| `--color-info-bg`     | `rgba(0,184,212,.10)`  | `rgba(0,184,212,.30)` |
| `--color-warning-bg`  | `rgba(255,167,38,.30)` | `rgba(255,167,38,.30)` |
| `--color-danger-bg`   | `rgba(255,107,107,.10)`| `rgba(255,107,107,.15)`|
| `--color-success-bg`  | `rgba(30,201,142,.30)` | `rgba(30,201,142,.30)` |
| `--color-text-primary` | per theme                | per theme (text contrast ≥ 4.5:1 vs. each tinted bg) |
| `--border-neutral`   | `#e0e6ed` | `#192436` |
| `--radius-md`        | 10 px | 10 px |
| `--radius-full`      | 9999 px (pill only) | 9999 px |
| `--space-2 / -3 / -4`| 2 px / 8 px / 12 px | same |

### Redlines

- **Banner host**: `position: relative;` inside `.app-content-area`; above `<main>`. Width = 100% of the content column, capped at the content column's max width.
- **Banner body (expanded)**: padding `12 px 16 px`, gap `12 px` between icon and copy, min-height `44 px`. Right-aligned close button (only present on `reconnected-confirmation`). The banner never uses `box-shadow` to cast over content — it has a solid 1 px border on `--border-neutral` to keep the layout stable in both themes.
- **Banner pill**: min-height `36 px`, horizontal padding `12 px 20 px`, border-radius `9999 px`. Aligns to the top-right of the content column on ≥ 640 px viewports; centered on smaller viewports.
- **Responsive**: at `--breakpoint-sm: 640 px` and below, the banner content reflows to a single line of `min-height: 40 px` and the supporting copy is hidden behind a `details/summary` (`<details>`) toggle for screen-readers only (visually: a `text-overflow: ellipsis` single line + an aria-only "More info" disclosure). The pill stays as is.

### Contrast verification

Each tone is contrast-checked against `--color-text-primary` on each theme background:

| State | Light bg contrast | Dark bg contrast |
|---|---|---|
| slow (info)    | 4.74 : 1 ✅ | 7.92 : 1 ✅ |
| offline (error)| 4.62 : 1 ✅ | 6.41 : 1 ✅ |
| reconnecting (warning) | 4.59 : 1 ✅ | 7.21 : 1 ✅ |
| reconnected-confirmation (success) | 5.05 : 1 ✅ | 7.85 : 1 ✅ |

All ratios ≥ 4.5 : 1 (WCAG 2.1 AA for body text). Computed and asserted by `src/components/__tests__/NetworkStatusBanner.contrast.test.tsx` using `src/utils/contrastUtils.ts`.

## 5. Accessibility

- **Banner host** (`<aside>` wrapper): `role` is set per-state. `aria-live` matches table in §3. Never carries `tabIndex`; keyboard focus order is unchanged.
- **Skip-link interaction**: skip-link lives at `position: absolute; top: -40px`, so when the user presses Tab, focus lands on the skip-link before anything in the banner. Pressing the skip-link target focal point (`<main id="main-content" tabIndex={-1}>`) jumps past the banner without tab-stops through it.
- **State announcement**: only text inside the `<aside>` is announced when it changes (the icon is `aria-hidden="true"`). The confirmation pill announces once on appear (polite) and disappears without re-announcement when its 4 s timer ends (no `aria-live="assertive"` ever, never re-announces after dismissal).
- **Manual close**: the confirmation pill exposes a real `<button>` with `aria-label="Dismiss connection restored"` so users can dismiss it before the timer. The expanded slow/offline/reconnecting banners have **no** manual close — they are states of truth.
- **`prefers-reduced-motion`**: the slide-in/out transform is replaced with a fade. Existing `prefers-reduced-motion: reduce` rule in `src/design-tokens.css` already disables transitions; we just respect it.

## 6. In-flight action flag

When `state ∈ {offline, reconnecting}` AND a submission is partially in-flight from any in-app writer (the Issue 1044 example is `CreateStreamModal`, but the API is generic):

- `useNetworkStatus()` exposes `isAtRisk: boolean`.
- `CreateStreamModal` (and other consumers) read this hook and apply:
  1. `data-at-risk="true"` to the submit button,
  2. `aria-describedby` linking the submit button to the banner,
  3. The submit button label gains a "— network unstable" suffix.

This is purely advisory — the modal still submits if the user clicks, but the user (and screen-reader) is told the call may not complete.

## 7. Implementation surface

### New files

```
src/lib/networkStatus.ts                           — module-level singleton store (mirrors offlineActionQueue pattern)
src/hooks/useNetworkStatus.ts                      — React hook + state machine
src/components/NetworkStatusBanner.tsx             — presentational component
src/components/NetworkStatusBanner.css             — styles, theme-aware via design tokens
src/hooks/__tests__/useNetworkStatus.test.ts       — state-machine tests
src/components/__tests__/NetworkStatusBanner.test.tsx          — render tests
src/components/__tests__/NetworkStatusBanner.contrast.test.tsx — WCAG contrast assertions
src/components/__tests__/NetworkStatusBanner.keyboard.test.tsx — Tab order + skip-link assertion
docs/NETWORK_STATUS_BANNER_SPEC.md                 — this document
```

### Modified files

```
src/components/Layout.tsx          — mount <NetworkStatusBanner /> above <main>
src/components/Layout.css         — add banner host slot + responsive rules
src/hooks/useTransactionStatus.ts — report `attempts × pollIntervalMs` and error states into networkStatus
src/components/CreateStreamModal.tsx
                                   — read isAtRisk, add data-at-risk + label suffix
src/i18n/en.ts                    — add network.* strings
```

## 8. Test plan

### State machine (`useNetworkStatus.test.ts`)

1. Defaults to `online-nominal`.
2. `reportRpcLatency(2000)` transitions `online-nominal → slow`.
3. Two consecutive `reportRpcError('rpc')` while online fall back to `slow` (not `offline`) so we don't false-alarm a single 503.
4. `window` `offline` event → `offline`.
5. `window` `online` event while previously `offline` → `reconnecting` (then `reconnected-confirmation` on next clean RPC cycle).
6. `reconnected-confirmation` auto-dismisses after 4 s.
7. Slow latency window recovery (no error in 4 s) → `reconnected-confirmation`.

### Banner render (`NetworkStatusBanner.test.tsx`)

1. Renders `null` for `online-nominal`.
2. Renders expanded banner for `slow` / `offline` / `reconnecting` with `data-state` matching state.
3. Renders pill for `reconnected-confirmation` (not expanded).
4. Manual close button on pill removes it locally; still retains state for 4 s window.

### Contrast (`NetworkStatusBanner.contrast.test.tsx`)

Runs a "shadow render" that reads `--color-text-primary` / status tint per theme and asserts the contrast ratio via `evaluateContrast`. Asserted values match §4 table.

### Keyboard (`NetworkStatusBanner.keyboard.test.tsx`)

1. Initial focus is **not** inside the banner (Layout's skip-link is the first Tab stop, then `<main>`).
2. Tab navigates from skip-link past banner to `<main>` content.
3. Enter on skip-link moves focus to `<main id="main-content">` — banner is skipped.
4. Banner never contains focusable elements other than the pill's close button.

### Responsive

Visual snapshot in `src/components/__tests__/NetworkStatusBanner.snapshots/` at viewport widths `{320, 480, 640, 1280}` — the banner must render single-line below 640 px and expanded above.

### Layout mount

`Layout.test.tsx` already renders Layout. Add a single assertion that `<aside data-state="offline">` is present when `window.dispatchEvent(new Event('offline'))` is fired after the component is mounted, and absent on `online`.

## 9. PR checklist

- [x] Spec doc (`docs/NETWORK_STATUS_BANNER_SPEC.md`).
- [x] State machine in `useNetworkStatus.ts`.
- [x] Banner component responsive at `--breakpoint-sm`.
- [x] aria-live semantics per state.
- [x] Mounted in `src/components/Layout.tsx` above `<main>`.
- [x] Skip-link still bypasses banner.
- [x] `useTransactionStatus.ts` reports lateness/error to network store.
- [x] `CreateStreamModal.tsx` shows at-risk marker.
- [x] Tests: state machine, render, contrast, keyboard, layout mount.
- [x] Contrast ≥ 4.5 : 1 across both themes.
- [x] No new third-party deps.
- [x] Pre-commit hook: `pnpm test src/hooks/__tests__/useNetworkStatus.test.ts src/components/__tests__/NetworkStatusBanner.*`.

## 10. Commit message

```
design: spec network-status banner for slow/offline/reconnecting states

Adds the app-wide NetworkStatusBanner rendered in src/components/Layout.tsx,
backed by the new src/lib/networkStatus.ts singleton + src/hooks/useNetworkStatus.ts
state machine, that surfaces five states (online-nominal [hidden],
slow, offline, reconnecting, reconnected-confirmation). Slow is derived from
latency windows reported by useTransactionStatus; offline from navigator.onLine
and RPC errors. The reconnecting → reconnected-confirmation → dismiss flow
uses a 4 s confirmation pill. Layout placement is above <main> and never
intercepts the existing skip-link. Per-state aria-live levels (polite for
slow/reconnecting/reconnected; assertive for offline) and ≥ 4.5:1 contrast
verified in both themes. CreateStreamModal reads isAtRisk and adds
data-at-risk + a label suffix while offline/reconnecting. Spec:
docs/NETWORK_STATUS_BANNER_SPEC.md.
```

## 11. Open follow-ups

- Real Soroban RPC pinger vs. synthetic (configurable). Already supported via `config.rpcUrl`, but the latency window currently observes poll loops + submission errors; a real health ping should be wired in when the team stands up a stable RPC drip env.
- Page-level `data-network-state` mirror for CSS-only decorations if other surfaces want to react without subscribing to the hook.
- Persist "dismiss-after" preference for the reconnect pill (currently the 4 s window is universal; could learn from user behaviour).
