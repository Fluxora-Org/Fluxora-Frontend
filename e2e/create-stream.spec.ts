import { expect, test } from "@playwright/test";

const validStellarAddress =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

test("creates a stream through the three-step wizard", async ({ page }) => {
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();
  await page.getByRole("button", { name: "Create stream" }).click();

  const dialog = page.getByRole("dialog", { name: "Create stream" });
  await expect(dialog).toBeVisible();

  await dialog
    .getByRole("textbox", { name: "Recipient" })
    .fill(validStellarAddress);
  await dialog.getByRole("textbox", { name: "Deposit amount" }).fill("120");
  await dialog.getByRole("button", { name: "Next" }).click();

  await expect(
    dialog.getByRole("heading", { name: "Rate & schedule" }),
  ).toBeVisible();
  await dialog.locator("#create-stream-accrual-rate").fill("30");
  await dialog.locator("#create-stream-duration").fill("4");
  await dialog.getByRole("button", { name: "Next" }).click();

  await expect(dialog.getByText("120.00 USDC", { exact: true })).toBeVisible();
  await expect(dialog.getByText("30 USDC per month")).toBeVisible();
  await dialog
    .getByRole("button", { name: "Create stream", exact: true })
    .click();

  const successDialog = page.getByRole("dialog", { name: /stream created/i });
  await expect(successDialog).toBeVisible();
  await expect(
    successDialog.getByText("#STR-005", { exact: true }),
  ).toBeVisible();
});
