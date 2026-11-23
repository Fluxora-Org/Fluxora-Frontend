Description
This is a UI/UX design task. src/utils/contrastUtils.ts exports contrastRatio()/getContrastRatio() computing WCAG relative luminance from hex pairs, but nothing in the app currently surfaces this to a user in real time. Design an inline contrast indicator for any future user-selectable color field (starting with a proposed stream "label color" swatch picker in src/components/CreateStreamModal.tsx) that reads live off contrastUtils.ts and warns before a low-contrast value can be saved.

Requirements and context
Design the swatch picker, live ratio readout ("4.6:1 — Pass AA"), and the blocked/warning state below 4.5:1
Specify how the indicator recomputes against both --color-bg-primary (light) and --color-bg-primary (dark) when the swatch is chosen
Define copy for the "Use anyway" override affordance and its own accessible warning semantics
Must be accessible, tested, and documented
Should be efficient and easy to review
Suggested execution
Fork the repo and create a branch

git checkout -b design/create-stream-live-contrast-check
Implement changes

Design specs: swatch picker, ratio badge, pass/fail color coding (not color-only — include text + icon)
Define states: AA-pass, AA-fail-blocked, AA-fail-overridden, no-selection
Accessibility annotations: aria-live="polite" region for ratio updates, role="alert" on block state
Update/Write: src/components/CreateStreamModal.tsx, src/utils/contrastUtils.ts (usage docs)
Add documentation: docs/LIVE_CONTRAST_CHECK_SPEC.md
Test and commit
Contrast check: verify the indicator's own text/background meets 4.5:1 in both pass and fail states
Keyboard walkthrough: swatch picker reachable and operable via arrow keys, ratio announced to screen readers on change
Responsive review: picker layout on mobile CreateStreamModal viewport
Include annotated screenshots/redlines in the PR
Example commit message

design: spec live contrast-check UX using contrastUtils
Guidelines
WCAG 2.1 AA compliance required
Deliver a spec ready for engineering hand-off (states, tokens, redlines annotated)
Timeframe: 96 hours
