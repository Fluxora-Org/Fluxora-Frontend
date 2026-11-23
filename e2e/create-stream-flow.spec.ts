/**
 * End-to-end tests for the stream creation flow.
 *
 * Covers:
 *   - Success path: user walks the full three-step wizard and sees the
 *     "Stream created!" modal with the generated stream ID.
 *   - Primary failure: wallet rejects the signing request and the error state
 *     is surfaced inline so the user can retry.
 *   - Validation: an empty recipient blocks the wizard on step 1.
 *
 * Design decisions
 * ─────────────────
 * • The modal starts in "choose" mode, so every test clicks "Create a single
 *   stream" before interacting with wizard fields.
 * • Wallet injection uses the postMessage-based Freighter stub (Pattern B from
 *   the existing test suite) because it supports realistic signing rejection.
 * • The Soroban RPC is stubbed via page.route() so no live network is needed.
 * • VITE_USE_MOCKS=true is set automatically by playwright.config.ts; the
 *   streams service therefore serves the four seeded records (STR-001 …
 *   STR-004) from src/data/streamRecords.ts, making the next created stream
 *   STR-005 (Streams.tsx generates `STR-${streams.length + 1}`).
 */

import { expect, test, type Page } from "@playwright/test";

// ── Addresses ────────────────────────────────────────────────────────────────

const SENDER_ADDRESS =
  "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const RECIPIENT_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

// ── Wallet stubs ─────────────────────────────────────────────────────────────

/**
 * Builds the in-page freighterApi stub object shared by both wallet helpers.
 * We store it on window.__freighterStub so the vendor-chunk route intercept
 * can re-export it as an ES module, which is how the app's WalletContext
 * actually detects a connected wallet.
 */
function buildFreighterInitScript(
  address: string,
  opts: { rejectSigning?: boolean },
): string {
  return `
(function() {
  var addr = ${JSON.stringify(address)};
  var rejectSigning = ${opts.rejectSigning ? "true" : "false"};
  var stub = {
    isConnected: function() { return Promise.resolve({ isConnected: true }); },
    isAllowed: function() { return Promise.resolve({ isAllowed: true }); },
    getAddress: function() { return Promise.resolve({ address: addr }); },
    getNetwork: function() { return Promise.resolve({ network: 'TESTNET', networkPassphrase: '' }); },
    getNetworkDetails: function() { return Promise.resolve({ network: 'TESTNET', networkPassphrase: '', sorobanRpcUrl: '' }); },
    requestAccess: function() { return Promise.resolve({ address: addr }); },
    signTransaction: rejectSigning
      ? function() { return Promise.reject(new Error('User rejected the signing request')); }
      : function(xdr) { return Promise.resolve({ signedTxXdr: xdr || 'MOCK_XDR' }); },
    signAuthEntry: function() { return Promise.reject(new Error('Not available in tests')); },
    signMessage: function() { return Promise.reject(new Error('Not available in tests')); },
    WatchWalletChanges: (function() { function W(){} W.prototype.watch = function(){}; W.prototype.stop = function(){}; return W; })(),
    isBrowser: true,
  };
  window.__freighterStub = stub;
  window.freighterApi = stub;
  // Also satisfy the localStorage-based wallet state some flows read on mount
  try {
    localStorage.setItem('fluxora_wallet_address', addr);
    localStorage.setItem('fluxora_wallet_network', 'TESTNET');
    localStorage.setItem('fluxora_wallet_connected', 'true');
  } catch(_) {}
})();
`;
}

