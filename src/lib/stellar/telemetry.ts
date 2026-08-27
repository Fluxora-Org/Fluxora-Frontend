/**
 * telemetry.ts — Redaction policy for client error telemetry.
 *
 * Only fields listed in {@link TELEMETRY_ALLOWLIST} are permitted to leave the
 * client. Wallet addresses, transaction hashes, and provider error payloads
 * (Freighter / Soroban RPC error bodies) are replaced with stable per-value
 * hashes so telemetry stays de-duplicable without exposing raw account-linked
 * values.
 *
 * Stability: {@link hashIdentifier} is a pure FNV-1a digest, so the same input
 * always produces the same redacted output on every platform. That lets
 * telemetry pipelines group/dedupe by redacted value.
 *
 * This module deliberately has no dependencies on `tx.ts` (and therefore no
 * dependency on the Stellar SDK): it duck-types the `type` field of
 * `TransactionError` so the redaction layer can be imported by lightweight
 * entry points like `ErrorBoundary` without ballooning their bundle.
 */

/** Diagnostic fields permitted in emitted telemetry. Everything else is dropped. */
export const TELEMETRY_ALLOWLIST = [
  'type', // error classification (e.g. TransactionError.type)
  'name', // error class name (e.g. 'TransactionError', 'TypeError')
  'code', // structured error code (e.g. Freighter's 'user_rejected')
  'message', // error message with identifiers redacted
  'network', // expected network label
  'component', // originating component
  'action', // user action that failed
] as const;

export type TelemetryField = (typeof TELEMETRY_ALLOWLIST)[number];

/** Sanitised error telemetry payload — only allowlisted fields, values redacted. */
export interface TelemetryPayload {
  error: {
    type?: string;
    name?: string;
    code?: string;
    message?: string;
  };
  context: Partial<Record<TelemetryField, string>>;
}

/** Optional non-error context to attach to a telemetry event. */
export interface TelemetryContext {
  component?: string;
  action?: string;
  network?: string;
}

// A Stellar public key is 'G' + 55 base32 chars.
const STELLAR_ADDRESS_RE = /\bG[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]{55}\b/g;
// A transaction hash is 64 hex characters.
const TX_HASH_RE = /\b[0-9a-fA-F]{64}\b/g;
// Long base64 blobs (Soroban XDR result payloads, provider error bodies).
const XDR_BASE64_RE = /\b[A-Za-z0-9+/]{80,}={0,2}\b/g;

/**
 * Stable, deterministic hash of an identifier. FNV-1a 32-bit is pure JS, so it
 * produces identical output in every runtime (no async crypto required) while
 * still being collision-resistant enough for pseudonymisation.
 */
export function hashIdentifier(value: string): string {
  let hash = 0x811c9dc5;
  const input = value.trim();
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Replaces Stellar addresses, transaction hashes, and long base64/provider
 * payloads in a string with stable redacted markers. Idempotent for input that
 * has already been redacted (markers do not match the raw patterns).
 */
export function redactIdentifiers(text: string): string {
  if (!text) return text;
  return text
    .replace(STELLAR_ADDRESS_RE, (match) => `[addr:${hashIdentifier(match)}]`)
    .replace(TX_HASH_RE, (match) => `[tx:${hashIdentifier(match)}]`)
    .replace(XDR_BASE64_RE, (match) => `[xdr:${hashIdentifier(match)}]`);
}

function toSafeString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return redactIdentifiers(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

/**
 * Builds a telemetry payload from an arbitrary thrown value, keeping only
 * allowlisted fields and redacting every value that leaves the client.
 *
 * Handles the boundary cases explicitly:
 * - `null`/`undefined` errors → payload with no error fields (context kept).
 * - non-Error values (strings, provider error objects) → message/code are
 *   extracted where present; unknown keys are dropped entirely.
 * - non-string `code` values → dropped.
 * - messages containing addresses/hashes/base64 → redacted in place.
 */
export function redactErrorForTelemetry(
  error: unknown,
  context: TelemetryContext = {},
): TelemetryPayload {
  const safeContext = {
    component: toSafeString(context.component),
    action: toSafeString(context.action),
    network: toSafeString(context.network),
  };

  if (error instanceof Error) {
    // TransactionError exposes a `type` classification; duck-type it so we
    // don't need to import tx.ts (and the Stellar SDK) here.
    const tErr = error as Error & { type?: unknown };
    return {
      error: {
        type: typeof tErr.type === 'string' ? tErr.type : undefined,
        name: error.name,
        code: undefined,
        message: toSafeString(error.message),
      },
      context: safeContext,
    };
  }

  // Non-Error thrown values: strings (unhandled rejection messages) and
  // provider error objects ({ code, message, ... }) — unknown keys are
  // dropped entirely so raw payload fields never leak.
  const record =
    error !== null && typeof error === 'object'
      ? (error as { message?: unknown; code?: unknown })
      : null;
  const message =
    typeof error === 'string'
      ? error
      : record && 'message' in record && typeof record.message === 'string'
        ? record.message
        : undefined;
  const code =
    record && 'code' in record && typeof record.code === 'string'
      ? record.code
      : undefined;

  return {
    error: {
      type: undefined,
      name: undefined,
      code,
      message: toSafeString(message),
    },
    context: safeContext,
  };
}

/**
 * Creates an error reporter that emits only the redacted telemetry payload.
 * Matches the `ErrorReporter` shape used by `ErrorBoundary` so it can be
 * dropped straight into `onError` / `createConsoleReporter`.
 *
 * The reporter never throws — any exception raised by the sink is swallowed so
 * telemetry can never create an error loop.
 */
export function createTelemetryErrorReporter(
  sink?: (payload: TelemetryPayload) => void,
): (error: Error, errorInfo?: unknown) => void {
  const emit = sink ?? ((payload) => console.error('[telemetry]', payload));
  return (error: Error, _errorInfo?: unknown) => {
    try {
      emit(redactErrorForTelemetry(error));
    } catch {
      // Never let the reporter throw.
    }
  };
}
