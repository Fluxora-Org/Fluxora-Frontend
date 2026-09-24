import { expect, test } from "@playwright/test";

test.describe("Treasury page lazy loading", () => {
  test("loads deferred chunks without breaking the page", async ({ page }) => {
    // Go to the treasury page
    await page.goto("/app/treasurypage", { waitUntil: "domcontentloaded" });

    // Verify main components eventually render (waiting for lazy loaded chunks)
    await expect(page.getByRole("heading", { name: "Treasury Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Treasury Stream Flow" })).toBeVisible();

    // Click Export to load the ReportBuilderPanel chunk
    await page.getByRole("button", { name: "Export Report" }).click();

    // Verify the modal appears
    await expect(page.getByRole("dialog", { name: "Export Treasury Report" })).toBeVisible();
  });
});
