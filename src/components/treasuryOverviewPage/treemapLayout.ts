/**
 * Squarified treemap layout (Bruls, Huizing & van Wijk, 2000).
 *
 * Pure, dependency-free geometry used by `TreasuryAssetTreemap`. Given a list
 * of weighted items and a container rectangle it returns one rectangle per
 * item such that:
 *
 *   • every rectangle's area is proportional to its item's weight,
 *   • the rectangles tile the container exactly (areas sum to its area),
 *   • no two rectangles overlap, and
 *   • aspect ratios stay as close to 1:1 as the greedy algorithm allows.
 *
 * The output is fully deterministic: items are ordered by weight descending
 * and ties are broken by `id` (code-point order), so the same set of items
 * always produces the same layout regardless of the input order.
 *
 * Weights are plain layout ratios — callers must derive them from exact
 * amounts (see `assetAllocation.ts`) rather than feeding raw token amounts in.
 */

export interface TreemapItem {
  /** Stable identifier; used for deterministic tie-breaking. */
  id: string;
  /** Relative weight. Non-finite and non-positive weights are dropped. */
  value: number;
}

export interface TreemapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreemapTile extends TreemapRect {
  id: string;
  value: number;
}

/** Deterministic ordering: weight descending, then id ascending. */
export function compareTreemapItems(a: TreemapItem, b: TreemapItem): number {
  if (a.value !== b.value) return b.value - a.value;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/**
 * Worst (largest) aspect ratio of a row whose areas sum to `sum`, whose
 * extreme areas are `min`/`max`, laid along a side of length `side`.
 */
function worstRatio(sum: number, min: number, max: number, side: number): number {
  const side2 = side * side;
  const sum2 = sum * sum;
  return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
}

/**
 * Place one finished row against the shorter side of `rect` and return the
 * rectangle left over for the remaining items. When `isLast` is true the row
 * consumes the whole remaining rectangle so floating-point drift can never
 * leave a sliver uncovered.
 */
function layoutRow(
  row: { item: TreemapItem; area: number }[],
  rect: TreemapRect,
  isLast: boolean,
  out: TreemapTile[],
): TreemapRect {
  const rowArea = row.reduce((sum, r) => sum + r.area, 0);

  if (rect.width >= rect.height) {
    // Short side is vertical: stack the row as a column on the left.
    const colWidth = isLast ? rect.width : Math.min(rect.width, rowArea / rect.height);
    let cursor = rect.y;
    row.forEach((r, idx) => {
      const isEdge = idx === row.length - 1;
      const height = isEdge ? rect.y + rect.height - cursor : r.area / colWidth;
      out.push({ id: r.item.id, value: r.item.value, x: rect.x, y: cursor, width: colWidth, height });
      cursor += height;
    });
    return { x: rect.x + colWidth, y: rect.y, width: rect.width - colWidth, height: rect.height };
  }

  // Short side is horizontal: lay the row across the top.
  const rowHeight = isLast ? rect.height : Math.min(rect.height, rowArea / rect.width);
  let cursor = rect.x;
  row.forEach((r, idx) => {
    const isEdge = idx === row.length - 1;
    const width = isEdge ? rect.x + rect.width - cursor : r.area / rowHeight;
    out.push({ id: r.item.id, value: r.item.value, x: cursor, y: rect.y, width, height: rowHeight });
    cursor += width;
  });
  return { x: rect.x, y: rect.y + rowHeight, width: rect.width, height: rect.height - rowHeight };
}

/**
 * Lay `items` out inside `container` using the squarified algorithm.
 *
 * Returns tiles in placement order (largest first). Returns an empty array
 * when there is nothing to place or the container has no area.
 */
export function squarify(items: readonly TreemapItem[], container: TreemapRect): TreemapTile[] {
  const { width, height } = container;
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return [];
  }

  const sorted = items
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort(compareTreemapItems);
  if (sorted.length === 0) return [];

  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  const scale = (width * height) / total;
  const scaled = sorted.map((item) => ({ item, area: item.value * scale }));

  const out: TreemapTile[] = [];
  let rect: TreemapRect = { ...container };
  let row: { item: TreemapItem; area: number }[] = [];
  let rowSum = 0;
  let rowMin = Infinity;
  let rowMax = 0;

  let i = 0;
  while (i < scaled.length) {
    const next = scaled[i];
    const side = Math.min(rect.width, rect.height);

    if (row.length === 0) {
      row = [next];
      rowSum = next.area;
      rowMin = next.area;
      rowMax = next.area;
      i += 1;
      continue;
    }

    const current = worstRatio(rowSum, rowMin, rowMax, side);
    const candidateSum = rowSum + next.area;
    const candidate = worstRatio(
      candidateSum,
      Math.min(rowMin, next.area),
      Math.max(rowMax, next.area),
      side,
    );

    // Ties keep growing the row so the outcome never depends on float noise
    // in an equality check being resolved differently between runs.
    if (candidate <= current) {
      row.push(next);
      rowSum = candidateSum;
      rowMin = Math.min(rowMin, next.area);
      rowMax = Math.max(rowMax, next.area);
      i += 1;
    } else {
      rect = layoutRow(row, rect, false, out);
      row = [];
    }
  }

  if (row.length > 0) {
    layoutRow(row, rect, true, out);
  }

  return out;
}
