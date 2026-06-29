/**
 * e2e: Wallet disconnect / reconnect flow — issue #386
 *
 * Covers:
 *   - Protected route access when wallet is connected
 *   - Route guard redirects to /connect-wallet after disconnect
 *   - Reconnect restores access and returns to the intended page
 *   - Navbar wallet-status UI reflects each transition
 *
 * Freighter is stubbed entirely via page.addInitScript + page.route so no real
 * extension or network is required. A mutable `window.__freighterState` flag
 * lets the test simulate connect/disconnect without touching the extension bus.
 */

import { expect, test, type Page } from "@playwright/test";

const STUB_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const STUB_NETWORK = "TESTNET";

// maskAddress(STUB_ADDRESS, 6, 4) → "GAAAAA...AAAA"
const MASKED_ADDRESS = "GAAAAA...AAAA";

// ─── Freighter stub helpers ───────────────────────────────────────────────────

/**
 * Injects a window-level Freighter stub before any page scripts run.
 * WalletProvider reads from the `@stellar/freighter-api` ES-module which Vite
 * bundles into a vendor chunk; we replace that chunk via page.route below.
 */
async function injectFreighterStub(page: Page, initiallyConnected: boolean) {
  await page.addInitScript(
    ({ address, network, connected }) => {
      (window as any).__freighterState = { connected };

      (window as any).__freighterStub = {
        isConnected: () =>
          Promise.resolve({
            isConnected: (window as any).__freighterState.connected,
          }),
        getAddress: () => {
          if (!(window as any).__freighterState.connected) {
            return Promise.resolve({
              address: "",
              error: { message: "Not connected" },
            });
          }
          return Promise.resolve({ address });
        },
        getNetwork: () => {
          if (!(window as any).__freighterState.connected) {
            return Promise.resolve({
              network: "",
              error: { message: "Not connected" },
            });
          }
          return Promise.resolve({ network });
        },
        requestAccess: () => Promise.resolve({ address }),
        WatchWalletChanges: class {
          watch(_cb: unknown) {}
          stop() {}
        },
        isBrowser: true,
      };
    },
    { address: STUB_ADDRESS, network: STUB_NETWORK, connected: initiallyConnected },
  );
}

/**
 * Intercepts the Vite vendor-stellar chunk and re-exports it from the
 * window stub so the WalletProvider's ES-module imports resolve correctly.
 */
async function interceptFreighterBundle(page: Page) {
  await page.route(/vendor-stellar.*\.js/, async (route) => {
    const stubModule = `
const s = window.__freighterStub || {};
const noop = () => Promise.resolve({ isConnected: false });
export const isConnected = s.isConnected ? s.isConnected.bind(s) : noop;
export const getAddress = s.getAddress ? s.getAddress.bind(s) : () => Promise.resolve({ address: '' });
export const getNetwork = s.getNetwork ? s.getNetwork.bind(s) : () => Promise.resolve({ network: '' });
export const requestAccess = s.requestAccess ? s.requestAccess.bind(s) : () => Promise.resolve({ address: '' });
export const WatchWalletChanges = s.WatchWalletChanges ?? class { watch(){} stop(){} };
export const isBrowser = true;
export default { isConnected, getAddress, getNetwork, requestAccess, WatchWalletChanges, isBrowser };
`;
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: stubModule,
    });
  });
}

/** Flip the stub's connected flag inside the running page. */
async function setFreighterConnected(page: Page, connected: boolean) {
  await page.evaluate((c) => {
    (window as any).__freighterState = { connected: c };
  }, connected);
}

async function setupPage(page: Page, initiallyConnected: boolean) {
  await injectFreighterStub(page, initiallyConnected);
  await interceptFreighterBundle(page);
}

// ─── Selectors ────────────────────────────────────────────────────────────────

/** The wallet-status pill button shown when connected. */
function walletButton(page: Page) {
  return page.getByRole("button", {
    name: `Wallet ${MASKED_ADDRESS}. Open wallet options.`,
  });
}

/** The "Connect Wallet" link/button shown when disconnected. */
function connectWalletLink(page: Page) {
  return page.getByRole("link", { name: /connect your stellar wallet/i });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("wallet disconnect / reconnect flow", () => {
  test("connected wallet shows address pill and grants protected route access", async ({
    page,
  }) => {
    await setupPage(page, true);
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    // The wallet pill renders after the brief 600 ms "connecting" skeleton.
    await expect(walletButton(page)).toBeVisible({ timeout: 10_000 });

    // Protected route renders (not redirected).
    await expect(page).not.toHaveURL(/connect-wallet/);
  });

  test("disconnected wallet redirects protected route to /connect-wallet", async ({
    page,
  }) => {
    await setupPage(page, false);
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    await page.waitForURL("**/connect-wallet", { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /connect your wallet/i }),
    ).toBeVisible();
  });

  test("disconnecting via navbar dropdown redirects to /connect-wallet", async ({
    page,
  }) => {
    await setupPage(page, true);
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

    // Wait for wallet pill (post-skeleton).
    await expect(walletButton(page)).toBeVisible({ timeout: 10_000 });

    // Open wallet dropdown.
    await walletButton(page).click();

    // First click enters the confirmation step.
    await page.getByRole("menuitem", { name: /^disconnect$/i }).click();

    // Confirmation panel appears — click the confirm button.
    await page.getByRole("button", { name: /disconnect wallet/i }).click();

    // Guard should redirect.
    await page.waitForURL("**/connect-wallet", { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /connect your wallet/i }),
    ).toBeVisible();

    // Wallet pill gone; Connect Wallet link appears.
    await expect(walletButton(page)).toHaveCount(0);
    await expect(connectWalletLink(page)).toBeVisible();
  });

  test("disconnect preserves returnTo so reconnect returns to the original page", async ({
    page,
  }) => {
    await setupPage(page, true);
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

    await expect(walletButton(page)).toBeVisible({ timeout: 10_000 });

    // Disconnect via navbar.
    await walletButton(page).click();
    await page.getByRole("menuitem", { name: /^disconnect$/i }).click();
    await page.getByRole("button", { name: /disconnect wallet/i }).click();

    await page.waitForURL("**/connect-wallet", { timeout: 10_000 });

    // Flip stub to connected so the Freighter flow resolves immediately.
    await setFreighterConnected(page, true);

    // Open the connect modal and select Freighter.
    await page.getByRole("button", { name: /connect wallet/i }).click();
    await page.getByRole("button", { name: /connect with freighter/i }).click();

    // ConnectWalletModal calls requestAccess() → wallet.connect() → ConnectWallet
    // page sees wallet.connected === true and navigates to the preserved returnTo.
    await page.waitForURL("**/app/streams", { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /streams/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("navbar shows Connect Wallet link when wallet is not connected", async ({
    page,
  }) => {
    await setupPage(page, false);
    await page.goto("/connect-wallet", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /connect your wallet/i }),
    ).toBeVisible();

    // Navbar should surface the Connect Wallet entry point.
    await expect(connectWalletLink(page)).toBeVisible();

    // Wallet address pill must not be present.
    await expect(walletButton(page)).toHaveCount(0);
  });
});
