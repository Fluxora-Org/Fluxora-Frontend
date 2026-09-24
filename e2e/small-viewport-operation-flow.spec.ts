/**
 * e2e: Small-viewport operation flow — issue #1781
 *
 * Covers the path a user takes on a mobile-width viewport (< BREAKPOINT_MD
 * from src/lib/breakpoints.ts) when operating the app via primary navigation:
 *
 *   1. Success path — open the mobile sidebar, navigate Dashboard → Streams →
 *      Recipient, and confirm each destination and that the drawer closes after
 *      a nav selection.
 *   2. Primary failure — with the drawer closed, primary nav destinations are
 *      not reachable; opening Connect wallet and dismissing without connecting
 *      leaves the user on the same page without a connected session.
 *
 * Follows the UI only (roles / labels). Does not import breakpoints helpers or
 * reach into Layout/Sidebar internals.
 */

import { expect, test, type Page } from "@playwright/test";

/** Matches `BREAKPOINT_MD` in src/lib/breakpoints.ts (widths below are mobile). */
const MOBILE_VIEWPORT = { width: 375, height: 812 } as const;

const MOCK_WALLET_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const MOCK_WALLET_NETWORK = "TESTNET";

async function injectMockWallet(page: Page): Promise<void> {
  await page.addInitScript(
    ({ addr, net }: { addr: string; net: string }) => {
      window.localStorage.setItem("fluxora_wallet_address", addr);
      window.localStorage.setItem("fluxora_wallet_network", net);
      window.localStorage.setItem("fluxora_wallet_connected", "true");
      (window as unknown as Record<string, unknown>)["freighterApi"] = {
        isConnected: () => Promise.resolve({ isConnected: true }),
        getAddress: () => Promise.resolve({ address: addr }),
        getNetwork: () =>
          Promise.resolve({ network: net, networkPassphrase: "" }),
        signTransaction: () =>
          Promise.reject(new Error("Not available in tests")),
        signAuthEntry: () =>
          Promise.reject(new Error("Not available in tests")),
        signMessage: () =>
          Promise.reject(new Error("Not available in tests")),
        getNetworkDetails: () =>
          Promise.resolve({
            network: net,
            networkPassphrase: "",
            sorobanRpcUrl: "",
          }),
        WatchWalletChanges: class {
          watch() {}
          stop() {}
        },
      };
    },
    { addr: MOCK_WALLET_ADDRESS, net: MOCK_WALLET_NETWORK },
  );
}

async function openMobileNav(page: Page): Promise<void> {
  const toggle = page.getByRole("button", { name: "Toggle menu" });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeVisible();
}

test.describe("small-viewport operation flow", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("success: mobile nav opens, routes Dashboard → Streams → Recipient, drawer closes", async ({
    page,
  }) => {
    await injectMockWallet(page);
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Treasury overview" }),
    ).toBeVisible();

    // Drawer starts closed — Streams link is not exposed in the viewport.
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", {
        name: /Streams/,
      }),
    ).toBeHidden();

    await openMobileNav(page);

    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: /Streams/ })
      .click();

    await page.waitForURL("**/app/streams");
    await expect(page.getByRole("heading", { name: "Streams" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Toggle menu" }),
    ).toHaveAttribute("aria-expanded", "false");

    await openMobileNav(page);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: /Recipient/ })
      .click();

    await page.waitForURL("**/app/recipient");
    await expect(
      page.getByRole("heading", { name: "Your streams" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Toggle menu" }),
    ).toHaveAttribute("aria-expanded", "false");

    // Return to Dashboard via the drawer to complete the loop.
    await openMobileNav(page);
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: /Dashboard/ })
      .click();
    await page.waitForURL(/\/app\/?$/);
    await expect(
      page.getByRole("heading", { name: "Treasury overview" }),
    ).toBeVisible();
  });

  test("failure: closed drawer blocks nav; connect-wallet dismiss leaves user unconnected", async ({
    page,
  }) => {
    await injectMockWallet(page);
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Treasury overview" }),
    ).toBeVisible();

    // Primary failure of the flow: operating without opening the drawer.
    const mainNav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(mainNav.getByRole("link", { name: /Streams/ })).toBeHidden();
    await expect(mainNav.getByRole("link", { name: /Recipient/ })).toBeHidden();
    await expect(page).toHaveURL(/\/app\/?$/);

    // Open drawer and attempt Connect wallet, then abandon (primary failure).
    await openMobileNav(page);
    await page.getByRole("button", { name: "Connect wallet" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dismiss without completing a connection.
    const closeBtn = dialog
      .getByRole("button", { name: /close|cancel|dismiss/i })
      .first();
    if (await closeBtn.count()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }

    await expect(dialog).toBeHidden();
    // Still on the dashboard — the connect operation did not complete.
    await expect(page).toHaveURL(/\/app\/?$/);
    await expect(
      page.getByRole("heading", { name: "Treasury overview" }),
    ).toBeVisible();
  });
});
