import { describe, expect, it } from "vitest";
import type { StreamRecord } from "../../../data/streamRecords";
import { resolveStreamIdentifier } from "../streamIdentifier";

const stream = (overrides: Partial<StreamRecord> = {}): StreamRecord => ({
  id: "STR-001",
  name: "Dev Grant - Alice",
  recipientName: "Alice M.",
  treasuryName: "Protocol Growth Treasury",
  ...overrides,
} as StreamRecord);

describe("resolveStreamIdentifier", () => {
  it("matches a unique stream by exact id or label", () => {
    const record = stream();
    expect(resolveStreamIdentifier("str 001", [record])).toEqual({
      status: "matched",
      stream: record,
    });
    expect(resolveStreamIdentifier("dev grant alice", [record])).toEqual({
      status: "matched",
      stream: record,
    });
  });

  it("does not select a default when two streams share a spoken label", () => {
    const first = stream({ id: "STR-001", name: "Operations" });
    const second = stream({ id: "STR-002", name: "Operations" });
    expect(resolveStreamIdentifier("operations", [first, second])).toEqual({
      status: "ambiguous",
      matches: [first, second],
    });
  });

  it("treats normalised homophones/diacritics as ambiguous", () => {
    const first = stream({ id: "STR-001", name: "Café" });
    const second = stream({ id: "STR-002", name: "Cafe" });
    expect(resolveStreamIdentifier("cafe", [first, second]).status).toBe(
      "ambiguous",
    );
  });

  it("rejects no match and stale identifiers", () => {
    const record = stream();
    expect(resolveStreamIdentifier("missing stream", [record])).toEqual({
      status: "not-found",
    });
    expect(resolveStreamIdentifier("dev grant alice", [])).toEqual({
      status: "not-found",
    });
  });
});
