import type { StreamRecord } from "../../data/streamRecords";

export type StreamResolution =
  | { status: "matched"; stream: StreamRecord }
  | { status: "ambiguous"; matches: StreamRecord[] }
  | { status: "not-found" };

/**
 * Normalise speech-recognition output without attempting fuzzy correction.
 * Fuzzy correction is unsafe here because a wrong stream can be a
 * money-moving target.
 */
export function normalizeStreamIdentifier(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Resolve against the current stream snapshot. Only an exact, unique match
 * by id, stream name, recipient, or treasury is accepted. This deliberately
 * treats homophones/duplicate labels as ambiguous and stale snapshots as a
 * miss, so callers can ask the user to repeat or refresh rather than guess.
 */
export function resolveStreamIdentifier(
  identifier: string,
  streams: readonly StreamRecord[],
): StreamResolution {
  const needle = normalizeStreamIdentifier(identifier);
  if (!needle) return { status: "not-found" };

  const matches = streams.filter((stream) =>
    [stream.id, stream.name, stream.recipientName, stream.treasuryName].some(
      (label) => normalizeStreamIdentifier(label) === needle,
    ),
  );

  if (matches.length === 1) return { status: "matched", stream: matches[0] };
  if (matches.length > 1) return { status: "ambiguous", matches };
  return { status: "not-found" };
}