/** Applies the vendor-chunk route intercept used by the accessibility suite. */
async function routeFreighterVendorChunk(page: Page): Promise<void> {
  await page.route(
    (url) =>
      url.href.includes("freighter") || url.href.includes("vendor-stellar"),
    async (route) => {
      const stubModule = `
const s = window.__freighterStub || {};
const noop = () => Promise.resolve({ isConnected: false });
export const isConnected = s.isConnected ? s.isConnected.bind(s) : noop;
export const isAllowed = s.isAllowed ? s.isAllowed.bind(s) : () => Promise.resolve({ isAllowed: true });
export const getAddress = s.getAddress ? s.getAddress.bind(s) : () => Promise.resolve({ address: '' });
export const getNetwork = s.getNetwork ? s.getNetwork.bind(s) : () => Promise.resolve({ network: '' });
export const requestAccess = s.requestAccess ? s.requestAccess.bind(s) : () => Promise.resolve({ address: '' });
export const signTransaction = s.signTransaction
  ? s.signTransaction.bind(s)
  : () => Promise.reject(new Error('signing unavailable in stub'));
export const WatchWalletChanges = s.WatchWalletChanges ?? class { watch(){} stop(){} };
export const isBrowser = true;
export default { isConnected, isAllowed, getAddress, getNetwork, requestAccess, signTransaction, WatchWalletChanges, isBrowser };
`;
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: stubModule,
      });
    },
  );
}

/**
 * Injects a Freighter wallet stub that signs every transaction successfully.
 * Combines the window-level stub (for the freighterApi context) with a
 * vendor-chunk route intercept (for the ES module import path).
 */
async function injectAcceptingWallet(page: Page): Promise<void> {
  await page.addInitScript(
    buildFreighterInitScript(SENDER_ADDRESS, { rejectSigning: false }),
  );
  await routeFreighterVendorChunk(page);
}

/**
 * Injects a Freighter stub that rejects every signing request. Used to
 * exercise the primary failure path (user denies the transaction).
 */
async function injectRejectingWallet(page: Page): Promise<void> {
  await page.addInitScript(
    buildFreighterInitScript(SENDER_ADDRESS, { rejectSigning: true }),
  );
  await routeFreighterVendorChunk(page);
}

// ── Soroban RPC stub ─────────────────────────────────────────────────────────

/*
 * Base64 XDR templates for the SDK's Soroban RPC responses. @stellar/stellar-sdk
 * v16 decodes these strictly, so hand-rolled JSON is not enough:
 *
 *  - getAccount()        → JSON-RPC getLedgerEntries: key/value must be real
 *                          XDR LedgerKey / LedgerEntryData for SENDER
 *  - simulateTransaction → transactionData must be SorobanTransactionData XDR
 *  - sendTransaction     → status "PENDING" + hash (omit errorResultXdr)
 *  - getTransaction      → SUCCESS with envelope/result/resultMeta XDR
 *                          (TransactionMeta V3 with a void Soroban return)
 *
 * Constants generated and round-trip verified with @stellar/stellar-sdk 16.
 */
const LATEST_LEDGER = 100;
const SENDER_LEDGER_KEY_B64 =
  "AAAAAAAAAAASIzRFVmd4iZqrvM3e7wARIjNEVWZ3iJmqu8zd7v8QIQ==";
const SENDER_ACCOUNT_ENTRY_B64 =
  "AAAAAAAAAAASIzRFVmd4iZqrvM3e7wARIjNEVWZ3iJmqu8zd7v8QIQAAABdIdugAAAAAAAAAMDkAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAA";
const EMPTY_SOROBAN_DATA_B64 =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const SUCCESS_TX_RESULT_B64 =
  "AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAA=";
const SUCCESS_TX_META_V3_B64 =
  "AAAAAwAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAAA==";
const TX_ENVELOPE_TEMPLATE_B64 =
  "AAAAAgAAAAASIzRFVmd4iZqrvM3e7wARIjNEVWZ3iJmqu8zd7v8QIQAAAGQAAAAAAAAwOgAAAAEAAAAAAAAAAAAAAABqtuYwAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABYQvCUA8MEPbjeEtiXnSOOnGbf5oJ/Gd2O/Y71zDROUMAAAANY3JlYXRlX3N0cmVhbQAAAAAAAAYAAAASAAAAAAAAAAASIzRFVmd4iZqrvM3e7wARIjNEVWZ3iJmqu8zd7v8QIQAAABIAAAAAAAAAACY3SFlqe4ydrr/Q4fIDFCU2R1hpeoucrb7P4PECEyQ1AAAABQAAAABHhowAAAAABQAAAAAAAAPoAAAABQAAAAAAAAfQAAAABQAAAAAAAAPoAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

