import { test, expect } from "@playwright/test";
import { scanRoute } from "./axe-helper";

/**
 * Mock Stellar wallet address for accessibility tests.
 * Security: Never use real Stellar addresses in test fixtures.
 */
const MOCK_WALLET_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const MOCK_WALLET_NETWORK = "TESTNET";
const VALID_STELLAR_RECIPIENT =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

/**
 * Axe options shared by every modal scan in this file.
 *
 * - `include`: scope the scan to the open dialog so the assertion is about the
 *   create-stream surface, not the streams page behind it (also keeps axe fast).
 * - `deferRules: ["color-contrast"]`: the app's muted/primary text tokens
 *   (`--muted` #6b7a94, `--primary` #00b8d4 on `--surface-raised` #e8ecf1) fall
 *   short of WCAG AA app-wide and are tracked as a pending design-token update
 *   (see the ALLOWLISTED_RULES note in e2e/axe-helper.ts). Deferring it here —
 *   rather than globally — keeps that debt from masking the structural a11y
 *   checks (names, roles, focus order, live regions) this suite exists to guard.
 */
const MODAL_SCAN_OPTIONS = {
  include: '[role="dialog"]',
  deferRules: ["color-contrast"],
} as const;

async function injectMockWallet(
  page: import("@playwright/test").Page,
  address: string,
  network: string,
): Promise<void> {
  await page.addInitScript(
    ({ addr, net }: { addr: string; net: string }) => {
      const stub = {
        isConnected: () => Promise.resolve({ isConnected: true }),
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
      (window as unknown as Record<string, unknown>)["__freighterStub"] = stub;
      (window as unknown as Record<string, unknown>)["freighterApi"] = stub;
    },
    { addr: address, net: network },
  );

  await page.route(
    (url) => url.href.includes("freighter") || url.href.includes("vendor-stellar"),
    async (route) => {
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
    },
  );

  await page.route(
    (url) => url.port === "8787" && url.pathname.startsWith("/treasury"),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            { label: "Active Streams", value: "2", desc: "active streams" },
            { label: "Total Streaming", value: "10,000.00 USDC", desc: "total streaming" },
            { label: "Withdrawable", value: "5,000.00 USDC", desc: "withdrawable" },
          ],
        }),
      }),
  );

  await page.route(
    (url) => url.port === "8787" && url.pathname.startsWith("/streams"),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              id: "STR-001",
              name: "Dev Grant - Alice",
              status: "Active",
              health: "Healthy",
              depositAmount: 10000,
              streamedAmount: 5000,
              withdrawableAmount: 2000,
              remainingAmount: 5000,
              monthlyRate: 1000,
              progress: 50,
              recipientAddress: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
              recipientName: "Alice",
              treasuryAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
              treasuryName: "Main Treasury",
              asset: "USDC",
              startDate: "2026-01-01T00:00:00Z",
              endDate: "2026-12-31T23:59:59Z",
              summary: "Dev Grant Stream",
              timeline: [],
              tags: ["Grant"],
            },
          ],
        }),
      }),
  );
}

const TRIGGER_NAME = "Create stream";
const DIALOG_NAME = "Create stream";

type PWPage = import("@playwright/test").Page;
type PWLocator = import("@playwright/test").Locator;

/**
 * Opens the create-stream modal from the Streams hero and returns both the
 * trigger (for focus-restoration assertions) and the dialog locator.
 *
 * The modal is lazy-loaded (`React.lazy`), so the first activation kicks off a
 * dynamic import that a cold Vite dev server transforms on demand — hence the
 * generous visibility timeout rather than the 10s default.
 */
async function openCreateStreamModal(
  page: PWPage,
  opts: { via?: "mouse" | "keyboard" } = {},
): Promise<{ trigger: PWLocator; dialog: PWLocator }> {
  const trigger = page.getByRole("button", { name: TRIGGER_NAME }).first();
  await expect(trigger).toBeVisible();

  if (opts.via === "keyboard") {
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await trigger.press("Enter");
  } else {
    await trigger.click();
  }

  const dialog = page.getByRole("dialog", { name: DIALOG_NAME });
  await expect(dialog).toBeVisible({ timeout: 30000 });
  return { trigger, dialog };
}

/** Advances the modal from the "choose" screen into the single-stream wizard. */
async function chooseSingleStream(dialog: PWLocator): Promise<void> {
  const singleModeBtn = dialog.getByRole("button", {
    name: /create a single stream/i,
  });
  if (await singleModeBtn.isVisible()) {
    await singleModeBtn.click();
  }
}

/** Reports whether the document's active element sits inside the dialog. */
function focusIsInsideDialog(dialog: PWLocator): Promise<boolean> {
  return dialog.evaluate((el) => el.contains(document.activeElement));
}

