Description
This is a UI/UX design task. src/components/CreateStreamModal.tsx tracks currentStep (1-3) internally with only a code comment ({/* Progress: Step 1 Recipient & amount, Step 2 Rate & schedule, Step 3 Review & create */}) documenting the three stages, with no visible numbered/labeled stepper shown to the user beyond whatever minimal progress UI exists today. Design an explicit, always-visible stepper header (1. Recipient & amount → 2. Rate & schedule → 3. Review & create) showing completed/current/upcoming steps.

Requirements and context
Design the stepper's visual states (completed with checkmark, current, upcoming/disabled) using --color-accent-secondary/--color-border-default tokens
Design click-back-to-a-completed-step behavior (jumping back via the stepper vs. only the "Back" button)
Specify the compact/mobile stepper variant (e.g. "Step 2 of 3" text plus a progress bar) for narrow modal widths
Must be accessible, tested, and documented
Should be efficient and easy to review
Suggested execution
Fork the repo and create a branch

git checkout -b design/create-stream-progress-stepper
Implement changes

Design specs: desktop numbered stepper, mobile compact progress-bar variant, completed/current/upcoming step states
Define states: step-1-active, step-2-active (step-1-completed), step-3-active (steps-1-2-completed), step-clicked-back
Accessibility annotations: stepper marked up as an ordered
with aria-current="step" on the active item
Update/Write: src/components/CreateStreamModal.tsx
Add documentation: docs/CREATE_STREAM_PROGRESS_STEPPER_SPEC.md
Test and commit
Contrast check: completed/current/upcoming step indicators meet 4.5:1 text / 3:1 non-text contrast in both themes
Keyboard walkthrough: completed steps are keyboard-focusable and activatable to jump back; upcoming steps are not focusable
Responsive review: compact mobile variant verified at 320px and 375px
Include annotated screenshots/redlines in the PR
Example commit message

design: spec form-progress stepper header for create-stream modal
Guidelines
WCAG 2.1 AA compliance required
Deliver a spec ready for engineering hand-off (states, tokens, redlines annotated)
Timeframe: 96 hours
