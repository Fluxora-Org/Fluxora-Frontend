import { expect, test, type Page } from "@playwright/test";

const KNOWN_STREAM_ID = "STR-001";
const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";

async function stubConnectedWallet(page: Page) {
  await page.addInitScript(
    ({ address }) => {
      (window as unknown as { freighter: boolean }).freighter = true;
      window.addEventListener("message", (event: MessageEvent) => {
        const data = event.data;
        if (!data || data.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST" || event.source !== window) {
          return;
        }
        const base = {
          source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
          messagedId: data.messageId,
          error: "",
        };
        let payload: Record<string, unknown> = {};
        switch (data.type) {
          case "REQUEST_CONNECTION_STATUS": payload = { isConnected: true }; break;
          case "REQUEST_ALLOWED_STATUS": case "SET_ALLOWED_STATUS": payload = { isAllowed: true }; break;
          case "REQUEST_PUBLIC_KEY": case "REQUEST_ACCESS": case "REQUEST_USER_INFO": payload = { publicKey: address, address }; break;
          case "REQUEST_NETWORK": case "REQUEST_NETWORK_DETAILS":
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
        }
        window.postMessage({ ...base, ...payload, apiData: payload }, window.location.origin);
      });
    },
    { address: MOCK_ADDRESS }
  );
}

test.beforeEach(async ({ page }) => {
  await stubConnectedWallet(page);
});

test.describe("Stream Top-up Flow", () => {
  test("success path: tops up the stream successfully", async ({ page }) => {
    await page.goto(`/app/streams/${KNOWN_STREAM_ID}`, { waitUntil: "domcontentloaded" });

    const amountInput = page.getByRole("spinbutton", { name: /top up amount/i });
    const submitBtn = page.getByRole("button", { name: /submit top up/i });

    await expect(amountInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toBeDisabled();

    await amountInput.fill("100");
    await expect(submitBtn).toBeEnabled();

    await submitBtn.click();
    
    // Status should be pending
    const statusText = page.getByTestId("top-up-status");
    await expect(statusText).toHaveText("Pending…");

    // Eventually confirms
    await expect(statusText).toHaveText("Confirmed", { timeout: 2000 });
  });

  test("failure path: rejects invalid top-up amounts", async ({ page }) => {
    await page.goto(`/app/streams/${KNOWN_STREAM_ID}`, { waitUntil: "domcontentloaded" });

    const amountInput = page.getByRole("spinbutton", { name: /top up amount/i });
    const submitBtn = page.getByRole("button", { name: /submit top up/i });

    await amountInput.fill("-10");
    await submitBtn.click();

    const statusText = page.getByTestId("top-up-status");
    await expect(statusText).toHaveText("Pending…");
    
    // Eventually rejects
    await expect(statusText).toHaveText("Rejected", { timeout: 2000 });
  });
});
