import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../utils/contrastUtils";

const background = "#070b12";
const panel = "#101827";
const pairings = [
  ["primary text", "#f4f7ff", background],
  ["secondary text", "#b4bfd1", background],
  ["cyan accent and icon", "#65f6ff", background],
  ["green success", "#62ffc9", background],
  ["magenta accent", "#ff75d8", background],
  ["yellow focus and status", "#ffe66d", background],
  ["secondary panel text", "#b4bfd1", panel],
  ["primary button text", background, "#65f6ff"],
] as const;

describe("Cyberpunk theme contrast", () => {
  it.each(pairings)("keeps %s at or above WCAG AA", (_name, foreground, surface) => {
    expect(contrastRatio(foreground, surface)).toBeGreaterThanOrEqual(4.5);
  });
});