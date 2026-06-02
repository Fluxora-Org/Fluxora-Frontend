import { Link, useLocation } from "react-router-dom";
import styles from "./NavLink.module.css";

interface NavLinkProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
    variant?: "primary" | "secondary"; // added
}

/**
 * Navigation Link Component
 * ──────────────────────────────────────
 * Implements DESIGN_SPEC.md § 4.2 Navigation specifications
 * 
 * Features:
 * - Auto-active state detection
 * - aria-current="page" for screen readers
 * - Proper focus state with visible ring
 * - Hover/active/focus states from design spec
 * - Icon + label support
 * - Keyboard accessible (Tab, Enter)
 */
export default function NavLink({
  to,
  label,
  icon,
  onClick,
  disabled = false,
  variant = "primary", //added
}: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));

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