/**
 * Intercepts all Soroban RPC calls and returns the minimal successful
 * responses. This removes the live-network dependency entirely.
 */
async function stubSorobanRpc(page: Page): Promise<void> {
  await page.route("https://soroban-testnet.stellar.org/**", async (route) => {
    const body = route.request().postDataJSON() as
      | { method?: string }
      | null;
    const method = body?.method;
    let result: Record<string, unknown> = {};

    switch (method) {
      case "getLatestLedger":
        result = { sequence: String(LATEST_LEDGER), protocolVersion: 22 };
        break;
      case "getLedgerEntries":
        result = {
          entries: [
            {
              key: SENDER_LEDGER_KEY_B64,
              xdr: SENDER_ACCOUNT_ENTRY_B64,
              lastModifiedLedgerSeq: LATEST_LEDGER,
            },
          ],
          latestLedger: LATEST_LEDGER,
        };
        break;
      case "simulateTransaction":
        // results[0] is required: rpc.assembleTransaction reads
        // success.result.auth when the invoked op has no auth entries.
        result = {
          transactionData: EMPTY_SOROBAN_DATA_B64,
          minResourceFee: "100",
          events: [],
          results: [{ auth: [], xdr: "AAAAAQ==" }],
          latestLedger: LATEST_LEDGER,
        };
        break;
      case "sendTransaction":
        result = { status: "PENDING", hash: "flow-test-tx-hash" };
        break;
      case "getTransaction":
        result = {
          status: "SUCCESS",
          ledger: LATEST_LEDGER,
          createdAt: 1_700_000_000,
          applicationOrder: 1,
          feeBump: false,
          envelopeXdr: TX_ENVELOPE_TEMPLATE_B64,
          resultXdr: SUCCESS_TX_RESULT_B64,
          resultMetaXdr: SUCCESS_TX_META_V3_B64,
          events: { contractEventsXdr: [], transactionEventsXdr: [] },
          latestLedger: LATEST_LEDGER,
          latestLedgerCloseTime: 1_700_000_060,
          oldestLedger: LATEST_LEDGER - 1,
          oldestLedgerCloseTime: 1_700_000_000,
        };
        break;
      default:
        result = {};
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, result }),
    });
  });
}

// ── Shared wizard helpers ────────────────────────────────────────────────────

/**
 * Navigates to the Streams page and opens the Create Stream modal.
 * Returns the dialog locator.
 */
async function openModal(page: Page) {
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible({
    timeout: 15_000,
  });
  // The page can render two openers with this name (header button + FAB);
  // both open the same modal, so either is a valid user path.
  await page
    .getByRole("button", { name: "Create stream" })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: "Create stream" });
  // The modal component is lazy-loaded; allow extra time on a cold dev server.
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  return dialog;
}

/**
 * Advances the modal from the "choose" entry screen into the single-stream
 * wizard. The modal defaults to 'choose' mode on every open.
 */
function getChooseSingleStreamButton(dialog: ReturnType<Page["getByRole"]>) {
  return dialog.getByRole("button", { name: /create a single stream/i });
}

/**
 * Fills step 1 (recipient & deposit) the way a keyboard user does. The modal
 * is lazy-loaded and settles asynchronously after mount, so a fill can rarely
 * be clobbered by a late focus/autofocus race. Refill and re-assert until the
 * committed values stick; a persistent clobber still fails (toPass timeout).
 */
