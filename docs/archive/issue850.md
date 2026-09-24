Description
This is a UI/UX design task. CreateStreamModal.tsx's three-step currentStep flow (Recipient & amount → Rate & schedule → Review & create) is fixed for every user. Design a mode toggle letting power users switch to a single-page "Advanced" form exposing every field (including cliff, custom start time) at once, while keeping the guided three-step "Wizard" mode as the default for first-time users.

Requirements and context
Design the mode-toggle control placement (modal header) and the transition between step-based and single-page layouts without losing already-entered field values
Design the Advanced-mode single-page layout grouping fields to mirror the three logical steps via section headers instead of separate screens
Specify how validation timing differs (per-step vs. all-at-once) between the two modes
Must be accessible, tested, and documented
Should be efficient and easy to review
Suggested execution
Fork the repo and create a branch

git checkout -b design/create-stream-wizard-advanced-toggle
Implement changes

Design specs: mode toggle control, Advanced single-page section layout, value-preservation transition
Define states: wizard-mode (default), advanced-mode, mode-switch-mid-entry (values retained), advanced-mode-with-errors
Accessibility annotations: mode toggle uses role="switch" with a clear accessible name; section headers in Advanced mode use proper heading hierarchy
Update/Write: src/components/CreateStreamModal.tsx
Add documentation: docs/CREATE_STREAM_WIZARD_ADVANCED_TOGGLE_SPEC.md
Test and commit
Contrast check: mode toggle track/thumb meet 3:1 non-text contrast in both themes
Keyboard walkthrough: toggle operable via Space/Enter, focus lands sensibly after switching modes
Responsive review: Advanced single-page mode remains usable (not just wizard mode) down to 375px width
Include annotated screenshots/redlines in the PR
Example commit message

design: spec wizard vs advanced mode toggle for create-stream
Guidelines
WCAG 2.1 AA compliance required
Deliver a spec ready for engineering hand-off (states, tokens, redlines annotated)