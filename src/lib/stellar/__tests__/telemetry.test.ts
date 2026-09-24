import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  TELEMETRY_ALLOWLIST,
  hashIdentifier,
  redactIdentifiers,
  redactErrorForTelemetry,
  createTelemetryErrorReporter,
} from '../telemetry';
import type { TelemetryPayload } from '../telemetry';

// Sample identifiers used across the tests — a real Stellar address, a
// 64-hex transaction hash, and a long base64 XDR/provider payload.
const SAMPLE_ADDRESS = 'GAEA6FQ5EQVTEOKAI5HFKXDDNJYXQ74GRWKJXIVJWC335ROM2PNODIMK';
const SAMPLE_HASH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const SAMPLE_XDR = 'AAAAAgAAAAD' + 'x'.repeat(80);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('hashIdentifier — stable, deterministic', () => {
  it('produces the same output for the same input', () => {
    expect(hashIdentifier(SAMPLE_ADDRESS)).toBe(hashIdentifier(SAMPLE_ADDRESS));
    expect(hashIdentifier(SAMPLE_HASH)).toBe(hashIdentifier(SAMPLE_HASH));
  });

  it('produces different output for different inputs', () => {
    expect(hashIdentifier(SAMPLE_ADDRESS)).not.toBe(hashIdentifier(SAMPLE_HASH));
    expect(hashIdentifier('GAEA6FQ5EQVTEOKAI5HFKXDDNJYXQ74GRWKJXIVJWC335ROM2PNODIMK')).not.toBe(
      hashIdentifier('GAERAFY6EUWDGOSBJBHVMXLENNZHTAEHR2KZZI5KWG4L7RWN2TN6EMHG'),
    );
  });

  it('returns a fixed-width hex digest', () => {
    expect(hashIdentifier(SAMPLE_ADDRESS)).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('redactIdentifiers', () => {
  it('redacts a Stellar address with a stable marker', () => {
    const out = redactIdentifiers(`sender ${SAMPLE_ADDRESS} failed`);
    expect(out).toContain(`[addr:${hashIdentifier(SAMPLE_ADDRESS)}]`);
    expect(out).not.toContain(SAMPLE_ADDRESS);
  });

  it('redacts a 64-hex transaction hash', () => {
    const out = redactIdentifiers(`tx ${SAMPLE_HASH} not found`);
    expect(out).toContain(`[tx:${hashIdentifier(SAMPLE_HASH)}]`);
    expect(out).not.toContain(SAMPLE_HASH);
  });

  it('redacts long base64/provider payloads', () => {
    const out = redactIdentifiers(`result ${SAMPLE_XDR} end`);
    expect(out).toContain(`[xdr:${hashIdentifier(SAMPLE_XDR)}]`);
    expect(out).not.toContain(SAMPLE_XDR);
  });

  it('redacts every identifier kind in one message', () => {
    const message = `from ${SAMPLE_ADDRESS} hash=${SAMPLE_HASH} xdr=${SAMPLE_XDR}`;
    const out = redactIdentifiers(message);
    expect(out).not.toContain(SAMPLE_ADDRESS);
    expect(out).not.toContain(SAMPLE_HASH);
    expect(out).not.toContain(SAMPLE_XDR.slice(0, 40));
    expect(out).toContain('[addr:');
    expect(out).toContain('[tx:');
    expect(out).toContain('[xdr:');
  });

  it('is stable across calls (same input → same redacted output)', () => {
    const a = redactIdentifiers(`addr ${SAMPLE_ADDRESS}`);
    const b = redactIdentifiers(`addr ${SAMPLE_ADDRESS}`);
    expect(a).toBe(b);
  });

  it('leaves ordinary text untouched', () => {
    expect(redactIdentifiers('simulation failed: insufficient auth')).toBe(
      'simulation failed: insufficient auth',
    );
  });

  it('handles empty and non-string input defensively', () => {
    expect(redactIdentifiers('')).toBe('');
    expect(redactIdentifiers(undefined as unknown as string)).toBe(undefined);
  });
});

describe('redactErrorForTelemetry — allowlist enforcement', () => {
  it('emits only allowlisted fields for an Error with identifiers in the message', () => {
    const error = new Error(
      `Failed to sign for ${SAMPLE_ADDRESS} tx ${SAMPLE_HASH} xdr ${SAMPLE_XDR}`,
    );
    const payload = redactErrorForTelemetry(error, {
      component: 'CreateStreamModal',
      action: 'create_stream',
      network: 'TESTNET',
    });

    expect(Object.keys(payload.error).sort()).toEqual(
      ['code', 'message', 'name', 'type'].sort(),
    );
    expect(payload.error.name).toBe('Error');
    expect(payload.error.message).not.toContain(SAMPLE_ADDRESS);
    expect(payload.error.message).not.toContain(SAMPLE_HASH);
    expect(payload.error.message).toContain('[addr:');
    expect(payload.error.message).toContain('[tx:');
    expect(payload.context).toEqual({
      component: 'CreateStreamModal',
      action: 'create_stream',
      network: 'TESTNET',
    });
  });

  it('classifies TransactionError via its `type` field', () => {
    const error = Object.assign(new Error('Transaction signature request was declined.'), {
      type: 'rejected',
      name: 'TransactionError',
    });
    const payload = redactErrorForTelemetry(error);
    expect(payload.error.type).toBe('rejected');
    expect(payload.error.name).toBe('TransactionError');
  });

  it('drops non-allowlisted keys from provider error objects', () => {
    const providerError = {
      code: 'user_rejected',
      message: `User declined transfer to ${SAMPLE_ADDRESS}`,
      data: { source: SAMPLE_ADDRESS, txHash: SAMPLE_HASH },
      stack: `at send (${SAMPLE_ADDRESS})`,
      rawPayload: SAMPLE_XDR,
    };
    const payload = redactErrorForTelemetry(providerError);

    // data / stack / rawPayload must never appear in emitted telemetry.
    expect(JSON.stringify(payload)).not.toContain(SAMPLE_ADDRESS);
    expect(JSON.stringify(payload)).not.toContain(SAMPLE_HASH);
    expect(JSON.stringify(payload)).not.toContain(SAMPLE_XDR.slice(0, 40));
    expect(payload.error.code).toBe('user_rejected');
    expect(payload.error.message).toContain('[addr:');
    expect('data' in payload.error).toBe(false);
    expect('stack' in payload.error).toBe(false);
  });

  it('treats a plain string throw as the message', () => {
    const payload = redactErrorForTelemetry(`rejected ${SAMPLE_ADDRESS}`);
    expect(payload.error.message).toContain('[addr:');
    expect(payload.error.message).not.toContain(SAMPLE_ADDRESS);
    expect(payload.error.name).toBeUndefined();
  });
});

describe('redactErrorForTelemetry — boundary cases', () => {
  it('handles null / undefined errors without throwing', () => {
    expect(redactErrorForTelemetry(null).error).toEqual({
      type: undefined,
      name: undefined,
      code: undefined,
      message: undefined,
    });
    expect(redactErrorForTelemetry(undefined).error.message).toBeUndefined();
  });

  it('preserves context even when the error is missing', () => {
    const payload = redactErrorForTelemetry(null, { component: 'TreasuryPage' });
    expect(payload.context.component).toBe('TreasuryPage');
  });

  it('drops non-string codes', () => {
    const payload = redactErrorForTelemetry({ code: 500, message: 'boom' });
    expect(payload.error.code).toBeUndefined();
    expect(payload.error.message).toBe('boom');
  });

  it('handles malformed payloads (numbers, arrays, booleans) without throwing', () => {
    expect(() => redactErrorForTelemetry(42)).not.toThrow();
    expect(redactErrorForTelemetry(42).error.message).toBeUndefined();
    expect(() => redactErrorForTelemetry([SAMPLE_ADDRESS])).not.toThrow();
    expect(redactErrorForTelemetry([SAMPLE_ADDRESS]).error.message).toBeUndefined();
    expect(() => redactErrorForTelemetry(true)).not.toThrow();
  });

  it('handles objects with a non-string message', () => {
    const payload = redactErrorForTelemetry({ message: { nested: SAMPLE_ADDRESS } });
    expect(payload.error.message).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain(SAMPLE_ADDRESS);
  });

  it('redacts identifiers inside context values too', () => {
    const payload = redactErrorForTelemetry(new Error('x'), {
      component: `wallet-${SAMPLE_ADDRESS}`,
    });
    expect(payload.context.component).not.toContain(SAMPLE_ADDRESS);
    expect(payload.context.component).toContain('[addr:');
  });
});

describe('createTelemetryErrorReporter', () => {
  it('emits only the redacted payload through the sink', () => {
    const sink = vi.fn();
    const reporter = createTelemetryErrorReporter(sink);
    const error = new Error(`recipient ${SAMPLE_ADDRESS} failed`);

    reporter(error);

    expect(sink).toHaveBeenCalledTimes(1);
    const payload = sink.mock.calls[0][0] as TelemetryPayload;
    expect(payload.error.message).not.toContain(SAMPLE_ADDRESS);
    expect(payload.error.message).toContain('[addr:');
  });

  it('never throws, even when the sink throws', () => {
    const reporter = createTelemetryErrorReporter(() => {
      throw new Error('sink exploded');
    });

    expect(() => reporter(new Error('boom'))).not.toThrow();
  });

  it('defaults to console.error with the redacted payload', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reporter = createTelemetryErrorReporter();

    reporter(new Error(`hash ${SAMPLE_HASH}`));

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).not.toContain(SAMPLE_HASH);
    expect(logged).toContain('[tx:');
    spy.mockRestore();
  });
});

describe('TELEMETRY_ALLOWLIST', () => {
  it('explicitly lists the permitted diagnostic fields', () => {
    expect(TELEMETRY_ALLOWLIST).toEqual([
      'type',
      'name',
      'code',
      'message',
      'network',
      'component',
      'action',
    ]);
  });
});
