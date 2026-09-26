import { expect, test, type Page } from "@playwright/test";

/**
 * Stream cancellation — end-to-end coverage of what the product actually ships.
 *
 * Issue #1759 asks for an E2E test of the "stream cancellation flow". Auditing
 * the repository first shows there is no cancel flow to drive, so this spec
 * covers the cancellation surface that does exist and pins the gap so that
 * adding a real flow is a deliberate change:
 *
 *  - `src/pages/StreamDetail.tsx` exposes no cancel action. Its only "cancel"
 *    references are AbortController-based fetch cancellation (the
 *    `activeCancelRef` guard around `getStreamById`) and a read-only
 *    "Cancelled" status label. Both are unreachable through the UI because...
 *  - `StreamStatus` (`src/components/treasuryOverviewPage/Stream.ts`) is
 *    `"Active" | "Paused" | "Completed"` — there is no "Cancelled" state to
 *    reach, and the seeded dataset contains no cancelled stream.
 *  - The single cancellation control in the app is the "Pause/Cancel" item in
 *    the stream row context menu (`StreamRow.tsx`). It closes the menu and
 *    raises a toast; it submits no transaction and does not change the row.
 *
 * The assertions below therefore verify the observable contract of that control
 * (offered, reports success, and disabled once a stream is Completed) and
 * explicitly assert the absence of a real cancellation (no navigation, no
 * status change) rather than pretending a cancel flow exists.
 */

const TREASURY_URL = "/app/treasurypage";
const KNOWN_STREAM_ID = "STR-001";
const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const ACTION_BUTTON = /^Actions for stream/;
const CANCEL_ITEM = "Pause/Cancel";

/**
 * Minimal Freighter provider stub so `/app/*` passes RequireWallet. It answers
 * the read-only status/address/network probes and never signs anything.
 */
async function stubConnectedWallet(page: Page) {
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
              networkDetails: {
                network: "TESTNET",
                networkPassphrase: "Test SDF Network ; September 2015",
                networkUrl: "https://horizon-testnet.stellar.org",
              },
            };
            break;
          default:
            payload = {};
        }
        window.postMessage(
          { ...base, ...payload, apiData: payload },
          window.location.origin
        );
      });
    },
    { address: MOCK_ADDRESS }
  );
}

async function openTreasuryStreams(page: Page) {
  await page.goto(TREASURY_URL, { waitUntil: "domcontentloaded" });
  // The "Recent streams" panel is lazy-loaded behind Suspense, so wait for a
  // rendered row action rather than the page heading.
  await expect(page.getByRole("button", { name: ACTION_BUTTON }).first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await stubConnectedWallet(page);
});

test.describe("Stream cancellation control", () => {
  test("Pause/Cancel is offered on a live stream and reports success without cancelling it", async ({
    page,
  }) => {
    await openTreasuryStreams(page);

    const cancellableRow = page
      .getByRole("row")
      .filter({ has: page.locator('[data-status="Active"], [data-status="Paused"]') })
      .first();

    const statusBadge = cancellableRow.locator("[data-status]").first();
    const statusBefore = await statusBadge.getAttribute("data-status");
    const urlBefore = page.url();

    await cancellableRow.getByRole("button", { name: ACTION_BUTTON }).click();

    const cancelItem = cancellableRow.getByRole("menuitem", { name: CANCEL_ITEM });
    await expect(cancelItem).toBeVisible();
    await expect(cancelItem).toBeEnabled();

    await cancelItem.click();

    // The stub reports success...
    await expect(page.getByText(/Stream (paused|resumed) successfully/)).toBeVisible();

    // ...but nothing was cancelled: no navigation and no status transition.
    expect(page.url()).toBe(urlBefore);
    await expect(statusBadge).toHaveAttribute("data-status", statusBefore ?? "");
  });

  test("Pause/Cancel is disabled for a completed stream", async ({ page }) => {
    await openTreasuryStreams(page);

    const completedRow = page
      .getByRole("row")
      .filter({ has: page.locator('[data-status="Completed"]') })
      .first();

    test.skip(
      (await completedRow.count()) === 0,
      "seeded dataset exposes no completed stream to assert against"
    );

    await completedRow.getByRole("button", { name: ACTION_BUTTON }).click();

    await expect(completedRow.getByRole("menuitem", { name: CANCEL_ITEM })).toBeDisabled();
  });

  test("the stream detail route exposes no cancel action", async ({ page }) => {
    // Characterises the gap #1759 hit: cancelling is not available on the
    // stream detail page, only the (stubbed) row-menu item above.
    await page.goto(`/app/streams/${KNOWN_STREAM_ID}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await expect(
      page.getByRole("button", { name: /cancel (stream|this stream|streaming)/i })
    ).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: CANCEL_ITEM })).toHaveCount(0);
  });
});
