import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useWidgetLayout } from "../useWidgetLayout";
import { Metric } from "../Metric";

// Mock the useWallet hook
let mockWalletAddress: string | null = null;
vi.mock("../../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    address: mockWalletAddress,
  }),
}));

describe("useWidgetLayout hook", () => {
  const mockMetrics: Metric[] = [
    { label: "Total Balance", value: "$100k", desc: "Balance", icon: "💰" },
    { label: "Active Streams", value: "5", desc: "Streams", icon: "🌊" },
    { label: "Pending Claims", value: "$5k", desc: "Claims", icon: "⏱️" },
  ];

  beforeEach(() => {
    mockWalletAddress = null;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns default fallback layout when localStorage is empty", () => {
    const { result } = renderHook(() => useWidgetLayout(mockMetrics));

    expect(result.current.layout.version).toBe(1);
    expect(result.current.layout.widgets).toHaveLength(3);
    
    // Check default configs
    expect(result.current.layout.widgets[0]).toEqual({
      id: "total-balance",
      size: "1x1",
      visible: true,
      order: 0,
    });
    expect(result.current.layout.widgets[1].id).toBe("active-streams");
    expect(result.current.layout.widgets[2].id).toBe("pending-claims");
  });

  it("handles localStorage round-trip", () => {
    const { result } = renderHook(() => useWidgetLayout(mockMetrics));

    // Reorder widgets: swap first and second
    act(() => {
      const reordered = [
        result.current.layout.widgets[1],
        result.current.layout.widgets[0],
        result.current.layout.widgets[2],
      ];
      result.current.reorderWidgets(reordered);
    });

    // Verify state updated
    expect(result.current.layout.widgets[0].id).toBe("active-streams");
    expect(result.current.layout.widgets[0].order).toBe(0);
    expect(result.current.layout.widgets[1].id).toBe("total-balance");
    expect(result.current.layout.widgets[1].order).toBe(1);

    // Verify it is written to unscoped key in localStorage
    const saved = localStorage.getItem("fluxora:treasury:widget-layout");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.widgets[0].id).toBe("active-streams");
  });

  it("uses wallet-scoped key when wallet is connected", () => {
    mockWalletAddress = "G-MOCK-WALLET-ADDRESS-123";
    const { result } = renderHook(() => useWidgetLayout(mockMetrics));

    // Resize a widget
    act(() => {
      result.current.updateWidgetSize("total-balance", "2x1");
    });

    expect(result.current.layout.widgets[0].size).toBe("2x1");

    // Verify it is saved in the wallet-scoped key
    const unscopedSaved = localStorage.getItem("fluxora:treasury:widget-layout");
    const scopedSaved = localStorage.getItem(`fluxora:treasury:widget-layout:${mockWalletAddress}`);

    expect(unscopedSaved).toBeNull();
    expect(scopedSaved).not.toBeNull();
    const parsed = JSON.parse(scopedSaved!);
    expect(parsed.widgets[0].size).toBe("2x1");
  });

  it("falls back to unscoped key when no wallet is connected", () => {
    // Save some data to unscoped key
    const initialLayout = {
      version: 1,
      widgets: [
        { id: "total-balance", size: "2x1", visible: false, order: 0 },
        { id: "active-streams", size: "1x1", visible: true, order: 1 },
        { id: "pending-claims", size: "1x1", visible: true, order: 2 },
      ],
    };
    localStorage.setItem("fluxora:treasury:widget-layout", JSON.stringify(initialLayout));

    mockWalletAddress = null; // No wallet
    const { result } = renderHook(() => useWidgetLayout(mockMetrics));

    expect(result.current.layout.widgets[0].size).toBe("2x1");
    expect(result.current.layout.widgets[0].visible).toBe(false);
  });

  it("recovers from parse failure and logs a warning", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    // Put corrupt JSON in localStorage
    localStorage.setItem("fluxora:treasury:widget-layout", "{invalid-json-corrupt");

    const { result } = renderHook(() => useWidgetLayout(mockMetrics));

    // Should fall back to default order
    expect(result.current.layout.widgets).toHaveLength(3);
    expect(result.current.layout.widgets[0].id).toBe("total-balance");
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("merges incoming new metrics that are missing from stored layout", () => {
    // Stored layout only has 2 of the widgets
    const storedLayout = {
      version: 1,
      widgets: [
        { id: "total-balance", size: "2x1", visible: true, order: 0 },
        { id: "active-streams", size: "1x1", visible: true, order: 1 },
      ],
    };
    localStorage.setItem("fluxora:treasury:widget-layout", JSON.stringify(storedLayout));

    const { result } = renderHook(() => useWidgetLayout(mockMetrics));

    // Missing metric (pending-claims) should be appended with correct order index
    expect(result.current.layout.widgets).toHaveLength(3);
    expect(result.current.layout.widgets[0].size).toBe("2x1");
    expect(result.current.layout.widgets[2].id).toBe("pending-claims");
    expect(result.current.layout.widgets[2].order).toBe(2);
    expect(result.current.layout.widgets[2].visible).toBe(true);
  });
});
