/**
 * contrastUtils tests
 * ────────────────────
 * Unit tests for WCAG luminance math, contrast ratio calculations,
 * and colour-blind simulation matrix helpers.
 */

import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  luminance,
  contrastRatio,
  wcagLevel,
  applyColorMatrix,
  rgbToHex,
  simulateColorBlindness,
  simulatedContrastRatio,
  COLOR_BLIND_MATRICES,
} from "../contrastUtils";

// ─── hexToRgb ────────────────────────────────────────────────────────────────

describe("hexToRgb", () => {
  it("parses a 6-digit hex with #", () => {
    expect(hexToRgb("#1ec98e")).toEqual({ r: 30, g: 201, b: 142 });
  });

  it("parses a 6-digit hex without #", () => {
    expect(hexToRgb("ff6b6b")).toEqual({ r: 255, g: 107, b: 107 });
  });

  it("parses a 3-digit hex with #", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("parses a 3-digit hex without #", () => {
    expect(hexToRgb("000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("returns null for an invalid hex string", () => {
    expect(hexToRgb("not-a-colour")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(hexToRgb("")).toBeNull();
  });

  it("handles uppercase hex", () => {
    expect(hexToRgb("#FFA726")).toEqual({ r: 255, g: 167, b: 38 });
  });
});

// ─── luminance ───────────────────────────────────────────────────────────────

describe("luminance", () => {
  it("returns 0 for black", () => {
    expect(luminance(0, 0, 0)).toBe(0);
  });

  it("returns 1 for white", () => {
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 5);
  });

  it("returns a value between 0 and 1 for a mid-tone colour", () => {
    const lum = luminance(30, 201, 142); // #1ec98e success
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });
});

// ─── contrastRatio ───────────────────────────────────────────────────────────

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    const ratio = contrastRatio("#000000", "#ffffff");
    expect(ratio).toBeCloseTo(21, 1);
  });

  it("returns 1 for identical colours", () => {
    const ratio = contrastRatio("#ff6b6b", "#ff6b6b");
    expect(ratio).toBeCloseTo(1, 5);
  });

  it("is symmetric (order of arguments does not matter)", () => {
    const r1 = contrastRatio("#1ec98e", "#121a2a");
    const r2 = contrastRatio("#121a2a", "#1ec98e");
    expect(r1).toBeCloseTo(r2 as number, 10);
  });

  it("returns null when the first colour is invalid", () => {
    expect(contrastRatio("not-a-colour", "#ffffff")).toBeNull();
  });

  it("returns null when the second colour is invalid", () => {
    expect(contrastRatio("#000000", "not-a-colour")).toBeNull();
  });

  it("success token #1ec98e passes AA against dark theme bg #121a2a", () => {
    const ratio = contrastRatio("#1ec98e", "#121a2a") as number;
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("warning token #ffa726 against dark theme bg #121a2a is legible (≥3:1)", () => {
    const ratio = contrastRatio("#ffa726", "#121a2a") as number;
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it("error token #ff6b6b against dark theme bg #121a2a is legible (≥3:1)", () => {
    const ratio = contrastRatio("#ff6b6b", "#121a2a") as number;
    expect(ratio).toBeGreaterThanOrEqual(3);
  });
});

// ─── wcagLevel ───────────────────────────────────────────────────────────────

describe("wcagLevel", () => {
  it("returns AAA for ratio ≥ 7", () => {
    expect(wcagLevel(7.1)).toBe("AAA");
    expect(wcagLevel(21)).toBe("AAA");
  });

  it("returns AA for ratio 4.5–6.99", () => {
    expect(wcagLevel(4.5)).toBe("AA");
    expect(wcagLevel(6.9)).toBe("AA");
  });

  it("returns AA-large for ratio 3–4.49", () => {
    expect(wcagLevel(3)).toBe("AA-large");
    expect(wcagLevel(4.4)).toBe("AA-large");
  });

  it("returns Fail for ratio < 3", () => {
    expect(wcagLevel(2.9)).toBe("Fail");
    expect(wcagLevel(1)).toBe("Fail");
  });
});

// ─── applyColorMatrix ────────────────────────────────────────────────────────

describe("applyColorMatrix", () => {
  it("leaves white unchanged under an identity matrix", () => {
    const identity = [
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ];
    expect(applyColorMatrix({ r: 255, g: 255, b: 255 }, identity)).toEqual({
      r: 255,
      g: 255,
      b: 255,
    });
  });

  it("clamps output channels to [0, 255]", () => {
    const overflowMatrix = [
      2, 0, 0,
      2, 0, 0,
      2, 0, 0,
    ];
    const result = applyColorMatrix({ r: 255, g: 0, b: 0 }, overflowMatrix);
    expect(result.r).toBe(255);
    expect(result.g).toBe(255);
    expect(result.b).toBe(255);
  });

  it("produces a changed colour under the protanopia matrix", () => {
    const original = { r: 255, g: 0, b: 0 }; // Pure red
    const result = applyColorMatrix(original, COLOR_BLIND_MATRICES.protanopia);
    // Protanopia shifts red significantly toward green/grey; result ≠ original
    expect(result).not.toEqual(original);
  });
});

// ─── rgbToHex ────────────────────────────────────────────────────────────────

describe("rgbToHex", () => {
  it("converts black to #000000", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });

  it("converts white to #ffffff", () => {
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
  });

  it("round-trips a hex colour through hexToRgb → rgbToHex", () => {
    const original = "#1ec98e";
    const rgb = hexToRgb(original)!;
    expect(rgbToHex(rgb)).toBe(original);
  });
});

// ─── simulateColorBlindness ──────────────────────────────────────────────────

describe("simulateColorBlindness", () => {
  it("returns a valid hex string for each simulation type", () => {
    const hex = "#1ec98e";
    const hexPattern = /^#[0-9a-f]{6}$/;
    expect(simulateColorBlindness(hex, "protanopia")).toMatch(hexPattern);
    expect(simulateColorBlindness(hex, "deuteranopia")).toMatch(hexPattern);
    expect(simulateColorBlindness(hex, "tritanopia")).toMatch(hexPattern);
  });

  it("returns the original string when hex is unparseable", () => {
    expect(simulateColorBlindness("not-a-colour", "protanopia")).toBe(
      "not-a-colour",
    );
  });

  it("protanopia shifts pure red toward grey/green", () => {
    const original = "#ff0000";
    const simulated = simulateColorBlindness(original, "protanopia");
    // Pure red should not remain pure red under protanopia
    expect(simulated).not.toBe(original);
  });
});

// ─── simulatedContrastRatio ──────────────────────────────────────────────────

describe("simulatedContrastRatio", () => {
  it("returns a number for all simulation types", () => {
    const fg = "#1ec98e";
    const bg = "#121a2a";
    expect(simulatedContrastRatio(fg, bg, "protanopia")).not.toBeNull();
    expect(simulatedContrastRatio(fg, bg, "deuteranopia")).not.toBeNull();
    expect(simulatedContrastRatio(fg, bg, "tritanopia")).not.toBeNull();
  });

  it("returns null when a colour is unparseable", () => {
    expect(simulatedContrastRatio("not-a-colour", "#ffffff", "protanopia")).toBeNull();
  });

  it("simulated ratio is a positive number ≥ 1", () => {
    const ratio = simulatedContrastRatio("#ffa726", "#0f1624", "deuteranopia");
    expect(ratio).not.toBeNull();
    expect(ratio as number).toBeGreaterThanOrEqual(1);
  });
});

import { contrastRatio as themeContrastRatio } from "../../theme/contrastUtils";

describe("Integration: contrastRatio canonical source", () => {
  it("utils and theme contrastRatio agree exactly on a boundary value", () => {
    // A pair that might cause rounding differences
    const fg = "#757575"; // grey
    const bg = "#ffffff"; // white
    const utilsRatio = contrastRatio(fg, bg);
    const themeRatio = themeContrastRatio(fg, bg);
    expect(utilsRatio).toBe(themeRatio);
  });
});

