import type { StreamRecord } from "../../data/streamRecords";

/**
 * Confidence assigned when a reference equals one of a stream's labels
 * exactly. This is the only score that clears
 * {@link STREAM_RESOLUTION_MIN_CONFIDENCE}.
 */
const EXACT_MATCH_CONFIDENCE = 1;

/**
 * Confidence assigned to a reference that merely *resembles* a label — it
 * shares tokens with it, or differs only in diacritics/punctuation that
 * {@link normalizeStreamIdentifier} folds away. Deliberately capped below
 * {@link STREAM_RESOLUTION_MIN_CONFIDENCE} so a resemblance can never select a
 * stream on its own; it only makes that stream a candidate worth asking about.
 */
const SIMILAR_MATCH_CONFIDENCE = 0.5;

/**
 * Minimum token overlap before a stream is offered as a disambiguation
 * candidate at all. Keeps an unrelated reference a plain `not-found` instead
 * of a confusing "did you mean…" that names unrelated streams.
 */
const SIMILARITY_FLOOR = 0.34;

/**
 * Confidence a spoken reference must reach before it is allowed to identify a
 * stream. Anything weaker is refused rather than resolved, because the wrong
 * stream here is a money-moving target.
 */
export const STREAM_RESOLUTION_MIN_CONFIDENCE = 0.9;

export type StreamResolution =
  | { status: "matched"; stream: StreamRecord; confidence: number }
  | { status: "ambiguous"; matches: StreamRecord[]; confidence: number }
  | {
      status: "unconfident";
      reference: string;
      confidence: number;
      candidates: StreamRecord[];
    }
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
 * Sørensen–Dice coefficient over the token multisets of two already normalised
 * labels. Returns 0 when the two share no tokens, 1 when they are identical.
 * Used only to decide which streams are worth *asking* about — never to pick
 * one.
 */
function tokenSimilarity(reference: string, label: string): number {
  const referenceTokens = reference.split(" ").filter(Boolean);
  const labelTokens = label.split(" ").filter(Boolean);
  if (referenceTokens.length === 0 || labelTokens.length === 0) return 0;

  const unmatched = [...labelTokens];
  let shared = 0;
  for (const token of referenceTokens) {
    const index = unmatched.indexOf(token);
    if (index === -1) continue;
    unmatched.splice(index, 1);
    shared += 1;
  }
  return (2 * shared) / (referenceTokens.length + labelTokens.length);
}

/** Every label a user could reasonably speak to name a stream. */
function streamLabels(stream: StreamRecord): string[] {
  return [stream.id, stream.name, stream.recipientName, stream.treasuryName]
    .map(normalizeStreamIdentifier)
    .filter((label) => label.length > 0);
}

/**
 * Confidence that `reference` (already normalised) identifies `stream`.
 *
 * An exact hit on any label scores {@link EXACT_MATCH_CONFIDENCE}. Anything
 * else is capped at {@link SIMILAR_MATCH_CONFIDENCE} and only counts as a
 * candidate when it clears {@link SIMILARITY_FLOOR}, so "Operations" can never
 * quietly select one of two streams that both answer to it.
 */
function scoreStream(reference: string, stream: StreamRecord): number {
  let best = 0;
  for (const label of streamLabels(stream)) {
    if (label === reference) return EXACT_MATCH_CONFIDENCE;
    best = Math.max(best, tokenSimilarity(reference, label));
  }
  return best >= SIMILARITY_FLOOR ? SIMILAR_MATCH_CONFIDENCE : 0;
}

/**
 * Resolve a spoken reference against the current stream snapshot.
 *
 * Resolution is thresholded: only a reference that is an exact, unique match
 * on a stream's id, name, recipient, or treasury may select that stream, and
 * it must reach {@link STREAM_RESOLUTION_MIN_CONFIDENCE} to do so. A reference
 * that matches more than one stream is reported `ambiguous`, and one that
 * merely resembles streams is reported `unconfident`; both are refusals the
 * caller must surface rather than resolve. A stale snapshot is a miss.
 *
 * Callers should treat every non-`matched` status as "do not act" and ask the
 * user to disambiguate — see {@link describeStreamAmbiguity}.
 */
export function resolveStreamIdentifier(
  identifier: string,
  streams: readonly StreamRecord[],
): StreamResolution {
  const needle = normalizeStreamIdentifier(identifier);
  if (!needle) return { status: "not-found" };

  const resolved = streams
    .map((stream) => ({ stream, confidence: scoreStream(needle, stream) }))
    .filter(
      (candidate) => candidate.confidence >= STREAM_RESOLUTION_MIN_CONFIDENCE,
    );

  if (resolved.length === 1) {
    const [only] = resolved;
    return {
      status: "matched",
      stream: only.stream,
      confidence: only.confidence,
    };
  }

  if (resolved.length > 1) {
    return {
      status: "ambiguous",
      matches: resolved.map((candidate) => candidate.stream),
      confidence: Math.max(...resolved.map((candidate) => candidate.confidence)),
    };
  }

  // Nothing was confident enough to act on. If something merely resembled the
  // reference, report that rather than a clean miss, so the caller can ask the
  // user to be more specific instead of implying the stream does not exist.
  const candidates = streams.filter(
    (stream) => scoreStream(needle, stream) > 0,
  );
  if (candidates.length > 0) {
    return {
      status: "unconfident",
      reference: identifier,
      confidence: SIMILAR_MATCH_CONFIDENCE,
      candidates,
    };
  }

  return { status: "not-found" };
}

/** How many candidate streams a disambiguation prompt will name. */
const MAX_PROMPTED_CANDIDATES = 3;

/**
 * Build the prompt shown and announced when a spoken reference is refused.
 *
 * Names the candidate streams so the user can pick one outright. Never implies
 * anything was executed, and always ends on an instruction to repeat the
 * reference with more detail.
 */
export function describeStreamAmbiguity(
  reference: string,
  resolution: StreamResolution,
): string {
  if (resolution.status === "matched") {
    return `"${reference}" resolved to stream ${resolution.stream.id}.`;
  }

  if (resolution.status === "ambiguous") {
    const options = resolution.matches
      .slice(0, MAX_PROMPTED_CANDIDATES)
      .map((stream) => `${stream.id} ${stream.name}`)
      .join(" or ");
    return `"${reference}" matches more than one stream: ${options}. Nothing was executed. Say the full stream id, for example "${resolution.matches[0].id}".`;
  }

  if (resolution.status === "unconfident") {
    const options = resolution.candidates
      .slice(0, MAX_PROMPTED_CANDIDATES)
      .map((stream) => stream.id)
      .join(", ");
    return `"${reference}" was not close enough to a single stream. Closest: ${options}. Nothing was executed. Say the full stream name or id, for example "${resolution.candidates[0].id}".`;
  }

  return `"${reference}" does not match any stream. Nothing was executed. Say the full stream name or id.`;
}
