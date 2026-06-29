import { expect, test, type Page } from "@playwright/test";

/**
 * Deep-link e2e coverage for the /app/streams/:streamId route.
 *
 * The dev server runs against the seeded demo dataset in
 * `src/data/streamRecords.ts`, whose first record has id `STR-001`
 * ("Dev Grant - Alice"). Navigating directly to that id should render the
 * stream detail view with its timeline, mirroring a shared/email deep link.
 *
 * `/app/*` routes are gated by RequireWallet, so we stub the Freighter provider
 * (via its `window.postMessage` request/response protocol) to report a
 * connected wallet. The stub never signs anything — it only answers the
 * read-only status/address/network probes used during silent restore.
 *
 * `STR-001` is hardcoded (a static, app-controlled id with no `../` traversal
 * characters), so there is no opportunity for path injection in mock mode.
 */
const KNOWN_STREAM_ID = "STR-001";
const KNOWN_STREAM_NAME = "Dev Grant - Alice";
const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";

/**
 * Installs a minimal Freighter provider stub that answers the read-only probes
 * (`REQUEST_CONNECTION_STATUS`, `REQUEST_PUBLIC_KEY`/address, network details,
 * allowed status) so RequireWallet treats the session as connected.
 */
async function stubConnectedWallet(page: Page) {
  await page.addInitScript(
    ({ address }) => {
      // Signals the synchronous `window.freighter` fast-path used by the API.
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
          window.location.origin,
        );
      });
    },
    { address: MOCK_ADDRESS },
  );
}

test.beforeEach(async ({ page }) => {
  await stubConnectedWallet(page);
});

test("renders the matching stream detail when deep-linking to a known id", async ({
  page,
}) => {
  await page.goto(`/app/streams/${KNOWN_STREAM_ID}`, {
    waitUntil: "domcontentloaded",
  });

  // The correct stream is expanded into the detail view (its name is the h1).
  await expect(
    page.getByRole("heading", { level: 1, name: KNOWN_STREAM_NAME }),
  ).toBeVisible();

  // The StreamTimeline visualization is present in the DOM.
  await expect(
    page.getByRole("region", { name: /stream timeline/i }).first(),
  ).toBeVisible();

  // The URL still reflects the deep-linked stream id after render.
  await expect(page).toHaveURL(new RegExp(`/app/streams/${KNOWN_STREAM_ID}$`));
});

test("shows a not-found state for an unknown stream id", async ({ page }) => {
  const unknownId = "STR-DOES-NOT-EXIST";
  await page.goto(`/app/streams/${unknownId}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", {
      name: new RegExp(`couldn.t find ${unknownId}`, "i"),
    }),
  ).toBeVisible();

  // A path back to the list is offered.
  await expect(
    page.getByRole("button", { name: /back to streams/i }),
  ).toBeVisible();
});
