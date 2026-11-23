/**
 * e2e: Offline operation queue flow — issue #1770
 *
 * Covers the full path a user takes when submitting the Create Stream wizard
 * while offline:
 *
 *   1. Success path — queued banner appears while offline, auto-flush fires on
 *      reconnect, modal closes and a success toast confirms on Stellar.
 *   2. Primary failure — flush fails on reconnect, the failure banner shows
 *      with "Retry now" and "Edit details" actions.
 *
 * The test follows the UI only — it does not reach into internals such as
 * offlineActionQueue.ts or useOnlineStatus.ts.  Online/offline state is
 * simulated by dispatching the standard `window` events (the same signals
 * useOnlineStatus.ts consumes) and clamping `navigator.onLine` to match.
 *
 * Freighter is stubbed via page.addInitScript (message-bus approach, same as
 * wallet-transaction-retry.spec.ts so the wallet module initialises correctly).
 * The vendor-stellar bundle is intercepted via page.route and re-exported from
 * the window stub so WalletProvider's ES-module imports resolve correctly.
 * Soroban RPC calls are intercepted via page.route.
 */

import { expect, test, type Page } from "@playwright/test";

// ── Constants ─────────────────────────────────────────────────────────────────

const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const RECIPIENT_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

// ── Freighter stub ────────────────────────────────────────────────────────────

/**
 * Injects a Freighter message-bus stub before any page script runs.
 * The wallet is always "connected" and signs transactions immediately.
 */
async function stubFreighterWallet(page: Page) {
  await page.addInitScript(
    ({ address }) => {
      (window as unknown as { freighter: boolean }).freighter = true;

      window.addEventListener("message", (event: MessageEvent) => {
        const data = event.data;
        if (
          !data ||
          data.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST" ||
          event.source !== window
        ) {
          return;
        }

        const base = {
          source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
          messagedId: data.messageId,
          error: "",
        };
        let payload: Record<string, unknown> = {};

        switch (data.type) {
          case "REQUEST_CONNECTION_STATUS":
            payload = { isConnected: true };
            break;
          case "REQUEST_ALLOWED_STATUS":
          case "SET_ALLOWED_STATUS":
            payload = { isAllowed: true };
            break;
          case "REQUEST_PUBLIC_KEY":
          case "REQUEST_ACCESS":
          case "REQUEST_USER_INFO":
            payload = { publicKey: address, address };
            break;
          case "REQUEST_NETWORK":
          case "REQUEST_NETWORK_DETAILS":
            payload = {
              network: "TESTNET",
              networkPassphrase: "Test SDF Network ; September 2015",
              networkUrl: "https://horizon-testnet.stellar.org",
            };
            break;
          case "SIGN_TRANSACTION":
            payload = { signedTxXdr: data.xdr ?? "mock-signed-xdr" };
            break;
          default:
            break;
        }

        window.postMessage(
          { ...base, ...payload, apiData: payload },
          window.location.origin,
        );
      });
    },
    { address: MOCK_ADDRESS },
  );
}

/**
 * Intercepts the Vite vendor-stellar chunk and re-exports it from the window
 * stub so WalletProvider's ES-module imports resolve correctly (same technique
 * as wallet-disconnect-reconnect.spec.ts).
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

// ── Soroban RPC stub ──────────────────────────────────────────────────────────

/** Stubs Soroban RPC so transactions complete successfully. */
async function stubSorobanRpcSuccess(page: Page) {
  await page.route("https://soroban-testnet.stellar.org/**", async (route) => {
    const body = route.request().postDataJSON() as { method?: string } | null;
    const method = body?.method;
    let result: Record<string, unknown> = {};

    if (method === "getLatestLedger") {
      result = { sequence: "100", protocolVersion: 22 };
    } else if (method === "getAccount") {
      result = {
        id: MOCK_ADDRESS,
        accountId: MOCK_ADDRESS,
        sequence: "1",
        sequenceNumber: "1",
        balances: [],
      };
    } else if (method === "simulateTransaction") {
      result = {
        transactionData:
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        minResourceFee: "100",
        cost: { cpuInsns: "1", memBytes: "1" },
        events: [],
        results: [],
      };
    } else if (method === "sendTransaction") {
      result = { status: "PENDING", hash: "offline-queue-tx-hash" };
    } else if (method === "getTransaction") {
      result = { status: "SUCCESS", txHash: "offline-queue-tx-hash" };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: body ? 1 : 0, result }),
    });
  });
}

