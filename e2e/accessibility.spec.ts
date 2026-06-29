import { test } from "@playwright/test";
import { scanRoute } from "./axe-helper";

/**
 * Accessibility regression suite.
 * Scans each primary route with axe-core and fails on serious/critical violations.
 */

const ROUTES: Array<{ label: string; path: string }> = [
  { label: "Landing (/)", path: "/" },
  { label: "Landing page (/landing)", path: "/landing" },
  { label: "Dashboard (/app)", path: "/app" },
  { label: "Streams (/app/streams)", path: "/app/streams" },
  { label: "Recipient (/app/recipient)", path: "/app/recipient" },
  { label: "Connect Wallet (/connect-wallet)", path: "/connect-wallet" },
];

for (const { label, path } of ROUTES) {
  test(`accessibility: ${label}`, async ({ page }) => {
    await page.goto(path);
    // Wait for the page to be reasonably interactive before scanning
    await page.waitForLoadState("networkidle");
    await scanRoute(page, label);
  });
}
