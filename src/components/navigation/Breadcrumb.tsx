import { Link } from "react-router-dom";
import { isValidStellarAddress, maskAddress } from "../../lib/stellar";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
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
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isStellarAddress = isValidStellarAddress(item.label);
          const displayLabel = isStellarAddress
            ? maskAddress(item.label)
            : item.label;

          return (
            <li
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: "var(--breadcrumb-gap)" }}
            >
              {isLast || !item.to ? (
                <span
                  aria-label={isStellarAddress ? item.label : undefined}
                  aria-current={isLast ? "page" : undefined}
                  title={isStellarAddress ? item.label : undefined}
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
                  {displayLabel}
                </span>
              ) : (
                <Link
                  to={item.to}
                  aria-label={isStellarAddress ? item.label : undefined}
                  title={isStellarAddress ? item.label : undefined}
                  className="breadcrumb-link"
                >
                  {displayLabel}
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
