import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../utils/contrastUtils";

const pairings = [
  ["light primary text", "#1a1f36", "#ffffff"],
  ["light muted text", "#4a5565", "#ffffff"],
  ["light primary button", "#ffffff", "#007f68"],
  ["dark primary text", "#e8ecf4", "#0a0e17"],
  ["dark muted text", "#b0b8c9", "#0a0e17"],
  ["dark primary button", "#04131a", "#00b890"],
] as const;

describe("notification priming contrast", () => {
  it.each(pairings)("keeps %s at WCAG AA", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});