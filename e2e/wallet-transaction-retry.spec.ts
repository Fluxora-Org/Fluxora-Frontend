import { expect, test, type Page } from "@playwright/test";

const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
const RECIPIENT_ADDRESS =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

async function stubRejectThenAcceptingWallet(page: Page) {
  await page.addInitScript(
    ({ address }) => {
      (window as unknown as { freighter: boolean }).freighter = true;
      let signingAttempts = 0;
      (window as unknown as { walletSignAttempts: number }).walletSignAttempts =
        0;

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
            signingAttempts += 1;
            (
              window as unknown as { walletSignAttempts: number }
            ).walletSignAttempts = signingAttempts;
            if (signingAttempts === 1) {
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
    { address: MOCK_ADDRESS },
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
      result = { status: "PENDING", hash: "retry-tx-hash" };
    } else if (method === "getTransaction") {
      result = { status: "SUCCESS", txHash: "retry-tx-hash" };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jsonrpc: "2.0", id: body ? 1 : 0, result }),
    });
  });
}

test("rejected wallet transaction can be retried without duplicate pending state", async ({
  page,
}) => {
  await stubRejectThenAcceptingWallet(page);
  await stubSorobanRpc(page);
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();
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

  await expect(dialog.getByRole("alert")).toContainText(
    "Transaction signature request was declined by the user.",
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { walletSignAttempts: number })
            .walletSignAttempts,
      ),
    )
    .toBe(1);
  await expect(
    dialog.getByText(/submitting|waiting for stellar confirmation/i),
  ).toHaveCount(0);
  await expect(createButton).toBeEnabled();

  await dialog.getByRole("button", { name: "Try again" }).click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { walletSignAttempts: number })
            .walletSignAttempts,
      ),
    )
    .toBe(2);
  await expect(
    page.getByRole("dialog", { name: /stream created/i }),
  ).toBeVisible();
  await expect(dialog).toHaveCount(0);
});
