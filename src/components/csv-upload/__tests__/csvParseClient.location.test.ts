import { describe, it, expect } from "vitest";
// SET THIS: import the real parse function from csvParseClient.ts / csvParser.ts
// import { parseCsv } from "../csvParseClient";

const CSV_WITH_MULTIPLE_ERRORS = [
  "recipient,amount,startDate",
  "GABC...,100,2026-01-01",       // valid row
  "GABC...,not-a-number,2026-01-01", // row 3: bad amount
  ",100,2026-01-01",                 // row 4: missing recipient
  "GABC...,100,not-a-date",          // row 5: bad startDate
].join("\n");

describe("parseCsv error location", () => {
  it("reports every distinct error, each with its row and column", () => {
    const result = /* SET THIS: parseCsv(CSV_WITH_MULTIPLE_ERRORS) */ null as any;

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors).toHaveLength(3);

    const amountError = result.errors.find((e: any) => e.row === 3);
    expect(amountError?.column).toBe("amount");
    expect(amountError?.message).toMatch(/expected a number/i);

    const recipientError = result.errors.find((e: any) => e.row === 4);
    expect(recipientError?.column).toBe("recipient");

    const dateError = result.errors.find((e: any) => e.row === 5);
    expect(dateError?.column).toBe("startDate");
    expect(dateError?.message).toMatch(/expected a valid date/i);
  });

  it("a single malformed row is still reported with a row number", () => {
    const badRow = "recipient,amount,startDate\nGABC...,100"; // missing a field
    const result = /* SET THIS: parseCsv(badRow) */ null as any;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0].row).toBe(2);
  });
});