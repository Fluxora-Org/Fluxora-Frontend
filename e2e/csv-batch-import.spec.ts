import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const validRecipient =
  "GAEA6FQ5EQVTEOKAI5HFKXDDNJYXQ74GRWKJXIVJWC335ROM2PNODIMK";
const secondValidRecipient =
  "GAERAFY6EUWDGOSBJBHVMXLENNZHTAEHR2KZZI5KWG4L7RWN2TN6EMHG";

async function openBulkImport(page: Page) {
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();
  await page.getByRole("button", { name: "Create stream" }).first().click();

  const dialog = page.getByRole("dialog", { name: "Create stream" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Bulk create from CSV/ }).click();
  await expect(
    dialog.getByRole("heading", { name: "Upload recipient CSV" }),
  ).toBeVisible();
  return dialog;
}

test("imports a valid CSV batch through dry-run review", async ({ page }) => {
  const dialog = await openBulkImport(page);

  await dialog.locator('input[type="file"]').setInputFiles({
    name: "streams.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "recipient,deposit_amount,accrual_rate_per_day,duration_days",
        `${validRecipient},100,10,30`,
        `${secondValidRecipient},250,25,14`,
      ].join("\n"),
    ),
  });

  await expect(dialog.locator(".csv-preview-summary__total")).toContainText(
    "Reviewing 2 streams",
  );
  await expect(dialog.getByRole("row").nth(1)).toContainText("Valid");
  await expect(dialog.getByRole("row").nth(2)).toContainText("Valid");
  await dialog
    .getByRole("button", { name: "Review batch to dry-run preview" })
    .click();

  await expect(
    dialog.getByRole("heading", { name: "Review batch summary" }),
  ).toBeVisible();
  await expect(dialog.getByText("Total streams")).toBeVisible();
  await expect(dialog.getByText("350.00 USDC")).toBeVisible();

  await dialog
    .getByRole("checkbox", { name: /I understand this will create 2 streams/ })
    .check();
  await expect(
    dialog.getByRole("button", { name: /Create 2 stream/ }),
  ).toBeEnabled();
});

test("blocks a batch with an invalid CSV row", async ({ page }) => {
  const dialog = await openBulkImport(page);

  await dialog.locator('input[type="file"]').setInputFiles({
    name: "invalid-streams.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      [
        "recipient,deposit_amount,accrual_rate_per_day,duration_days",
        `${validRecipient},100,10,30`,
        "not-a-stellar-address,250,25,14",
      ].join("\n"),
    ),
  });

  await expect(dialog.getByRole("row").nth(2)).toContainText("Needs fix");
  const reviewButton = dialog.getByRole("button", {
    name: "Review batch to dry-run preview",
  });
  await expect(reviewButton).toBeEnabled();
  await reviewButton.click();

  await expect(
    dialog.getByRole("heading", { name: "Review batch summary" }),
  ).toBeVisible();
  await expect(dialog.getByText("Rows needing attention: 1")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Create 1 stream" }),
  ).toBeDisabled();
});
