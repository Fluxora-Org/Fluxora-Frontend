/**
 * #1755 — Assert the embed widget works when third-party storage is blocked.
 *
 * When the widget is embedded in a third-party iframe, the browser may block
 * all storage APIs entirely.  Merely *accessing* `window.localStorage` or
 * `window.sessionStorage` throws a `DOMException` with name `SecurityError`.
 *
 * These tests exercise that exact condition and assert:
 *  1. The widget renders and functions with storage unavailable.
 *  2. No unhandled exception occurs.
 *  3. Features requiring storage degrade gracefully.
 *  4. Theme defaults apply when storage cannot be read.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EmbedStreamWidget from '../EmbedStreamWidget';
import { getStreamById } from '../../lib/api/streamsService';

// ---------------------------------------------------------------------------
// Mocks — same setup as the main EmbedStreamWidget test file
// ---------------------------------------------------------------------------

vi.mock('../../lib/api/streamsService', () => ({
  getStreamById: vi.fn(),
}));

vi.mock('../../hooks/useTickingNow', () => ({
  useTickingNow: () => new Date('2026-01-20'),
}));

vi.mock('../../hooks/useEmbedAccessibility', () => ({
  useEmbedAccessibility: vi.fn(),
}));

const mockStream = {
  id: 'STR-001',
  name: 'Test Stream',
  recipientName: 'Test Recipient',
  recipientAddress: 'GA...',
  treasuryName: 'Test Treasury',
  treasuryAddress: 'GA...',
  asset: 'USDC',
  status: 'Active' as const,
  monthlyRate: 5000,
  depositAmount: 48000,
  streamedAmount: 19250,
  withdrawableAmount: 4200,
  remainingAmount: 28750,
  progress: 40,
  startDate: '2026-01-15',
  endDate: '2026-10-15',
  cliffDate: '2026-01-31',
  nextUnlockDate: '2026-04-03',
  summary: 'Test stream summary',
  health: 'Healthy' as const,
  healthNote: 'Healthy stream',
  auditNote: 'No issues',
  tags: ['test'],
  timeline: [],
};

// ---------------------------------------------------------------------------
// Storage-blocking helpers
// ---------------------------------------------------------------------------

const origLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
const origSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

/**
 * Simulate a third-party iframe where the browser blocks all site data.
 * After this call, reading `window.localStorage` or `window.sessionStorage`
 * throws a `DOMException("The operation is insecure.", "SecurityError")` —
 * exactly what Chrome, Firefox, and Safari do for blocked third-party storage.
 */
function blockAllStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

