import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  compareTreemapItems,
  squarify,
  type TreemapItem,
  type TreemapRect,
  type TreemapTile,
} from "../treemapLayout";

const area = (r: TreemapRect) => r.width * r.height;

function intersectionArea(a: TreemapRect, b: TreemapRect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

const CONTAINER: TreemapRect = { x: 0, y: 0, width: 160, height: 90 };

describe("squarify — unit", () => {
  it("returns no tiles for an empty input", () => {
    expect(squarify([], CONTAINER)).toEqual([]);
  });

  it("returns no tiles for a container without area", () => {
    const items = [{ id: "a", value: 1 }];
    expect(squarify(items, { x: 0, y: 0, width: 0, height: 90 })).toEqual([]);
    expect(squarify(items, { x: 0, y: 0, width: 160, height: -1 })).toEqual([]);
    expect(squarify(items, { x: 0, y: 0, width: Number.NaN, height: 90 })).toEqual([]);
    expect(squarify(items, { x: 0, y: 0, width: Infinity, height: 90 })).toEqual([]);
  });

  it("drops zero, negative and non-finite weights", () => {
    const tiles = squarify(
      [
        { id: "zero", value: 0 },
        { id: "neg", value: -5 },
        { id: "nan", value: Number.NaN },
        { id: "inf", value: Infinity },
        { id: "ok", value: 3 },
      ],
      CONTAINER,
    );
    expect(tiles.map((t) => t.id)).toEqual(["ok"]);
  });

  it("fills the whole container with a single item", () => {
    const [tile] = squarify([{ id: "USDC", value: 42 }], CONTAINER);
    expect(tile).toMatchObject({ id: "USDC", x: 0, y: 0, width: 160, height: 90 });
  });

  it("splits two items along the long side, proportionally", () => {
    const tiles = squarify(
      [
        { id: "b", value: 1 },
        { id: "a", value: 3 },
      ],
      CONTAINER,
    );
    expect(tiles.map((t) => t.id)).toEqual(["a", "b"]);
    expect(tiles[0]).toMatchObject({ x: 0, y: 0, height: 90 });
    expect(tiles[0].width).toBeCloseTo(120, 9);
    expect(tiles[1].x).toBeCloseTo(120, 9);
    expect(tiles[1].width).toBeCloseTo(40, 9);
  });

  it("matches the canonical Bruls et al. example layout", () => {
    // 6×4 rectangle with areas 6,6,4,3,2,2,1 from the original paper.
    const values = [6, 6, 4, 3, 2, 2, 1];
    const tiles = squarify(
      values.map((v, i) => ({ id: `n${i}`, value: v })),
      { x: 0, y: 0, width: 6, height: 4 },
    );
    const byId = Object.fromEntries(tiles.map((t) => [t.id, t]));
    // First row: the two 6s stacked in a 3-wide column on the left.
    expect(byId.n0).toMatchObject({ x: 0, y: 0, width: 3, height: 2 });
    expect(byId.n1).toMatchObject({ x: 0, y: 2, width: 3 });
    expect(byId.n1.height).toBeCloseTo(2, 9);
    // Second row: 4 and 3 across the top of the remaining 3×4.
    expect(byId.n2.y).toBe(0);
    expect(byId.n3.y).toBe(0);
    expect(byId.n2.height).toBeCloseTo(7 / 3, 9);
  });

  it("breaks ties deterministically by id", () => {
    const items = [
      { id: "c", value: 5 },
      { id: "a", value: 5 },
      { id: "b", value: 5 },
    ];
    expect(squarify(items, CONTAINER).map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect([...items].sort(compareTreemapItems).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("compares identical items as equal", () => {
    expect(compareTreemapItems({ id: "x", value: 1 }, { id: "x", value: 1 })).toBe(0);
    expect(compareTreemapItems({ id: "b", value: 1 }, { id: "a", value: 1 })).toBe(1);
  });

  it("lays out a tall container by stacking rows across the top", () => {
    const tiles = squarify(
      [
        { id: "a", value: 3 },
        { id: "b", value: 1 },
      ],
      { x: 0, y: 0, width: 50, height: 200 },
    );
    expect(tiles[0]).toMatchObject({ x: 0, y: 0, width: 50 });
    expect(tiles[0].height).toBeCloseTo(150, 9);
    expect(tiles[1].y).toBeCloseTo(150, 9);
  });

  it("honours a non-zero container origin", () => {
    const tiles = squarify(
      [
        { id: "a", value: 1 },
        { id: "b", value: 1 },
      ],
      { x: 10, y: 20, width: 100, height: 50 },
    );
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(10);
      expect(t.y).toBeGreaterThanOrEqual(20);
      expect(t.x + t.width).toBeLessThanOrEqual(110 + 1e-9);
      expect(t.y + t.height).toBeLessThanOrEqual(70 + 1e-9);
    }
  });

  it("does not mutate its input", () => {
    const items = [
      { id: "b", value: 1 },
      { id: "a", value: 2 },
    ];
    const snapshot = JSON.parse(JSON.stringify(items));
    squarify(items, CONTAINER);
    expect(items).toEqual(snapshot);
  });

  it("keeps aspect ratios reasonable for evenly sized items", () => {
    const tiles = squarify(
      Array.from({ length: 16 }, (_, i) => ({ id: `t${i}`, value: 1 })),
      { x: 0, y: 0, width: 100, height: 100 },
    );
    for (const t of tiles) {
      const ratio = Math.max(t.width / t.height, t.height / t.width);
      expect(ratio).toBeLessThanOrEqual(3);
    }
  });
});

// ─── Property-based tests ───────────────────────────────────────────────────

const itemsArb = fc.uniqueArray(
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 6 }),
    value: fc.double({ min: 1, max: 1e6, noNaN: true, noDefaultInfinity: true }),
  }),
  { minLength: 1, maxLength: 40, selector: (item) => item.id },
);

