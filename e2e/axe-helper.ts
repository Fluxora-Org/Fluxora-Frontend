import AxeBuilder from "@axe-core/playwright";
import { Page, expect } from "@playwright/test";

/**
 * Known violations to suppress until fixed.
 * Each entry maps a rule ID to an optional reason comment.
 *
 * To add an allowlist entry:
 *   1. Record the axe rule ID from the violation report.
 *   2. Add it here with a short comment explaining why it is deferred.
 *   3. Open a tracking issue and reference it in the comment.
 */
export const ALLOWLISTED_RULES: Record<string, string> = {
  // Example: "color-contrast": "tracked in #999 – design token update pending",
};

/**
 * Runs an axe accessibility scan on the current page and asserts no
 * serious or critical violations exist (excluding allowlisted rules).
 *
 * @param page - Playwright Page object for the route under test.
 * @param routeLabel - Human-readable label used in assertion messages.
 */
export async function scanRoute(
  page: Page,
  routeLabel: string,
): Promise<void> {
  const disabledRules = Object.keys(ALLOWLISTED_RULES);

  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag21a",
    "wcag21aa",
  ]);

  if (disabledRules.length > 0) {
    builder.disableRules(disabledRules);
  }

  const { violations } = await builder.analyze();

  const seriousOrCritical = violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? ""),
  );

  expect(
    seriousOrCritical,
    `[${routeLabel}] Found ${seriousOrCritical.length} serious/critical axe violation(s):\n` +
      seriousOrCritical
        .map((v) => `  - ${v.id} (${v.impact}): ${v.description}`)
        .join("\n"),
  ).toHaveLength(0);
}
