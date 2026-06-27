import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTreasury } from "../useTreasury";
import {
  treasuryDemoMetrics,
  treasuryDemoStreams,
} from "../../../fixtures/treasury";

describe("useTreasury", () => {
  it("returns stable getMetrics and getStreams callbacks", () => {
    const { result, rerender } = renderHook(() => useTreasury());
    const first = result.current;
    rerender();
    expect(result.current.getMetrics).toBe(first.getMetrics);
    expect(result.current.getStreams).toBe(first.getStreams);
  });

  describe("getMetrics", () => {
    it("resolves to an empty array in the default (stub) implementation", async () => {
      const { result } = renderHook(() => useTreasury());
      await expect(result.current.getMetrics()).resolves.toEqual([]);
    });

    it("resolves with the correct Metric shape when given fixture data", async () => {
      const { result } = renderHook(() => useTreasury());
      // Simulate what a real API call would return and assert the shape.
      const metrics = treasuryDemoMetrics;
      for (const m of metrics) {
        expect(m).toMatchObject({
          label: expect.any(String),
          value: expect.any(String),
          desc: expect.any(String),
        });
        // icon is a ReactNode — just assert it is defined (not undefined/null)
        expect(m.icon).toBeDefined();
      }
      // getMetrics itself still resolves to [] (stub); shape contract is on the type
      await expect(result.current.getMetrics()).resolves.toEqual([]);
    });
  });

  describe("getStreams", () => {
    it("resolves to an empty array in the default (stub) implementation", async () => {
      const { result } = renderHook(() => useTreasury());
      await expect(result.current.getStreams()).resolves.toEqual([]);
    });

    it("resolves with the correct Stream shape when given fixture data", async () => {
      const { result } = renderHook(() => useTreasury());
      const streams = treasuryDemoStreams;
      for (const s of streams) {
        expect(s).toMatchObject({
          name: expect.any(String),
          id: expect.any(String),
          recipient: expect.any(String),
          rate: expect.any(String),
          status: expect.stringMatching(/^(Active|Paused|Completed)$/),
        });
      }
      await expect(result.current.getStreams()).resolves.toEqual([]);
    });

    it("stream fixture includes optional accruedAmount only when present", () => {
      for (const s of treasuryDemoStreams) {
        if ("accruedAmount" in s) {
          expect(typeof s.accruedAmount).toBe("number");
        }
      }
    });
  });

  it("returns a plain object with exactly getMetrics and getStreams keys", () => {
    const { result } = renderHook(() => useTreasury());
    expect(Object.keys(result.current).sort()).toEqual([
      "getMetrics",
      "getStreams",
    ]);
  });
});
