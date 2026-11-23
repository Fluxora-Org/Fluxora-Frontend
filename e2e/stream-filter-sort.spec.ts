/**
 * e2e: stream filtering and sorting flow — issue #1773
 *
 * Covers the path a user actually takes through the Streams list:
 *
 *   - Success path: narrow the list with the status buttons and the search
 *     box, then re-order it with the sort selector, asserting the exact
 *     card order the flow produces.
 *   - Primary failure: a query that matches nothing shows the empty state,
 *     and the "Clear filters" recovery action brings every stream back.
 *
 * Assertions only use user-visible roles, labels and text — the list is read
 * through its `role="list"` container (`aria-label="Stream cards"`) and each
 * row through its card heading. No component internals, no direct calls into
 * `streamFilterParams.ts` or `streamSorting.ts`.
 *
 * The suite runs against the seeded demo dataset (`src/data/streamRecords.ts`)
 * served in mock mode, so the expected order is deterministic:
 *
 *   recent → Marketing Budget, Dev Grant - Alice, Core Contributor, Community Rewards
 *   name   → Community Rewards, Core Contributor, Dev Grant - Alice, Marketing Budget
 *   rate   → Core Contributor, Dev Grant - Alice, Marketing Budget, Community Rewards
 *
 * `/app/*` routes are guarded; the Playwright config boots the dev server with
 * `VITE_E2E=true`, which makes the guards pass through so the flow is reachable
 * without a real wallet extension.
 */

import { expect, test, type Page } from "@playwright/test";

const LIST_LABEL = "Stream cards";

const STATUS_FILTERS = "Filter streams by status";
const SEARCH_LABEL = "Search streams by name, ID or recipient";
const SORT_LABEL = "Sort streams";

const RECENT_ORDER = [
  "Marketing Budget",
  "Dev Grant - Alice",
  "Core Contributor",
  "Community Rewards",
];
const NAME_ORDER = [
  "Community Rewards",
  "Core Contributor",
  "Dev Grant - Alice",
  "Marketing Budget",
];
const RATE_ORDER = [
  "Core Contributor",
  "Dev Grant - Alice",
  "Marketing Budget",
  "Community Rewards",
];

/** Card headings of the rendered streams list, in DOM order. */
function streamNames(page: Page) {
  return page
    .getByRole("list", { name: LIST_LABEL })
    .getByRole("heading", { level: 3 });
}

function statusButton(page: Page, name: string) {
  return page.getByRole("group", { name: STATUS_FILTERS }).getByRole("button", {
    name,
    exact: true,
  });
}

/** Opens the stream list and waits for the default (most-recent) ordering. */
async function openStreamList(page: Page) {
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { level: 1, name: "Streams" }),
  ).toBeVisible();
  await expect(streamNames(page)).toHaveText(RECENT_ORDER);
}

test.describe("stream filtering and sorting flow", () => {
  test("filters the list by status and search", async ({ page }) => {
    await openStreamList(page);

    // Status filter narrows to a single stream.
    await statusButton(page, "Paused").click();
    await expect(streamNames(page)).toHaveText(["Core Contributor"]);

    // Switching status re-filters from the same full dataset.
    await statusButton(page, "Active").click();
    await expect(streamNames(page)).toHaveText([
      "Marketing Budget",
      "Dev Grant - Alice",
    ]);

    // Search narrows within the active status filter.
    await page.getByLabel(SEARCH_LABEL).fill("alice");
    await expect(streamNames(page)).toHaveText(["Dev Grant - Alice"]);

    // Clearing the search restores the status-filtered list.
    await page.getByLabel(SEARCH_LABEL).fill("");
    await expect(streamNames(page)).toHaveText([
      "Marketing Budget",
      "Dev Grant - Alice",
    ]);

    // "All" restores every stream in the default order.
    await statusButton(page, "All").click();
    await expect(streamNames(page)).toHaveText(RECENT_ORDER);
  });

  test("re-orders the list with every supported sort mode", async ({ page }) => {
    await openStreamList(page);

    const sort = page.getByLabel(SORT_LABEL);

    await sort.selectOption("name");
    await expect(streamNames(page)).toHaveText(NAME_ORDER);

    await sort.selectOption("rate");
    await expect(streamNames(page)).toHaveText(RATE_ORDER);

    await sort.selectOption("recent");
    await expect(streamNames(page)).toHaveText(RECENT_ORDER);
  });

  test("shows the empty state when nothing matches and clears it", async ({
    page,
  }) => {
    await openStreamList(page);

    await page.getByLabel(SEARCH_LABEL).fill("no-such-stream-zzz");

    const emptyState = page.getByRole("region", {
      name: "Search no results state",
    });
    await expect(emptyState).toBeVisible();
    await expect(
      emptyState.getByRole("heading", { name: "No results found" }),
    ).toBeVisible();
    await expect(streamNames(page)).toHaveCount(0);

    await emptyState.getByRole("button", { name: "Clear filters" }).click();
    await expect(streamNames(page)).toHaveText(RECENT_ORDER);
  });
});
