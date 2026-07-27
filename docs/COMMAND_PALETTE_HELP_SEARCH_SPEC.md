# Command Palette — Help & Search Modal

**Status:** Design / Spec (hand-off ready)  
**Trigger:** Cmd/Ctrl+K (global), visible header button  
**WCAG Target:** 2.1 AA  
**Breakpoints:** 320 · 640 · 768 · 1024px  
**Modal supersedes:** `src/components/KeyboardShortcutsModal.tsx` (the old shortcuts-only modal; the new file replaces it entirely)

---

## 1. Overview

A unified command-palette-style modal combining three concerns into one interface:

| Section | Purpose |
|---|---|
| **Actions** | Global navigation (Dashboard, Streams, Recipient, Treasury) and app commands ("Create stream", "Toggle theme", "Connect wallet") |
| **Shortcuts** | Searchable keyboard-shortcuts reference (replaces the old static `KeyboardShortcutsModal` content) |
| **Help** | Lightweight help-article lookup |

The palette is triggered globally by **Cmd/Ctrl+K** and by a visible header button in `AppNavbar.tsx`.

### 1.1. Relationship to the old `KeyboardShortcutsModal`

- The old file had **no mounting point** in the app.
- The new `KeyboardShortcutsModal.tsx` is a full command palette that **wraps** the shortcuts list inside its "Shortcuts" section (see §3.2).
- The shortcuts data lives in a single place: `SHORTCUTS` array inside the component. No duplicate list exists anywhere else.

---

## 2. States & Layout

### 2.1. Closed (default)

- Modal is **not rendered** (`return null`).
- No DOM nodes, no aria-hidden baggage.
- Focus is wherever the user was.

### 2.2. Open — empty query

```
┌─────────────────────────────────────────┐
│  🔍  Search actions, shortcuts, help…   │  ← auto-focused input
├─────────────────────────────────────────┤
│  ACTIONS                                 │  ← section header
│  ┌─────────────────────────────────────┐ │
│  │ 📊  Dashboard          Ctrl+1      │ │
│  │ 📋  Streams            Ctrl+2      │ │
│  │ 👤  Recipient          Ctrl+3      │ │
│  │ 💰  Treasury           Ctrl+4      │ │
│  │ ➕  Create stream                  │ │
│  │ 🔄  Toggle theme                   │ │
│  │ 🔗  Connect wallet                 │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ⌨️  Use ↑↓ to navigate, ↵ to select    │  ← hint text
└─────────────────────────────────────────┘
```

