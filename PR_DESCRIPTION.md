## Documentation: clarify rendering verification scope

## Summary

This PR updates `PR_DESCRIPTION.md` with the rendering policy and verification
evidence associated with the documentation review.

This PR changes only `PR_DESCRIPTION.md`. It does not contain the rendering
implementation or regression tests required by #1443, and it is not the issue
deliverable for #1443. Those changes must remain in a separate implementation
PR.

## Changes

- Documented the intended rendering policy for long recipient addresses, large
  amounts, narrow layouts, and zoom behavior.
- Recorded the verification evidence supplied for the policy review.
- Clarified that implementation and regression-test work for #1443 belongs in a
  separate PR.

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

This PR adds no implementation or regression tests. The rendering behavior and
regression coverage described below are requirements for the separate #1443
implementation PR, not deliverables of this documentation PR.

Responsive CSS media-query behavior is not fully measurable in jsdom; the
responsive policy is documented in the relevant spec and covered by browser
test/manual verification requirements.

## Verification Evidence

Commands documented or previously run for the rendering work:

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
