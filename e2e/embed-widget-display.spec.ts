/**
 * End-to-end coverage for the embedded stream widget display flow.
 *
 * Route under test: `/embed/streams/:streamId` → `EmbedStreamWidget`.
 * Playwright starts Vite with `VITE_USE_MOCKS=true`, so known ids resolve from
 * `src/data/streamRecords.ts` without a live backend.
 *
 * Assertions stay on user-visible roles and copy (no component internals).
 * Covers the success path and the primary failure (unknown stream id).
 */
import { expect, test } from "@playwright/test";

const KNOWN_STREAM_ID = "STR-001";
const KNOWN_STREAM_NAME = "Dev Grant - Alice";
const UNKNOWN_STREAM_ID = "STR-DOES-NOT-EXIST";

test.describe("embedded widget display flow", () => {
  test("success path shows the known stream card widget", async ({ page }) => {
    await page.goto(`/embed/streams/${KNOWN_STREAM_ID}`, {
      waitUntil: "domcontentloaded",
    });

    const widget = page.getByRole("article", {
      name: new RegExp(`Stream widget:\s*${KNOWN_STREAM_NAME}`, "i"),
    });
    await expect(widget).toBeVisible();

    await expect(
      page.getByRole("heading", { level: 1, name: KNOWN_STREAM_NAME }),
    ).toBeVisible();

    await expect(
      page.getByRole("status", { name: "Stream status: Active" }),
    ).toBeVisible();
    await expect(widget.getByText(/Payment Rate/i)).toBeVisible();
    await expect(widget.getByText(/5,?000\s*USDC\/month/i)).toBeVisible();
    await expect(page.getByText(/Powered by Fluxora/i)).toBeVisible();
  });

  test("success path honors compact preset query param", async ({ page }) => {
    await page.goto(`/embed/streams/${KNOWN_STREAM_ID}?preset=compact`, {
      waitUntil: "domcontentloaded",
    });

    // Compact layout has no title heading; identify via article aria-label.
    const widget = page.getByRole("article", {
      name: new RegExp(`Stream widget:\s*${KNOWN_STREAM_NAME}`, "i"),
    });
    await expect(widget).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Stream status: Active" }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: /Stream progress:\s*40%/i }),
    ).toBeVisible();
    await expect(widget.getByText("Fluxora", { exact: true })).toBeVisible();
  });

  test("primary failure shows unavailable state for unknown stream", async ({
    page,
  }) => {
    await page.goto(`/embed/streams/${UNKNOWN_STREAM_ID}`, {
      waitUntil: "domcontentloaded",
    });

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/Stream unavailable/i);
    await expect(alert).toContainText(/Stream not found/i);
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: KNOWN_STREAM_NAME }),
    ).toHaveCount(0);
  });
});
