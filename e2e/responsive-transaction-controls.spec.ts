import { expect, test } from "@playwright/test";

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;

type ViewportKey = keyof typeof VIEWPORTS;

const MOCK_WALLET_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const MOCK_WALLET_NETWORK = "TESTNET";
const VALID_RECIPIENT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function injectMockWallet(
  page: import("@playwright/test").Page,
  address: string,
  network: string,
): Promise<void> {
  await page.addInitScript(
    ({ addr, net }: { addr: string; net: string }) => {
      window.localStorage.setItem("fluxora_wallet_address", addr);
      window.localStorage.setItem("fluxora_wallet_network", net);
      window.localStorage.setItem("fluxora_wallet_connected", "true");
      (window as unknown as Record<string, unknown>)["freighterApi"] = {
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
    },
    { addr: address, net: network },
  );
}

async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    return { scrollWidth, clientWidth, overflows: scrollWidth > clientWidth + 1 };
  });
  expect.soft(overflow.overflows, "no horizontal page overflow").toBe(false);
}

async function assertElementInViewport(
  page: import("@playwright/test").Page,
  locator: import("@playwright/test").Locator,
  label: string,
) {
  const box = await locator.boundingBox();
  expect(box, `${label} has bounding box`).not.toBeNull();
  if (box) {
    const viewport = page.viewportSize();
    const vw = viewport?.width ?? 0;
    expect
      .soft(box.x + box.width <= vw + 4, `${label} fits within viewport width`)
      .toBe(true);
    expect.soft(box.y >= -4, `${label} not clipped above viewport`).toBe(true);
  }
}

