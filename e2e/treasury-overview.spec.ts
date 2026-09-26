import { expect, test, type Page } from "@playwright/test";

const MOCK_ADDRESS = "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";

async function stubConnectedWallet(page: Page, options?: { disableMocks?: boolean }) {
  await page.addInitScript(
    ({ address, disableMocks }) => {
      (window as unknown as { freighter: boolean }).freighter = true;
      if (disableMocks) {
        (window as unknown as { __FLUXORA_USE_MOCKS__: boolean }).__FLUXORA_USE_MOCKS__ = false;
      }

      window.addEventListener("message", (event: MessageEvent) => {
        const data = event.data;
        if (
          !data ||
          typeof data !== "object" ||
          data.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST"
        ) {
          return;
        }

        const base = {
          source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
          messagedId: data.messageId,
          error: "",
        };

        let payload: Record<string, unknown>;
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
                networkName: "TESTNET",
                networkPassphrase: "Test SDF Network ; September 2015",
                networkUrl: "https://horizon-testnet.stellar.org",
                sorobanRpcUrl: "https://soroban-testnet.stellar.org",
              },
            };
            break;
          default:
            payload = {};
        }

        window.postMessage(
          { ...base, ...payload, apiData: payload },
          "*",
        );
      });
    },
    { address: MOCK_ADDRESS, disableMocks: options?.disableMocks ?? false },
  );
}

test.describe("Treasury Overview End-to-End Flow", () => {
  test("success path: loads overview metrics, switches time periods, inspects activity, exports report, and navigates", async ({
    page,
  }) => {
    await stubConnectedWallet(page);

    // 1. User navigates to the treasury overview page
    await page.goto("/app/treasurypage", { waitUntil: "domcontentloaded" });

    // 2. Header and period selector are visible
    const headerTitle = page.getByRole("heading", {
      level: 1,
      name: "Treasury overview",
    });
    await expect(headerTitle).toBeVisible();
    await expect(page.getByText("Your streaming activity at a glance.")).toBeVisible();

    // Verify initial period display
    await expect(page.getByTestId("figures-period-label")).toHaveText(
      "Figures cover: Last 30 Days",
    );
    await expect(page.getByTestId("period-boundaries")).toBeVisible();

    // 3. User verifies metric cards
    await expect(page.getByRole("group", { name: "Active Streams" })).toBeVisible();
    await expect(page.getByText("streams currently accruing")).toBeVisible();

    await expect(page.getByRole("group", { name: "Total Streaming" })).toBeVisible();
    await expect(page.getByText("combined deposit in active streams")).toBeVisible();

    await expect(page.getByRole("group", { name: "Withdrawable" })).toBeVisible();
    await expect(page.getByText("available for recipients to withdraw")).toBeVisible();

    // 4. User inspects visualization sections
    await expect(page.getByRole("heading", { name: "Treasury Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Treasury Stream Flow" })).toBeVisible();

    // 5. User changes the time period
    const periodSelect = page.getByRole("combobox", { name: /select treasury period/i });
    await expect(periodSelect).toBeVisible();
    await periodSelect.selectOption("7d");

    // Figures label updates to reflect new period
    await expect(page.getByTestId("figures-period-label")).toHaveText(
      "Figures cover: Last 7 Days",
    );

    // 6. User opens the Report Builder panel (Export Report)
    const exportButton = page.getByRole("button", { name: "Export Report" });
    await expect(exportButton).toBeVisible();
    await exportButton.click();

    // Modal dialog appears
    const reportDialog = page.getByRole("dialog", { name: "Export Treasury Report" });
    await expect(reportDialog).toBeVisible();
    await expect(reportDialog.getByText("Export Treasury Report")).toBeVisible();

    // Close the export modal
    const closeBtn = reportDialog.getByRole("button", { name: /close report builder/i });
    await closeBtn.click();
    await expect(reportDialog).not.toBeVisible();

    // 7. User refreshes metrics
    const refreshButton = page.getByRole("button", { name: "Refresh metrics" });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Metrics remain visible and healthy
    await expect(headerTitle).toBeVisible();
    await expect(page.getByRole("group", { name: "Active Streams" })).toBeVisible();

    // 8. User navigates to Create Stream via Header CTA
    const createStreamBtn = page.getByRole("button", { name: /create stream/i });
    await expect(createStreamBtn).toBeVisible();
    await createStreamBtn.click();

    // URL transitions to the streams page
    await expect(page).toHaveURL(/\/app\/streams/);
  });

  test("primary failure path: surfaces error presentation on upstream failure and recovers on retry", async ({
    page,
  }) => {
    // Stub wallet with live network mode so fetchJson calls hit our routed endpoints
    await stubConnectedWallet(page, { disableMocks: true });

    let shouldFail = true;

    await page.route((url) => url.port === "8787" && url.pathname.startsWith("/treasury/metrics"), async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                label: "Active Streams",
                value: "4",
                desc: "streams currently accruing",
              },
              {
                label: "Total Streaming",
                value: "15,000 USDC",
                desc: "combined deposit in active streams",
              },
              {
                label: "Withdrawable",
                value: "3,200 USDC",
                desc: "available for recipients to withdraw",
              },
            ],
          }),
        });
      }
    });

    await page.route((url) => url.port === "8787" && url.pathname.startsWith("/streams"), async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [
              {
                id: "STR-001",
                name: "Dev Grant - Alice",
                recipientName: "Alice M.",
                recipientAddress: "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P",
                treasuryName: "Protocol Growth Treasury",
                treasuryAddress: "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT",
                asset: "USDC",
                status: "Active",
                monthlyRate: 5000,
                depositAmount: 48000,
                streamedAmount: 19250,
                withdrawableAmount: 4200,
                remainingAmount: 28750,
                progress: 40,
                startDate: "2026-01-15",
                endDate: "2026-10-15",
                cliffDate: "2026-01-31",
                nextUnlockDate: "2026-04-03",
                summary: "Core grant stream for protocol engineering.",
                health: "Healthy",
                healthNote: "Runway covers the remaining schedule.",
                auditNote: "No intervention required.",
                tags: ["Engineering"],
                timeline: [],
              },
            ],
          }),
        });
      }
    });

    // 1. Visit treasury overview during failure
    await page.goto("/app/treasurypage", { waitUntil: "domcontentloaded" });

    // 2. Failure banner/alert is displayed to the user
    const errorAlert = page.getByRole("alert");
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/Streams service responded with 500/i);

    // 3. Service recovers and user triggers a refresh via the refresh metrics button
    shouldFail = false;
    const refreshButton = page.getByRole("button", { name: "Refresh metrics" });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // 4. Content recovers and error alert is dismissed
    await expect(errorAlert).not.toBeVisible();
    await expect(page.getByRole("group", { name: "Active Streams" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Treasury Activity" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Treasury Stream Flow" })).toBeVisible();
  });
});

