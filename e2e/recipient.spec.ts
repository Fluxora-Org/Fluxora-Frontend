import { expect, test, type Page } from "@playwright/test";

const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";

async function stubWallet(page: Page, options: { accept: boolean }) {
  await page.addInitScript(
    ({ address, accept }) => {
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
            if (!accept) {
              window.postMessage(
                {
                  ...base,
                  error: "User rejected the signing request",
                  apiData: { error: "User rejected the signing request" },
                },
                window.location.origin,
              );
              return;
            }
            payload = { signedTxXdr: data.xdr };
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
    { address: MOCK_ADDRESS, accept: options.accept },
  );
}

async function stubSorobanRpc(page: Page) {
  await page.route("https://soroban-testnet.stellar.org/**", async (route) => {
    const request = route.request();
    const body = request.postDataJSON() as { method?: string } | null;
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
      result = { status: "PENDING", hash: "withdraw-tx-hash" };
    } else if (method === "getTransaction") {
      result = { status: "SUCCESS", txHash: "withdraw-tx-hash" };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: body ? 1 : 0, result }),
    });
  });
}

test("shows recipient withdraw state and incoming streams", async ({ page }) => {
  await page.goto("/app/recipient", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Your streams" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Withdraw 22,600 USDC" }),
  ).toBeEnabled();
  await expect(page.getByText("Withdrawable now")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Incoming streams", exact: true }),
  ).toBeVisible();
});

test("completes the recipient withdrawal flow successfully", async ({ page }) => {
  await stubWallet(page, { accept: true });
  await stubSorobanRpc(page);

  await page.goto("/app/recipient", { waitUntil: "domcontentloaded" });
  
  const withdrawButton = page.getByRole("button", { name: "Withdraw 22,600 USDC" });
  await expect(withdrawButton).toBeVisible();
  await withdrawButton.click();

  await expect(page.getByRole("button", { name: "Withdrawn successfully!" })).toBeVisible();
  await expect(page.getByText("Withdrawal completed successfully on-chain!")).toBeVisible();
});

test("shows an error when the transaction is rejected", async ({ page }) => {
  await stubWallet(page, { accept: false });
  await stubSorobanRpc(page);

  await page.goto("/app/recipient", { waitUntil: "domcontentloaded" });
  
  const withdrawButton = page.getByRole("button", { name: "Withdraw 22,600 USDC" });
  await expect(withdrawButton).toBeVisible();
  await withdrawButton.click();

  await expect(page.getByRole("button", { name: "Withdrawal Failed - Retry" })).toBeVisible();
  await expect(page.getByText(/Withdrawal failed:/)).toBeVisible();
});
