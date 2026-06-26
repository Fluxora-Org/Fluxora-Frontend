import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Static label map for known route segments.
 *
 * Hoisted to module scope so it is never rebuilt per render.
 * Add entries here when new routes are introduced.
 */
export const LABEL_MAP: Record<string, string> = {
  app: 'Dashboard',
  streams: 'Streams',
  recipient: 'Recipient',
  settings: 'Settings',
};

/** Stellar public key: starts with G, 56 chars, base32 (no 0,1,8,9). */
function isValidStellarAddress(value: string): boolean {
  const t = value.trim();
  if (t.length !== 56 || t[0] !== 'G') return false;
  return /^G[ABCDEFGHJKLMNPQRSTUVWXYZ234567]{55}$/.test(t);
}

function maskAddress(addr: string): string {
  const t = addr.trim();
  if (t.length <= 12) return t || '—';
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

/**
 * Derives breadcrumb items from the current pathname.
 *
 * Per-item address validation is memoized so it only re-runs when the
 * pathname changes, not on every render.
 */
export function useBreadcrumbs(labelMap: Record<string, string> = LABEL_MAP): BreadcrumbItem[] {
  const { pathname } = useLocation();

  return useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    let accumulated = '';

    return segments.map((seg, i) => {
      accumulated += `/${seg}`;
      const isCurrent = i === segments.length - 1;
      const rawLabel = labelMap[seg] ?? seg;
      const label = isValidStellarAddress(seg) ? maskAddress(seg) : rawLabel;
      return { label, href: accumulated, isCurrent };
    });
  }, [pathname, labelMap]);
}

/**
 * Breadcrumb navigation component.
 *
 * Labels are derived from LABEL_MAP (module-scope constant).
 * Address segments are masked; validation result is memoized per pathname.
 */
export default function Breadcrumb() {
  const items = useBreadcrumbs();

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol
        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', listStyle: 'none', margin: 0, padding: 0 }}
      >
        {items.map((item, i) => (
          <li key={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            {i > 0 && (
              <span aria-hidden="true" style={{ color: 'var(--muted)' }}>
                /
              </span>
            )}
            {item.isCurrent ? (
              <span aria-current="page" style={{ color: 'var(--text)' }}>
                {item.label}
              </span>
            ) : (
              <Link to={item.href} style={{ color: 'var(--muted)', textDecoration: 'none' }}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
