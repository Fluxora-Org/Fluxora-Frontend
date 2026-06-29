import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTreasuryOverviewData, isTreasuryDemoMode } from "../useTreasuryOverviewData";
import { treasuryDemoMetrics, treasuryDemoStreams } from "../../../fixtures/treasury";

const useTreasuryMock = vi.fn();

vi.mock("../useTreasury", () => ({
  useTreasury: () => useTreasuryMock(),
}));

describe("useTreasuryOverviewData", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    useTreasuryMock.mockReset();
  });

  describe("isTreasuryDemoMode", () => {
    it("parses the demo mode flag strictly", () => {
      expect(isTreasuryDemoMode("true", false)).toBe(true);
      expect(isTreasuryDemoMode("1", false)).toBe(true);
      expect(isTreasuryDemoMode("false", false)).toBe(false);
      expect(isTreasuryDemoMode("0", false)).toBe(false);
      expect(isTreasuryDemoMode(undefined, false)).toBe(false);
    });

    it("strictly disables demo mode in production", () => {
      expect(isTreasuryDemoMode("true", true)).toBe(false);
      expect(isTreasuryDemoMode("1", true)).toBe(false);
      expect(isTreasuryDemoMode("false", true)).toBe(false);
      expect(isTreasuryDemoMode(undefined, true)).toBe(false);
    });

    it("respects the environment variables correctly by default", () => {
      vi.stubEnv("VITE_DEMO_MODE", "true");
      // @ts-expect-error PROD is boolean in vite types but we need a falsy string here
      vi.stubEnv("PROD", "false");
      expect(isTreasuryDemoMode()).toBe(true);

      vi.stubEnv("VITE_DEMO_MODE", "false");
      expect(isTreasuryDemoMode()).toBe(false);
    });
  });

  describe("useTreasuryOverviewData hook", () => {
    it("returns mock data immediately when demo mode is active", () => {
      vi.stubEnv("VITE_DEMO_MODE", "true");
      // @ts-expect-error PROD is boolean in vite types but we need a falsy string here
      vi.stubEnv("PROD", "false");
      useTreasuryMock.mockReturnValue({
        metrics: [],
        streams: [],
        loading: false,
        error: null,
      });

      const { result } = renderHook(() => useTreasuryOverviewData());
      expect(result.current.isDemoMode).toBe(true);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.metrics).toEqual(treasuryDemoMetrics);
      expect(result.current.streams).toEqual(treasuryDemoStreams);
    });

    it("routes to live success state when demo mode is disabled", () => {
      vi.stubEnv("VITE_DEMO_MODE", "false");

      const mockMetrics = [
        { icon: null, label: "Active Streams", value: "10", desc: "Active streams count" },
      ];
      const mockStreams = [
        {
          id: "1",
          name: "Test Stream",
          recipientAddress: "G-Recipient",
          monthlyRate: 1200,
          asset: "XLM",
          streamedAmount: 500,
          status: "Active" as const,
        },
      ];

      useTreasuryMock.mockReturnValue({
        metrics: mockMetrics,
        streams: mockStreams,
        loading: false,
        error: null,
      });

      const { result } = renderHook(() => useTreasuryOverviewData());

      expect(result.current.isDemoMode).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.metrics).toEqual(mockMetrics);

      // Check mapped streams format (legacy Stream layout)
      expect(result.current.streams).toHaveLength(1);
      expect(result.current.streams[0]).toEqual({
        name: "Test Stream",
        id: "1",
        recipient: "G-Recipient",
        rate: "1,200 XLM/mo",
        accruedAmount: 500,
        status: "Active",
      });
    });

    it("propagates error state and terminates loading", () => {
      vi.stubEnv("VITE_DEMO_MODE", "false");

      useTreasuryMock.mockReturnValue({
        metrics: [],
        streams: [],
        loading: false,
        error: "Failed to connect to network",
      });

      const { result } = renderHook(() => useTreasuryOverviewData());

      expect(result.current.isDemoMode).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Failed to connect to network");
      expect(result.current.metrics).toEqual([]);
      expect(result.current.streams).toEqual([]);
    });

    it("retains loading state when upstream is loading", () => {
      vi.stubEnv("VITE_DEMO_MODE", "false");

      useTreasuryMock.mockReturnValue({
        metrics: [],
        streams: [],
        loading: true,
        error: null,
      });

      const { result } = renderHook(() => useTreasuryOverviewData());

      expect(result.current.isDemoMode).toBe(false);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });
  });
});
