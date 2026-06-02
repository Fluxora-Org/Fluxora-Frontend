StatusPill Design Spec

Overview

The StatusPill component provides a compact, accessible visual indicator combining color, icon, and text so that status and health are perceivable without relying on color alone.

States

- Active — icon: Play — token: `--status-success`, bg `--status-success-bg`
- Paused — icon: Pause — token: `--status-warning`, bg `--status-warning-bg`
- Completed — icon: CheckCircle — token: `--status-info`, bg `--status-info-bg`
- Healthy — icon: Heart — token: `--status-success`, bg `--status-success-bg`
- At-Risk — icon: AlertTriangle — token: `--status-warning`, bg `--status-warning-bg`
- Critical — icon: XCircle — token: `--status-error`, bg `--status-error-bg`

Design tokens

New semantic tokens were added to `src/design-tokens.css`:

- `--status-success`, `--status-warning`, `--status-error`, `--status-info`
- `--status-*-bg` counterparts for subtle background tints

Accessibility

- Text labels are always present (e.g. "ACTIVE"), so status is not conveyed by color alone (WCAG 1.4.1).
- Pill uses `role="status"` and an explicit `aria-label` (e.g. "Active status").
- The pill is keyboard-focusable (`tabindex=0`) and can be focused for keyboard users.
- Ensure contrast checks for text: tokens are chosen to provide legible contrast against the background tints; verify per-theme (light/dark) at 4.5:1 for label text where possible. For UI icons, 3:1 is recommended.

States: interaction & variants

- Default: shown label + icon
- Hover/focus: rely on existing component focus rings; pill is focusable for keyboard navigation
- Disabled/loading/empty/error: not implemented here — treat as future extension; use `aria-disabled` and visible label text for those states.

Notes for reviewers

- The component centralizes status visuals for treasury overview; other local `StatusPill` helpers in other pages can be migrated to this central component for consistency.
- Tests were updated to assert presence of icon and semantic tokens (See `StatusPill.test.tsx`).

Responsive behavior

- The pill uses compact spacing and a 14px icon; it scales naturally with text-size. On very narrow layouts, consider hiding the label and exposing the full label via `aria-label` and tooltip — not implemented here.

Accessibility checklist (manual)

- [ ] Contrast checks at breakpoints (320 / 375 / 768 / 1024)
- [ ] Keyboard-only walkthrough
- [ ] Screen reader validation

