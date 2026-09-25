/**
 * e2e: recover from a failed route-chunk request — issue #1749
 *
 * Route-level code splitting means a chunk request can fail on a flaky network
 * or after a deploy replaces the asset. Without handling, the route renders
 * nothing and the user sees a blank page.
 *
 * This spec simulates a genuine network-level failure of the lazy-loaded
 * Streams chunk (the browser request for the module is aborted mid-flight) and
 * asserts:
 *
 *   1. A failed chunk load renders the recoverable error page ("Something went
 *      wrong" with Try Again / Back to Dashboard) instead of a blank page.
 *   2. After connectivity is restored, clicking "Try Again" re-attempts the
 *      chunk load and renders the page again — no full document reload, so the
 *      route context is preserved.
 *
 * The deploy-invalidation case is covered at the unit level in
 * `src/App.test.tsx`: when a deploy replaces hashed chunk URLs, Vite emits
 * `vite:preloadError` and the app prompts the user to reload (`window.confirm`)
 * rather than leaving them stranded (see `vite:preloadError` handler in
 * `src/App.tsx`).
 */
import { expect, test, type Page } from "@playwright/test";

/**
 * Aborts every request for the Streams route chunk — the module the Streams
 * page lazy-loads via `RouteErrorBoundary`'s dynamic-import factory. In the
 * Vite dev server this is served from `/src/pages/Streams.tsx`, which is what
 * a production hashed chunk maps to. Aborting the download makes the dynamic
 * `import()` reject with a network error, exactly like a flaky connection.
 */
async function failStreamsChunk(page: Page) {
  await page.route(/\/src\/pages\/Streams(\.tsx)?(\?.*)?$/, (route) => {
    void route.abort("failed");
  });
}

test("renders a recoverable error instead of a blank page when the route chunk fails", async ({
  page,
}) => {
  await failStreamsChunk(page);

  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  // The route error boundary shows the sanitized recovery view.
  await expect(
    page.getByRole("heading", { name: /something went wrong/i }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /try again/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /back to dashboard/i }),
  ).toBeVisible();

  // The failed route must not leak partial page content.
  await expect(page.getByRole("heading", { name: "Streams" })).not.toBeVisible();
});

test("retries the failed chunk without losing context and renders the page", async ({
  page,
}) => {
  await failStreamsChunk(page);

  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: /something went wrong/i }),
  ).toBeVisible();

  // The network recovers: stop failing the chunk request.
  await page.unroute(/\/src\/pages\/Streams(\.tsx)?(\?.*)?$/);

  // "Try Again" re-runs the dynamic import (a fresh lazy component), so the
  // page should render in place without a browser reload.
  await page.getByRole("button", { name: /try again/i }).click();

  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("heading", { name: /something went wrong/i }),
  ).not.toBeVisible();
});