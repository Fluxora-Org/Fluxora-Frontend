import { expect, test, type Page } from "@playwright/test";

const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";

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
          window.location.origin,
        );
      });
    },
    { address: MOCK_ADDRESS },
  );
}

test.describe("Treasury page lazy loading", () => {
  test.beforeEach(async ({ page }) => {
    await stubConnectedWallet(page);
  });

  test("loads deferred chunks without breaking the page", async ({ page }) => {
    // Go to the treasury page
    await page.goto("/app/treasurypage", { waitUntil: "domcontentloaded" });

    // Verify main components eventually render (waiting for lazy loaded chunks)
    await expect(page.getByRole("heading", { name: "Treasury Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Treasury Stream Flow" })).toBeVisible();

    // Click Export to load the ReportBuilderPanel chunk
    await page.getByRole("button", { name: "Export Report" }).click();

    // Verify the modal appears
    await expect(page.getByRole("dialog", { name: "Export Treasury Report" })).toBeVisible();
  });
});
