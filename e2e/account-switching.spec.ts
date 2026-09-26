/**
 * e2e: Account switching flow — issue #1764
 *
 * Covers src/lib/accountContextSync.ts + the wallet context
 * (src/components/wallet-connect/Walletcontext.tsx) end to end, the way a
 * user actually experiences it:
 *
 *  1. Success path — Freighter reports a different (valid) account while
 *     connected. The active tab updates in place (no redirect, no reload)
 *     AND a second, already-open tab picks up the same account via the
 *     cross-tab BroadcastChannel sync in accountContextSync.ts.
 *  2. Primary failure — Freighter reports an unusable account mid-switch
 *     (e.g. the newly selected account is locked). The app must not log the
 *     user out or crash; it shows the "connection lost" notice and recovers
 *     once a valid account is available again via the Reconnect action.
 *
 * Freighter itself is not available in CI, so it is replaced with a mutable
 * test double (window.__freighterStub) the same way the existing
 * network-switch.spec.ts and wallet-disconnect-reconnect.spec.ts specs do:
 * the real @stellar/freighter-api module is intercepted at the bundled
 * "vendor-stellar" chunk and re-exported from the stub. The stubbed
 * WatchWalletChanges captures the callback the app registers so the test can
 * invoke it directly — this simulates the signal Freighter itself would send
 * on an account change, without reaching into any React internals.
 *
 * Both test accounts are real, checksum-valid Stellar StrKey addresses
 * (verified against src/lib/isValidStellarAddress) — a copy-pasted
 * placeholder like "GAAAA...AAAA" fails that checksum and makes the wallet
 * context silently refuse to connect.
 */
import { expect, test, type Page } from "@playwright/test";

const ACCOUNT_A = "GCXTXWOGTZMXQ7MZJYRUWXFP6WIZFEZEJXEBDWZWH2EBIBTRUJKJZH33";
const ACCOUNT_B = "GA3MHBIMBZNMVTYKWEB3UBKXQRCOSAWOGHELDXIYJOMPPAYSMYBYLLAE";
const NETWORK = "TESTNET";

// formatAddress(address, 6, 4) — see src/components/common/TruncatedAddress.tsx
const MASKED_A = "GCXTXW...ZH33";
const MASKED_B = "GA3MHB...LLAE";

interface FreighterState {
  address: string;
  network: string;
}

type WalletChangeCallback = (state: FreighterState) => void;

interface FreighterStub {
  isConnected: () => Promise<{ isConnected: boolean }>;
  isAllowed: () => Promise<{ isAllowed: boolean }>;
  getAddress: () => Promise<{ address: string }>;
  getNetwork: () => Promise<{ network: string }>;
  requestAccess: () => Promise<{ address: string }>;
  WatchWalletChanges: new () => {
    watch: (cb: WalletChangeCallback) => void;
    stop: () => void;
  };
  isBrowser: boolean;
}

declare global {
  interface Window {
    __freighterState: FreighterState;
    __freighterStub: FreighterStub;
    __watchCallback: WalletChangeCallback | null;
  }
}

/**
 * Installs a mutable Freighter stub on `window` and captures whatever
 * callback the app passes to `WatchWalletChanges.watch(...)`. Tests fire
 * that callback directly (via triggerWalletChange) to simulate Freighter
 * detecting an account switch — the same external signal the polling
 * watcher in Walletcontext.tsx reacts to.
 */
