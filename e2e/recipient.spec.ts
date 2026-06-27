import { expect, test } from "@playwright/test";

test("shows recipient withdraw state and incoming streams", async ({ page }) => {
  await page.goto("/app/recipient", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Your streams" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Withdraw 22,600 USDC" }),
  ).toBeEnabled();
  await expect(page.getByText("Withdrawable now")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Incoming streams", exact: true }),
  ).toBeVisible();
});
