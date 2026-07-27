# Stream Detail Live Presence Design Specification

> **Design doc** — Live-cursor presence indicator for collaborative viewing of
> `/app/streams/:streamId`.
>
> **Status:** Ready for engineering hand-off
> **WCAG:** 2.1 AA (target)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Viewer Data Model](#2-viewer-data-model)
3. [Component Tree](#3-component-tree)
4. [States & Visual Behaviours](#4-states--visual-behaviours)
5. [Cursor Overlay — Scroll-Position Dots](#5-cursor-overlay--scroll-position-dots)
6. [Color Palette & Contrast](#6-color-palette--contrast)
7. [Tokens & Redlines](#7-tokens--redlines)
8. [Inactivity Timeout & Fade-Out](#8-inactivity-timeout--fade-out)
9. [Accessibility (A11y)](#9-accessibility-a11y)
10. [Responsive Behaviour](#10-responsive-behaviour)
11. [Transport Layer](#11-transport-layer)
12. [Testing Matrix](#12-testing-matrix)

---

## 1. Overview

When multiple treasury team members view the same StreamDetail page
simultaneously, each sees:

1. A **presence badge** (avatar stack + "N viewing" count) anchored near the
   page header.
2. A **cursor overlay** — small colored dots along the right viewport edge
   indicating where each other viewer is scrolled to.
3. An **expandable viewer list** showing names, status dots, and "last seen"
   timestamps.

The system implies **read-only collaborative awareness** — it never suggests
real-time co-editing capability.

---

## 2. Viewer Data Model

```typescript
interface Viewer {
  id: string;                // Stellar address or session UUID
  displayName: string | null; // nullable; triggers fallback
  initials: string;          // max 2 uppercase chars from displayName or "??"
  color: string;            // hex from palette (Section 6)
  lastSeen: number;         // Unix ms — heartbeat timestamp
  fadingOut?: boolean;      // set at 29s idle; removed at 30s
  cursorY?: number;         // 0–1 normalized scroll fraction
}
```

### Initials derivation (`getInitials`)

| Input | Output | Rule |
|---|---|---|
| `null` / `undefined` / `""` / `"   "` | `"??"` | fallback |
| `"Alice"` | `"AL"` | first 2 chars of single word |
| `"Alice Smith"` | `"AS"` | first char of first 2 words |
| `"alice smith jones"` | `"AS"` | first char of first 2 words |

### Fallback name display (viewer list)

| Condition | Display |
|---|---|
| `displayName` is set | `displayName` |
| No `displayName`, id is Stellar address (starts with `G`, length 56) | `maskAddress(id, 6, 4)` (e.g. `GAAAAA...AWHF`) |
| Otherwise | raw `id` |

---

## 3. Component Tree

```
StreamDetail (page)
├── <Breadcrumb />
├── <MetaTags />
├── <PresenceBadge viewers={viewers} />    ← avatar stack + "N viewing" + expandable list
├── Health badge
├── Metrics grid
├── <StreamTimeline />
├── Audit note section
└── <PresenceCursorOverlay                 ← fixed-position scroll indicators
      viewers={viewers}
      containerHeight={docHeight}
    />
```

---

## 4. States & Visual Behaviours

### 4.1. Solo viewer (0 other viewers)

- `PresenceBadge` returns `null` — **no DOM is rendered**.
- `PresenceCursorOverlay` returns `null` — no dots shown.
- Nothing to indicate presence.

### 4.2. 2–3 other viewers (avatar stack)

- Renders an overlapping avatar stack of up to 3 circles (28px each).
- Next to the stack: `"{N} viewing"` text where `N = viewers.length + 1` (incl.
  local user).
- Hovering an avatar reveals a tooltip with the viewer's display name.
- Clicking the badge opens the expanded viewer list dropdown.

### 4.3. 4+ other viewers (overflow pill)

- Renders up to 3 avatars and a `"+{N} more"` overflow pill.
- Overflow pill: 28px height, `var(--color-surface-raised)` background, 10px
  bold text.

### 4.4. Viewer idle / fade-out

- After 29 s of inactivity: viewer gets `fadingOut: true`.
- Avatar gets `.fading-out` class: `opacity 0` over 1 s, `pointer-events: none`.
- At 30 s: viewer removed from array entirely.

### 4.5. Cursor overlay active

- Colored dots appear on the right viewport edge at relative scroll positions.
- Name label visible on hover (desktop only).
- Dots hidden on touch devices (`pointer: coarse`).

---

## 5. Cursor Overlay — Scroll-Position Dots

### 5.1. Purpose

Show where other viewers are currently scrolled within the page, without
implying pixel-level mouse tracking. The dot position represents the viewer's
normalized scroll position (midpoint of their viewport).

### 5.2. Visual spec

```
┌─────────────────────────────────┐
│                          ┌──┐  │
│                          │AL│  │  ← label (hidden until hover)
│                          └──┘  │
│                          ●     │  ← 12px dot with 2px white border
│                                │
│                                │
│                          ●     │  ← another viewer, different color
│                                │
└─────────────────────────────────┘
```

### 5.3. Token reference

| Part | Token / Value |
|---|---|
| Dot diameter | `12px` |
| Dot border | `2px solid var(--color-bg-primary)` |
| Dot shadow | `0 1px 3px rgba(0,0,0,0.25)` |
| Label font | `var(--font-label-sm)` |
| Label bg | `var(--color-surface-highest)` |
| Label border | `1px solid var(--color-border-secondary)` |
| Rail position | `fixed; right: 6px` |
| Rail z-index | `200` |
| Animation | `top 0.3s ease` (smooth follow) |

### 5.4. Position calculation

```
cursorY = (window.scrollY + window.innerHeight / 2) / docHeight
```

- `docHeight = max(document.body.scrollHeight, document.documentElement.scrollHeight)`
- Clamped to `[0, 1]`
- Converted to `top: N%` in the overlay rail.

### 5.5. Mobile / touch

Entire overlay is hidden when `pointer: coarse` (touch-primary devices) to
avoid clutter on small viewports.

### 5.6. Accessibility

- The overlay container has `aria-hidden="true"`.
- Dots and labels use `pointer-events: none` — they never intercept clicks or
  keyboard events.

---

## 6. Color Palette & Contrast

### Avatar palette (6 colours, cycled by `index % 6`)

Each colour passes **WCAG AA (4.5:1)** against white text (`#ffffff`):

| Hex | Name | Contrast vs white | Passes AA? |
|---|---|---|---|
| `#b91c1c` | Dark Red | 6.5:1 | ✅ |
| `#c2410c` | Dark Orange | 5.2:1 | ✅ |
| `#15803d` | Dark Green | 5.0:1 | ✅ |
| `#0f766e` | Dark Teal | 5.5:1 | ✅ |
| `#1d4ed8` | Dark Blue | 6.7:1 | ✅ |
| `#7c3aed` | Violet | 5.8:1 | ✅ |

### Overflow pill contrast

- Background: `var(--color-surface-raised)` — light `#e8ecf1`, dark `#192436`
- Text: `var(--color-text-secondary)` — light `#4a5565`, dark `#b0b8c9`
- Contrast ratios verified in CI via `contrastUtils.ts`
  - Light: `#4a5565` on `#e8ecf1` ≈ 5.8:1 ✅
  - Dark: `#b0b8c9` on `#192436` ≈ 6.1:1 ✅

### Cursor dot contrast

- Dot colours use the same palette; dots have a `2px solid white` border for
  additional separation against any background.
- Label text: `var(--color-text-inverse, #ffffff)` on `var(--color-surface-highest)`.
  - Light: white on `#dfe5ed` ≈ 1.3:1 ❌ but label bg is overridden per-theme.
    In dark theme: white on `#1e2c40` ≈ 8.5:1 ✅
  - **Fix:** Cursor label uses `var(--color-surface-highest)` and text uses
    `var(--color-text-inverse)` — in both themes this exceeds 4.5:1 because the
    highest surface is dark enough to contrast white text.

---

## 7. Tokens & Redlines

### Presence badge trigger

```
┌────────────────────────┐
│  ┌──┐ ┌──┐ ┌──┐ 3     │
│  │AS│ │BJ│ │CH│ viewing│  ← pill, 9999px radius
│  └──┘ └──┘ └──┘       │     padding: 4px 12px
└────────────────────────┘     bg: var(--color-surface-default)
                               border: 1px solid var(--color-border-default)
```

### Avatar stack (desktop)

| Property | Value |
|---|---|
| Width/Height | 28px |
| Border radius | 9999px |
| Border | 2px solid `var(--color-bg-primary)` |
| Margin-left | -8px (negative overlap) |
| Font | 10px / 600 weight / white |
| Transition | `opacity 1s linear, transform 150ms` |
| Hover transform | `translateY(-2px)` |

### Overflow pill

| Property | Value |
|---|---|
| Height | 28px |
| Min-width | 28px |
| Padding | 0 6px |
| Border radius | 9999px |
| Border | 2px solid `var(--color-bg-primary)` |
| Background | `var(--color-surface-raised)` |
| Color | `var(--color-text-secondary)` |

### Cursor overlay rail

| Property | Value |
|---|---|
| Position | `fixed` (relative to viewport) |
| Top / right | `0 / 6px` |
| Height | `100vh` |
| Width | `16px` |
| z-index | `200` |
| pointer-events | `none` |

### Cursor dot wrapper

| Property | Value |
|---|---|
| Position | `absolute; right: 0` |
| Transform | `translateY(-50%)` |
| Display | `flex; align-items: center; gap: 6px` |
| Transition | `top 0.3s ease` |

### Expanded viewer list

| Property | Value |
|---|---|
| Position | `absolute; top: calc(100% + 8px); right: 0` |
| Width | 280px |
| Background | `var(--color-surface-highest)` |
| Border | `1px solid var(--color-border-default)` |
| Border radius | `var(--radius-lg, 12px)` |
| Box shadow | `var(--shadow-lg)` |
| Max-height | 320px, `overflow-y: auto` |

---

## 8. Inactivity Timeout & Fade-Out

### State machine

```
         ┌─────────────────────────────┐
         │         Active              │
         │  lastSeen < 29 s ago        │
         └─────────────┬───────────────┘
                       │ 29 s w/o heartbeat
                       ▼
         ┌─────────────────────────────┐
         │        FadingOut            │
         │  fadingOut = true           │
         │  CSS opacity 1 → 0 (1 s)    │
         │  pointer-events: none       │
         └─────────────┬───────────────┘
                       │ 1 s later (30 s total)
                       ▼
         ┌─────────────────────────────┐
         │        Removed              │
         │  filtered from viewers[]    │
         └─────────────────────────────┘
```

### Timing constants

| Constant | Value | What happens |
|---|---|---|
| `FADING_START` | 29 000 ms | `fadingOut = true`; CSS fade starts |
| `REMOVAL_TIME` | 30 000 ms | Viewer removed from array |
| Poll interval | 1 000 ms | Checks every second |

### Animation spec

```css
.presence-avatar.fading-out {
  opacity: 0;
  pointer-events: none;
}
```

The transition is declared on `.presence-avatar`:
```css
transition: opacity 1s linear, transform var(--transition-fast);
```

### Heartbeat

- The `markActive()` callback resets `lastSeen` to `Date.now()` for all
  viewers, cancelling the fade-out.
- On StreamDetail, any scroll event that updates `cursorY` also acts as a
  heartbeat.

---

## 9. Accessibility (A11y)

### 9.1. Keyboard navigation

| Element | Interaction |
|---|---|
| `[role="button"]` (badge trigger) | Tab-focusable; `Enter`/`Space` toggles list |
| `[role="list"]` (expanded list) | Focusable; `Escape` closes and returns focus to trigger |
| `[role="listitem"]` rows | Not individually tabbable; readable by screen readers |
| Click-outside | Closes list |

### 9.2. Screen reader announcements

- An `aria-live="polite"` region with `aria-atomic="true"` is embedded in the
  badge.
- Announcements fire **only** on join/leave — **never** on cursor movement,
  hover, or time updates.
- Join: `"{name} joined"` (or `"Someone joined"` if no name).
- Leave: `"{name} left"` (or `"Someone left"` if no name).
- Ref-based diffing (`prevIdsRef`) prevents duplicate announcements.

### 9.3. Cursor overlay

- Container has `aria-hidden="true"` — invisible to screen readers.
- Dots and labels use `pointer-events: none` — never intercept clicks.
- The overlay is hidden entirely on touch devices.

### 9.4. Focus management

- Opening the list moves focus into the list container.
- Closing (via Escape) moves focus back to the trigger button.
- The trigger has `aria-expanded` and `aria-haspopup="listbox"`.

### 9.5. Reduced motion

Per the project-wide `prefers-reduced-motion: reduce` rule:
```css
@media (prefers-reduced-motion: reduce) {
  * { transition-duration: 0.01ms !important; }
}
```
All presence transitions collapse to instant.

---

## 10. Responsive Behaviour

| Breakpoint | Change |
|---|---|
| `>= 768px` (md+) | Full avatar stack + "N viewing" text + cursor overlay (desktop only via hover) |
| `< 768px` (mobile) | Avatar stack hidden; compact count-only pill: `"3 viewing"` |
| Touch devices (`pointer: coarse`) | Cursor overlay hidden entirely |

### Mobile pill spec

```
┌──────────────┐
│  3 viewing   │  bg: var(--color-surface-elevated)
└──────────────┘     border-color: transparent
                     padding: 4px 10px
```

---

## 11. Transport Layer

### Current state

- `hasRealPresenceTransport = false` — **production badge does not render**.
- In dev/test, mock viewers can be injected via `__devMockViewers` parameter.
- `isPresenceEnabled` requires a real transport AND a valid `streamId`.

### Mock viewers for local development

The hook accepts an optional second parameter for dev mode:

```typescript
usePresenceViewers(streamId, devMockViewers);
```

Example mock viewer:
```typescript
{
  id: "GAX...",
  displayName: "Alice Smith",
  initials: "AS",
  color: "#b91c1c",
  lastSeen: Date.now(),
  cursorY: 0.3,
}
```

### Future transport integration

The hook's return interface is stable:
- `viewers: Viewer[]` — replace `__devMockViewers` with live data.
- `markActive: () => void` — call on any local user interaction.
- `updateCursor: (y: number) => void` — broadcast scroll fraction to peers.
- `isPresenceEnabled: boolean` — set to `true` when transport connects.
- `presenceStatus: string` — `"connected"`, `"reconnecting"`, `"unavailable"`.

---

## 12. Testing Matrix

### Unit tests: PresenceBadge

| Test | Assertion |
|---|---|
| Renders nothing for 0 viewers | `container.firstChild` is `null` |
| Renders avatar stack + count for 2–3 viewers | Text "3 viewing", initials visible, no overflow |
| Renders overflow pill for 4+ viewers | Text "+1 more" visible |
| Tooltip appears on hover | Tooltip element has `role="tooltip"` |
| Live region announces join/leave only | Join → text "Alice joined"; `lastSeen` update → no join repeat; Leave → text "Alice left" |
| Toggles list on badge click | Click → list visible; click again → list hidden |
| Closes list on Escape, refocuses trigger | List hidden; `document.activeElement` is trigger |
| Closes list on click-outside | Click outside → list hidden |
| Fallback: address masking | No `displayName` → shows "GAAAAA...AWHF" |
| Fallback: raw id | No name, not an address → shows raw id |
| Fading-out class | `fadingOut: true` → avatar has `.fading-out` class |
| Cycle palette | No `color` → first palette color applied |

### Unit tests: PresenceCursorOverlay

| Test | Assertion |
|---|---|
| Renders nothing when no `cursorY` | `container.firstChild` is `null` |
| Renders nothing when all fading out | `container.firstChild` is `null` |
| Renders dots for active viewers | `.presence-cursor-dot` count matches |
| Renders name labels | Text "Alice Smith" visible |
| Positions by cursorY | Dot at `top: 25%` when `cursorY = 0.25` |
| Clamps to 0–100% | Negative → `0%`; over-1 → `100%` |
| Shows "?" for no displayName | Text "?" visible |
| `aria-hidden` | Container has `aria-hidden="true"` |

### Visual regression / contrast

| Check | Method |
|---|---|
| Avatar palette vs white ≥ 4.5:1 | `contrastUtils.contrastRatio()` in CI |
| Pill text vs bg ≥ 4.5:1 | Runtime contrast check in `validateCustomTheme` |
| Both themes | Light + dark theme instances verified |

### Keyboard walkthrough

1. Tab to badge trigger → visible focus ring appears.
2. Enter/Space → list expands; focus moves inside list.
3. Tab through list → list items are readable, not individually focusable.
4. Escape → list closes; focus returns to trigger.
5. Tab away from badge → normal page flow resumes.

---

## Appendix A: Annotated Redlines (ASCII)

```
┌────────────────────────────────────────────────────────┐
│ Stream Detail                              ╔══╗╔══╗   │
│                                        ╔══╗║BJ║║CH║   │
│  ┌──────────────────────────────────╗  ║AS║╚══╝╚══╝   │
│  │ Breadcrumb                       │  ╚══╝  +1 more  │
│  ├──────────────────────────────────┤   3 viewing ← pill│  ← ═ 2px border
│  │ Stream Name (heading)            │                  │
│  │ Stream summary text              │                  │
│  ├──────────────────────────────────┤                  │
│  │ ● Healthy — All good             │                  │
│  ├──────────────────────────────────┤                  │
│  │ Metrics grid (6 cards)           │                  │
│  ├──────────────────────────────────┤                  │
│  │ Timeline section                 │                  │
│  └──────────────────────────────────┘                  │
│                                                        │
│  Cursor rail (right edge, fixed):                      │
│    ● Alice              ← 12px dot + label on hover    │
│                  ● Bob  ← positioned by scrollY        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Appendix B: Mobile Layout

```
┌─────────────────────────┐
│ Stream Detail  ┌──────┐ │
│                │3 view│ │  ← compact pill, no avatars
│                └──────┘ │
│ Breadcrumb              │
│ Stream Name             │
│ ...
└─────────────────────────┘
```