test.describe("CreateStream Modal Accessibility & Focus Management", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000);
    page.on("console", (msg) => console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`PAGE ERROR: ${err.message}`));
    await injectMockWallet(page, MOCK_WALLET_ADDRESS, MOCK_WALLET_NETWORK);
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });
    console.log(`NAVIGATED URL: ${page.url()}`);
    // The streams route is code-split and hydrates its seeded data before the
    // hero renders; a cold Vite dev server transforming the chunk on first hit
    // can push this past the default expect timeout, so wait generously here.
    const trigger = page.getByRole("button", { name: TRIGGER_NAME }).first();
    await expect(trigger).toBeVisible({ timeout: 45000 });
  });

  test("CreateStream: initial focus entry and axe scanning on open", async ({ page }) => {
    const { dialog } = await openCreateStreamModal(page);

    // Focus enters the dialog on open (WAI-ARIA APG dialog pattern).
    expect(await focusIsInsideDialog(dialog)).toBe(true);

    // Perform axe scan on the opened modal state
    await scanRoute(page, "CreateStream Modal (Initial Open)", MODAL_SCAN_OPTIONS);
  });

  test("CreateStream: focus trapping prevents focus escape on Tab and Shift+Tab", async ({ page }) => {
    const { dialog } = await openCreateStreamModal(page);

    // Switch to single stream mode to have multiple interactive controls
    await chooseSingleStream(dialog);

    // Get all visible focusable elements inside the dialog
    const focusableElements = dialog.locator(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(1);

    const firstElement = focusableElements.first();
    const lastElement = focusableElements.last();

    // From the first control, Shift+Tab must not escape the dialog.
    await firstElement.focus();
    await page.keyboard.press("Shift+Tab");
    expect(await focusIsInsideDialog(dialog)).toBe(true);

    // From the last control, Tab must not escape the dialog.
    await lastElement.focus();
    await page.keyboard.press("Tab");
    expect(await focusIsInsideDialog(dialog)).toBe(true);
  });

  test("CreateStream: keyboard exit via Escape restores focus to trigger", async ({ page }) => {
    // Open with the keyboard so the restored focus target is unambiguous.
    const { trigger, dialog } = await openCreateStreamModal(page, {
      via: "keyboard",
    });

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();

    // Focus returns to the element that opened the modal.
    await expect(trigger).toBeFocused();
  });

  test("CreateStream: close button restores focus to trigger", async ({ page }) => {
    const { trigger, dialog } = await openCreateStreamModal(page);

    const closeBtn = dialog.getByRole("button", {
      name: /close create stream modal/i,
    });
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();

    await expect(trigger).toBeFocused();
  });

  test("CreateStream: validation error announcements and axe compliance", async ({ page }) => {
    const { dialog } = await openCreateStreamModal(page);
    await chooseSingleStream(dialog);

    // Attempt to advance without filling mandatory fields.
    await dialog.getByRole("button", { name: /^next$/i }).click();

    // The required-recipient message is surfaced and announced (it renders in
    // both the form-level error summary and the inline field error).
    await expect(dialog.getByText(/recipient is required/i).first()).toBeVisible();

    // Scan route with axe while validation error state is active
    await scanRoute(page, "CreateStream Modal (Validation Errors)", MODAL_SCAN_OPTIONS);
  });

  test("CreateStream: keyboard navigation through wizard steps with disabled submit verification", async ({ page }) => {
    const { trigger, dialog } = await openCreateStreamModal(page);
    await chooseSingleStream(dialog);

    // The money-moving "Create stream" submit action must not be reachable
    // until the wizard has been completed — step 1 only offers "Next".
    await expect(
      dialog.getByRole("button", { name: /^create stream$/i }),
    ).toHaveCount(0);

    // Step 1: recipient + deposit amount.
    await dialog
      .getByRole("textbox", { name: "Recipient" })
      .fill(VALID_STELLAR_RECIPIENT);
    await dialog.getByRole("textbox", { name: "Deposit amount" }).fill("150");

    // Advance to step 2 by activating "Next" with the keyboard.
    const nextToStep2 = dialog.getByRole("button", { name: /^next$/i });
    await nextToStep2.focus();
    await expect(nextToStep2).toBeFocused();
    await nextToStep2.press("Enter");

    await expect(
      dialog.getByRole("heading", { name: /rate & schedule/i }),
    ).toBeVisible();

    // Advance to step 3 (Review & create).
    const nextToStep3 = dialog.getByRole("button", { name: /^next$/i });
    await nextToStep3.focus();
    await expect(nextToStep3).toBeFocused();
    await nextToStep3.press("Enter");

    await expect(dialog.getByText("By creating this stream:")).toBeVisible();

    // The submit action is now available and enabled for the reviewed stream.
    await expect(
      dialog.getByRole("button", { name: /^create stream$/i }),
    ).toBeEnabled();

    // Focus stayed trapped inside the dialog across the whole wizard.
    expect(await focusIsInsideDialog(dialog)).toBe(true);

    // Scan Step 3 with axe
    await scanRoute(page, "CreateStream Modal (Step 3 Review)", MODAL_SCAN_OPTIONS);

    // Exit via Escape from the deepest step and confirm focus restoration.
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});
