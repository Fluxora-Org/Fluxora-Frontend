/**
 * Tests for Breadcrumb.tsx and useBreadcrumbs hook.
 * Issue: #374 — Memoize useBreadcrumbs labelMap and address validation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import Breadcrumb, { LABEL_MAP, useBreadcrumbs } from '../Breadcrumb';

function wrapper(path: string) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
}

const VALID_STELLAR = 'GABC' + 'ABCDEFGHJKLMNPQRSTUVWXYZ234567'.repeat(2).slice(0, 52);

// ─── LABEL_MAP is module-scoped ───────────────────────────────────────────────

describe('LABEL_MAP', () => {
  it('is the same reference on re-import (not rebuilt per call)', async () => {
    const { LABEL_MAP: map2 } = await import('../Breadcrumb');
    expect(LABEL_MAP).toBe(map2);
  });

  it('contains expected route labels', () => {
    expect(LABEL_MAP.app).toBe('Dashboard');
    expect(LABEL_MAP.streams).toBe('Streams');
    expect(LABEL_MAP.recipient).toBe('Recipient');
  });
});

// ─── useBreadcrumbs ───────────────────────────────────────────────────────────

describe('useBreadcrumbs', () => {
  it('returns [] for root path', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapper('/') });
    expect(result.current).toEqual([]);
  });

  it('returns one item for /app with correct label', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapper('/app') });
    expect(result.current).toHaveLength(1);
    expect(result.current[0].label).toBe('Dashboard');
    expect(result.current[0].isCurrent).toBe(true);
  });

  it('returns correct labels for /app/streams', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapper('/app/streams') });
    expect(result.current[0].label).toBe('Dashboard');
    expect(result.current[0].isCurrent).toBe(false);
    expect(result.current[1].label).toBe('Streams');
    expect(result.current[1].isCurrent).toBe(true);
  });

  it('builds correct hrefs', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapper('/app/streams') });
    expect(result.current[0].href).toBe('/app');
    expect(result.current[1].href).toBe('/app/streams');
  });

  it('handles deep route (3 segments)', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapper('/app/streams/details') });
    expect(result.current).toHaveLength(3);
    expect(result.current[2].isCurrent).toBe(true);
  });

  it('masks a valid Stellar address segment', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapper(`/app/${VALID_STELLAR}`) });
    const item = result.current.find((i) => i.href.includes(VALID_STELLAR))!;
    expect(item.label).not.toBe(VALID_STELLAR);
    expect(item.label).toContain('…');
  });

  it('does not mask a non-address segment', () => {
    const { result } = renderHook(() => useBreadcrumbs(), { wrapper: wrapper('/app/streams') });
    expect(result.current[1].label).toBe('Streams');
  });
});

// ─── Breadcrumb component ─────────────────────────────────────────────────────

describe('Breadcrumb component', () => {
  it('renders nothing for root path', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}><Breadcrumb /></MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nav with correct labels for /app/streams', () => {
    render(
      <MemoryRouter initialEntries={['/app/streams']}><Breadcrumb /></MemoryRouter>
    );
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Streams')).toBeTruthy();
  });

  it('marks last segment with aria-current="page"', () => {
    render(
      <MemoryRouter initialEntries={['/app/streams']}><Breadcrumb /></MemoryRouter>
    );
    expect(screen.getByText('Streams').getAttribute('aria-current')).toBe('page');
  });

  it('non-current segments are links with correct hrefs', () => {
    render(
      <MemoryRouter initialEntries={['/app/streams']}><Breadcrumb /></MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/app');
  });

  it('shows masked address (not raw) for Stellar address segment', () => {
    render(
      <MemoryRouter initialEntries={[`/app/${VALID_STELLAR}`]}><Breadcrumb /></MemoryRouter>
    );
    expect(screen.queryByText(VALID_STELLAR)).toBeNull();
    expect(screen.getByText((t) => t.includes('…'))).toBeTruthy();
  });

  it('output parity: labels match LABEL_MAP for known segments', () => {
    render(
      <MemoryRouter initialEntries={['/app/recipient']}><Breadcrumb /></MemoryRouter>
    );
    expect(screen.getByText(LABEL_MAP.app)).toBeTruthy();
    expect(screen.getByText(LABEL_MAP.recipient)).toBeTruthy();
  });
});
