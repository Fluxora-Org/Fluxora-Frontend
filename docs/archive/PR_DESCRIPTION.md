# Assert monthly summary figures reconcile with the underlying stream records

## Description
This PR fixes a reporting bug where monthly summary aggregates could disagree with the sum of their underlying source rows due to late rounding. It also introduces a `fast-check` property test to mathematically assert this reconciliation over generated stream data.

### Issue
Aggregates that disagree with the records beneath them are the hardest class of reporting bugs to notice. Nothing previously asserted that the monthly summary figures reconciled precisely with their source rows, leading to potential off-by-one or rounding disparities in the printed monthly summaries.

## Changes
- **Fixed aggregation rounding in `src/utils/monthlySummary.ts`**: `computeMonthlySummary` now rounds the prorated `amountStreamed` *before* pushing it into `perStream` and before accumulating it into `totalStreamed`. This ensures the overall `totalStreamed` strictly equals the sum of `amountStreamedInMonth` displayed in individual rows.
- **Added Property Tests (`src/utils/monthlySummary.test.ts`)**: Added a robust property test utilizing `fast-check`. It generates random mock `StreamRecord` items with arbitrary dates, rates, and timeline events, and dynamically computes the monthly summary to assert that `totalStreamed` and `totalWithdrawn` consistently match the exact sum of the rows over hundreds of randomized permutations.

## Acceptance Criteria Met
- [x] Each summary figure equals the sum of its source rows.
- [x] Period boundaries are inclusive as documented.
- [x] Streams spanning a boundary are apportioned consistently.
- [x] A property test asserts reconciliation across generated data.

## Testing
1. Run `npm run test` or `npx vitest run src/utils/monthlySummary.test.ts` to execute the property tests.
2. Verify the fast-check assertions pass successfully. 
3. Run the application via `npm run dev` and navigate to the Recipient portal to view a monthly summary, ensuring the totals printed in the footer exactly match the column values.
