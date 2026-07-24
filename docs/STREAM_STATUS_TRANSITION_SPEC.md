# Stream Status Transition Specification

## 1. Overview
This specification defines the animated transitions applied to stream statuses within `StatusPill.tsx` and `StreamTimeline.tsx`. The goal is to make status changes (e.g., from "Active" to "Paused" or "Completed") noticeable through a short, purposeful animation, replacing the previous silent and instant re-render.

## 2. Design Specs & States

### 2.1 Status Pill Transition
- **Trigger**: When the `status` prop changes.
- **Animation**: The background and color transition smoothly over the specified duration. The label and icon slightly scale and cross-fade to draw attention without failing contrast requirements.
- **Keyframes**:
  - `pill-cross-fade`: Scales from 0.96 with opacity 0.5 up to scale 1 and opacity 1.0.
- **Timing Tokens**:
  - Duration: `var(--motion-duration-stream-disclosure)` (defaults to 200ms)
  - Easing: `var(--transition-base)` (defaults to `ease-in-out`)
- **Contrast Requirement**: Mid-transition frames must maintain a 4.5:1 text-to-background contrast ratio (WCAG 2.1 AA). The approach of a quick cross-fade ensures no intermediate muddy colors compromise legibility.

### 2.2 Timeline Marker Transition
- **Trigger**: When the `status` prop changes, updating the timeline segments and marker properties.
- **Animation**: 
  - The marker sweeps to its new calculated position (if the position changes).
  - The marker’s background color transitions between its default state, the completed state (green), or applies a grayscale filter for paused states.
- **State Changes**:
  - **Active → Paused**: The marker receives a 50% grayscale filter.
  - **Paused → Active**: Grayscale filter is removed, returning to full color.
  - **Active → Completed**: Marker sweeps (if progressing) and its color becomes `var(--timeline-status-completed)`.

## 3. Accessibility & Fallbacks

### 3.1 Reduced Motion (`prefers-reduced-motion`)
To respect user preferences for reduced motion:
- Movement and continuous animations (like the marker pulse) are disabled.
- Status changes trigger an instant state swap.
- Instead of a morph or sweep, a `highlight-ring-pulse` animation plays for 500ms. This provides a brief focus-ring highlight to signal the change visually without spatial movement.

### 3.2 Screen Reader Announcements
- An `aria-live="polite"` visually hidden region is included in both components.
- When the status changes, it announces the new state (e.g., "Stream status changed to Paused"), accompanying the visual animation without interrupting the user.

## 4. Implementation Details
- **Tokens Utilized**:
  - `--motion-duration-stream-disclosure`
  - `--transition-base`
- **Testing criteria**:
  - Keyboard focus must not be shifted or stolen by the transitions.
  - Mobile responsive layouts must apply identical timing without layout shifts.