for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  const viewportKey = vpName as ViewportKey;
  test.describe(`create stream transaction controls @ ${viewportKey}`, () => {
    test.use({ viewport: vpSize });

    test("labels, review summary, submit/cancel controls visible without horizontal scroll", async ({
      page,
    }) => {
      await injectMockWallet(page, MOCK_WALLET_ADDRESS, MOCK_WALLET_NETWORK);
      await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

      await page.getByRole("button", { name: "Create stream" }).click();
      const dialog = page.getByRole("dialog", { name: "Create stream" });
      await expect(dialog).toBeVisible();

      await dialog.getByRole("button", { name: "Create a single stream" }).click();

      const recipientLabel = dialog.getByLabel("Recipient");
      const depositLabel = dialog.getByLabel("Deposit amount");
      const cancelBtn = dialog.getByRole("button", { name: "Cancel" });
      const nextBtn = dialog.getByRole("button", { name: "Next" });

      await expect(recipientLabel).toBeVisible();
      await expect(depositLabel).toBeVisible();
      await expect(cancelBtn).toBeVisible();
      await expect(nextBtn).toBeVisible();

      await assertElementInViewport(page, recipientLabel, "step1 Recipient label");
      await assertElementInViewport(page, depositLabel, "step1 Deposit label");
      await assertElementInViewport(page, cancelBtn, "step1 Cancel button");
      await assertElementInViewport(page, nextBtn, "step1 Next button");

      await assertNoHorizontalOverflow(page);

      await recipientLabel.fill(VALID_RECIPIENT);
      await depositLabel.fill("120");
      await nextBtn.click();

      const rateHeading = dialog.getByRole("heading", { name: "Rate & schedule" });
      const rateInput = dialog.locator("#create-stream-accrual-rate");
      const durationInput = dialog.locator("#create-stream-duration");
      const backBtn = dialog.getByRole("button", { name: "Back" });

      await expect(rateHeading).toBeVisible();
      await expect(rateInput).toBeVisible();
      await expect(durationInput).toBeVisible();
      await expect(backBtn).toBeVisible();

      await assertElementInViewport(page, rateHeading, "step2 Rate & schedule heading");
      await assertElementInViewport(page, rateInput, "step2 Accrual rate input");
      await assertElementInViewport(page, durationInput, "step2 Duration input");
      await assertElementInViewport(page, backBtn, "step2 Back button");
      await assertElementInViewport(page, nextBtn, "step2 Next button");

      await assertNoHorizontalOverflow(page);

      await rateInput.fill("30");
      await durationInput.fill("4");
      await nextBtn.click();

      const reviewDeposit = dialog.getByText("120.00 USDC", { exact: true });
      const reviewRate = dialog.getByText("30 USDC per month");
      const reviewRecipientCard = dialog.getByText("Recipient & Address");
      const reviewWarning = dialog.getByText(/confirm the details above/i);
      const submitBtn = dialog.getByRole("button", { name: "Create stream", exact: true });

      await expect(reviewDeposit).toBeVisible();
      await expect(reviewRate).toBeVisible();
      await expect(reviewRecipientCard).toBeVisible();
      await expect(reviewWarning).toBeVisible();
      await expect(submitBtn).toBeVisible();
      await expect(backBtn).toBeVisible();

      await assertElementInViewport(page, reviewDeposit, "step3 Review deposit amount");
      await assertElementInViewport(page, reviewRate, "step3 Review rate");
      await assertElementInViewport(page, reviewRecipientCard, "step3 Recipient card");
      await assertElementInViewport(page, reviewWarning, "step3 Confirmation warning");
      await assertElementInViewport(page, backBtn, "step3 Back button");
      await assertElementInViewport(page, submitBtn, "step3 Create stream submit button");

      await assertNoHorizontalOverflow(page);

      await submitBtn.focus();
      await expect(submitBtn).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(backBtn).toBeFocused();
    });
  });

  test.describe(`treasury report builder controls @ ${viewportKey}`, () => {
    test.use({ viewport: vpSize });

    test("labels, preview, export/cancel controls visible without horizontal scroll", async ({
      page,
    }) => {
      await injectMockWallet(page, MOCK_WALLET_ADDRESS, MOCK_WALLET_NETWORK);
      await page.goto("/app/treasury", { waitUntil: "domcontentloaded" });

      await page.getByRole("button", { name: /export/i }).click();

      const panel = page.getByRole("dialog", { name: "Export Treasury Report" });
      await expect(panel).toBeVisible();

      const startDateLabel = panel.getByLabel("Start Date");
      const endDateLabel = panel.getByLabel("End Date");
      const fieldsLegend = panel.getByText("Fields");
      const groupingLabel = panel.getByLabel("Grouping");
      const previewHeading = panel.getByRole("heading", { name: "Live Preview" });
      const closeBtn = panel.getByRole("button", { name: "Close report builder" });
      const exportCsv = panel.getByRole("button", { name: /Export CSV/i });

      await expect(startDateLabel).toBeVisible();
      await expect(endDateLabel).toBeVisible();
      await expect(fieldsLegend).toBeVisible();
      await expect(groupingLabel).toBeVisible();
      await expect(previewHeading).toBeVisible();
      await expect(closeBtn).toBeVisible();
      await expect(exportCsv).toBeVisible();

      await assertElementInViewport(page, startDateLabel, "Start Date input");
      await assertElementInViewport(page, endDateLabel, "End Date input");
      await assertElementInViewport(page, fieldsLegend, "Fields legend");
      await assertElementInViewport(page, groupingLabel, "Grouping select");
      await assertElementInViewport(page, previewHeading, "Live Preview heading");
      await assertElementInViewport(page, closeBtn, "Close button");
      await assertElementInViewport(page, exportCsv, "Export CSV button");

      await assertNoHorizontalOverflow(page);

      for (const fieldLabel of ["Name", "Recipient", "Rate", "Status"]) {
        const checkbox = panel.getByLabel(fieldLabel);
        await expect(checkbox).toBeVisible();
        await assertElementInViewport(page, checkbox, `${fieldLabel} checkbox`);
      }

      await exportCsv.focus();
      await expect(exportCsv).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(closeBtn).toBeFocused();
    });
  });
}
