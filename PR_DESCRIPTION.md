## Closes #1133 - Document CSV preview validation and rendering edge cases

## Summary

This PR documents the CSV preview validation behavior and locks down the
regression surface around empty values, long recipient addresses, large token
amounts, keyboard interaction, modal replacement, and responsive rendering.

No production component behavior is changed by the CSV documentation and test
updates.

## Changes

- Added `docs/CSV_UPLOAD_PREVIEW_VALIDATION_SPEC.md` as the behavior reference
  for `PreviewValidateStep`.
- Updated `src/components/csv-upload/__tests__/PreviewValidateStep.test.tsx`
  with edge-case and interaction coverage, including the real `ConfirmModal`
  path instead of a stale `window.confirm` mock.
- Added/retained regression coverage for exact large-amount formatting,
  address shortening, and 400% zoom overflow protection in the formatter and
  treasury overview tests.
- Updated this PR description with the rendering policy and verification
  evidence.

## Rendering Policy

### Long recipient addresses

- Keep the complete address in the DOM and accessible name/title where the
  component exposes it.
- Use a shortened visual label for long addresses so tables and flow diagrams
  remain legible: the treasury flow label keeps the first six characters and
  last four characters, separated by `...` (for example,
  `GAJCGN...CA3P`).
- Short recipient labels are rendered unchanged.
- A truncated label is presentation only; it must not replace the full value
  used for identification, interaction, or assistive technology.

### Large amounts

- Use grouping separators and the component's normal asset suffix when
  rendering amounts.
- Integer amounts beyond `Number.MAX_SAFE_INTEGER` must be supplied to
  `formatTokenAmount` as `bigint` or a decimal string. This preserves every
  digit, including values such as `9007199254740993` and `10^20`.
- Plain-number formatters reject unsafe integer inputs with `RangeError`
  rather than displaying a silently rounded value. Safe integers and ordinary
  fractional display amounts continue to use the existing number formatters.

### Narrow layouts and zoom

- The CSV preview table remains horizontally scrollable when its natural width
  exceeds the viewport; keyboard scrolling is preserved.
- At 400% zoom, the treasury streams table reflows to stacked cards below the
  container threshold instead of forcing page-wide horizontal scrolling.
- Long metric and amount values wrap within their container. No value is
  hidden solely to make the layout fit.

## Regression Coverage

The relevant tests cover:

- CSV preview empty rows, empty cells, status combinations, multiple field
  errors, review gating, inline edit save/cancel/keyboard flows, skip actions,
  live-region announcements, and Replace CSV confirm/cancel/Escape behavior.
- Long-address shortening with the full recipient value retained, including
  the boundary between long and short labels.
- Exact large-amount output at and beyond `Number.MAX_SAFE_INTEGER` using
  `bigint` and decimal-string inputs; rejection of unsafe integer `number`
  inputs; decimal shifting; grouping; and negative/zero values.
- Metric-card overflow-safe styles and treasury table behavior at narrow
  widths/400% zoom.

Responsive CSS media-query behavior is not fully measurable in jsdom; the
responsive policy is documented in the relevant spec and covered by browser
test/manual verification requirements.

## Verification Evidence

Commands run from the repository root:

| Check | Result |
|---|---|
| `pnpm exec vitest run src/lib/__tests__/formatters.largeamounts.test.ts src/components/treasuryOverviewPage/__tests__/TreasuryFlowSankey.test.tsx src/components/treasuryOverviewPage/__tests__/Metrics.test.tsx` | **94 passed** across 3 files |
| `pnpm exec vitest run` | **2693 passed, 19 skipped** across 183 files |
| `pnpm build` | **Passed**: TypeScript build and Vite production bundle completed. Vite emitted an existing circular-chunk warning. |
| `pnpm lint` | **Fails on existing repository errors** outside this PR's touched rendering tests/components, including unrelated e2e, provider, receipt, and data files. |

The focused lint invocation for the rendering implementation completed with no
errors; it reported only the existing Fast Refresh warning in
`TreasuryFlowSankey.tsx` and ignored-test-file warnings.

## Reviewer Checklist

- [ ] Review the rendering policy against the formatter and treasury flow
      implementation.
- [ ] Run the focused regression command above.
- [ ] Review the full-suite result and the unrelated lint baseline.
- [ ] Verify responsive behavior in a browser at narrow width and 400% zoom.
