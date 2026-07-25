# Stream Detail Live Presence Design Specification

This document details the live presence system implemented on the Stream Detail page of Fluxora. The system allows users to see other active viewers in real-time, displaying details like name, initials, presence color, and duration since last active.

---

## 1. Viewer Data Shape

The core state model is transport-agnostic. The `Viewer` interface is defined as follows:

```typescript
export interface Viewer {
  id: string;               // Unique identifier (e.g. Stellar address or session UUID)
  displayName: string | null; // User's name or public label (null triggers fallback)
  initials: string;         // Max 2 uppercase characters derived from displayName or fallback
  color: string;            // Background hex color assigned from a verified palette
  lastSeen: number;         // Unix timestamp representing when the user was last active
  fadingOut?: boolean;      // Flag set to true during the 1-second fade-out period
}
```

---

## 2. Component States and Visual Behaviors

The presence layer evaluates the viewers list to render one of three states:

### 2.1. Solo Viewer (0 Other Viewers)
- **Behavior**: If the local user is the only viewer on the stream (`viewers.length === 0`), the presence badge renders nothing (no DOM node).

### 2.2. 2–3 Viewers
- **Behavior**: Renders an overlapping avatar stack representing each of the other active viewers.
- **Visual details**:
  - Each avatar is a 28px circle.
  - A text label showing the total count (e.g., "N viewing" where `N` is the total count including the local user) is displayed next to the stack.
  - White initials (up to 2 characters) are shown centered in each avatar.

### 2.3. Many Viewers (4+ Viewers)
- **Behavior**: Renders up to 3 avatars in the stack, followed by a "+N more" overflow pill (where `N` is the number of hidden viewers).
- **Overflow Pill**: A rounded pill matching the height of the avatar stack, displaying the overflow count clearly.

### 2.4. Mobile Viewport Collapse (Below `md` / 768px)
- **Behavior**: The avatar stack and overflow pill collapse.
- **Layout**: Renders a compact count-only pill: `"N viewing"` (with `var(--color-text-secondary)` text) on a `var(--color-surface-elevated)` background.

### 2.5. Tooltips on Hover
- **Behavior**: Hovering over any avatar dot displays an absolutely positioned name tooltip containing the viewer's full display name (or masked address) directly above the avatar.
- **A11y / Usability**: Tooltips are designed with `pointer-events: none` on the overlay so they never intercept clicks or keyboard focus on elements beneath them.

---

## 3. High-Contrast Color Palette

To ensure WCAG 2.1 AA compliance (contrast ratio of at least 4.5:1 against white text), the background color for initials is selected from a fixed palette of 6 colors, cycling by viewer index.

| Hex Color | Color Description | Contrast Ratio vs. White (`#ffffff`) | Status |
| :--- | :--- | :--- | :--- |
| `#b91c1c` | Dark Red | **6.5 : 1** | ✅ Compliant (>= 4.5:1) |
| `#c2410c` | Dark Orange / Rust | **5.2 : 1** | ✅ Compliant (>= 4.5:1) |
| `#15803d` | Dark Green | **5.0 : 1** | ✅ Compliant (>= 4.5:1) |
| `#0f766e` | Dark Teal | **5.5 : 1** | ✅ Compliant (>= 4.5:1) |
| `#1d4ed8` | Dark Blue | **6.7 : 1** | ✅ Compliant (>= 4.5:1) |
| `#7c3aed` | Violet / Purple | **5.8 : 1** | ✅ Compliant (>= 4.5:1) |

---

## 4. Inactivity Timeout and Smooth Fade-Out Transitions

- **Threshold**: A viewer is considered inactive if their `lastSeen` timestamp is more than 30 seconds old.
- **Fade-out Transition**: When the viewer's inactivity crosses 29 seconds:
  1. A `fadingOut: true` flag is set on the viewer object.
  2. The avatar element receives the `.fading-out` class, which transitions its CSS `opacity` from `1` to `0` over a `1s` duration.
  3. During this transition, `pointer-events: none` is applied so the element cannot be clicked or hovered.
  4. At 30 seconds, the viewer is filtered out of the array completely.
- **Heartbeat & Resets**: A `markActive()` callback is exposed by the hook. Invoking this resets the `lastSeen` timestamps of active users to keep them from timing out.

---

## 5. Accessibility (A11y) Patterns

The presence widgets are keyboard and screen-reader navigable:

### 5.1. Keyboard Navigation
- The badge is a standard interactive `<button>` (trigger).
- Pressing `Escape` closes the list dropdown and immediately returns focus to the badge trigger.
- Clicking outside the badge closes the list.
- All rows in the viewer list are focusable (`tabIndex={0}`) and accessible.

### 5.2. Screen Reader Live Announcements
- The component embeds an `aria-live="polite"` region.
- Announcements are triggered **only** for join and leave events (e.g., `"Alice joined"` or `"Alice left"`).
- It does **not** announce on cursor movements, hover events, or `lastSeen` time updates.
- Ref-based diffing tracks changes in viewer IDs between renders to prevent redundant announcements.

---

## 6. Transport-Agnostic Hook Design

The `usePresenceViewers` hook decouples the presence state machine from the underlying networking transport:
- **Simulation**: Currently, the hook manages presence in-memory using local state, timers, and intervals.
- **Future Integration**: The real WebSocket, SSE, or polling transport can easily replace this mock behavior later without modifying any UI components.
- **Local Dev Mock**: To assist development and testing without auto-populating mock data on mount in production or tests, the hook accepts an optional parameter: `__devMockViewers: Viewer[] = []`.
  - When provided, this initializes the hook with the specified mock viewers.
  - When omitted, it starts with an empty list (`[]`).
