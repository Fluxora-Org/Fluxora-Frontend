import { expect, test } from "@playwright/test";

test("landing page hero CTA navigates to connect-wallet entry point", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const hero = page.getByRole("region", { name: /the future of treasury streaming/i });
  await expect(hero).toBeVisible();

  await expect(
    hero.getByRole("heading", { level: 1, name: /the future of/i }),
  ).toBeVisible();

  const launchApp = hero.getByRole("button", { name: "Launch App" });
  await expect(launchApp).toBeVisible();
  await expect(launchApp).toBeEnabled();

  await launchApp.focus();
  await expect(launchApp).toBeFocused();

  await page.keyboard.press("Enter");
  await page.waitForURL("**/connect-wallet");

  await expect(
    page.getByRole("heading", { name: "Connect your wallet" }),
  ).toBeVisible();
});
