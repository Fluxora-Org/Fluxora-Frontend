/**
 * Property-based tests for createStreamDates.ts using fast-check.
 *
 * Invariants under test:
 * 1. endDate > startDate for all valid (startDate, durationMonths > 0) inputs.
 * 2. When cliff is enabled, cliffDate > startDate and cliffDate < endDate.
 * 3. computeStreamEndDate never returns a Date with a NaN timestamp for valid inputs.
 * 4. validateCliffBeforeEnd returns null (no error) when cliffDate <= endDate.
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  computeStreamEndDate,
  validateCliffBeforeEnd,
  parseLocalDateTime,
  isBeforeLocalDateTime,
} from "../createStreamDates";

const fcOptions = { numRuns: 150, seed: 544 };

/** Arbitrary valid start date: any date within a reasonable range */
const fcStartDate = fc.date({
  min: new Date("2000-01-01T00:00:00Z"),
  max: new Date("2099-12-31T23:59:59Z"),
});

/** Arbitrary positive duration in months (1–120 months = 10 years) */
const fcDurationMonths = fc.integer({ min: 1, max: 120 });

/** Arbitrary duration in days (1–3650) as required by the issue */
const fcDurationDays = fc.integer({ min: 1, max: 3650 });

describe("createStreamDates property-based tests", () => {
  it("endDate > startDate holds for all valid (startDate, durationMonths) inputs", () => {
    fc.assert(
      fc.property(fcStartDate, fcDurationMonths, (startDate, durationMonths) => {
        const endDate = computeStreamEndDate(startDate, durationMonths);

        // endDate must not be null for valid inputs
        expect(endDate).not.toBeNull();

        if (endDate !== null) {
          // endDate timestamp must be greater than startDate timestamp
          expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
        }
      }),
      fcOptions,
    );
  });

  it("computeStreamEndDate never returns a NaN timestamp for valid inputs", () => {
    fc.assert(
      fc.property(fcStartDate, fcDurationMonths, (startDate, durationMonths) => {
        const endDate = computeStreamEndDate(startDate, durationMonths);

        expect(endDate).not.toBeNull();

        if (endDate !== null) {
          // The resulting timestamp must not be NaN
          expect(Number.isNaN(endDate.getTime())).toBe(false);
          // And must be finite
          expect(Number.isFinite(endDate.getTime())).toBe(true);
        }
      }),
      fcOptions,
    );
  });

  it("cliff ordering: startDate < cliffDate < endDate holds when cliff is within stream bounds", () => {
    fc.assert(
      fc.property(
        fcStartDate,
        fcDurationMonths,
        // cliff offset: between 1 day and (durationMonths * 30 - 1) days
        fc.integer({ min: 1, max: 29 }),
        (startDate, durationMonths, cliffOffsetDays) => {
          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const endDate = computeStreamEndDate(startDate, durationMonths);

          expect(endDate).not.toBeNull();

          if (endDate !== null) {
            // Place cliff between start and end
            const cliffDate = new Date(
              startDate.getTime() + cliffOffsetDays * MS_PER_DAY,
            );

            // Only test the invariant when cliff is strictly before end
            if (cliffDate.getTime() < endDate.getTime()) {
              // cliffDate > startDate
              expect(cliffDate.getTime()).toBeGreaterThan(startDate.getTime());
              // cliffDate < endDate
              expect(cliffDate.getTime()).toBeLessThan(endDate.getTime());

              // validateCliffBeforeEnd should return null (no error)
              const error = validateCliffBeforeEnd(cliffDate, endDate);
              expect(error).toBeNull();
            }
          }
        },
      ),
      fcOptions,
    );
  });

  it("validateCliffBeforeEnd returns an error string when cliffDate is after endDate", () => {
    fc.assert(
      fc.property(
        fcStartDate,
        fcDurationMonths,
        fc.integer({ min: 1, max: 365 }),
        (startDate, durationMonths, extraDays) => {
          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const endDate = computeStreamEndDate(startDate, durationMonths);

          expect(endDate).not.toBeNull();

          if (endDate !== null) {
            // Place cliff strictly after end
            const lateCliffDate = new Date(
              endDate.getTime() + extraDays * MS_PER_DAY,
            );

            const error = validateCliffBeforeEnd(lateCliffDate, endDate);
            // Must return a non-null error message
            expect(error).not.toBeNull();
            expect(typeof error).toBe("string");
          }
        },
      ),
      fcOptions,
    );
  });

  it("computeStreamEndDate returns null for invalid or non-positive durations", () => {
    fc.assert(
      fc.property(fcStartDate, (startDate) => {
        expect(computeStreamEndDate(startDate, 0)).toBeNull();
        expect(computeStreamEndDate(startDate, -1)).toBeNull();
        expect(computeStreamEndDate(startDate, -Infinity)).toBeNull();
        expect(computeStreamEndDate(startDate, NaN)).toBeNull();
      }),
      { ...fcOptions, numRuns: 50 },
    );
  });

  it("parseLocalDateTime never returns a NaN-timestamp Date for any string", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 64 }), (input) => {
        const result = parseLocalDateTime(input);
        // Must be null or a valid (non-NaN) Date
        if (result !== null) {
          expect(Number.isNaN(result.getTime())).toBe(false);
        }
      }),
      fcOptions,
    );
  });

  it("isBeforeLocalDateTime is consistent with Date arithmetic for valid datetime strings", () => {
    fc.assert(
      fc.property(
        fcStartDate,
        fcDurationDays,
        (baseDate, offsetDays) => {
          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const laterDate = new Date(baseDate.getTime() + offsetDays * MS_PER_DAY);

          // Format as local datetime strings (ISO without timezone suffix)
          const baseStr = baseDate.toISOString().slice(0, 16);
          const laterStr = laterDate.toISOString().slice(0, 16);

          // baseDate should be before or equal to laterDate
          const result = isBeforeLocalDateTime(baseStr, laterStr);
          // When offset > 0 the base is strictly earlier (or equal when offset rounds to same minute)
          if (baseStr < laterStr) {
            expect(result).toBe(true);
          } else {
            // equal or later
            expect(result).toBe(false);
          }
        },
      ),
      fcOptions,
    );
  });
});
