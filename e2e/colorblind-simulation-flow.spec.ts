import { expect, test, type Page } from "@playwright/test";

/**
 * Colour-blind operation flow — end-to-end coverage.
 *
 * ## Why this suite exists
 *
 * The colour-blind simulation preview is the path a designer or QA engineer walks
 * before signing off status colours: navigate to the treasury overview, pick a
 * simulation preset, read the previewed dashboard, then disable it. Every part of
 * that path had unit coverage (`ColorBlindSimulationProvider.test.tsx`,
 * `ColorBlindToggle.test.tsx`, `contrastUtils.test.ts`) but the path itself did
 * not — a broken link between the toggle and `contrastUtils` would still show up
 * as green unit tests.
 *
 * ## What it asserts, end to end
 *
 * For every preset the flow must hold this whole chain together, with no step
 * mocked and nothing imported from `src/`:
 *
 *   user picks a preset
 *     -> the radio reports checked
 *     -> the wrapper reports `data-colorblind-simulation="<mode>"`
 *     -> the wrapper's inline `filter` references `#cb-filter-<mode>`
 *     -> that referenced `<filter>` exists in the document
 *     -> it carries a `feColorMatrix[type=matrix]` with a 20-value matrix
 *     -> the sticky banner and the preview description name the active preset
 *
 * The matrix definitions are the bridge to `contrastUtils.ts`: if the filter
 * definitions are dropped or the reference and the definition disagree, the flow
 * silently previews the unfiltered colours and every screen-reader-style text
 * assertion would still pass — which is exactly why the filter linkage is checked
 * as DOM state rather than through the component's internals.
 *
 * ## Failure paths covered
 *
 * - Spoofed/leftover storage must never enable the preview (documented
 *   `COLORBLIND_PERSISTENCE_POLICY` — in-memory only, never `localStorage`).
 * - Reloading returns the preview to `Off` and leaves no storage artifacts.
 * - A canary test breaks one step of the chain (removes the SVG filter
 *   definitions) and proves the chain assertion used by the success path goes
 *   red, so the success path cannot pass vacuously.
 *
 * ## Running
 *
 * Runs under `npm run test:e2e` (Chromium + Firefox), which the `Build & test`
 * CI job executes on every pull request targeting `main`.
 *
 *   npx playwright test e2e/colorblind-simulation-flow.spec.ts
 */

const PRESETS = [
  {
    mode: "protanopia",
    accessibleName: "Protanopia (red-blind)",
    chipText: "Protanopia",
  },
  {
    mode: "deuteranopia",
    accessibleName: "Deuteranopia (green-blind)",
    chipText: "Deuteranopia",
  },
  {
    mode: "tritanopia",
    accessibleName: "Tritanopia (blue-blind)",
    chipText: "Tritanopia",
  },
] as const;

/** Mirrors `COLORBLIND_STORAGE_KEYS` in the provider module. */
const COLORBLIND_STORAGE_KEYS = [
  "fluxora:colorblind-simulation",
  "colorBlindSimulation",
  "colorblind-simulation",
  "cb-simulation-mode",
] as const;

/**
 * Walks to the colour-blind controls the way a user does — by URL, then by the
 * visible toggle — and leaves the page in its settled (data-loaded) state.
 */
async function openColorBlindControls(page: Page) {
  await page.goto("/app/treasurypage", { waitUntil: "domcontentloaded" });

  const toggle = page.getByTestId("colorblind-toggle");
  await expect(toggle).toBeVisible();
  // The figures label only renders once the overview data has resolved, so it is
  // the "page is settled" signal before we start driving the preview.
  await expect(page.getByTestId("figures-period-label")).toBeVisible();

  return toggle;
}

/** Clicks the visible preset chip (the visually hidden radio follows the label). */
async function selectPreset(page: Page, chipText: string, accessibleName: string) {
  const toggle = page.getByTestId("colorblind-toggle");
  await toggle.getByText(chipText, { exact: true }).click();
  await expect(toggle.getByRole("radio", { name: accessibleName })).toBeChecked();
}

/**
 * Reads the whole preset -> filter-definition chain out of the live DOM.
 * Returns `false` the moment any single link is broken.
 */
async function colorBlindChainIsIntact(
  page: Page,
  expectedMode: string,
): Promise<boolean> {
  return page.evaluate((mode) => {
    const wrapper = document.querySelector<HTMLElement>(
      `[data-colorblind-simulation="${mode}"]`,
    );
    if (!wrapper) return false;

    // 1. The active preset must point at its own filter definition.
    const reference = /url\(["']?#([^"')]+)["']?\)/.exec(
      wrapper.style.filter ?? "",
    );
    if (!reference || reference[1] !== `cb-filter-${mode}`) return false;

    // 2. That definition must actually exist in the document.
    const definition = document.getElementById(reference[1]);
    if (!definition) return false;

    // 3. …and carry a usable 5x4 feColorMatrix, the bridge to contrastUtils.
    const matrix = definition.querySelector("feColorMatrix");
    if (!matrix || matrix.getAttribute("type") !== "matrix") return false;
    const values = (matrix.getAttribute("values") ?? "").trim().split(/\s+/);
    if (values.length !== 20 || values.some((value) => Number.isNaN(Number(value)))) {
      return false;
    }

    // 4. The user-facing banner must name the same preset.
    const banner = document.querySelector(
      '[data-testid="colorblind-active-banner"]',
    );
    if (!banner || banner.getAttribute("data-colorblind-active") !== mode) {
      return false;
    }

    return true;
  }, expectedMode);
}

