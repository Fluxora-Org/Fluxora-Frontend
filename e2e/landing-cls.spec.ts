import { test, expect } from '@playwright/test';

test('landing page hero renders without layout shift', async ({ page }) => {
  await page.addInitScript(() => {
    const target = window as Window & { __landingCls?: number };
    target.__landingCls = 0;

    let sessionValue = 0;
    let sessionStart: number | undefined;
    let previousEntryTime = 0;

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (shift.hadRecentInput) continue;

        if (
          sessionStart === undefined ||
          shift.startTime - previousEntryTime >= 1_000 ||
          shift.startTime - sessionStart > 5_000
        ) {
          sessionValue = 0;
          sessionStart = shift.startTime;
        }

        sessionValue += shift.value;
        target.__landingCls = Math.max(target.__landingCls ?? 0, sessionValue);
        previousEntryTime = shift.startTime;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  await page.goto('/', { waitUntil: 'load' });
  await expect(
    page.getByRole('heading', { level: 1, name: /the future of/i }),
  ).toBeVisible();
  await page.waitForTimeout(2_000);

  const clsScore = await page.evaluate(
    () => (window as Window & { __landingCls?: number }).__landingCls,
  );
  if (clsScore === undefined) {
    throw new Error('The browser did not report cumulative layout shift');
  }
  expect(clsScore).toBeLessThanOrEqual(0.1);
});
