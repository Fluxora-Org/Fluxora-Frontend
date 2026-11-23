import { expect, test, type Page } from "@playwright/test";

const ACCOUNT =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

async function setupWallet(page: Page) {
  await page.addInitScript(({ address }) => {
    (window as any).__freighterStub = {
      isConnected: () => Promise.resolve({ isConnected: true }),
      isAllowed: () => Promise.resolve({ isAllowed: true }),
      getAddress: () => Promise.resolve({ address }),
      getNetwork: () => Promise.resolve({ network: "TESTNET" }),
      WatchWalletChanges: class {
        watch() {}
        stop() {}
      },
      isBrowser: true,
    };
  }, { address: ACCOUNT });

  await page.route(/vendor-stellar.*\.js/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        const s = window.__freighterStub || {};
        export const isConnected = s.isConnected;
        export const isAllowed = s.isAllowed;
        export const getAddress = s.getAddress;
        export const getNetwork = s.getNetwork;
        export const WatchWalletChanges = s.WatchWalletChanges;
        export const isBrowser = true;
        export default { isConnected, isAllowed, getAddress, getNetwork, WatchWalletChanges, isBrowser };
      `,
    });
  });
}

async function createInterruptedSession(page: Page) {
  await setupWallet(page);
  await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();
  await page
    .getByRole("textbox", { name: /search streams/i })
    .fill("Dev Grant");
  await expect(
    page.getByRole("img", { name: /saved on this device/i }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
}

test.describe("session recovery", () => {
  test("restores the saved session through the recovery banner", async ({
    page,
  }) => {
    await createInterruptedSession(page);
    await expect(
      page.getByRole("status", {
        name: /we restored your previous session/i,
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Restore" }).click();

    await expect(
      page.getByRole("status", { name: /session restored/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /search streams/i }),
    ).toHaveValue("Dev Grant");
    await expect(
      page.getByRole("button", { name: "All", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("starts fresh and does not offer the discarded session after reload", async ({
    page,
  }) => {
    await createInterruptedSession(page);
    await expect(
      page.getByRole("status", {
        name: /we restored your previous session/i,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start fresh" }).click();

    await expect(
      page.getByRole("status", { name: /starting fresh/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: /search streams/i }),
    ).toHaveValue("");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("status", {
        name: /we restored your previous session/i,
      }),
    ).toHaveCount(0);
  });
});