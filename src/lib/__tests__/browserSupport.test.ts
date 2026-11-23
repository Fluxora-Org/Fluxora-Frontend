import { describe, expect, it } from "vitest";
import {
  isSupportedBrowser,
  SUPPORTED_BROWSER_MATRIX,
  VITE_BUILD_TARGETS,
} from "../browserSupport";

describe("supported browser policy", () => {
  it.each([
    ["Chrome/109.0.0.0", true],
    ["Chrome/108.0.0.0", false],
    ["Edg/109.0.0.0", true],
    ["Edg/108.0.0.0", false],
    ["Firefox/115.0", true],
    ["Firefox/114.0", false],
    ["Version/16.4 Safari/605.1.15", true],
    ["Version/16.3 Safari/605.1.15", false],
    ["UnknownBrowser/99", false],
  ])("checks %s", (userAgent, expected) => {
    expect(isSupportedBrowser(userAgent)).toBe(expected);
  });

  it("keeps each documented minimum aligned with the production build target", () => {
    expect(VITE_BUILD_TARGETS).toEqual(
      SUPPORTED_BROWSER_MATRIX.map(
        ({ engine, minimumVersion }) => `${engine}${minimumVersion}`,
      ),
    );
  });
});
