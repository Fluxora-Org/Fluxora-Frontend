# Add an end-to-end test covering the CSV batch import flow

Closes #1765

## Description

Adds Playwright coverage for the CSV batch import flow from the Streams page.
The tests cover:

- Uploading a valid CSV and reaching dry-run review with aggregate totals.
- Uploading a CSV containing an invalid row and verifying the row is marked
  for attention and batch submission remains disabled.
- Running the flow in CI with deterministic mock/demo configuration.