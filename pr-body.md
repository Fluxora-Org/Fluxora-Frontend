## Overview

This PR implements per-route JavaScript bundle budgeting to prevent heavy dependencies added to one route from degrading load time for that route without any signal.

## Related Issue

Closes [#1715](https://github.com/Fluxora-Org/Fluxora-Frontend/issues/1715)

## Changes

### 📦 Per-Route Bundle Budgets

- **`src/lib/routeChunks.ts`**: Added `ROUTE_BUDGETS` constant with gzip byte budgets for each lazy-loaded route, plus `assertRouteBudgetsComplete()` validation
- **`scripts/route-budgets.json`**: JSON configuration file for CI-friendly budget thresholds
- **`scripts/bundle-size-report.mjs`**: Enhanced to:
  - Load per-route budgets from JSON
  - Report route chunk sizes with budget comparison (✓ OK / ✗ OVER BUDGET)
  - Exit with code 1 when `--fail` flag is used and any route exceeds budget
  - Added "Heaviest routes" summary table ranked by gzip size with % of total JS
  - Fixed chunk name extraction to handle multi-dash route names (e.g., `app-stream-detail`)

### 🔧 Bug Fixes (Pre-existing TypeScript Errors)

Fixed several pre-existing build blockers to enable successful compilation:
- Fixed duplicate imports in `src/App.tsx`
- Fixed duplicate function declaration in `src/components/voice/VoiceContext.tsx`
- Added missing imports in `src/pages/Dashboard.tsx` and `src/components/TreasuryOnboarding.tsx`
- Fixed csv-upload type issues in `src/components/csv-upload/`

## Verification

```bash
# Build and run size check (fails if any route exceeds budget)
npm run size-check

# Report only
npm run build:report
```

**Example output:**

```
Route chunk sizes (with per-route budgets)
=========================================
| Chunk              | Raw      | Gzip     | Budget   | Status |
| app-dashboard      | 283.31 kB | 73.25 kB | 120.00 kB | ✓ OK   |
| app-streams        | 92.33 kB  | 26.62 kB | 40.00 kB  | ✓ OK   |
| app-stream-detail  | 32.55 kB  | 9.24 kB  | 15.00 kB  | ✓ OK   |
| app-recipient      | 45.68 kB  | 12.27 kB | 20.00 kB  | ✓ OK   |
| app-treasury       | 32.29 kB  | 9.18 kB  | 15.00 kB  | ✓ OK   |
| app-empty-state... | 0.04 kB   | 0.05 kB  | 5.00 kB   | ✓ OK   |
| app-embed-stream   | 19.95 kB  | 6.12 kB  | 10.00 kB  | ✓ OK   |

Heaviest routes (by gzip size)
===============================
| Rank | Chunk              | Gzip     | % of Total JS |
| 1    | app-dashboard      | 73.25 kB | 53.6%         |
| 2    | app-streams        | 26.62 kB | 19.5%         |
| ...  | ...                | ...      | ...           |
```

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| Per-route JavaScript budget recorded | ✅ Each route has defined budget in bytes |
| Exceeding it fails the build | ✅ `--fail` flag causes exit code 1 on violation |
| Report published on every run | ✅ Both `build:report` and `size-check` show detailed reports |
| Heaviest routes identified | ✅ Ranked table with gzip size and % of total JS |

## Testing

- ✅ `npm run build` - Production build succeeds
- ✅ `npm run size-check` - Budget check passes with current budgets
- ✅ All routes code-split correctly (no missing chunks)
- ✅ Budgets configurable via `scripts/route-budgets.json`