import { expect, test, type Page } from "@playwright/test";

const validStellarAddress =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

async function openMaxValueReview(page: Page) {
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create stream" }).click();

  const dialog = page.getByRole("dialog", { name: "Create stream" });
  await dialog.getByRole("textbox", { name: "Recipient" }).fill(validStellarAddress);
  await dialog.getByRole("textbox", { name: "Deposit amount" }).fill("365000000.00");
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.locator("#create-stream-accrual-rate").fill("100000");
  await dialog.locator("#create-stream-duration").fill("3650");
  await dialog.getByRole("button", { name: "Next" }).click();
  await expect(dialog.getByText("365000000.00", { exact: true })).toBeVisible();
  return dialog;
}

test.describe("responsive address and amount safety", () => {
  for (const width of [320, 1280]) {
    test(`keeps review values and controls inside the ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      const dialog = await openMaxValueReview(page);

      await expect(
        dialog.getByRole("button", { name: `Copy address: ${validStellarAddress}` }),
      ).toBeVisible();

      const bounds = await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const controls = Array.from(
          element.querySelectorAll("button, input, [role='button']"),
        ).map((control) => {
          const controlRect = control.getBoundingClientRect();
          return {
            left: controlRect.left,
            right: controlRect.right,
            top: controlRect.top,
            bottom: controlRect.bottom,
          };
        });
        return { dialog: rect.toJSON(), controls };
      });

      expect(bounds.dialog.left).toBeGreaterThanOrEqual(0);
      expect(bounds.dialog.right).toBeLessThanOrEqual(width);
      for (const control of bounds.controls) {
        expect(control.left).toBeGreaterThanOrEqual(bounds.dialog.left);
        expect(control.right).toBeLessThanOrEqual(bounds.dialog.right);
        expect(control.top).toBeGreaterThanOrEqual(bounds.dialog.top);
        expect(control.bottom).toBeLessThanOrEqual(bounds.dialog.bottom);
      }
    });
  }
});