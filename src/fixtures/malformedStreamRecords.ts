import {
  normalizeStreamRecord,
  type StreamRecord,
} from "../data/streamRecords";

/**
 * Fixtures for defensive-rendering tests (issue #670).
 *
 * `StreamRecord` marks exactly two fields as optional: `cliffDate` and
 * `nextUnlockDate`. Every other field is required by the type and is
 * backfilled with a safe default by {@link normalizeStreamRecord} when an
 * upstream payload omits it. These fixtures produce records that are missing
 * each genuinely optional field so consumers (StreamRow, RecentStreams, …)
 * can be rendered against them.
 */

/** The fields the StreamRecord type declares as optional. */
export const OPTIONAL_STREAM_RECORD_FIELDS = [
  "cliffDate",
  "nextUnlockDate",
] as const;

export type OptionalStreamRecordField =
  (typeof OPTIONAL_STREAM_RECORD_FIELDS)[number];

/** Valid checksummed Stellar addresses (borrowed from the STR-001 fixture). */
export const FIXTURE_RECIPIENT_ADDRESS =
  "GAJCGNCFKZTXRCM2VO6M3XXPAAISEM2EKVTHPCEZVK54ZXPO74ICCA3P";
export const FIXTURE_TREASURY_ADDRESS =
  "GAJSINKGK5UHTCU3VS645X7QAEJCGNCFKZTXRCM2VO6M3XXPAAISFPVT";

/**
 * A complete, valid raw payload with every optional field present.
 * Mirrors the shape delivered by the API / Soroban RPC layer.
 */
export function makeStreamRecordPayload(
  overrides: Partial<Record<keyof StreamRecord, unknown>> = {},
): Record<string, unknown> {
  return {
    id: "STR-FIX-001",
    name: "Defensive Fixture Stream",
    recipientName: "Fixture Recipient",
    recipientAddress: FIXTURE_RECIPIENT_ADDRESS,
    treasuryName: "Fixture Treasury",
    treasuryAddress: FIXTURE_TREASURY_ADDRESS,
    asset: "USDC",
    status: "Active",
    monthlyRate: 1000,
    depositAmount: 12000,
    streamedAmount: 3000,
    withdrawableAmount: 500,
    remainingAmount: 9000,
    progress: 25,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    cliffDate: "2026-02-01",
    nextUnlockDate: "2026-08-01",
    summary: "Fixture summary",
    health: "Healthy",
    healthNote: "Fixture health note",
    auditNote: "Fixture audit note",
    tags: ["Fixture"],
    timeline: [
      {
        date: "2026-01-01",
        title: "Stream activated",
        detail: "Fixture activation event",
      },
    ],
    ...overrides,
  };
}

/** A fully populated, valid StreamRecord. */
export function makeStreamRecord(
  overrides: Partial<Record<keyof StreamRecord, unknown>> = {},
): StreamRecord {
  return normalizeStreamRecord(makeStreamRecordPayload(overrides));
}

/**
 * A StreamRecord whose raw payload omitted the given optional field, run
 * through the production normalization path.
 */
export function makeStreamRecordMissing(
  field: OptionalStreamRecordField,
): StreamRecord {
  const payload = makeStreamRecordPayload({ id: `STR-NO-${field}` });
  delete payload[field];
  return normalizeStreamRecord(payload);
}

/**
 * One record per optional field, each missing exactly that field.
 * Keys are the omitted field names.
 */
export function makeMissingOptionalFieldRecords(): Record<
  OptionalStreamRecordField,
  StreamRecord
> {
  return Object.fromEntries(
    OPTIONAL_STREAM_RECORD_FIELDS.map((field) => [
      field,
      makeStreamRecordMissing(field),
    ]),
  ) as Record<OptionalStreamRecordField, StreamRecord>;
}

/**
 * An ongoing (Active) stream whose raw payload carried no end date — the
 * "no end date for an ongoing stream" case called out in issue #670. The
 * type requires `endDate`, so normalization backfills an empty string;
 * consumers must render it as "not scheduled" rather than crash.
 */
export function makeOngoingStreamWithoutEndDatePayload(): Record<
  string,
  unknown
> {
  const payload = makeStreamRecordPayload({ id: "STR-NO-endDate" });
  delete payload.endDate;
  // Without an end date the cliff/unlock bounds are meaningless upstream too.
  delete payload.cliffDate;
  delete payload.nextUnlockDate;
  return payload;
}
