import { expect, test } from "@playwright/test";

test("timeline remains interpretable in greyscale and colour-blind simulations", async ({
  page,
}) => {
  await page.goto("/");

  // Mount the actual component on a public page so wallet state and mock data
  // cannot make this visual accessibility check conditional.
  await page.evaluate(async () => {
    const React = await import("/node_modules/.vite/deps/react.js");
    const { createRoot } =
      await import("/node_modules/.vite/deps/react-dom_client.js");
    const timelineModule = "/src/components/StreamTimeline.tsx";
    const simulationModule =
      "/src/components/colorBlindSimulation/ColorBlindSimulationProvider.tsx";
    const { StreamTimeline } = await import(timelineModule);
    const { ColorBlindSvgFilters } = await import(simulationModule);
    const host = document.createElement("div");
    host.id = "timeline-test-host";
    document.body.append(host);
    createRoot(host).render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(ColorBlindSvgFilters),
        React.createElement(
          "div",
          { id: "timeline-filter-target" },
          React.createElement(StreamTimeline, {
            startDate: "2026-01-01",
            cliffDate: "2026-01-11",
            currentDate: "2026-01-31",
            endDate: "2026-04-11",
            withdrawableAmount: 200,
            totalAmount: 1000,
            status: "active",
          }),
        ),
      ),
    );
  });

  const host = page.locator("#timeline-test-host");
  const summary = host.locator(".stream-timeline__text-summary");
  const cliff = host.locator(".stream-timeline-bar__segment--cliff");
  const vested = host.locator(".stream-timeline-bar__segment--accrual");
  const unvested = host.locator(".stream-timeline-bar__segment--remaining");
  const labels = host.locator(".stream-timeline-labels");

  for (const filter of [
    "grayscale(1)",
    "url(#cb-filter-protanopia)",
    "url(#cb-filter-deuteranopia)",
    "url(#cb-filter-tritanopia)",
  ]) {
    await host.locator("#timeline-filter-target").evaluate((element, value) => {
      element.style.filter = value;
    }, filter);
    await expect(summary).toBeVisible();
    await expect(summary).toContainText("Vested period: 20%");
    await expect(summary).toContainText("Unvested period: 70%");
    await expect(summary).toContainText("Withdrawable: 200 of 1,000");
    await expect(labels.getByText("Cliff end")).toBeVisible();
    await expect(labels.getByText("End", { exact: true })).toBeVisible();
    await expect(cliff).toHaveCSS(
      "background-image",
      /repeating-linear-gradient/,
    );
    await expect(vested).toHaveCSS("background-image", /linear-gradient/);
    await expect(unvested).toHaveCSS("background-image", /radial-gradient/);
    await expect(cliff).toBeVisible();
    await expect(vested).toBeVisible();
    await expect(unvested).toBeVisible();
  }
});