/**
 * Stubs Soroban RPC so `sendTransaction` returns a server-side error,
 * causing the flush to fail.
 */
async function stubSorobanRpcFailure(page: Page) {
  await page.route("https://soroban-testnet.stellar.org/**", async (route) => {
    const body = route.request().postDataJSON() as { method?: string } | null;
    const method = body?.method;
    let result: Record<string, unknown> = {};

    if (method === "getLatestLedger") {
      result = { sequence: "100", protocolVersion: 22 };
    } else if (method === "getAccount") {
      result = {
        id: MOCK_ADDRESS,
        accountId: MOCK_ADDRESS,
        sequence: "1",
        sequenceNumber: "1",
        balances: [],
      };
    } else if (method === "simulateTransaction") {
      result = {
        transactionData:
          "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
        minResourceFee: "100",
        cost: { cpuInsns: "1", memBytes: "1" },
        events: [],
        results: [],
      };
    } else if (method === "sendTransaction") {
      // Simulate a network/contract error that the offline flush will surface.
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: body ? 1 : 0,
          error: { code: -32603, message: "Insufficient balance to fund this stream." },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: body ? 1 : 0, result }),
    });
  });
}

// ── Online / offline helpers ───────────────────────────────────────────────────

/**
 * Simulates going offline by clamping `navigator.onLine` to `false` and
 * firing a `window` `offline` event — the same signal useOnlineStatus.ts
 * listens to.
 */
async function goOffline(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });
    window.dispatchEvent(new Event("offline"));
  });
}

/**
 * Simulates coming back online by restoring `navigator.onLine` to `true` and
 * firing a `window` `online` event.
 */
async function goOnline(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => true,
    });
    window.dispatchEvent(new Event("online"));
  });
}

// ── Shared wizard helper ───────────────────────────────────────────────────────

/**
 * Navigates to /app/streams, opens the Create Stream modal, and fills all
 * three steps up to (but not including) clicking the final "Create stream"
 * submit button.
 */