function restoreStorage() {
  if (origLocalStorage) Object.defineProperty(window, 'localStorage', origLocalStorage);
  if (origSessionStorage) Object.defineProperty(window, 'sessionStorage', origSessionStorage);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderEmbedWidget(streamId: string, searchParams?: string) {
  const path = `/embed/streams/${streamId}${searchParams ? `?${searchParams}` : ''}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/embed/streams/:streamId" element={<EmbedStreamWidget />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('#1755 — Embed widget with third-party storage blocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blockAllStorage();
  });

  afterEach(() => {
    restoreStorage();
    vi.restoreAllMocks();
  });

  // ─── 1. Widget renders and functions with storage unavailable ──────────────

  it('renders the loading skeleton without throwing when storage is blocked', () => {
    (getStreamById as any).mockImplementation(
      () => new Promise(() => {}), // never resolves — keeps the loading state
    );

    expect(() => renderEmbedWidget('STR-001')).not.toThrow();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading stream widget')).toBeInTheDocument();
  });

  it('renders a live stream when storage is entirely blocked', async () => {
    (getStreamById as any).mockResolvedValue(mockStream);

    renderEmbedWidget('STR-001');

    await waitFor(() => {
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('Test Stream')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });
  });

  it('renders the error state without throwing when storage is blocked', async () => {
    (getStreamById as any).mockRejectedValue(new Error('Stream not found'));

    renderEmbedWidget('invalid-id');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Stream unavailable/)).toBeInTheDocument();
    });
  });

  // ─── 2. No unhandled exception ─────────────────────────────────────────────

  it('produces no unhandled exception across all three presets', async () => {
    (getStreamById as any).mockResolvedValue(mockStream);

    for (const preset of ['card', 'banner', 'compact'] as const) {
      const { unmount } = renderEmbedWidget('STR-001', `preset=${preset}`);

      await waitFor(() => {
        expect(screen.getByRole('article')).toBeInTheDocument();
      });

      // Unmount also exercises cleanup paths (theme restoration, etc.)
      unmount();
    }
  });

  // ─── 3. Features requiring storage degrade gracefully ──────────────────────

  it('falls back to the default theme when storage is blocked', async () => {
    (getStreamById as any).mockResolvedValue(mockStream);

    renderEmbedWidget('STR-001');

    await waitFor(() => {
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    // Without storage the widget cannot read a persisted theme, so no
    // data-theme attribute should be set (defaults apply from CSS).
    const container = screen.getByRole('article').closest('.embed-widget-container');
    expect(container).toBeInTheDocument();
    // The widget should still be usable even though theme persistence is unavailable
    expect(container).toHaveAttribute('data-accent-color', 'default');
  });

  it('applies query-param theme even when storage is blocked', async () => {
    (getStreamById as any).mockResolvedValue(mockStream);

    renderEmbedWidget('STR-001', 'theme=dark');

    await waitFor(() => {
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    // Query-param theming does not depend on storage — it must still work.
    const container = screen.getByRole('article').closest('[data-theme]');
    expect(container).toHaveAttribute('data-theme', 'dark');
  });

  it('applies custom accent colour via query param even when storage is blocked', async () => {
    (getStreamById as any).mockResolvedValue(mockStream);

    renderEmbedWidget('STR-001', 'accent-color=%2300AEEF');

    await waitFor(() => {
      const container = screen.getByRole('article').closest('[data-accent-color]');
      expect(container).toHaveAttribute('data-accent-color', 'custom');
    });
  });

  // ─── 4. Retry works with storage blocked ───────────────────────────────────

  it('retry button works when storage is blocked', async () => {
    (getStreamById as any)
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockResolvedValueOnce(mockStream);

    renderEmbedWidget('STR-001');

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Click retry
    const retryButton = screen.getByRole('button', { name: /try again/i });
    retryButton.click();

    // Widget should eventually show success
    await waitFor(() => {
      expect(screen.getByRole('article')).toBeInTheDocument();
      expect(screen.getByText('Test Stream')).toBeInTheDocument();
    });

    expect(getStreamById).toHaveBeenCalledTimes(2);
  });

  // ─── 5. postMessage theming works without storage ──────────────────────────

  it('handles postMessage theme change when storage is blocked', async () => {
    (getStreamById as any).mockResolvedValue(mockStream);

    let nonceSeq = 0;
    const sendMessage = (data: unknown, origin = window.location.origin) => {
      let payload = data;
      if (
        data &&
        typeof data === 'object' &&
        (data as Record<string, unknown>).type === 'fluxora:embed' &&
        !(data as Record<string, unknown>).nonce
      ) {
        nonceSeq += 1;
        payload = {
          ...(data as Record<string, unknown>),
          nonce: `test-nonce-${nonceSeq}`,
          timestamp: Date.now(),
        };
      }
      window.dispatchEvent(
        new MessageEvent('message', { data: payload, origin, source: window }),
      );
    };

    renderEmbedWidget('STR-001');

    await waitFor(() => {
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    // Send a theme-change message — must not throw even with storage blocked
    sendMessage({
      type: 'fluxora:embed',
      version: 1,
      action: 'theme',
      theme: 'dark',
    });

    await waitFor(() => {
      const container = screen.getByRole('article').closest('[data-theme]');
      expect(container).toHaveAttribute('data-theme', 'dark');
    });
  });

  // ─── 6. Cleanup (unmount) is safe without storage ──────────────────────────

  it('unmounts cleanly without throwing when storage is blocked', async () => {
    (getStreamById as any).mockResolvedValue(mockStream);

    const { unmount } = renderEmbedWidget('STR-001', 'theme=dark&accent-color=%2300AEEF');

    await waitFor(() => {
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    expect(() => unmount()).not.toThrow();
  });
});
