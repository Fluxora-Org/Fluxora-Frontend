/**
 * Network-switch contract coverage for issue #1763.
 *
 * Freighter is replaced with a mutable test double so the flow covers both
 * the rejected wrong-network path and the successful re-check after the
 * wallet is switched to Fluxora's expected network.
 */
import { expect, test, type Page } from "@playwright/test";

const ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function installFreighterNetworkStub(page: Page) {
  await page.addInitScript(({ address }) => {
    (window as any).__fluxoraNetwork = "PUBLIC";
    (window as any).__freighterStub = {
      isConnected: () => Promise.resolve({ isConnected: true }),
      getAddress: () => Promise.resolve({ address }),
      requestAccess: () => Promise.resolve({ address }),
      getNetwork: () => Promise.resolve({ network: (window as any).__fluxoraNetwork }),
      WatchWalletChanges: class { watch() {} stop() {} },
      isBrowser: true,
    };
  }, { address: ADDRESS });

  await page.route(/vendor-stellar.*\.js/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        const s = window.__freighterStub;
        export const isConnected = s.isConnected;
        export const getAddress = s.getAddress;
        export const requestAccess = s.requestAccess;
        export const getNetwork = s.getNetwork;
        export const WatchWalletChanges = s.WatchWalletChanges;
        export const isBrowser = true;
        export default { isConnected, getAddress, requestAccess, getNetwork, WatchWalletChanges, isBrowser };
      `,
    });
  });
}

test.describe("wallet network switching", () => {
  test("shows a mismatch, then succeeds after switching to TESTNET", async ({ page }) => {
    await installFreighterNetworkStub(page);
    await page.goto("/connect-wallet", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await page.getByRole("button", { name: /connect with freighter/i }).click();

    await expect(page.getByTestId("error-state-network-mismatch")).toBeVisible();
    await expect(page.getByText(/expected.*testnet.*mainnet/i)).toBeVisible();

    await page.evaluate(() => {
      (window as any).__fluxoraNetwork = "TESTNET";
    });
    await page.getByRole("button", { name: /check network configuration again/i }).click();

    await expect(page).toHaveURL(/\/app(?:\/)?$/, { timeout: 10_000 });
  });

  test("keeps the mismatch actionable when the wallet remains on PUBLIC", async ({ page }) => {
    await installFreighterNetworkStub(page);
    await page.goto("/connect-wallet", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Connect wallet" }).click();
    await page.getByRole("button", { name: /connect with freighter/i }).click();

    await expect(page.getByTestId("error-state-network-mismatch")).toBeVisible();
    await page.getByRole("button", { name: /check network configuration again/i }).click();
    await expect(page.getByTestId("error-state-network-mismatch")).toBeVisible();
  });
});
