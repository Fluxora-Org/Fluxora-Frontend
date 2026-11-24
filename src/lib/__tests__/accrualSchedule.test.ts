import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  DEFAULT_ACCRUAL_SEGMENTS,
  computeAccrualSchedule,
} from "../accrualSchedule";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 0, 1, 0, 0, 0);

describe("computeAccrualSchedule", () => {
  it("accrues nothing before the cliff and 100% at the end", () => {
    const total = 1_000_000_000n;
    const cliff = START + 30 * DAY_MS;
    const end = START + 90 * DAY_MS;

    const points = computeAccrualSchedule({
      total,
      startMs: START,
      cliffMs: cliff,
      endMs: end,
      segments: 9,
    });

    expect(points[0]).toEqual({ at: START, accrued: 0n });

    for (const point of points) {
      if (point.at <= cliff) {
        expect(point.accrued).toBe(0n);
      }
    }

    const last = points[points.length - 1];
    expect(last.at).toBe(end);
    expect(last.accrued).toBe(total);
  });

  it("accrues linearly when there is no cliff", () => {
    const total = 1_000n;
    const end = START + 100 * DAY_MS;

    const points = computeAccrualSchedule({
      total,
      startMs: START,
      cliffMs: null,
      endMs: end,
      segments: 10,
    });

    expect(points).toHaveLength(11);
    expect(points[0].accrued).toBe(0n);
    expect(points[5].accrued).toBe(500n);
    expect(points[points.length - 1].accrued).toBe(total);
  });

  it("uses the default segment count", () => {
    const points = computeAccrualSchedule({
      total: 100n,
      startMs: START,
      endMs: START + 10 * DAY_MS,
    });

    expect(points).toHaveLength(DEFAULT_ACCRUAL_SEGMENTS + 1);
  });

  it("handles a zero-length stream and clamps invalid totals", () => {
    const points = computeAccrualSchedule({
      total: -5n,
      startMs: START,
      endMs: START,
    });

    expect(points).toHaveLength(2);
    expect(points[0].accrued).toBe(0n);
    expect(points[1].accrued).toBe(0n);
  });

  it("keeps points monotonic for a cliff at the stream end", () => {
    const end = START + 10 * DAY_MS;
    const points = computeAccrualSchedule({
      total: 500n,
      startMs: START,
      cliffMs: end,
      endMs: end,
    });

    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].at).toBeGreaterThanOrEqual(points[i - 1].at);
      expect(points[i].accrued).toBeGreaterThanOrEqual(points[i - 1].accrued);
    }
    expect(points[points.length - 1].accrued).toBe(500n);
  });
});

/**
 * Property-based tests for the accrual schedule.
 *
 * Invariants:
 * 1. the final point equals the deposited total (units are never lost);
 * 2. both time and accrued amount are monotonic;
 * 3. nothing accrues before the later of the stream start and the cliff;
 * 4. no point exceeds the total.
 */
describe("computeAccrualSchedule property-based tests", () => {
  const fcOptions = { numRuns: 150, seed: 2125 };
  const fcTotal = fc.bigInt({ min: 0n, max: 10n ** 30n });
  const fcStart = fc.integer({ min: 0, max: 4_000_000_000_000 });
  const fcDuration = fc.integer({ min: 1, max: 400 * DAY_MS });
  const fcCliffOffset = fc.integer({ min: -10 * DAY_MS, max: 500 * DAY_MS });

  it("reaches exactly the total and stays monotonic", () => {
    fc.assert(
      fc.property(fcTotal, fcStart, fcDuration, fcCliffOffset, (total, start, duration, cliffOffset) => {
        const end = start + duration;
        const cliff = start + cliffOffset;

        const points = computeAccrualSchedule({
          total,
          startMs: start,
          cliffMs: cliff,
          endMs: end,
        });

        const last = points[points.length - 1];
        expect(last.accrued).toBe(total);
        expect(last.at).toBe(end);
        expect(points[0].accrued).toBe(0n);

        for (let i = 1; i < points.length; i += 1) {
          expect(points[i].at).toBeGreaterThanOrEqual(points[i - 1].at);
          expect(points[i].accrued).toBeGreaterThanOrEqual(points[i - 1].accrued);
          expect(points[i].accrued).toBeLessThanOrEqual(total);
        }
      }),
      fcOptions,
    );
  });

  it("accrues nothing before the cliff", () => {
    fc.assert(
      fc.property(fcTotal, fcStart, fcDuration, fcCliffOffset, (total, start, duration, cliffOffset) => {
        const end = start + duration;
        const cliff = Math.min(Math.max(start, start + cliffOffset), end);

        const points = computeAccrualSchedule({
          total,
          startMs: start,
          cliffMs: cliff,
          endMs: end,
        });

        const accrualStart = Math.min(Math.max(start, cliff), end);
        for (const point of points) {
          if (point.at <= accrualStart) {
            expect(point.accrued).toBe(0n);
          }
        }
      }),
      fcOptions,
    );
  });
});
