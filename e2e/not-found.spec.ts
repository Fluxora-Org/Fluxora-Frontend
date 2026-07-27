/**
 * Playwright e2e tests for the 404 NotFound page.
 *
 * Coverage:
 * - Unknown top-level route renders the 404 page
 * - Unknown /app sub-path renders the 404 page
 * - Deep path under /app/streams that doesn't map to a real stream
 * - "Back to home" / "Go home" link navigates back to "/"
 * - No unhandled JS console errors during the render
 */
import { expect, test } from "@playwright/test";

const UNKNOWN_ROUTES = [
  "/totally-unknown-route",
  "/app/unknown-subpath",
  "/app/streams/does-not-exist-xyz-404",
];

for (const route of UNKNOWN_ROUTES) {
  test(`renders 404 page for "${route}"`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(route, { waitUntil: "domcontentloaded" });

    // The NotFound page must show a 404 or "not found" heading
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
    const headingText = (await heading.textContent()) ?? "";
    expect(headingText.toLowerCase()).toMatch(/404|not found/);

    // There must be a link / button to return home
    const homeLink = page.getByRole("link", { name: /home|back/i }).first();
    await expect(homeLink).toBeVisible();

    expect(consoleErrors.filter((e) => !e.includes("Warning:"))).toHaveLength(0);
  });
}

test("NotFound home link navigates to /", async ({ page }) => {
  await page.goto("/totally-unknown-route", { waitUntil: "domcontentloaded" });

  const homeLink = page.getByRole("link", { name: /home|back/i }).first();
  await homeLink.click();

  await page.waitForURL("/");
  await expect(page).toHaveURL("/");
});
