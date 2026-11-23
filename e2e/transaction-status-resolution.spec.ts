import { expect, test, type Page } from "@playwright/test";

const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const RECIPIENT_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

type TxStatus = "NOT_FOUND" | "SUCCESS" | "FAILED";

async function stubAcceptingWallet(page: Page) {
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
    { address: MOCK_ADDRESS },
  );
}

async function stubSorobanRpc(page: Page, statuses: TxStatus[]) {
  let getTransactionAttempts = 0;
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
      result = { status: "PENDING", hash: "resolve-tx-hash" };
    } else if (method === "getTransaction") {
      const status =
        statuses[getTransactionAttempts] ??
        statuses[statuses.length - 1] ??
        "SUCCESS";
      getTransactionAttempts += 1;
      result = { status, txHash: "resolve-tx-hash" };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: body ? 1 : 0, result }),
    });
  });
}

async function fillWizardAndSubmit(page: Page) {
  await page.getByRole("heading", { name: "Streams" }).waitFor();
  await page.getByRole("button", { name: "Create stream" }).click();
  const dialog = page.getByRole("dialog", { name: "Create stream" });
  await dialog
    .getByRole("textbox", { name: "Recipient" })
    .fill(RECIPIENT_ADDRESS);
  await dialog.getByRole("textbox", { name: "Deposit amount" }).fill("120");
  await dialog.getByRole("button", { name: "Next" }).click();
  await dialog.locator("#create-stream-accrual-rate").fill("30");
  await dialog.locator("#create-stream-duration").fill("4");
  await dialog.getByRole("button", { name: "Next" }).click();
  const createButton = dialog.getByRole("button", {
    name: "Create stream",
    exact: true,
  });
  await createButton.click();
  return dialog;
}

test("resolves a pending create-stream transaction to confirmed via on-chain status", async ({
  page,
}) => {
  await stubAcceptingWallet(page);
  // First two getTransaction polls resolve to NOT_FOUND (transaction submitted but
  // not yet confirmed), forcing the flow through its pending/confirmation loop.
  await stubSorobanRpc(page, ["NOT_FOUND", "NOT_FOUND", "SUCCESS"]);
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  const dialog = await fillWizardAndSubmit(page);

  await expect(dialog.getByRole("status").first()).toContainText(
    /submitting transaction to stellar|waiting for stellar confirmation/i,
  );

  const successDialog = page.getByRole("dialog", { name: /stream created/i });
  await expect(successDialog).toBeVisible();
  await expect(dialog).toHaveCount(0);
});

test("surfaces an on-chain failure and recovers through the retry path", async ({
  page,
}) => {
  await stubAcceptingWallet(page);
  // Both implicit submissions fail on-chain; the retry then confirms.
  await stubSorobanRpc(page, ["FAILED", "FAILED", "SUCCESS"]);
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  const dialog = await fillWizardAndSubmit(page);

  await expect(
    dialog
      .getByText(
        "Transaction execution failed on-chain. Check the transaction details and try again if the problem persists.",
      )
      .first(),
  ).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Try again" })).toBeVisible();

  await dialog.getByRole("button", { name: "Try again" }).click();

  const successDialog = page.getByRole("dialog", { name: /stream created/i });
  await expect(successDialog).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
