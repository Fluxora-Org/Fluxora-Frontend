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
