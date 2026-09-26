import { test, expect } from "@playwright/test";

const MOCK_WALLET_ADDRESS = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const MOCK_WALLET_NETWORK = "TESTNET";

async function injectMockWallet(page: import("@playwright/test").Page) {
  // Strip CSP so Playwright's inline script doesn't get blocked
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.resourceType() === "document") {
      const response = await route.fetch();
      let html = await response.text();
      html = html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i, "");
      const headers = response.headers();
      delete headers["content-security-policy"];
      await route.fulfill({ response, headers, body: html });
    } else {
      await route.fallback();
    }
  });

  await page.addInitScript(
    ({ addr, net }: { addr: string; net: string }) => {
      // @stellar/freighter-api checks window.freighter for the extension presence
      (window as any).freighter = "freighter";

      window.addEventListener("message", (event) => {
        if (event.source !== window || event.data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") {
          return;
        }

        const { type, messageId } = event.data;
        let response = {};

        switch (type) {
          case "REQUEST_CONNECTION_STATUS":
            response = { isConnected: true };
            break;
          case "REQUEST_ALLOWED_STATUS":
            response = { isAllowed: true };
            break;
          case "REQUEST_PUBLIC_KEY":
          case "REQUEST_ACCESS":
            response = { publicKey: addr };
            break;
          case "REQUEST_NETWORK_DETAILS":
            response = {
              networkDetails: {
                network: net,
                networkPassphrase: "Test SDF Network ; September 2015",
              },
            };
            break;
          default:
            response = { error: "Not mock implemented in tests" };
            break;
        }

        window.postMessage(
          {
            source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
            messagedId: messageId, // Typo expected by freighter-api
            ...response,
          },
          window.location.origin,
        );
      });
    },
    { addr: MOCK_WALLET_ADDRESS, net: MOCK_WALLET_NETWORK },
  );
}

test.describe("Dashboard keyboard navigation", () => {
  test("success path: navigates linearly through navbar, sidebar, and dashboard content", async ({ page }) => {
    await injectMockWallet(page);
    page.on("console", (msg) => console.log("[Browser Console]", msg.text()));
    page.on("pageerror", (err) => console.log("[Browser Error]", err.message));
    await page.goto("/app");
    
    // Wait for the page to be reasonably interactive
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Treasury overview" })).toBeVisible();

    // Print current URL for debugging
    console.log("Current URL:", page.url());

    // 1. Navbar focus (Skip link should be first)
    await page.keyboard.press("Tab");
    
    // Wait a little bit for focus to settle
    await page.waitForTimeout(500);
    
    // Log active element
    const activeElHtml = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.outerHTML : 'null';
    });
    console.log("Active element after first Tab:", activeElHtml);

    await expect(page.locator("a[href='#main-content']").first()).toBeFocused();

    // Tab through Navbar until we reach the Sidebar toggle
    let reachedSidebar = false;
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const isSidebarToggle = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute("aria-controls") === "app-sidebar";
      });
      if (isSidebarToggle) {
        reachedSidebar = true;
        break;
      }
    }
    expect(reachedSidebar, "Failed to reach sidebar toggle").toBe(true);

    // Sidebar Links
    // Next tabs should sequentially focus Dashboard, Streams, Recipient in the sidebar
    await page.keyboard.press("Tab");
    await expect(page.locator("aside#app-sidebar a", { hasText: "Dashboard" })).toBeFocused();
    
    await page.keyboard.press("Tab");
    await expect(page.locator("aside#app-sidebar a", { hasText: "Streams" })).toBeFocused();

    // Continue tabbing until we reach the Dashboard Main Content
    let reachedDashboardContent = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const isDashboardContent = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.closest("#main-content");
      });
      if (isDashboardContent) {
        reachedDashboardContent = true;
        break;
      }
    }
    expect(reachedDashboardContent, "Failed to reach dashboard content").toBe(true);
  });

  test("primary failure: skip to main content block bypass works", async ({ page }) => {
    await injectMockWallet(page);
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Treasury overview" })).toBeVisible();

    // Focus the skip link
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);
    const skipLink = page.locator("a[href='#main-content']").first();
    await expect(skipLink).toBeFocused();

    // Activate skip link
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // The #main-content element should have received focus
    await expect(page.locator("#main-content")).toBeFocused();
  });
});
