import { useMemo } from "react";
import { Link } from "react-router-dom";
import { isValidStellarAddress, maskAddress } from "../../lib/stellar";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const stellarAddressValidationCache = new Map<string, boolean>();

function isCachedStellarAddress(label: string): boolean {
  const cached = stellarAddressValidationCache.get(label);
  if (cached !== undefined) return cached;

  const isAddress = isValidStellarAddress(label);
  stellarAddressValidationCache.set(label, isAddress);
  return isAddress;
}

/**
 * Breadcrumb
 * ──────────────────────────────────────
 * Semantic breadcrumb trail for deep pages (e.g. Streams / Stream #ABC123).
 *
 * Accessibility:
 * - nav[aria-label="Breadcrumb"] wraps the trail
 * - ol > li structure (ordered, represents hierarchy)
 * - aria-current="page" on the last (current) item
 * - Separator chevrons are aria-hidden
 * - All link items are keyboard-focusable with visible focus ring
 * - Truncates checksum-valid Stellar addresses at 8...4 chars
 *
 * WCAG 2.1 AA: 4.5:1 text contrast, 3:1 focus ring contrast
 */
export default function Breadcrumb({ items }: BreadcrumbProps) {
  const displayItems = useMemo(
    () =>
      items.map((item) => {
        const isStellarAddress = isCachedStellarAddress(item.label);
        return {
          ...item,
          displayLabel: isStellarAddress ? maskAddress(item.label) : item.label,
          isStellarAddress,
        };
      }),
    [items],
  );

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center" }}>
      <ol
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--breadcrumb-gap)",
          listStyle: "none",
          margin: 0,
          padding: 0,
          font: "var(--breadcrumb-font)",
          flexWrap: "wrap",
        }}
      >
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;

          return (
            <li
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: "var(--breadcrumb-gap)" }}
            >
              {isLast || !item.to ? (
                <span
                  aria-label={item.isStellarAddress ? item.label : undefined}
                  aria-current={isLast ? "page" : undefined}
                  title={item.isStellarAddress ? item.label : undefined}
                  style={{
                    color: isLast
                      ? "var(--breadcrumb-color-current)"
                      : "var(--breadcrumb-color)",
                    fontWeight: isLast ? 500 : 400,
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.displayLabel}
                </span>
              ) : (
                <Link
                  to={item.to}
                  aria-label={item.isStellarAddress ? item.label : undefined}
                  title={item.isStellarAddress ? item.label : undefined}
                  className="breadcrumb-link"
                >
                  {item.displayLabel}
                </Link>
              )}

              {!isLast && (
                <span
                  aria-hidden="true"
                  style={{
                    color: "var(--breadcrumb-separator-color)",
                    userSelect: "none",
                    fontSize: "10px",
                  }}
                >
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