async function installFreighterStub(page: Page) {
  await page.addInitScript(
    ({ address, network }) => {
      window.__freighterState = { address, network };
      window.__watchCallback = null;

      window.__freighterStub = {
        isConnected: () => Promise.resolve({ isConnected: true }),
        isAllowed: () => Promise.resolve({ isAllowed: true }),
        getAddress: () =>
          Promise.resolve({ address: window.__freighterState.address }),
        getNetwork: () =>
          Promise.resolve({ network: window.__freighterState.network }),
        requestAccess: () =>
          Promise.resolve({ address: window.__freighterState.address }),
        WatchWalletChanges: class {
          watch(cb: (state: FreighterState) => void) {
            window.__watchCallback = cb;
          }
          stop() {
            window.__watchCallback = null;
          }
        },
        isBrowser: true,
      };
    },
    { address: ACCOUNT_A, network: NETWORK },
  );

  await page.route(/vendor-stellar.*\.js/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        const s = window.__freighterStub;
        export const isConnected = s.isConnected;
        export const isAllowed = s.isAllowed;
        export const getAddress = s.getAddress;
        export const getNetwork = s.getNetwork;
        export const requestAccess = s.requestAccess;
        export const WatchWalletChanges = s.WatchWalletChanges;
        export const isBrowser = true;
        export default { isConnected, isAllowed, getAddress, getNetwork, requestAccess, WatchWalletChanges, isBrowser };
      `,
    });
  });
}

/** Simulates Freighter reporting a new account/network to the app. */
async function triggerWalletChange(page: Page, next: FreighterState) {
  await page.evaluate((n) => {
    window.__freighterState = n;
    if (typeof window.__watchCallback === "function") window.__watchCallback(n);
  }, next);
}

function walletButton(page: Page, masked: string) {
  return page.getByRole("button", {
    name: `Wallet ${masked}. Open wallet options.`,
  });
}

/** The always-mounted live region from WalletConnectionNotice.tsx. */
function connectionNotice(page: Page) {
  return page.getByRole("status", { name: /wallet connection status/i });
}

test.describe("account switching flow", () => {
  test("switching to a different account updates the active tab and syncs to another open tab", async ({
    page,
    context,
  }) => {
    await installFreighterStub(page);
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

    await expect(walletButton(page, MASKED_A)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /streams/i })).toBeVisible();

    // A second tab, connected to the same (pre-switch) account, open before
    // the switch happens.
    const page2 = await context.newPage();
    await installFreighterStub(page2);
    await page2.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(walletButton(page2, MASKED_A)).toBeVisible({
      timeout: 10_000,
    });

    // User switches accounts inside Freighter, in tab 1.
    await triggerWalletChange(page, { address: ACCOUNT_B, network: NETWORK });

    // Tab 1 updates in place: no redirect, no reload, no disconnect banner.
    await expect(walletButton(page, MASKED_B)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/app\/streams/);
    await expect(connectionNotice(page)).toHaveText("");

    // Tab 2 picks up the same account via the cross-tab BroadcastChannel
    // sync in accountContextSync.ts, with no action taken in that tab.
    await expect(walletButton(page2, MASKED_B)).toBeVisible({
      timeout: 10_000,
    });

    await page2.close();
  });

  test("an unusable account mid-switch drops the link and recovers without logging the user out", async ({
    page,
  }) => {
    await installFreighterStub(page);
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
    await expect(walletButton(page, MASKED_A)).toBeVisible({ timeout: 10_000 });

    // Freighter reports an empty address — e.g. the account the user just
    // switched to is locked. This must never crash or delete the session.
    await triggerWalletChange(page, { address: "", network: NETWORK });

    await expect(connectionNotice(page)).toContainText(
      /wallet connection lost/i,
      { timeout: 10_000 },
    );
    await expect(
      page.getByRole("button", { name: /reconnect wallet/i }),
    ).toBeVisible();

    // The route guard must not treat a dropped link as a disconnect.
    await expect(page).not.toHaveURL(/connect-wallet/);
    await expect(page.getByRole("heading", { name: /streams/i })).toBeVisible();
    await expect(walletButton(page, MASKED_A)).toBeVisible();

    // The account becomes usable again (e.g. unlocked) and the user retries.
    await page.evaluate(
      (n) => {
        window.__freighterState = n;
      },
      { address: ACCOUNT_B, network: NETWORK },
    );
    await page.getByRole("button", { name: /reconnect wallet/i }).click();

    await expect(walletButton(page, MASKED_B)).toBeVisible({ timeout: 10_000 });
    await expect(connectionNotice(page)).toHaveText("");
  });
});