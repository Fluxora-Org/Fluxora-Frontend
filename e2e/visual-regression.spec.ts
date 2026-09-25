import { test, expect } from "@playwright/test";

// The primary flows to cover
const FLOWS = [
  { name: "landing", path: "/" },
  { name: "dashboard", path: "/app/streams" },
  { name: "stream-detail", path: "/app/streams/STR-001" },
  { name: "recipient", path: "/app/recipient" },
  { name: "connect-wallet", path: "/connect-wallet" },
];

test.describe("Visual Regression", () => {
  for (const { name, path } of FLOWS) {
    test.describe(`Flow: ${name}`, () => {
      
      test("light theme snapshot", async ({ page }) => {
        // Force light theme
        await page.addInitScript(() => {
          window.localStorage.setItem("theme", "light");
        });

        await page.goto(path);
        await page.waitForLoadState("networkidle");
        
        // Wait for a small delay to ensure any layout shifts or initial data loads settle
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`${name}-light.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });

      test("dark theme snapshot", async ({ page }) => {
        // Force dark theme
        await page.addInitScript(() => {
          window.localStorage.setItem("theme", "dark");
        });

        await page.goto(path);
        await page.waitForLoadState("networkidle");

        // Wait for a small delay to ensure any layout shifts or initial data loads settle
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot(`${name}-dark.png`, {
          fullPage: true,
          animations: "disabled",
        });
      });
      
    });
  }
});