async function fillStep1RecipientAndDeposit(
  dialog: ReturnType<Page["getByRole"]>,
): Promise<void> {
  const recipientInput = dialog.getByRole("textbox", { name: "Recipient" });
  const depositInput = dialog.getByRole("textbox", { name: "Deposit amount" });

  await expect(recipientInput).toBeVisible();
  await expect(async () => {
    await recipientInput.fill(RECIPIENT_ADDRESS);
    await expect(recipientInput).toHaveValue(RECIPIENT_ADDRESS);
    await depositInput.fill("120");
    await expect(depositInput).toHaveValue("120");
  }).toPass({ timeout: 15_000 });

  await dialog.getByRole("button", { name: "Next" }).click();
}

/**
 * Fills step 2 (rate & schedule) the way a keyboard user does: type the value,
 * press Enter to commit (the app moves focus to duration and advances on the
 * second Enter). Rate 30 × duration 4 → 120 USDC, within the 200 USDC deposit
 * cap. Assertions on the committed values make any overwrite fail loudly here
 * instead of surfacing as a confusing blocked-Next state.
 */
async function fillStep2RateAndDuration(
  dialog: ReturnType<Page["getByRole"]>,
): Promise<void> {
  const rateInput = dialog.locator("#create-stream-accrual-rate");
  const durationInput = dialog.locator("#create-stream-duration");

  // Same settle-race protection as step 1: refill until the committed values
  // stick before pressing Enter (the app commits on Enter, not on Next).
  await expect(async () => {
    await rateInput.fill("30");
    await expect(rateInput).toHaveValue("30");
    await durationInput.fill("4");
    await expect(durationInput).toHaveValue("4");
  }).toPass({ timeout: 15_000 });

  await rateInput.press("Enter");
  await durationInput.press("Enter");

  // Step 2 must hand over to review; a stuck wizard fails here with context.
  await expect(
    dialog.getByRole("heading", { name: "Rate & schedule" }),
  ).toHaveCount(0, { timeout: 10_000 });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe("create-stream flow", () => {
  // The dev server compiles lazy chunks on demand; a cold run can exceed the
  // global 30s budget on the multi-step flows in this file.
  test.describe.configure({ timeout: 180_000 });

  /**
   * Success path — user completes all three wizard steps and the success modal
   * appears with the correct generated stream ID.
   */
  test("success: completes the three-step wizard and shows the success modal", async ({
    page,
  }) => {
    await injectAcceptingWallet(page);
    await stubSorobanRpc(page);

    const dialog = await openModal(page);
    await expect(getChooseSingleStreamButton(dialog)).toBeVisible();
    await getChooseSingleStreamButton(dialog).click();

    // ── Steps 1-3: walk the wizard to review ────────────────────────────────
    // The lazy modal can remount while it settles and drop the flow back to
    // the "choose" screen; re-sync the wizard state on every retry.
    await expect(async () => {
      if (
        await getChooseSingleStreamButton(dialog)
          .isVisible()
          .catch(() => false)
      ) {
        await getChooseSingleStreamButton(dialog).click();
      }
      if (
        !(await dialog
          .getByRole("heading", { name: "Rate & schedule" })
          .isVisible()
          .catch(() => false))
      ) {
        await fillStep1RecipientAndDeposit(dialog);
      }
      // Rate = 30 USDC/day, duration = 4 days → required deposit = 120 USDC
      // (within the 200 USDC deposit cap, so validation passes)
      await fillStep2RateAndDuration(dialog);
      await expect(
        dialog.getByText("120.00 USDC", { exact: true }),
      ).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await expect(dialog.getByText("30 USDC per day")).toBeVisible();

    // The submit button is the only "Create stream" button with exact match
    // (the dialog title also contains those words but is not a button).
    await dialog
      .getByRole("button", { name: "Create stream", exact: true })
      .click();

    // ── Post-submit: success modal ──────────────────────────────────────────

    // The create modal closes and the success modal opens.
    const successModal = page.getByRole("dialog", { name: /stream created/i });
    await expect(successModal).toBeVisible({ timeout: 20_000 });

    // The generated ID is streams.length + 1 = 4 + 1 = STR-005 (four seeded records).
    await expect(
      successModal.getByText("STR-005", { exact: true }),
    ).toBeVisible();
  });

  /**
   * Primary failure path — wallet rejects signing. The create modal stays
   * open, shows an inline error alert, and offers a "Try again" button that
   * re-enables the flow without any duplicate pending state.
   */
  test("failure: wallet rejection shows inline error and allows retry", async ({
    page,
  }) => {
    await injectRejectingWallet(page);
    await stubSorobanRpc(page);

    // A modal remount can reset the wizard mid-flow; each attempt starts from
    // a freshly opened modal so a settle race on one attempt cannot poison the
    // next. The test only fails if the rejection alert never appears.
    let rejectionSeen = false;
    let dialog: ReturnType<Page["getByRole"]> | null = null;
    for (let attempt = 0; attempt < 3 && !rejectionSeen; attempt++) {
      dialog = await openModal(page);
      await expect(getChooseSingleStreamButton(dialog)).toBeVisible();
      await getChooseSingleStreamButton(dialog).click();

      await expect(async () => {
        if (
          await getChooseSingleStreamButton(dialog!)
            .isVisible()
            .catch(() => false)
        ) {
          await getChooseSingleStreamButton(dialog!).click();
        }
        if (
          !(await dialog!
            .getByRole("heading", { name: "Rate & schedule" })
            .isVisible()
            .catch(() => false))
        ) {
          await fillStep1RecipientAndDeposit(dialog!);
        }
        await fillStep2RateAndDuration(dialog!);
        await expect(
          dialog!.getByText("120.00 USDC", { exact: true }),
        ).toBeVisible({ timeout: 5_000 });
      }).toPass({ timeout: 45_000 });

      // Submit — the wallet stub rejects the signing request.
      await dialog!
        .getByRole("button", { name: "Create stream", exact: true })
        .click();

      const errorAlert = dialog!
        .getByRole("alert")
        .filter({ hasText: /declined|rejected/i });
      try {
        // ── Error state — asserted while the state is fresh. A modal
        // remount during these assertions throws and retries the attempt.
        await expect(errorAlert.first()).toBeVisible({ timeout: 8_000 });

        // An accessible alert must describe the rejection.
        await expect(errorAlert.first()).toContainText(/declined|rejected/i);

        // The success modal must NOT have appeared.
        await expect(
          page.getByRole("dialog", { name: /stream created/i }),
        ).toHaveCount(0);

        // The modal must still be open so the user can act.
        await expect(dialog!).toBeVisible();

        // No submission in progress — no infinite spinner.
        await expect(
          dialog!.getByText(/submitting|waiting for stellar confirmation/i),
        ).toHaveCount(0);

        // A "Try again" affordance lets the user retry without reopening.
        await expect(
          dialog!.getByRole("button", { name: /try again/i }),
        ).toBeVisible();

        rejectionSeen = true;
      } catch {
        // Remount race: reopen a fresh modal and try again.
      }
    }
    expect(rejectionSeen, "wallet rejection alert never appeared").toBe(true);
  });

  /**
   * Validation guard — submitting Step 1 with an empty recipient blocks
   * progression and surfaces an accessible error message. This exercises the
   * validation layer (which feeds into createStreamAmounts usage in Step 2)
   * without requiring a wallet or RPC stub.
   */
  test("validation: missing recipient blocks wizard progression", async ({
    page,
  }) => {
    await injectAcceptingWallet(page);
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByRole("button", { name: "Create stream" })
      .first()
      .click();

    const dialog = page.getByRole("dialog", { name: "Create stream" });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(getChooseSingleStreamButton(dialog)).toBeVisible();
    await getChooseSingleStreamButton(dialog).click();

    // Deliberately leave Recipient empty and attempt to advance.
    await dialog.getByRole("button", { name: "Next" }).click();

    // The wizard must stay on Step 1 — "Rate & schedule" heading must not appear.
    await expect(
      dialog.getByRole("heading", { name: "Rate & schedule" }),
    ).toHaveCount(0);

    // An error message for the missing recipient must be visible.
    await expect(dialog.getByText(/recipient is required/i).first()).toBeVisible();
  });
});
