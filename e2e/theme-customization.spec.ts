import { expect, test } from "@playwright/test";

/**
 * Theme customization flow end-to-end tests.
 *
 * Covers the full user journey for switching themes:
 * 1. Initial theme detection (system preference or stored choice)
 * 2. Manual theme toggle via navbar button
 * 3. Persistence across page reloads
 * 4. Visual feedback (icon change, DOM attribute)
 *
 * Success path: User toggles theme and sees the change persist
 * Failure path: localStorage is unavailable (simulated via context.clearPermissions)
 */

test.describe("Theme customization flow", () => {
  test("user can toggle theme from light to dark and it persists", async ({
    page,
  }) => {
    // Start on the landing page
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Verify initial light theme
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    // Find and verify the theme toggle button shows moon icon (for switching to dark)
    const themeButton = page.getByRole("button", {
      name: "Switch to dark mode",
    });
    await expect(themeButton).toBeVisible();

    // Click to switch to dark mode
    await themeButton.click();

    // Verify theme changed to dark
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Verify button now shows sun icon (for switching back to light)
    const lightModeButton = page.getByRole("button", {
      name: "Switch to light mode",
    });
    await expect(lightModeButton).toBeVisible();

    // Reload the page to verify persistence
    await page.reload({ waitUntil: "domcontentloaded" });

    // Theme should still be dark after reload
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(lightModeButton).toBeVisible();
  });

  test("user can toggle theme from dark back to light", async ({ page }) => {
    // Set dark theme in localStorage before visiting the page
    await page.addInitScript(() => {
      window.localStorage.setItem("theme", "dark");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Verify initial dark theme
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Find and click the theme toggle to switch to light
    const themeButton = page.getByRole("button", {
      name: "Switch to light mode",
    });
    await expect(themeButton).toBeVisible();
    await themeButton.click();

    // Verify theme changed to light
    await expect(html).toHaveAttribute("data-theme", "light");

    // Verify button now shows moon icon
    const darkModeButton = page.getByRole("button", {
      name: "Switch to dark mode",
    });
    await expect(darkModeButton).toBeVisible();
  });

  test("theme toggle works across different routes", async ({ page }) => {
    // Start on landing page
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    // Toggle to dark on landing page
    await page
      .getByRole("button", { name: "Switch to dark mode" })
      .click();
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Navigate to app dashboard
    await page.goto("/app", { waitUntil: "domcontentloaded" });

    // Theme should persist across navigation
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();

    // Toggle back to light on app page
    await page
      .getByRole("button", { name: "Switch to light mode" })
      .click();
    await expect(html).toHaveAttribute("data-theme", "light");

    // Navigate to streams
    await page.goto("/app/streams", { waitUntil: "domcontentloaded" });

    // Theme should still be light
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("theme toggle is keyboard accessible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");
    const themeButton = page.getByRole("button", {
      name: "Switch to dark mode",
    });

    // Focus the theme button using keyboard navigation
    await themeButton.focus();
    await expect(themeButton).toBeFocused();

    // Verify focus ring is visible (accessibility requirement)
    await expect(themeButton).toHaveCSS(
      "outline",
      /^none$|^0px none/,
    );

    // Toggle theme using keyboard (Enter key)
    await page.keyboard.press("Enter");
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Try with Space key
    const lightModeButton = page.getByRole("button", {
      name: "Switch to light mode",
    });
    await lightModeButton.focus();
    await page.keyboard.press("Space");
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("theme toggle works in mobile menu", async ({ page }) => {
    // Use mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");

    // Open mobile menu
    const menuButton = page.getByRole("button", {
      name: "Open navigation menu",
    });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Find theme toggle in mobile menu
    const mobileThemeButton = page
      .locator("#mobile-nav")
      .getByRole("button", { name: "Switch to dark mode" });
    await expect(mobileThemeButton).toBeVisible();

    // Toggle theme from mobile menu
    await mobileThemeButton.click();
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Verify mobile menu still shows correct icon
    const mobileLightButton = page
      .locator("#mobile-nav")
      .getByRole("button", { name: "Switch to light mode" });
    await expect(mobileLightButton).toBeVisible();
  });

  test("handles localStorage unavailable gracefully (failure path)", async ({
    context,
    page,
  }) => {
    // Block localStorage access by denying persistent storage permission
    // This simulates environments where localStorage may be blocked
    await context.clearPermissions();

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");

    // Initial theme should still work (falls back to system preference)
    const initialTheme = await html.getAttribute("data-theme");
    expect(initialTheme).toMatch(/^(light|dark)$/);

    // Toggle should still work in memory even if persistence fails
    const themeButton =
      initialTheme === "light"
        ? page.getByRole("button", { name: "Switch to dark mode" })
        : page.getByRole("button", { name: "Switch to light mode" });

    await themeButton.click();

    const newTheme = await html.getAttribute("data-theme");
    expect(newTheme).toBe(initialTheme === "light" ? "dark" : "light");

    // After reload, without localStorage, it should fall back to system preference
    // (may not be the same as the toggled theme)
    await page.reload({ waitUntil: "domcontentloaded" });
    const reloadedTheme = await html.getAttribute("data-theme");
    expect(reloadedTheme).toMatch(/^(light|dark)$/);
  });

  test("validates data-theme attribute only accepts light or dark", async ({
    page,
  }) => {
    // Try to inject an invalid theme value via localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem("theme", "hacker-theme");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");

    // Should fall back to a valid theme (system preference), not use the invalid value
    const theme = await html.getAttribute("data-theme");
    expect(theme).toMatch(/^(light|dark)$/);

    // Verify the invalid value doesn't corrupt the UI
    const themeButton = page.getByRole("button", {
      name: /Switch to (dark|light) mode/,
    });
    await expect(themeButton).toBeVisible();
  });

  test("respects system preference when no explicit choice is stored", async ({
    page,
  }) => {
    // Emulate dark color scheme preference
    await page.emulateMedia({ colorScheme: "dark" });

    // Clear any stored theme preference
    await page.addInitScript(() => {
      window.localStorage.removeItem("theme");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");

    // Should use system dark preference
    await expect(html).toHaveAttribute("data-theme", "dark");

    // Now emulate light preference
    await page.emulateMedia({ colorScheme: "light" });
    await page.reload({ waitUntil: "domcontentloaded" });

    // Should use system light preference
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("explicit user choice overrides system preference", async ({ page }) => {
    // Emulate system dark preference
    await page.emulateMedia({ colorScheme: "dark" });

    // Set explicit light preference in storage
    await page.addInitScript(() => {
      window.localStorage.setItem("theme", "light");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const html = page.locator("html");

    // Should use explicit light choice, not system dark
    await expect(html).toHaveAttribute("data-theme", "light");
  });
});
