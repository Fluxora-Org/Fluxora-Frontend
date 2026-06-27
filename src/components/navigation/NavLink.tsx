import { Link, useLocation } from "react-router-dom";
import styles from "./NavLink.module.css";

interface NavLinkProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  /**
   * When `true`, the link is considered active only when the current
   * pathname matches exactly (same number of segments). Useful for
   * index-style links like `/` or `/dashboard`.
   * @default false
   */
  end?: boolean;
}

/**
 * Compares `pathname` and `to` segment-by-segment, avoiding false
 * positives from raw string prefix matching (e.g. `/app/stream` vs
 * `/app/streams`).
 *
 * - Splits both paths on `/` and discards empty segments.
 * - In prefix mode (default): the link is active when every segment of
 *   `to` matches the corresponding segment of `pathname` and `to` has
 *   fewer or equal segments (i.e. `to` is a pathname prefix).
 * - In exact mode (`end = true`): both paths must have the same number
 *   of segments and every segment must match.
 * - The root path `"/"` is always exact — it only activates on exactly `/`.
 */
function segmentMatch(pathname: string, to: string, end = false): boolean {
  const pathSegments = pathname.split("/").filter(Boolean);
  const toSegments = to.split("/").filter(Boolean);

  if (to === "/" || end) {
    return (
      pathSegments.length === toSegments.length &&
      toSegments.every((seg, i) => seg === pathSegments[i])
    );
  }

  if (toSegments.length > pathSegments.length) {
    return false;
  }

  return toSegments.every((seg, i) => seg === pathSegments[i]);
}

/**
 * Navigation Link Component
 * ──────────────────────────────────────
 * Implements DESIGN_SPEC.md § 4.2 Navigation specifications
 *
 * Features:
 * - Auto-active state detection via segment-aware matching
 * - aria-current="page" for screen readers
 * - Proper focus state with visible ring
 * - Hover/active/focus states from design spec
 * - Icon + label support
 * - Keyboard accessible (Tab, Enter)
 * - `end` prop for exact-match index links
 */
export default function NavLink({
  to,
  label,
  icon,
  onClick,
  disabled = false,
  variant = "primary",
  end = false,
}: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = segmentMatch(pathname, to, end);

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      className={[
        styles.navItem,
        disabled ? styles.disabled : "",
        variant === "secondary" ? styles.navItemSecondary : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ pointerEvents: disabled ? "none" : "auto" }}
    >
      {icon && <span className={styles.navIcon}>{icon}</span>}
      <span className={styles.navLabel}>{label}</span>
    </Link>
  );
}