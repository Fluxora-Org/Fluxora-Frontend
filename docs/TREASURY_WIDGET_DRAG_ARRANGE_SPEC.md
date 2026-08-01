# Spec: Treasury Metrics Grid Drag-to-Arrange Widget System

This document specifies the interaction flows, data models, keyboard controls, responsive states, and accessibility standards for the treasury metrics grid drag-and-arrange layout system.

---

## 1. Overview & Objectives

The Treasury Metrics Grid supports customizable widget layout reordering, resizing, and visibility configuration. 
- **Desktop (Mouse):** Drag widgets using their drag handles and drop them onto other cards to swap their positions. Right-click or use the action menu (`⋮`) to toggle size or hide a widget.
- **Tablet / Keyboard:** Visually hidden-until-focused keyboard "Move" buttons trigger context menus to shift layout order.
- **Mobile (Below md breakpoint):** Reorder buttons (▲/▼) render on each card to support layout modification.
- **Persistence:** Layout states synchronize automatically with `localStorage`, scoped to active freighter wallet addresses.

---

## 2. Interaction Patterns & States

The metrics cards render in one of five interactive layout states:

### A. Idle State
- Normal card representation with default styling.
- Actions menu contains:
  1. A drag handle (grip icon) that remains hidden until the card is hovered or focused.
  2. A hidden-until-focused keyboard "Move" button.
  3. A vertical ellipsis button (`⋮`) to trigger the context menu.

### B. Dragging State (Ghost Card)
- Triggered by dragging the grip handle. The card in the grid gets the `.widget-dragging` class.
- Visual: `opacity: 0.6` with standard transition animations.

### C. Valid Drop Target State
- Triggered when dragging a card over another active card slot. The target container gets the `.widget-drop-valid` class.
- Visual: 2px dashed border and a 30% opacity overlay backdrop.

### D. Invalid Drop Target State
- Triggered when dragging a card over a hidden widget placeholder in the Widget Tray. The target tray slot gets the `.widget-drop-invalid` class.
- Visual: 2px dashed red border and 10-15% opacity red background tint.

### E. Keyboard Reorder Active State
- Triggered by focusing the keyboard "Move" button and opening the directional Move context menu.

---

## 3. Data Shape & Schemas

The widget layouts are defined and structured using the following schemas in `widgetLayout.ts`:

```typescript
export type WidgetSize = "1x1" | "2x1";

export interface WidgetConfig {
  id: string;      // Slugified Metric.label (e.g. "Total Balance" -> "total-balance")
  size: WidgetSize;
  visible: boolean;
  order: number;   // Zero-based index representing grid positions
}

export interface WidgetLayout {
  version: 1;
  widgets: WidgetConfig[];
}
```

---

## 4. Accessibility (WCAG 2.1 AA Audit)

To meet the WCAG 1.4.11 non-text contrast requirement (minimum 3:1 contrast ratio against the background), the following token strategies are implemented and verified:

### A. Drag Handle Icon (`var(--color-text-secondary)`)
- **Light theme (`#4a5565` vs `#fafbfc` background):** **7.20:1** contrast.
- **Dark theme (`#b0b8c9` vs `#121a2a` background):** **8.75:1** contrast.
- Both exceed the 3:1 non-text contrast requirement.

### B. Drop Target Border (Theme-aware)
The standard accent cyan `--color-accent-primary` (`#00b8d4`) fails contrast checks against the light theme background (only 2.29:1). To resolve this, a theme-aware border token strategy is applied:
- **Light theme (`var(--color-accent-primary-dark)` / `#0097a7`):** **3.47:1** contrast.
- **Dark theme (`var(--color-accent-primary)` / `#00b8d4`):** **7.31:1** contrast.
- Both exceed the 3:1 non-text contrast requirement.

### C. Invalid Target Border (`var(--color-danger)` / `#ef4444`)
- **Light theme (`#ef4444` vs `#fafbfc` background):** **3.63:1** contrast.
- **Dark theme (`#ef4444` vs `#121a2a` background):** **4.63:1** contrast.
- Both exceed the 3:1 non-text contrast requirement.

---

## 5. Keyboard Navigation & ARIA Specifications

- **Move Trigger Button:**
  - Standard focusable `<button class="keyboard-move-btn">`. Visually hidden by default, becomes visible when keyboard focused.
  - Activating (Space / Enter) reveals the Move menu.
  - `aria-label="Move {label} widget"` gives each button a unique accessible
    name — with many widgets on the page, a bare "Move" name is
    indistinguishable to screen reader users navigating by element list.
  - `aria-haspopup="menu"` / `aria-expanded` expose the menu-trigger state.
- **Move Directional Menu:**
  - Renders menu options (Move Left / Right / Up / Down) with appropriate disabled states (e.g. Move Left is disabled for the first widget).
  - Pressing Escape closes the menu and returns focus to the trigger button.
- **ARIA Live Announcements:**
  - Layout changes are announced to screen readers using an `aria-live="polite"` region.
  - Text format: `[Widget Label] moved to position [New Index] of [Total Visible Widgets]` (e.g. `"Total Balance moved to position 2 of 6"`).
- **Roving Focus & Target Maintenance:**
  - Focus is restored to the moved card's "Move" button immediately after layout updates.

---

## 6. Storage & Session Synchronization

- **Scoped Keys:**
  - When a Freighter wallet is connected, the layout is stored under the wallet-scoped key `fluxora:treasury:widget-layout:<walletAddress>`.
  - When no wallet is connected, it falls back to the unscoped key `fluxora:treasury:widget-layout`.
- **Parsing Fallbacks:**
  - If parsing fails (malformed JSON or version mismatch), the hook logs a warning and falls back to the default order derived from the incoming `metrics` list.
- **Merging Strategy:**
  - When loading stored configs, any incoming metrics that are not in the saved configuration (e.g. from code updates) are automatically appended to the end of the visible layout. Stored configs of widgets that no longer exist in the code are filtered out.