- Search input shows placeholder: *"Search actions, shortcuts, help…"*
- Default result set: all **Actions** listed (user's top tasks at a glance).
- Keyboard hint displayed at the bottom.

### 2.3. Open — with results

```
┌─────────────────────────────────────────┐
│  🔍  stream                             │  ← query typed
├─────────────────────────────────────────┤
│  ACTIONS                                 │
│  ┌─────────────────────────────────────┐ │
│  │ 📋  Streams ↗                      │ │  ← matched because "streams" contains "stream"
│  │ ➕  Create stream                  │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  SHORTCUTS                               │
│  ┌─────────────────────────────────────┐ │
│  │ ⌘S  Save current stream            │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  HELP                                    │
│  ┌─────────────────────────────────────┐ │
│  │ ℹ️   How to create a stream?       │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- Results grouped by **section** (actions → shortcuts → help).
- Each group has a visible section header.
- Active (keyboard-focused) item highlighted with focus ring.
- Empty sections are **hidden** (if no results match in a section, the header is not rendered).

### 2.4. Open — no results

```
┌─────────────────────────────────────────┐
│  🔍  xyzzy                              │  ← query typed
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐ │
│  │  😕  No results for "xyzzy"         │ │
│  │                                     │ │
│  │  Try searching for:                 │ │
│  │  • "stream" — navigate to Streams  │ │
│  │  • "theme" — toggle light/dark     │ │
│  │  • "shortcuts" — browse all keys   │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

- Clear empty state — no dead end.
- Shows the query the user typed.
- Suggests alternative terms as clickable quick-fills: "stream", "theme", "shortcuts", "recipient", "create".

### 2.5. Item-focused (keyboard selection)

When the user presses **↑** or **↓**, the selection highlight moves:

- The **active item** gets a visible focus-ring effect (`--focus-ring-shadow`).
- The result list scrolls (if needed) to keep the active item in view — `scrollIntoView({ block: 'nearest' })`.
- The active index wraps: pressing ↓ past the last item wraps to the first; ↑ past the first wraps to the last.
- This is purely a **visual highlight**; it does not steal `document.activeElement` from the search input (so typing continues to work). The search input retains focus the entire time. The active item is tracked as an internal `activeIndex` state, not via DOM focus.

---

## 3. Grouped Result Sections — Behavior & Ranking

### 3.1. Section ordering

Results always appear in this order:

1. **Actions** — highest priority; commands and navigation
2. **Shortcuts** — keyboard-shortcut reference
3. **Help** — article lookups

When a section has **zero results** it is omitted entirely (header + list hidden).

### 3.2. Shortcuts section — replacing the old content

The **Shortcuts** section is where the old `KeyboardShortcutsModal` content lives. Instead of an isolated file with a static table, the shortcuts are defined as an array of `{ keys, label, description }` objects embedded in the component. The user can filter them by typing any part of the label, key combination, or description.

**Old → New mapping:**

| Old content | New location |
|---|---|
| Static table of all shortcuts | `SHORTCUTS` array in `KeyboardShortcutsModal.tsx` |
| No search | Searchable via the palette search input |
| No mounting point | Always accessible via Cmd/Ctrl+K |

### 3.3. Ranking within each section

For a given query string `q` (lowercased, trimmed):

1. **Exact match** — `item.label.toLowerCase() === q` (top)
2. **Prefix match** — `item.label.toLowerCase().startsWith(q)`
3. **Word-start match** — any word in `item.label` starts with `q`
4. **Substring match** — `item.label.toLowerCase().includes(q)`
5. **Description match** — `item.description?.toLowerCase().includes(q)`

Within each tier, items retain their **definition order** (deterministic).

### 3.4. Empty-query default

When the search input is empty:

- Only the **Actions** section is shown (all default actions).
- Shortcuts and Help sections are hidden (they would be too noisy).
- The user can type a character to begin filtering all sections.

---

## 4. Accessibility Annotations (WCAG 2.1 AA)

### 4.1. ARIA roles & attributes

| Element | Role / Attribute | Purpose |
|---|---|---|
| Modal container | `role="dialog"` + `aria-modal="true"` + `aria-label="Command palette"` | Identifies as a modal dialog |
| Search input | `role="combobox"` + `aria-expanded` + `aria-controls="palette-results"` + `aria-activedescendant` | Combobox pattern for search + results |
| Results container | `role="listbox"` + `id="palette-results"` | Identifies the list of selectable results |
| Each result | `role="option"` + `aria-selected` + `id` | Selectable option in the listbox |
| Section headers | `role="presentation"` or plain `<div>` | Not interactive; no special role needed |
| Close button | `aria-label="Close command palette"` | Clear purpose |
| Live region | `aria-live="polite"` on result count | Announces result count changes to screen readers |

### 4.2. Keyboard interaction map

| Key | Action |
|---|---|
| **Cmd/Ctrl+K** (global) | Open palette from anywhere |
| **Escape** | Close palette, return focus to trigger element in AppNavbar |
| **Tab** (within palette) | Move through focusable elements (input → close button → input) per `useModalAccessibility` |
| **↑ / ↓** | Move active selection highlight through the flat result list (wraps) |
| **Enter** | Activate the currently highlighted result |
| **Typing** | Filters results in real time |

### 4.3. Focus management

- On open: search input receives focus (via `initialFocusRef` in `useModalAccessibility`).
- On close: focus returns to the trigger element in `AppNavbar.tsx` (handled by `useModalAccessibility`'s `previouslyFocused` restoration).
- Arrow-key navigation does **not** move DOM focus; the search input retains `document.activeElement`. `aria-activedescendant` is updated to point to the active result's `id`.

### 4.4. Contrast requirements

| Element | Light theme | Dark theme | Ratio |
|---|---|---|---|
| Search input text | `--color-text-primary` (#1a1f36) on `--surface-base` (#ffffff) | `--text-vivid` (#e8ecf4) on `--surface-base` (#0a0e17) | ≥ 7:1 |
| Result item text (default) | `--color-text-primary` on `--surface-neutral` | `--text-vivid` on `--surface-neutral` | ≥ 7:1 |
| Result item text (active) | `--color-text-primary` on `--surface-elevated` | `--text-vivid` on `--surface-raised` | ≥ 7:1 |
| Section header text | `--color-text-tertiary` (#6b7a94) on `--surface-base` | `--text-muted` (#6b7a94) on `--surface-base` | ≥ 4.5:1 |
| Focus ring | `--focus-ring-color` (#0ea5e9) | `--focus-ring-color` (#00d4aa) | ≥ 3:1 (non-text) |
| Empty-state text | `--color-text-tertiary` | `--text-muted` | ≥ 4.5:1 |

---

## 5. Design Tokens Reference

### 5.1. Layout & spacing

| Token / Value | Where used |
|---|---|
| `--space-sm` (8px) | Gap between icon and label in result items |
| `--space-md` (12px) | Result item padding (vertical), gap between items |
| `--space-lg` (16px) | Search input padding, section header bottom margin |
| `--space-xl` (24px) | Modal padding (mobile), gap between sections |
| `--space-2xl` (32px) | Modal padding (desktop) |
| `--radius-md` (8px) | Search input, result items |
| `--radius-xl` (16px) | Modal container |

### 5.2. Typography

| Token | Used for |
|---|---|
| `--font-body-lg` (400 16px/24px) | Search input text |
| `--font-body-md` (400 14px/20px) | Result item label |
| `--font-body-sm` (400 12px/16px) | Result item description, section header |
| `--font-label-sm` (500 11px/14px) | Keyboard-shortcut badge text, keyboard hint |
| `--font-mono-sm` (400 12px/16px) | Key-combination display in shortcut items |

### 5.3. Color (light theme)

| CSS variable | Hex | Role |
|---|---|---|
| `--surface-base` | #ffffff | Modal background |
| `--surface-neutral` | #fafbfc | Result item default bg |
| `--surface-elevated` | #f0f3f7 | Result item active/hover bg |
| `--surface-raised` | #e8ecf1 | Section header bg |
| `--focus-ring-color` | #0ea5e9 | Active result focus ring |
| `--color-border-default` | #e0e6ed | Input border, item borders |
| `--color-text-primary` | #1a1f36 | Primary text |
| `--color-text-tertiary` | #6b7a94 | Section headers, descriptions |

### 5.4. Color (dark theme)

| CSS variable | Hex | Role |
|---|---|---|
| `--surface-base` | #0a0e17 | Modal background |
| `--surface-neutral` | #121a2a | Result item default bg |
| `--surface-elevated` | #151e2e | Result item hover bg |
| `--surface-raised` | #192436 | Result item active bg |
| `--focus-ring-color` | #00d4aa | Active result focus ring |
| `--color-border-default` | #192436 | Input border, item borders |
| `--color-text-primary` | #e8ecf4 | Primary text |
| `--color-text-tertiary` | #6b7a94 | Section headers, descriptions |

### 5.5. Shadows & transitions

| Token | Where |
|---|---|
| `--shadow-xl` | Modal container elevation |
| `--focus-ring-shadow` | Active result item "selected" state |
| `--transition-base` | Item hover, focus transitions |
| `prefers-reduced-motion` | All animations disabled |

---

## 6. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| ≥ 768px (tablet/desktop) | Centered modal, `max-width: 640px`, padding `var(--space-2xl)` |
| < 768px (mobile) | Near-full-screen sheet: `max-width: 100%`, `height: 100dvh`, `border-radius: 0`, padding `var(--space-xl)`. Search input at top, results fill remaining space with scroll. |

### Mobile sheet specifics

- The backdrop is still present (tap to close).
- Modal fills the entire viewport height (`100dvh`) — no scrolling behind.
- The search input stays pinned at the top (not in a scroll container).
- The results area scrolls independently below the input.
- Close button remains in the top-right corner.

---

## 7. Edge Cases

| Situation | Behavior |
|---|---|
| Very long query (> 50 chars) | Input scrolls horizontally; no truncation. |
| Many results (50+) | Results container scrolls; max-height `60vh` (desktop) / fill remaining (mobile). First item auto-selected for keyboard nav. |
| Rapid typing | Debounce not needed — filtering is synchronous (client-side, small dataset). |
| No JavaScript | Modal not rendered (progressive enhancement: the Cmd/Ctrl+K shortcut and button are inert). |
| Screen reader + palette open | `aria-live` region announces result count on each keystroke. |
| User tabs away from input then presses ↓ | ↓ activates on last-used palette if palette is open; no cross-app confusion. |
| Cmd+K vs Ctrl+K | macOS: `metaKey`; Windows/Linux: `ctrlKey`. Both listened to via the modifier check `(e.metaKey || e.ctrlKey) && e.key === 'k'`. |

---

## 8. Engineering Hand-off Notes

### 8.1. What is fully implemented

- `src/components/KeyboardShortcutsModal.tsx` — complete command palette component with search, 3 result sections, keyboard navigation, all accessibility requirements.
- `src/components/KeyboardShortcutsModal.module.css` — full stylesheet with responsive breakpoints, themes, animations, high-contrast support.
- `src/components/navigation/AppNavbar.tsx` — trigger button with "⌘K" badge, global Cmd/Ctrl+K listener, modal state management.

### 8.2. What is spec-only / future

- Help-article search results are **static suggestions** (no CMS-backed article database yet). The data structure supports linking to real help articles when available.
- Analytics tracking (e.g., which actions users search for most) is not implemented but the `onActivate` callbacks are easy to instrument.
- The `SHORTCUTS` array and `HELP_ARTICLES` arrays can be moved to a shared data module or fetched from an API in the future without changing the component's rendering logic.

### 8.3. Key integration points

- **`useModalAccessibility`**: imported from `../useModalAccessibility`. Handles focus trap, body scroll lock, Escape close, focus restoration.
- **`useNavigate`**: from `react-router-dom` — used for all navigation actions.
- **`useTheme`**: from `../theme/ThemeProvider` — used for the "Toggle theme" action.
- **`useWallet`**: from `../components/wallet-connect/Walletcontext` — used for "Connect wallet" action.
- **Lucide icons**: `Search`, `ArrowRight`, `Keyboard`, `Monitor`, `Sun`, `Moon`, `Layout`, `Layers`, `Users`, `Wallet`, `Plus`, `FileText`, `Sparkles` — all already in the project's `lucide-react` dependency.

### 8.4. Test coverage

Test files live at `src/components/__tests__/`. Recommended tests:

- Modal opens/closes on Cmd/Ctrl+K and button click
- Arrow keys move active selection
- Enter activates the selected item
- Escape closes and returns focus to trigger
- Search filters results
- Empty query shows default actions only
- No-results state renders correctly
- Focus is trapped within modal
- Returns null when `isOpen` is false

---

## 9. Keyboard Walkthrough

1. **User presses Cmd+K** (or clicks the "Search… ⌘K" button in the navbar header).
2. The command palette opens. Focus moves to the search input. The results list shows default Actions.
3. **User types "str"** — results filter in real-time: "Streams" action and "Create stream" action appear under Actions; relevant shortcuts appear under Shortcuts.
4. **User presses ↓** — the active highlight moves from the first result to the second result. `aria-activedescendant` on the input updates to the second item's `id`.
5. **User presses ↓ again** — the highlight moves to the third result (or wraps to the first if at the end).
6. **User presses Enter** — the highlighted action activates: navigates to Streams (or performs the command). The palette closes. Focus returns to the trigger button in `AppNavbar.tsx`.
7. **User presses Cmd+K again** — palette re-opens.
8. **User presses Escape** — palette closes. Focus returns to the trigger button.
