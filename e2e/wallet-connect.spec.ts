/**
 * e2e: Wallet connection flow — issue #1762
 *
 * Covers the end-to-end path a real user takes through ConnectWallet.tsx and
 * ConnectWalletModal.tsx:
 *   - Success: open the modal, choose Freighter, approve the request, and land
 *     on the app with the connected wallet visible.
 *   - Primary failure: the user declines the extension prompt and the modal
 *     surfaces a recoverable error instead of connecting.
 *   - Rejection recovery: retrying re-runs the same flow and succeeds.
 *   - Not installed: Freighter is absent, so the install prompt is shown.
 *
 * The Freighter extension is stubbed entirely via page.addInitScript +
 * page.route so no real extension, network, or signing is required. A mutable
 * `window.__freighterStub.mode` lets the test flip grant/deny/missing behaviour
 * without touching the extension bus. Assertions only use user-visible roles,
 * labels and URLs — never component internals.
 */

import { expect, test, type Page } from "@playwright/test";
import {
  installFreighterMock,
  setFreighterMode,
  type FreighterMockMode,
} from "./helpers/freighterMock";

const STUB_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const STUB_NETWORK = "TESTNET";

// formatAddress(STUB_ADDRESS, 6, 4) → "GAAAAA...AAAA"
const MASKED_ADDRESS = "GAAAAA...AAAA";

async function setupPage(page: Page, mode: FreighterMockMode) {
  await installFreighterMock(page, {
    address: STUB_ADDRESS,
    network: STUB_NETWORK,
    mode,
    autoConnect: false,
  });
}

// ─── Selectors ────────────────────────────────────────────────────────────────

/** The wallet-status pill button shown once connected. */
function walletButton(page: Page) {
  return page.getByRole("button", {
    name: `Wallet ${MASKED_ADDRESS}. Open wallet options.`,
  });
}

function connectCta(page: Page) {
  return page.getByRole("button", { name: "Connect wallet", exact: true });
}

function freighterOption(page: Page) {
  return page.getByRole("button", { name: /connect with freighter/i });
}

/** Opens the modal from the /connect-wallet page. */
async function openWalletModal(page: Page) {
  await page.goto("/connect-wallet", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: /connect your wallet/i }),
  ).toBeVisible();
  await connectCta(page).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("wallet connection flow", () => {
  test("connects Freighter end to end and lands on the app", async ({
    page,
  }) => {
    await setupPage(page, "grants");
    await openWalletModal(page);

    await freighterOption(page).click();

    // Successful connection leaves the connect page for the app root and the
    // navbar exposes the connected wallet pill.
    await page.waitForURL("**/app", { timeout: 10_000 });
    await expect(walletButton(page)).toBeVisible({ timeout: 10_000 });
    await expect(page).not.toHaveURL(/connect-wallet/);
  });

  test("shows a recoverable error when the connection request is rejected", async ({
    page,
  }) => {
    await setupPage(page, "denies");
    await openWalletModal(page);

    await freighterOption(page).click();

    // Primary failure: the user declined in the extension.
    const rejected = page.getByTestId("error-state-rejected");
    await expect(rejected).toBeVisible({ timeout: 10_000 });
    await expect(
      rejected.getByRole("heading", { name: /connection rejected/i }),
    ).toBeVisible();

    // The wallet never connected, so we stay on the connect page.
    await expect(page).toHaveURL(/connect-wallet/);
    await expect(walletButton(page)).toHaveCount(0);

    // A recovery action is offered.
    await expect(
      rejected.getByRole("button", { name: /retry connection/i }),
    ).toBeVisible();
  });

  test("retrying after a rejection re-runs the flow and succeeds", async ({
    page,
  }) => {
    await setupPage(page, "denies");
    await openWalletModal(page);

    await freighterOption(page).click();
    const rejected = page.getByTestId("error-state-rejected");
    await expect(rejected).toBeVisible({ timeout: 10_000 });

    // The user approves on the second attempt.
    await setFreighterMode(page, "grants");
    await rejected.getByRole("button", { name: /retry connection/i }).click();

    await page.waitForURL("**/app", { timeout: 10_000 });
    await expect(walletButton(page)).toBeVisible({ timeout: 10_000 });
  });

  test("prompts to install Freighter when the extension is absent", async ({
    page,
  }) => {
    await setupPage(page, "missing");
    await openWalletModal(page);

    await freighterOption(page).click();

    const notInstalled = page.getByTestId("error-state-not-installed");
    await expect(notInstalled).toBeVisible({ timeout: 10_000 });
    await expect(
      notInstalled.getByRole("heading", { name: /freighter not installed/i }),
    ).toBeVisible();
    await expect(
      notInstalled.getByRole("link", { name: /download freighter/i }),
    ).toBeVisible();
  });
});
