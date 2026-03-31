import { Link, useLocation } from "react-router-dom";

interface NavLinkProps {
  to: string;
  label: string;
  onClick?: () => void;
}

export default function NavLink({ to, label, onClick }: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={[
        "relative px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
        isActive
          ? "text-[var(--accent)]"
          : "text-[var(--navbar-link-color)] hover:text-[var(--text)]",
      ].join(" ")}
    >
      {label}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--accent)]"
        />
      )}
    </Link>
  );
}
