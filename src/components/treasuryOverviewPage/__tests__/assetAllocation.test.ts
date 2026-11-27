import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  OTHER_TILE_ID,
  TREEMAP_PALETTE_SIZE,
  buildAssetAllocation,
  toMinorUnits,
} from "../assetAllocation";
import { selectAllocationTokens } from "../useTreasuryOverviewData";

describe("toMinorUnits", () => {
  it("parses display amounts into exact 7-decimal minor units", () => {
    expect(toMinorUnits(1)).toBe(10_000_000n);
    expect(toMinorUnits(0.1)).toBe(1_000_000n);
    expect(toMinorUnits(1234.5678901)).toBe(12_345_678_901n);
  });

  it("rejects zero, negatives, non-finite and non-number input", () => {
    for (const bad of [0, -1, Number.NaN, Infinity, -Infinity, "5", null, undefined]) {
      expect(toMinorUnits(bad)).toBeNull();
    }
  });

  it("rejects exponent-notation magnitudes outside the supported range", () => {
    expect(toMinorUnits(1e21)).toBeNull();
    expect(toMinorUnits(1e-9)).toBeNull();
  });
});

describe("buildAssetAllocation", () => {
  it("returns no tiles for empty, null or invalid input", () => {
    expect(buildAssetAllocation([])).toEqual({ tiles: [], assetCount: 0 });
    expect(buildAssetAllocation(null)).toEqual({ tiles: [], assetCount: 0 });
    expect(buildAssetAllocation(undefined)).toEqual({ tiles: [], assetCount: 0 });
    expect(
      buildAssetAllocation([
        { asset: "USDC", amount: 0 },
        { asset: "", amount: 10 },
        { asset: "XLM", amount: -4 },
      ]),
    ).toEqual({ tiles: [], assetCount: 0 });
  });

  it("gives a single asset 100%", () => {
    const { tiles, assetCount } = buildAssetAllocation([{ asset: "USDC", amount: 52000 }]);
    expect(assetCount).toBe(1);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toMatchObject({
      id: "USDC",
      label: "USDC",
      shareBps: 10_000n,
      formattedShare: "100.00",
      formattedAmount: "52,000.00 USDC",
      weight: 1_000_000,
      colorIndex: 0,
      isOther: false,
    });
  });

  it("orders tiles by amount and computes exact shares", () => {
    const { tiles } = buildAssetAllocation([
      { asset: "XLM", amount: 25 },
      { asset: "USDC", amount: 75 },
    ]);
    expect(tiles.map((t) => t.id)).toEqual(["USDC", "XLM"]);
    expect(tiles.map((t) => t.formattedShare)).toEqual(["75.00", "25.00"]);
    expect(tiles.map((t) => t.colorIndex)).toEqual([0, 1]);
  });

  it("merges duplicate assets", () => {
    const { tiles, assetCount } = buildAssetAllocation([
      { asset: "USDC", amount: 10 },
      { asset: "USDC", amount: 30 },
      { asset: "XLM", amount: 40 },
    ]);
    expect(assetCount).toBe(2);
    expect(tiles.map((t) => [t.id, t.formattedShare])).toEqual([
      ["USDC", "50.00"],
      ["XLM", "50.00"],
    ]);
  });

  it("breaks equal-amount ties by asset name", () => {
    const { tiles } = buildAssetAllocation([
      { asset: "XLM", amount: 5 },
      { asset: "EURC", amount: 5 },
    ]);
    expect(tiles.map((t) => t.id)).toEqual(["EURC", "XLM"]);
  });

  it("groups two or more sub-2% assets into an Other tile", () => {
    const { tiles, assetCount } = buildAssetAllocation([
      { asset: "USDC", amount: 31200 },
      { asset: "XLM", amount: 9800 },
      { asset: "EURC", amount: 6100 },
      { asset: "AQUA", amount: 750 },
      { asset: "yXLM", amount: 650 },
    ]);
    expect(assetCount).toBe(5);
    expect(tiles.map((t) => t.id)).toEqual(["USDC", "XLM", "EURC", OTHER_TILE_ID]);
    const other = tiles[3];
    expect(other).toMatchObject({
      label: "Other (2 assets)",
      isOther: true,
      colorIndex: null,
      assets: ["AQUA", "yXLM"],
      formattedAmount: "1,400.00",
    });
    expect(other.formattedShare).toBe("2.88");
  });

  it("keeps a lone small asset as its own tile", () => {
    const { tiles } = buildAssetAllocation([
      { asset: "USDC", amount: 990 },
      { asset: "XLM", amount: 10 },
    ]);
    expect(tiles.map((t) => t.id)).toEqual(["USDC", "XLM"]);
    expect(tiles[1].formattedShare).toBe("1.00");
  });

  it("cycles the categorical palette after ten colours", () => {
    const tokens = Array.from({ length: 12 }, (_, i) => ({ asset: `A${String(i).padStart(2, "0")}`, amount: 100 }));
    const { tiles } = buildAssetAllocation(tokens);
    expect(tiles.map((t) => t.colorIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1]);
    expect(TREEMAP_PALETTE_SIZE).toBe(10);
  });

  it("formats amounts precisely, rounding half-up to 2 decimals", () => {
    const { tiles } = buildAssetAllocation([{ asset: "XLM", amount: 0.005 }]);
    expect(tiles[0].formattedAmount).toBe("0.01 XLM");
  });

  it("stays exact for amounts at the top of the safe range", () => {
    const { tiles } = buildAssetAllocation([
      { asset: "BIG", amount: 900719925474099 },
      { asset: "SMALL", amount: 900719925474099 },
    ]);
    expect(tiles[0].formattedAmount).toBe("900,719,925,474,099.00 BIG");
    expect(tiles.map((t) => t.formattedShare)).toEqual(["50.00", "50.00"]);
  });

  it("layout weights are bounded integers that cover the whole (within rounding)", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(
          fc.record({
            asset: fc.string({ minLength: 1, maxLength: 5 }).filter((s) => s.trim() === s && s !== ""),
            amount: fc.integer({ min: 1, max: 1_000_000_000 }),
          }),
          { minLength: 1, maxLength: 20, selector: (t) => t.asset },
        ),
        (tokens) => {
          const { tiles } = buildAssetAllocation(tokens);
          const totalWeight = tiles.reduce((s, t) => s + t.weight, 0);
          for (const t of tiles) {
            expect(Number.isInteger(t.weight)).toBe(true);
            expect(t.weight).toBeGreaterThanOrEqual(0);
            expect(t.weight).toBeLessThanOrEqual(1_000_000);
          }
          // Each tile floors to the ppm, so at most one ppm is lost per tile.
          expect(totalWeight).toBeGreaterThan(1_000_000 - tiles.length - 1);
          expect(totalWeight).toBeLessThanOrEqual(1_000_000);
          const totalBps = tiles.reduce((s, t) => s + t.shareBps, 0n);
          expect(totalBps).toBeLessThanOrEqual(10_000n);
        },
      ),
    );
  });
});

describe("selectAllocationTokens", () => {
  it("picks the Total Streaming metric's tokens", () => {
    const tokens = [{ asset: "USDC", amount: 1 }];
    expect(
      selectAllocationTokens([
        { label: "Active Streams", value: "1", desc: "", icon: null },
        { label: "Total Streaming", value: "1", desc: "", icon: null, tokens },
      ]),
    ).toBe(tokens);
  });

  it("returns an empty list when the metric or its tokens are missing", () => {
    expect(selectAllocationTokens(undefined)).toEqual([]);
    expect(selectAllocationTokens([{ label: "Total Streaming", value: "1", desc: "", icon: null }])).toEqual([]);
  });
});
