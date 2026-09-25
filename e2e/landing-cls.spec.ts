import { test, expect } from '@playwright/test';

test('landing page hero renders without layout shift', async ({ page }) => {
  let cls = 0;
  page.on('console', msg => console.log(msg.text()));

  await page.goto('/', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(2000);

  const clsScore = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsValue = 0;
      if (!window.PerformanceObserver) {
        resolve(0);
        return;
      }
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      try {
        observer.observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 500);
      } catch (e) {
        resolve(0);
      }
    });
  });

  console.log('CLS Score:', clsScore);
  expect(clsScore).toBeLessThanOrEqual(0.1);
});
