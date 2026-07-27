Description
This is a UI/UX design task. Recipient.tsx shows the current withdrawable balance and RecipientStreams.tsx's live list, but a recipient has no way to produce a month-end summary of what streamed in for bookkeeping. Design a "Print monthly summary" view (a dedicated @media print stylesheet, not a screenshot) listing per-stream totals for a selected month alongside the aggregate withdrawn/accrued figures.

Requirements and context
Design the print-optimized layout: single-column, no navigation chrome, high-contrast black-on-white, page-break rules between sections
Design the on-screen month-picker that generates the print view
Specify how currently-accruing (not-yet-withdrawn) amounts are labeled distinctly from finalized withdrawals in the printed summary
Must be accessible, tested, and documented
Should be efficient and easy to review
Suggested execution
Fork the repo and create a branch

git checkout -b design/recipient-printable-monthly-summary
Implement changes

Design specs: @media print stylesheet rules, month-picker control, print-preview trigger button
Define states: month-with-activity, month-with-no-activity, current-partial-month (mid-accrual), printing
Accessibility annotations: printed output retains semantic table markup so it remains screen-reader/PDF-accessible when saved as PDF
Update/Write: src/pages/Recipient.tsx, src/pages/Recipient.css
Add documentation: docs/RECIPIENT_PRINTABLE_SUMMARY_SPEC.md
Test and commit
Contrast check: printed black-on-white text meets 4.5:1 (WCAG 2.1 AA applies to print output too)
Keyboard walkthrough: month-picker and "Print" trigger fully keyboard-operable
Responsive review: on-screen print-preview reflows correctly at mobile widths before printing
Include annotated screenshots/redlines in the PR
Example commit message

design: spec printable monthly streaming summary for recipients
Guidelines
WCAG 2.1 AA compliance required
Deliver a spec ready for engineering hand-off (states, tokens, redlines annotated)
Timeframe: 96 hours