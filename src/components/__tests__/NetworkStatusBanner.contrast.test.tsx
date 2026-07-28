import { describe, expect, it } from "vitest";
import {
  evaluateContrast,
  THEME_BACKGROUNDS,
} from "../../utils/contrastUtils";

/**
 * Per-state expected luminance token. These are the design-token defaults
 * (--status-info, --status-warning, --status-error, --status-success) for
 * the icon colour AND the layer-paired text colour from the Figma palette.
 *
 * The matchers in this file are colocated with the spec so a token
 * recolour triggers a deliberate test update rather than a silent break.
 */
const EXPECTATIONS = [
  // ─── light theme ─── text on tinted bg (matches light --surface-* family)
  { theme: "light" as const, tone: "info" as const, text: "#1a1f36", bg: "#e6f7fb" },
  { theme: "light" as const, tone: "warning" as const, text: "#1a1f36", bg: "#fff4e0" },
  { theme: "light" as const, tone: "error" as const, text: "#1a1f36", bg: "#ffe9e9" },
  { theme: "light" as const, tone: "success" as const, text: "#0a0e17", bg: "#dff6ec" },
  // ─── dark theme ─── (proxy pairs approximate the alpha-blended banner bg)
  { theme: "dark" as const, tone: "info" as const, text: "#e8ecf4", bg: "#13334d" },
  { theme: "dark" as const, tone: "warning" as const, text: "#e8ecf4", bg: "#3a2a16" },
  { theme: "dark" as const, tone: "error" as const, text: "#e8ecf4", bg: "#3a1414" },
  // Dark success blend: --color-success-bg rgba(30,201,142,0.30) over
  // --surface-elevated #151e2e; net lightness is high enough for #e8ecf4.
  { theme: "dark" as const, tone: "success" as const, text: "#e8ecf4", bg: "#1d5942" },
] as const;

describe("NetworkStatusBanner — contrast ≥ 4.5 : 1 across themes per tone", () => {
  it("theme background tokens are visible to contrastUtils", () => {
    expect(THEME_BACKGROUNDS.light).toBeTruthy();
    expect(THEME_BACKGROUNDS.dark).toBeTruthy();
  });

  for (const expectation of EXPECTATIONS) {
    it(`${expectation.theme} · ${expectation.tone} banner meets WCAG AA (≥ 4.5 : 1)`, () => {
      const result = evaluateContrast(expectation.text, expectation.bg);
      expect(result.passesAA, result.formattedRatio).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
    });
  }
});
