/**
 * Asset-allocation model for the treasury treemap.
 *
 * Converts the `MetricToken[]` breakdown the treasury overview already
 * exposes into tiles with exact shares and display strings. Amounts are never
 * combined as floating-point numbers: each token amount is parsed once into
 * exact minor units (`bigint`) through `src/lib/amountPrecision.ts`, and all
 * totals, shares and display values are derived with integer arithmetic and
 * rendered through `src/lib/formatters.ts`.
 *
 * The only `number`s that leave this module are layout weights in parts per
 * million — bounded, dimensionless ratios that `treemapLayout.ts` needs for
 * geometry.
 */

import { parseAmountString, toSmallestUnitsString } from "../../lib/amountPrecision";
import { formatTokenAmount } from "../../lib/formatters";
import type { MetricToken } from "./Metric";

/** Precision at which token amounts are held while computing shares. */
const AMOUNT_DECIMALS = 7;
/** Fraction digits shown for amounts in labels and the table. */
const DISPLAY_DECIMALS = 2;
const DISPLAY_DIVISOR = 10n ** BigInt(AMOUNT_DECIMALS - DISPLAY_DECIMALS);

/** Shares are computed in hundredths of a percent (basis points). */
const BPS_SCALE = 10_000n;
/** Layout weights are computed in parts per million. */
const PPM_SCALE = 1_000_000n;

/** Assets below this share (2% = 200 bps) are grouped into "Other". */
export const OTHER_THRESHOLD_BPS = 200n;
export const OTHER_TILE_ID = "__other__";

/** Number of categorical colour slots defined in the treemap CSS tokens. */
export const TREEMAP_PALETTE_SIZE = 10;

export interface AllocationTile {
  id: string;
  /** Visible label, e.g. "USDC" or "Other (3 assets)". */
  label: string;
  /** Exact amount in minor units (10^-7). */
  minorUnits: bigint;
  /** Locale-formatted amount, e.g. "36,200.00 USDC". */
  formattedAmount: string;
  /** Share of the treasury in basis points (0–10000). */
  shareBps: bigint;
  /** Locale-formatted share without the % sign, e.g. "74.64". */
  formattedShare: string;
  /** Layout weight in parts per million. */
  weight: number;
  /** Categorical colour slot, or `null` for the neutral "Other" tile. */
  colorIndex: number | null;
  isOther: boolean;
  /** Assets represented by this tile (1, or N for "Other"). */
  assets: string[];
}

export interface AssetAllocation {
  tiles: AllocationTile[];
  /** Number of distinct assets with a positive balance. */
  assetCount: number;
}

interface ParsedToken {
  asset: string;
  minorUnits: bigint;
}

/**
 * Parse a token amount into exact minor units without float arithmetic.
 * Rejects non-finite, non-positive and exponent-notation values (the latter
 * are outside the supported amount range in either direction).
 */
export function toMinorUnits(amount: unknown): bigint | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const canonical = parseAmountString(String(amount));
  if (canonical === "") return null;
  const minor = BigInt(toSmallestUnitsString(canonical, AMOUNT_DECIMALS));
  return minor > 0n ? minor : null;
}

function formatShare(bps: bigint): string {
  return formatTokenAmount(bps, 2);
}

function formatAmount(minorUnits: bigint, asset: string): string {
  // Round half-up from 7 to 2 fraction digits in integer space.
  const rounded = (minorUnits + DISPLAY_DIVISOR / 2n) / DISPLAY_DIVISOR;
  return formatTokenAmount(rounded, DISPLAY_DECIMALS, asset);
}

/** Integer-to-weight conversion for bounded ppm values (≤ 1e6). */
function toWeight(ppm: bigint): number {
  return parseInt(ppm.toString(), 10);
}

function compareParsed(a: ParsedToken, b: ParsedToken): number {
  if (a.minorUnits !== b.minorUnits) return a.minorUnits > b.minorUnits ? -1 : 1;
  if (a.asset < b.asset) return -1;
  if (a.asset > b.asset) return 1;
  return 0;
}

/**
 * Build the treemap tiles for a token breakdown.
 *
 * - Duplicate assets are merged; invalid or non-positive amounts are ignored.
 * - Tiles are ordered by amount descending, ties by asset name.
 * - Two or more assets below {@link OTHER_THRESHOLD_BPS} collapse into a
 *   single "Other" tile (a lone small asset keeps its own tile).
 * - Colour slots follow the ordering and cycle after
 *   {@link TREEMAP_PALETTE_SIZE}.
 */
export function buildAssetAllocation(tokens: readonly MetricToken[] | null | undefined): AssetAllocation {
  const byAsset = new Map<string, bigint>();
  for (const token of tokens ?? []) {
    if (!token || typeof token.asset !== "string" || token.asset.trim() === "") continue;
    const minor = toMinorUnits(token.amount);
    if (minor === null) continue;
    const asset = token.asset.trim();
    byAsset.set(asset, (byAsset.get(asset) ?? 0n) + minor);
  }

  const parsed: ParsedToken[] = Array.from(byAsset, ([asset, minorUnits]) => ({ asset, minorUnits })).sort(
    compareParsed,
  );
  const total = parsed.reduce((sum, t) => sum + t.minorUnits, 0n);
  if (total === 0n) return { tiles: [], assetCount: 0 };

  const shareOf = (minor: bigint) => (minor * BPS_SCALE) / total;
  const small = parsed.filter((t) => shareOf(t.minorUnits) < OTHER_THRESHOLD_BPS);
  const groupSmall = small.length >= 2;
  const smallSet = new Set(groupSmall ? small.map((t) => t.asset) : []);

  const tiles: AllocationTile[] = [];
  parsed
    .filter((t) => !smallSet.has(t.asset))
    .forEach((t, idx) => {
      const shareBps = shareOf(t.minorUnits);
      tiles.push({
        id: t.asset,
        label: t.asset,
        minorUnits: t.minorUnits,
        formattedAmount: formatAmount(t.minorUnits, t.asset),
        shareBps,
        formattedShare: formatShare(shareBps),
        weight: toWeight((t.minorUnits * PPM_SCALE) / total),
        colorIndex: idx % TREEMAP_PALETTE_SIZE,
        isOther: false,
        assets: [t.asset],
      });
    });

  if (groupSmall) {
    const otherMinor = small.reduce((sum, t) => sum + t.minorUnits, 0n);
    const shareBps = shareOf(otherMinor);
    tiles.push({
      id: OTHER_TILE_ID,
      label: `Other (${small.length} assets)`,
      minorUnits: otherMinor,
      // Mixed assets have no common ticker, so the combined figure is unitless.
      formattedAmount: formatAmount(otherMinor, ""),
      shareBps,
      formattedShare: formatShare(shareBps),
      weight: toWeight((otherMinor * PPM_SCALE) / total),
      colorIndex: null,
      isOther: true,
      assets: small.map((t) => t.asset),
    });
  }

  return { tiles, assetCount: parsed.length };
}