function storedArtifacts(page: Page): Promise<string[]> {
  return page.evaluate((keys) => {
    return keys.filter(
      (key) =>
        window.localStorage.getItem(key) !== null ||
        window.sessionStorage.getItem(key) !== null,
    );
  }, [...COLORBLIND_STORAGE_KEYS]);
}

test.describe("Colour-blind operation flow", () => {
  test("success path: previewing every preset keeps the filter chain intact and can be turned off", async ({
    page,
  }) => {
    const toggle = await openColorBlindControls(page);

    // The preview starts off, and says so.
    await expect(toggle.getByRole("radio", { name: "No simulation" })).toBeChecked();
    await expect(page.locator('[data-colorblind-simulation="none"]')).toHaveCount(1);
    await expect(page.getByTestId("colorblind-active-banner")).toHaveCount(0);

    for (const preset of PRESETS) {
      // Off -> pick a preset. The chips are only ever clicked while the page is
      // unfiltered, which is also the order a designer actually works in.
      await selectPreset(page, preset.chipText, preset.accessibleName);

      // The whole chain holds for this preset.
      expect(await colorBlindChainIsIntact(page, preset.mode)).toBe(true);

      // And it is legible to the user, not just correct in the DOM.
      await expect(page.getByTestId("colorblind-active-banner")).toContainText(
        preset.accessibleName,
      );
      await expect(page.getByTestId("active-filter-description")).toContainText(
        preset.accessibleName,
      );

      // The overview the user is judging is still rendered underneath the filter.
      await expect(
        page.getByRole("heading", { level: 1, name: "Treasury overview" }),
      ).toBeVisible();
      await expect(page.getByRole("group", { name: "Active Streams" })).toBeVisible();

      // Preview -> back to the unfiltered view via the banner's one-click disable.
      await page.getByTestId("colorblind-disable-button").click();

      await expect(toggle.getByRole("radio", { name: "No simulation" })).toBeChecked();
      await expect(page.locator('[data-colorblind-simulation="none"]')).toHaveCount(1);
      await expect(page.getByTestId("colorblind-active-banner")).toHaveCount(0);
      await expect(page.getByTestId("active-filter-description")).toHaveCount(0);
    }

    // After the last disable, no preset is still referenced anywhere.
    expect(await colorBlindChainIsIntact(page, "tritanopia")).toBe(false);
  });

  test("success path: preset is reachable by keyboard alone", async ({ page }) => {
    const toggle = await openColorBlindControls(page);

    const offRadio = toggle.getByRole("radio", { name: "No simulation" });
    await offRadio.focus();
    await expect(offRadio).toBeFocused();

    // Native radio-group arrow navigation must move both focus and selection.
    await page.keyboard.press("ArrowRight");

    const protanopia = toggle.getByRole("radio", {
      name: "Protanopia (red-blind)",
    });
    await expect(protanopia).toBeFocused();
    await expect(protanopia).toBeChecked();
    expect(await colorBlindChainIsIntact(page, "protanopia")).toBe(true);
  });

  test("failure path: spoofed storage cannot enable the preview", async ({ page }) => {
    // A leftover key from an earlier experiment must not miscolour the UI with no
    // obvious cause — the provider treats storage as untrusted input.
    await page.addInitScript((keys) => {
      for (const key of keys) {
        window.localStorage.setItem(key, "protanopia");
        window.sessionStorage.setItem(key, "protanopia");
      }
    }, [...COLORBLIND_STORAGE_KEYS]);

    const toggle = await openColorBlindControls(page);

    await expect(toggle.getByRole("radio", { name: "No simulation" })).toBeChecked();
    await expect(page.locator('[data-colorblind-simulation="none"]')).toHaveCount(1);
    await expect(page.getByTestId("colorblind-active-banner")).toHaveCount(0);

    // The leftovers are cleaned up on mount, so a reload cannot resurrect them.
    expect(await storedArtifacts(page)).toEqual([]);
  });

  test("failure path: reload resets the preview to Off and persists nothing", async ({
    page,
  }) => {
    await openColorBlindControls(page);

    await selectPreset(page, "Tritanopia", "Tritanopia (blue-blind)");
    expect(await colorBlindChainIsIntact(page, "tritanopia")).toBe(true);

    await page.reload({ waitUntil: "domcontentloaded" });

    const reloadedToggle = await openColorBlindControls(page);
    await expect(
      reloadedToggle.getByRole("radio", { name: "No simulation" }),
    ).toBeChecked();
    await expect(page.getByTestId("colorblind-active-banner")).toHaveCount(0);
    expect(await storedArtifacts(page)).toEqual([]);
  });

  test("canary: breaking one step of the flow turns the chain assertion red", async ({
    page,
  }) => {
    await openColorBlindControls(page);
    await selectPreset(page, "Protanopia", "Protanopia (red-blind)");

    // Control: with the flow intact, the same assertion the success path uses passes.
    expect(await colorBlindChainIsIntact(page, "protanopia")).toBe(true);

    // Break one step the way a regression would: the SVG filter definitions never
    // make it into the document, so the active preset references nothing.
    await page.evaluate(() => {
      document.querySelectorAll("svg filter").forEach((filter) => filter.remove());
    });

    expect(await colorBlindChainIsIntact(page, "protanopia")).toBe(false);
  });
});
