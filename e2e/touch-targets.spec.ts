import { expect, test } from "@playwright/test";

const SMALLEST_SUPPORTED_VIEWPORT = { width: 320, height: 568 };
const MINIMUM_TOUCH_TARGET_PX = 44;

const ROUTES = [
  { label: "Landing", path: "/" },
  { label: "Landing page", path: "/landing" },
  { label: "Connect wallet", path: "/connect-wallet" },
  { label: "Dashboard", path: "/app" },
];

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "input",
  "select",
  "textarea",
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
].join(",");

for (const route of ROUTES) {
  test(`touch targets: ${route.label}`, async ({ page }) => {
    await page.setViewportSize(SMALLEST_SUPPORTED_VIEWPORT);
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");

    const result = await page.locator(INTERACTIVE_SELECTOR).evaluateAll(
      (elements, minimumSize) => {
        const failures: Array<{ label: string; width: number; height: number }> = [];
        const invalidExceptions: string[] = [];

        for (const element of elements) {
          const exception = element.getAttribute("data-touch-target-exception");
          if (exception !== null) {
            if (!element.getAttribute("data-touch-target-reason")?.trim()) {
              invalidExceptions.push(exception);
            }
            continue;
          }

          const styles = window.getComputedStyle(element);
          const rectangle = element.getBoundingClientRect();
          if (
            styles.display === "none" ||
            styles.visibility === "hidden" ||
            rectangle.width === 0 ||
            rectangle.height === 0
          ) {
            continue;
          }

          if (rectangle.width < minimumSize || rectangle.height < minimumSize) {
            failures.push({
              label: element.outerHTML.slice(0, 160),
              width: Math.round(rectangle.width * 100) / 100,
              height: Math.round(rectangle.height * 100) / 100,
            });
          }
        }

        return { failures, invalidExceptions };
      },
      MINIMUM_TOUCH_TARGET_PX,
    );

    expect(result.invalidExceptions, "Touch-target exceptions require a reason").toEqual([]);
    expect(result.failures, `${route.label} has interactive elements below 44 x 44 CSS px`).toEqual([]);
  });
}