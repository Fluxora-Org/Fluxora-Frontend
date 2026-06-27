## Summary

<!-- What does this PR change and why? -->

## Changes

<!-- List the key changes made. -->

## Test plan

- [ ] `npm run build` passes (type-check + production build)
- [ ] `npm run test` passes (all unit tests green)
- [ ] `npm run test:coverage` passes (statements/branches/functions/lines ≥ 95%)
- [ ] New code is covered by tests; the coverage include list in `vitest.config.ts` is expanded if new production modules are added

## Coverage gate

CI enforces **95% coverage thresholds** (statements, branches, functions, lines) via
the `coverage` job in `.github/workflows/ci.yml`. The job runs `npm run test:coverage`
and fails the PR check when any threshold is missed. The coverage report is uploaded
as a build artifact for every run.

To add a new production file to the coverage baseline, append it to the `include`
array in `vitest.config.ts` and ensure tests cover it before opening the PR.
