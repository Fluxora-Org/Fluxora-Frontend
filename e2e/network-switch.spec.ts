/**
 * Network-switch contract coverage for issue #1763.
 *
 * Freighter is replaced with a mutable test double so the flow covers both
 * the rejected wrong-network path and the successful re-check after the
 * wallet is switched to Fluxora's expected network.
 */
import { expect, test, type Page } from "@playwright/test";
import {
  installFreighterMock,
  setFreighterNetwork,
} from "./helpers/freighterMock";

const ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function installFreighterNetworkStub(page: Page) {
  await installFreighterMock(page, {
    address: ADDRESS,
    network: "PUBLIC",
    autoConnect: false,
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

    await setFreighterNetwork(page, "TESTNET");
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
