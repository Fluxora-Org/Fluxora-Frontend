import { describe, expect, it } from "vitest";
import type { StreamRecord } from "../../../data/streamRecords";
import {
  STREAM_RESOLUTION_MIN_CONFIDENCE,
  describeStreamAmbiguity,
  resolveStreamIdentifier,
} from "../streamIdentifier";

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
      confidence: 1,
    });
    expect(resolveStreamIdentifier("dev grant alice", [record])).toEqual({
      status: "matched",
      stream: record,
      confidence: 1,
    });
  });

  it("does not select a default when two streams share a spoken label", () => {
    const first = stream({ id: "STR-001", name: "Operations" });
    const second = stream({ id: "STR-002", name: "Operations" });
    expect(resolveStreamIdentifier("operations", [first, second])).toEqual({
      status: "ambiguous",
      matches: [first, second],
      confidence: 1,
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

describe("resolveStreamIdentifier — confidence threshold", () => {
  it("only accepts a reference that reaches the confidence threshold", () => {
    const record = stream();
    const resolution = resolveStreamIdentifier("str 001", [record]);

    expect(resolution.status).toBe("matched");
    expect(
      resolution.status === "matched" && resolution.confidence,
    ).toBeGreaterThanOrEqual(STREAM_RESOLUTION_MIN_CONFIDENCE);
  });

  it("refuses a partial reference to a single stream instead of guessing", () => {
    const only = stream();

    // "alice" is a fragment of "Dev Grant - Alice": close enough to raise, not
    // close enough to act on.
    expect(resolveStreamIdentifier("alice", [only])).toEqual({
      status: "unconfident",
      reference: "alice",
      confidence: 0.5,
      candidates: [only],
    });
  });

  it("refuses a similar-sounding recipient that several streams share", () => {
    const first = stream({ id: "STR-001", recipientName: "Alice M." });
    const second = stream({ id: "STR-002", recipientName: "Alice K." });

    const resolution = resolveStreamIdentifier("alice", [first, second]);

    expect(resolution).toEqual({
      status: "unconfident",
      reference: "alice",
      confidence: 0.5,
      candidates: [first, second],
    });
  });

  it("never resolves a reference that only resembles two near-identical streams", () => {
    const first = stream({ id: "STR-001", name: "Growth Reserve A" });
    const second = stream({ id: "STR-002", name: "Growth Reserve B" });

    // Shares 2 of 3 tokens with both names, so it is a candidate for each and
    // must not be treated as a match for either.
    const resolution = resolveStreamIdentifier("growth reserve", [
      first,
      second,
    ]);

    expect(resolution.status).toBe("unconfident");
    expect(resolution.status === "unconfident" && resolution.candidates).toEqual(
      [first, second],
    );
  });

  it("prefers an exact hit over a merely similar stream", () => {
    const exact = stream({ id: "STR-002", name: "Operations" });
    const similar = stream({ id: "STR-001", name: "Operations Payroll" });

    expect(resolveStreamIdentifier("operations", [similar, exact])).toEqual({
      status: "matched",
      stream: exact,
      confidence: 1,
    });
  });

  it("does not treat an unrelated reference as a weak candidate", () => {
    const record = stream();
    // No shared tokens, so this is a plain miss rather than a vague "did you
    // mean" that would be misleading.
    expect(resolveStreamIdentifier("quantum escrow", [record])).toEqual({
      status: "not-found",
    });
  });

  it("refuses a reference that partly matches a stream but names something else", () => {
    const record = stream({ id: "STR-001", name: "Operations Payroll" });

    // "operations escrow" shares a token with the name, so it is worth
    // mentioning back — but it is not the stream, so it must not be resolved.
    expect(resolveStreamIdentifier("operations escrow", [record])).toEqual({
      status: "unconfident",
      reference: "operations escrow",
      confidence: 0.5,
      candidates: [record],
    });
  });

  it("rejects an empty or punctuation-only reference", () => {
    const record = stream();
    expect(resolveStreamIdentifier("", [record])).toEqual({
      status: "not-found",
    });
    expect(resolveStreamIdentifier("   ---   ", [record])).toEqual({
      status: "not-found",
    });
  });
});

describe("describeStreamAmbiguity", () => {
  it("names every candidate stream and asks the user to pick one", () => {
    const first = stream({ id: "STR-001", name: "Operations" });
    const second = stream({ id: "STR-002", name: "Operations" });

    const prompt = describeStreamAmbiguity(
      "Operations",
      resolveStreamIdentifier("operations", [first, second]),
    );

    expect(prompt).toContain("more than one stream");
    expect(prompt).toContain("STR-001 Operations");
    expect(prompt).toContain("STR-002 Operations");
    expect(prompt).toMatch(/nothing was executed/i);
    expect(prompt).toMatch(/say the full stream id/i);
  });

  it("explains a low-confidence refusal without naming a target as chosen", () => {
    const first = stream({ id: "STR-001", recipientName: "Alice M." });
    const second = stream({ id: "STR-002", recipientName: "Alice K." });

    const prompt = describeStreamAmbiguity(
      "alice",
      resolveStreamIdentifier("alice", [first, second]),
    );

    expect(prompt).toContain("not close enough to a single stream");
    expect(prompt).toContain("STR-001");
    expect(prompt).toContain("STR-002");
    expect(prompt).toMatch(/nothing was executed/i);
  });

  it("reports an unknown reference as a miss", () => {
    const prompt = describeStreamAmbiguity(
      "quantum escrow",
      resolveStreamIdentifier("quantum escrow", [stream()]),
    );

    expect(prompt).toContain("does not match any stream");
    expect(prompt).toMatch(/nothing was executed/i);
  });

  it("resolves cleanly for a matched reference", () => {
    const record = stream();
    const prompt = describeStreamAmbiguity(
      "STR-001",
      resolveStreamIdentifier("STR-001", [record]),
    );

    expect(prompt).toContain("STR-001");
  });

  it("caps how many candidates a prompt lists", () => {
    const many = Array.from({ length: 5 }, (_, index) =>
      stream({ id: `STR-00${index + 1}`, name: "Operations" }),
    );

    const prompt = describeStreamAmbiguity(
      "Operations",
      resolveStreamIdentifier("operations", many),
    );

    expect(prompt).toContain("STR-001");
    expect(prompt).toContain("STR-003");
    expect(prompt).not.toContain("STR-004");
  });
});
