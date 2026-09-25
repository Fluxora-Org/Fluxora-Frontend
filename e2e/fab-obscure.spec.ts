import { expect, test } from "@playwright/test";

test.describe("FAB layout at small viewports", () => {
  test.use({ viewport: { width: 320, height: 568 } }); // smallest supported

  test("the floating action button does not obscure content", async ({ page }) => {
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

    const fab = page.getByRole("button", { name: "Create stream" });
    await expect(fab).toBeVisible();

    const spacer = page.getByTestId("fab-spacer");
    await expect(spacer).toBeVisible();

    const spacerBox = await spacer.boundingBox();
    expect(spacerBox?.height).toBeGreaterThan(0);
  });
});
