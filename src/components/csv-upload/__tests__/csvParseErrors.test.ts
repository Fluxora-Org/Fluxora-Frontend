import { describe, it, expect } from "vitest";
import { formatCsvParseError, makeColumnError, makeRowError } from "../csvParseErrors";

describe("csvParseErrors", () => {
  it("row error names the row and states what was expected", () => {
    const err = makeRowError(4, "expected 5 columns, got 3");
    expect(formatCsvParseError(err)).toBe("Row 4: expected 5 columns, got 3");
  });

  it("column error names both the row and the column", () => {
    const err = makeColumnError(7, "amount", 'expected a number, got "abc"');
    const text = formatCsvParseError(err);
    expect(text).toContain("Row 7");
    expect(text).toContain('column "amount"');
    expect(text).toContain('expected a number, got "abc"');
  });
});