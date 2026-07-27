import { test } from "@playwright/test";
import { scanRoute } from "./axe-helper";

/**
 * Accessibility regression suite.
 * Scans each primary route with axe-core and fails on serious/critical violations.
 */

const ROUTES: Array<{ label: string; path: string }> = [
  { label: "Landing (/)", path: "/" },
  { label: "Landing page (/landing)", path: "/landing" },
  { label: "Dashboard (/app)", path: "/app" },
  { label: "Connect Wallet (/connect-wallet)", path: "/connect-wallet" },
];

for (const { label, path } of ROUTES) {
  test(`accessibility: ${label}`, async ({ page }) => {
    await page.goto(path);
    // Wait for the page to be reasonably interactive before scanning
    await page.waitForLoadState("networkidle");
    await scanRoute(page, label);
  });
}

/**
 * Mock Stellar wallet address for accessibility tests.
 *
 * Uses the Stellar TESTNET placeholder address as recommended in security notes.
 * This is NOT a real funded address — it is used only to satisfy the RequireWallet
 * guard so axe-core can scan the authenticated app routes in the test environment.
 *
 * Security: Never use real Stellar addresses in test fixtures.
 */
const MOCK_WALLET_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

const MOCK_WALLET_NETWORK = "TESTNET";

/**
 * Injects a mock Freighter wallet extension into the page context before navigation.
 *
 * The WalletContext calls `isConnected()`, `getAddress()`, and `getNetwork()` from
 * `@stellar/freighter-api` during the silent session restore phase. This script
 * replaces the underlying `freighterApi` global that the bundled Freighter API
 * package reads from, causing the context to resolve as connected and skip the
 * redirect to /connect-wallet.
 *
 * @param address - Mock Stellar public key to inject (must not be a real address).
 * @param network - Mock network label (e.g. "TESTNET").
 */
async function injectMockWallet(
  page: import("@playwright/test").Page,
  address: string,
  network: string,
): Promise<void> {
  await page.addInitScript(
    ({ addr, net }: { addr: string; net: string }) => {
      // The `@stellar/freighter-api` library looks for `window.freighterApi` to
      // communicate with the browser extension. Providing a stub here causes
      // `isConnected()`, `getAddress()`, and `getNetwork()` to resolve with the
      // mock values immediately, bypassing the "extension not found" error path.
      (window as unknown as Record<string, unknown>)["freighterApi"] = {
        isConnected: () => Promise.resolve(true),
        getAddress: () => Promise.resolve({ address: addr }),
        getNetwork: () => Promise.resolve({ network: net, networkPassphrase: "" }),
        signTransaction: () => Promise.reject(new Error("Not available in tests")),
        signAuthEntry: () => Promise.reject(new Error("Not available in tests")),
        signMessage: () => Promise.reject(new Error("Not available in tests")),
        getNetworkDetails: () =>
          Promise.resolve({ network: net, networkPassphrase: "", sorobanRpcUrl: "" }),
        WatchWalletChanges: class {
          watch() {}
          stop() {}
        },
      };
    },
    { addr: address, net: network },
  );
}

/**
 * Accessibility scan for /app/streams with mock wallet state injected.
 *
 * Injects a mock Freighter wallet into the page context before navigation so
 * that `RequireWallet` resolves as connected and does not redirect to /connect-wallet.
 * The scan verifies zero WCAG 2.1 AA serious/critical violations on the Streams page.
 */
test("accessibility: Streams (/app/streams) — with mock wallet", async ({
  page,
}) => {
  await injectMockWallet(page, MOCK_WALLET_ADDRESS, MOCK_WALLET_NETWORK);
  await page.goto("/app/streams");
  await page.waitForLoadState("networkidle");
  await scanRoute(page, "Streams (/app/streams)");
});

/**
 * Accessibility scan for /app/recipient with mock wallet state injected.
 *
 * Injects a mock Freighter wallet into the page context before navigation so
 * that `RequireWallet` resolves as connected and does not redirect to /connect-wallet.
 * The scan verifies zero WCAG 2.1 AA serious/critical violations on the Recipient page.
 */
test("accessibility: Recipient (/app/recipient) — with mock wallet", async ({
  page,
}) => {
  await injectMockWallet(page, MOCK_WALLET_ADDRESS, MOCK_WALLET_NETWORK);
  await page.goto("/app/recipient");
  await page.waitForLoadState("networkidle");
  await scanRoute(page, "Recipient (/app/recipient)");
});