async function openWizardAtReview(page: Page) {
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();

  await page.getByRole("button", { name: "Create stream" }).click();

  const dialog = page.getByRole("dialog", { name: "Create stream" });
  await expect(dialog).toBeVisible();

  // Step 1 — Recipient & deposit
  await dialog
    .getByRole("textbox", { name: "Recipient" })
    .fill(RECIPIENT_ADDRESS);
  await dialog.getByRole("textbox", { name: "Deposit amount" }).fill("120");
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 2 — Rate & schedule
  await expect(
    dialog.getByRole("heading", { name: "Rate & schedule" }),
  ).toBeVisible();
  await dialog.locator("#create-stream-accrual-rate").fill("30");
  await dialog.locator("#create-stream-duration").fill("4");
  await dialog.getByRole("button", { name: "Next" }).click();

  // Step 3 — Review (just arrived, nothing submitted yet)
  await expect(dialog.getByText("120.00 USDC", { exact: true })).toBeVisible();

  return dialog;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("offline operation queue flow", () => {
  test("success path — submission queues while offline then auto-flushes on reconnect", async ({
    page,
  }) => {
    await stubFreighterWallet(page);
    await interceptFreighterBundle(page);
    await stubSorobanRpcSuccess(page);

    const dialog = await openWizardAtReview(page);

    // Go offline before submitting.
    await goOffline(page);

    // Submit the stream while offline.
    await dialog
      .getByRole("button", { name: "Create stream", exact: true })
      .click();

    // --- Queued state ---
    // The offline-queue banner should appear immediately with role="status".
    const queueBanner = dialog.locator(".offline-queue-banner");
    await expect(queueBanner).toBeVisible();
    await expect(queueBanner).toHaveAttribute("role", "status");
    await expect(queueBanner).toContainText("Queued — will submit when back online");
    // Queue position is shown (1 of 1 for a single submission).
    await expect(queueBanner).toContainText("Queue position: 1 of 1");

    // Cancel / Close must remain accessible while just queued (not in-flight).
    const closeButton = dialog.getByRole("button", { name: /close/i });
    await expect(closeButton).toBeEnabled();

    // Back/Edit are blocked while queued.
    const backButton = dialog.getByRole("button", { name: "Back" });
    await expect(backButton).toBeDisabled();

    // --- Reconnect — flush triggers automatically ---
    await goOnline(page);

    // The flushing status box appears while the submission is in flight.
    await expect(
      dialog.locator(".transaction-status-box"),
    ).toContainText("Back online. Submitting your queued stream to Stellar…");

    // --- Success — modal closes and toast confirms ---
    // The modal closes once the transaction is confirmed.
    await expect(dialog).toHaveCount(0, { timeout: 15_000 });

    // The success toast for a queued flush uses different copy.
    await expect(
      page.getByText("Your queued stream was submitted and confirmed on Stellar."),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("failure path — flush failure shows error banner with Retry now and Edit details", async ({
    page,
  }) => {
    await stubFreighterWallet(page);
    await interceptFreighterBundle(page);
    await stubSorobanRpcFailure(page);

    const dialog = await openWizardAtReview(page);

    // Go offline then submit.
    await goOffline(page);
    await dialog
      .getByRole("button", { name: "Create stream", exact: true })
      .click();

    // Queued banner appears.
    await expect(dialog.locator(".offline-queue-banner")).toBeVisible();
    await expect(dialog.locator(".offline-queue-banner")).toContainText(
      "Queued — will submit when back online",
    );

    // Reconnect — flush fires but the RPC returns an error.
    await goOnline(page);

    // --- Failure banner ---
    const failureBanner = dialog.locator(
      ".offline-queue-banner.offline-queue-banner--failed",
    );
    await expect(failureBanner).toBeVisible({ timeout: 15_000 });
    await expect(failureBanner).toHaveAttribute("role", "alert");
    await expect(failureBanner).toContainText(
      "Your queued stream couldn't be submitted.",
    );

    // Both recovery actions must be present.
    await expect(
      failureBanner.getByRole("button", { name: "Retry now" }),
    ).toBeVisible();
    await expect(
      failureBanner.getByRole("button", { name: "Edit details" }),
    ).toBeVisible();

    // Modal stays open (not closed on failure).
    await expect(dialog).toBeVisible();

    // Close / Cancel are usable (not blocked — flush is done, nothing in flight).
    await expect(dialog.getByRole("button", { name: /close/i })).toBeEnabled();
  });

  test("failure path — Edit details returns to step 1 so the user can amend the form", async ({
    page,
  }) => {
    await stubFreighterWallet(page);
    await interceptFreighterBundle(page);
    await stubSorobanRpcFailure(page);

    const dialog = await openWizardAtReview(page);

    await goOffline(page);
    await dialog
      .getByRole("button", { name: "Create stream", exact: true })
      .click();

    await expect(dialog.locator(".offline-queue-banner")).toBeVisible();
    await goOnline(page);

    // Wait for the failure banner.
    const failureBanner = dialog.locator(
      ".offline-queue-banner.offline-queue-banner--failed",
    );
    await expect(failureBanner).toBeVisible({ timeout: 15_000 });

    // Clicking "Edit details" should navigate back to step 1.
    await failureBanner.getByRole("button", { name: "Edit details" }).click();

    // Step 1 inputs are visible again.
    await expect(
      dialog.getByRole("textbox", { name: "Recipient" }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Deposit amount" }),
    ).toBeVisible();
  });
});
