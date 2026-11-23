import { expect, test, type Page } from "@playwright/test";

/**
 * Keep the browser test independent of a locally installed Freighter extension.
 * The application still follows its real wallet provider and route-guard code.
 */
async function installMissingWalletStub(page: Page) {
  await page.addInitScript(() => {
    (window as any).__freighterStub = {
      isConnected: () => Promise.resolve({ isConnected: false }),
      getAddress: () => Promise.resolve({ address: "" }),
      getNetwork: () => Promise.resolve({ network: "" }),
      requestAccess: () => Promise.resolve({ address: "" }),
      WatchWalletChanges: class {
        watch() {}
        stop() {}
      },
      isBrowser: true,
    };
  });

  await page.route(/vendor-stellar.*\.js/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        const s = window.__freighterStub;
        export const isConnected = s.isConnected;
        export const getAddress = s.getAddress;
        export const getNetwork = s.getNetwork;
        export const requestAccess = s.requestAccess;
        export const WatchWalletChanges = s.WatchWalletChanges;
        export const isBrowser = true;
        export default { isConnected, getAddress, getNetwork, requestAccess, WatchWalletChanges, isBrowser };
      `,
    });
  });
}

test.describe("first-visit-without-wallet flow", () => {
  test("redirects a first-time visitor to the wallet entry point", async ({ page }) => {
    await installMissingWalletStub(page);
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    await page.waitForURL("**/connect-wallet");
    await expect(
      page.getByRole("heading", { name: "Connect your wallet" }),
    ).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Wallet onboarding checklist" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Connect wallet" }),
    ).toBeEnabled();
  });

  test("shows an actionable missing-extension error when connection cannot start", async ({ page }) => {
    await installMissingWalletStub(page);
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/connect-wallet");

    await page.getByRole("button", { name: "Connect wallet" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /connect with freighter/i }).click();

    await expect(page.getByTestId("error-state-not-installed")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Freighter Not Installed" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Download Freighter browser extension" }),
    ).toBeVisible();
  });
});