const containerArb = fc.record({
  x: fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }),
  y: fc.double({ min: -500, max: 500, noNaN: true, noDefaultInfinity: true }),
  width: fc.double({ min: 1, max: 2000, noNaN: true, noDefaultInfinity: true }),
  height: fc.double({ min: 1, max: 2000, noNaN: true, noDefaultInfinity: true }),
});

describe("squarify — properties", () => {
  it("emits exactly one tile per valid item", () => {
    fc.assert(
      fc.property(itemsArb, containerArb, (items, container) => {
        const tiles = squarify(items, container);
        expect(tiles).toHaveLength(items.length);
        expect(new Set(tiles.map((t) => t.id))).toEqual(new Set(items.map((i) => i.id)));
      }),
    );
  });

  it("tile areas sum to the container area", () => {
    fc.assert(
      fc.property(itemsArb, containerArb, (items, container) => {
        const total = squarify(items, container).reduce((s, t) => s + area(t), 0);
        expect(Math.abs(total - area(container))).toBeLessThanOrEqual(area(container) * 1e-9);
      }),
    );
  });

  it("each tile's area is proportional to its weight", () => {
    fc.assert(
      fc.property(itemsArb, containerArb, (items, container) => {
        const totalValue = items.reduce((s, i) => s + i.value, 0);
        for (const tile of squarify(items, container)) {
          const expected = (tile.value / totalValue) * area(container);
          expect(Math.abs(area(tile) - expected)).toBeLessThanOrEqual(area(container) * 1e-7);
        }
      }),
    );
  });

  it("tiles have non-negative size and stay inside the container", () => {
    fc.assert(
      fc.property(itemsArb, containerArb, (items, container) => {
        const eps = Math.max(container.width, container.height) * 1e-9;
        for (const t of squarify(items, container)) {
          expect(t.width).toBeGreaterThanOrEqual(-eps);
          expect(t.height).toBeGreaterThanOrEqual(-eps);
          expect(t.x).toBeGreaterThanOrEqual(container.x - eps);
          expect(t.y).toBeGreaterThanOrEqual(container.y - eps);
          expect(t.x + t.width).toBeLessThanOrEqual(container.x + container.width + eps);
          expect(t.y + t.height).toBeLessThanOrEqual(container.y + container.height + eps);
        }
      }),
    );
  });

  it("no two tiles overlap", () => {
    fc.assert(
      fc.property(itemsArb, containerArb, (items, container) => {
        const tiles: TreemapTile[] = squarify(items, container);
        const eps = area(container) * 1e-9;
        for (let i = 0; i < tiles.length; i += 1) {
          for (let j = i + 1; j < tiles.length; j += 1) {
            expect(intersectionArea(tiles[i], tiles[j])).toBeLessThanOrEqual(eps);
          }
        }
      }),
    );
  });

  it("is deterministic regardless of input order", () => {
    fc.assert(
      fc.property(
        itemsArb.chain((items) =>
          fc.tuple(fc.constant(items), fc.shuffledSubarray(items, { minLength: items.length })),
        ),
        containerArb,
        ([items, shuffled]: [TreemapItem[], TreemapItem[]], container) => {
          expect(squarify(shuffled, container)).toEqual(squarify(items, container));
        },
      ),
    );
  });

  it("orders tiles by weight descending", () => {
    fc.assert(
      fc.property(itemsArb, containerArb, (items, container) => {
        const tiles = squarify(items, container);
        for (let i = 1; i < tiles.length; i += 1) {
          expect(compareTreemapItems(tiles[i - 1], tiles[i])).toBeLessThanOrEqual(0);
        }
      }),
    );
  });
});
