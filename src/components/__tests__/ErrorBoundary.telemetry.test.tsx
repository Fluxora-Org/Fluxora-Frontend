import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ErrorBoundary, { createConsoleReporter } from '../ErrorBoundary';
import { createTelemetryErrorReporter } from '../../lib/stellar/telemetry';

const SAMPLE_ADDRESS = 'GAEA6FQ5EQVTEOKAI5HFKXDDNJYXQ74GRWKJXIVJWC335ROM2PNODIMK';
const SAMPLE_HASH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

function ThrowingChild(): React.ReactNode {
  throw new Error(`Failed for recipient ${SAMPLE_ADDRESS} tx ${SAMPLE_HASH}`);
}

describe('ErrorBoundary — telemetry redaction (#1450)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const preventExpectedRenderError = (event: ErrorEvent) => {
    if (String(event.error?.message).includes('Failed for recipient')) {
      event.preventDefault();
    }
  };

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.addEventListener('error', preventExpectedRenderError);
  });

  afterEach(() => {
    window.removeEventListener('error', preventExpectedRenderError);
    consoleErrorSpy.mockRestore();
  });

  it('reports only redacted identifiers through onError when a route child throws', () => {
    const sink = vi.fn();

    render(
      <MemoryRouter>
        <ErrorBoundary onError={createTelemetryErrorReporter(sink)}>
          <ThrowingChild />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(sink).toHaveBeenCalledTimes(1);
    const payload = sink.mock.calls[0][0] as {
      error: { message?: string; name?: string };
    };
    expect(payload.error.name).toBe('Error');
    expect(payload.error.message).toContain('[addr:');
    expect(payload.error.message).toContain('[tx:');
    expect(payload.error.message).not.toContain(SAMPLE_ADDRESS);
    expect(payload.error.message).not.toContain(SAMPLE_HASH);
  });

  it('createConsoleReporter emits redacted console output with no raw identifiers', () => {
    const reporter = createConsoleReporter();

    reporter(
      new Error(`Failed for recipient ${SAMPLE_ADDRESS} tx ${SAMPLE_HASH}`),
      { componentStack: 'test' },
    );

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(consoleErrorSpy.mock.calls[0]);
    expect(logged).not.toContain(SAMPLE_ADDRESS);
    expect(logged).not.toContain(SAMPLE_HASH);
    expect(logged).toContain('[addr:');
    expect(logged).toContain('[tx:');
  });
});
