import { expect, test } from "@playwright/test";

/** Maximum acceptable first contentful paint on the production landing route. */
export const LANDING_FCP_BUDGET_MS = 1_800;

test.describe("landing route performance budget", () => {
  test("first contentful paint stays within budget", async ({ page }) => {
    const client = await page.context().newCDPSession(page);

    // Keep measurements comparable across releases and developer machines.
    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 40,
      downloadThroughput: 1_500_000,
      uploadThroughput: 750_000,
    });
    await client.send("Network.setCacheDisabled", { cacheDisabled: true });

    await page.goto("/", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { level: 1, name: /the future of/i }),
    ).toBeVisible();

    const fcp = await page.evaluate(() => {
      const entry = performance
        .getEntriesByType("paint")
        .find(({ name }) => name === "first-contentful-paint");
      return entry?.startTime ?? null;
    });

    expect(fcp, "The browser did not report first-contentful-paint").not.toBeNull();
    console.log(`Landing FCP: ${fcp?.toFixed(0)} ms (budget: ${LANDING_FCP_BUDGET_MS} ms)`);
    expect(fcp).toBeLessThanOrEqual(LANDING_FCP_BUDGET_MS);
  });
});