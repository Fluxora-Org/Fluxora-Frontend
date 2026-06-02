import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useWallet } from "../wallet-connect/Walletcontext";
import NavLink from "./NavLink";
import WalletStatus from "./WalletStatus";
import Breadcrumb, { type BreadcrumbItem } from "./Breadcrumb";

interface AppNavbarProps {
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
}

const ANON_LINKS = [
  { to: "/#features", label: "Features" },
  { to: "/#docs", label: "Docs" },
  { to: "/#pricing", label: "Pricing" },
];

const APP_PRIMARY_LINKS = [
  { to: "/app", label: "Dashboard" },
  { to: "/app/streams", label: "Streams" },
  { to: "/app/recipient", label: "Recipient" },
];

const APP_SECONDARY_LINKS: { to: string; label: string }[] = [
  // Settings and Help go here when added
  // { to: "/app/settings", label: "Settings" },
];

function FluxoraLogo({ connected }: { connected: boolean }) {
  return (
    <Link
      to={connected ? "/app" : "/"}
      aria-label="Fluxora home"
      className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-md"
    >
      <svg width="34" height="34" viewBox="0 0 46 46" fill="none" aria-hidden="true">
        <defs>
          <filter id="nav_f" x="0" y="0" width="45.9936" height="45.9936" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="2" operator="erode" in="SourceAlpha" result="e1" />
            <feOffset dy="2" /><feGaussianBlur stdDeviation="2" /><feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="e1" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
            <feMorphology radius="1" operator="erode" in="SourceAlpha" result="e2" />
            <feOffset dy="4" /><feGaussianBlur stdDeviation="3" /><feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0" />
            <feBlend mode="normal" in2="e1" result="e2" />
            <feBlend mode="normal" in="SourceGraphic" in2="e2" result="shape" />
          </filter>
          <linearGradient id="nav_g" x1="22.9968" y1="1" x2="22.9968" y2="36.9936" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00B8D4" /><stop offset="1" stopColor="#0097A7" />
          </linearGradient>
          <clipPath id="nav_c">
            <rect width="19.9952" height="19.9952" fill="white" transform="translate(12.9938 8.99917)" />
          </clipPath>
        </defs>
        <g filter="url(#nav_f)">
          <path d="M5 9C5 4.58173 8.58172 1 13 1H32.9936C37.4119 1 40.9936 4.58172 40.9936 9V28.9936C40.9936 33.4119 37.4119 36.9936 32.9936 36.9936H13C8.58173 36.9936 5 33.4119 5 28.9936V9Z" fill="url(#nav_g)" shapeRendering="crispEdges" />
          <g clipPath="url(#nav_c)">
            {[
              "M14.6601 13.998C15.16 14.4145 15.6598 14.8311 16.7429 14.8311C18.8258 14.8311 18.8258 13.1648 20.9086 13.1648C23.0748 13.1648 22.9081 14.8311 25.0743 14.8311C27.1571 14.8311 27.1571 13.1648 29.24 13.1648C30.323 13.1648 30.8229 13.5814 31.3228 13.998",
              "M14.6601 18.9968C15.16 19.4134 15.6598 19.8299 16.7429 19.8299C18.8258 19.8299 18.8258 18.1637 20.9086 18.1637C23.0748 18.1637 22.9081 19.8299 25.0743 19.8299C27.1571 19.8299 27.1571 18.1637 29.24 18.1637C30.323 18.1637 30.8229 18.5802 31.3228 18.9968",
              "M14.6601 23.9956C15.16 24.4122 15.6598 24.8287 16.7429 24.8287C18.8258 24.8287 18.8258 23.1625 20.9086 23.1625C23.0748 23.1625 22.9081 24.8287 25.0743 24.8287C27.1571 24.8287 27.1571 23.1625 29.24 23.1625C30.323 23.1625 30.8229 23.579 31.3228 23.9956",
            ].map((d, i) => (
              <path key={i} d={d} stroke="white" strokeWidth="2.08284" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </g>
        </g>
      </svg>
      <span className="text-lg font-bold tracking-tight text-[var(--navbar-logo-color)] font-['Plus_Jakarta_Sans',system-ui,sans-serif]">
        Fluxora
      </span>
    </Link>
  );
}

function ConnectingSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-label="Connecting wallet…" role="status">
      <div className="h-8 w-20 rounded-full bg-[var(--surface)] animate-pulse" />
      <div className="h-9 w-32 rounded-full bg-[var(--surface)] animate-pulse" />
    </div>
  );
}

/**
 * Build breadcrumb items from the current pathname.
 * e.g. /app/streams/STR-001 → [Streams, STR-001]
 */
function useBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (!pathname.startsWith("/app")) return [];

  const segments = pathname.replace("/app", "").split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const labelMap: Record<string, string> = {
    streams: "Streams",
    recipient: "Recipient",
    treasury: "Treasury",
  };

  const items: BreadcrumbItem[] = [];
  let accumulatedPath = "/app";

  segments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;
    const isLast = index === segments.length - 1;
    items.push({
      label: labelMap[segment] ?? segment,
      to: isLast ? undefined : accumulatedPath,
    });
  });

  return items;
}

export default function AppNavbar({
  onThemeToggle,
  theme = "dark",
  onSidebarToggle,
  isSidebarOpen = false,
}: AppNavbarProps) {
  const { connected, address, network, disconnect } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Simulate a brief "connecting" state on first mount when wallet restores session
  useEffect(() => {
    setConnecting(true);
    const t = setTimeout(() => setConnecting(false), 600);
    return () => clearTimeout(t);
  }, []);

const location = useLocation();
  const isAppView = connected && location.pathname.startsWith("/app");
  const breadcrumbs = useBreadcrumbs(location.pathname);
  const showBreadcrumb = isAppView && breadcrumbs.length > 1;
  const links = connected ? APP_PRIMARY_LINKS : ANON_LINKS;

  const handleMobileToggle = () => {
    if (isAppView && onSidebarToggle) {
      onSidebarToggle();
    } else {
      setMobileMenuOpen((o) => !o);
    }
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header
      role="banner"
      aria-label="Global navigation"
      className="sticky top-0 z-50 w-full border-b border-[var(--navbar-border)] bg-[var(--navbar-bg)]/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile Sidebar Toggle (only in App View) */}
          {isAppView && (
            <button
              className="md:hidden flex items-center justify-center w-11 h-11 -ml-2 rounded-lg text-[var(--navbar-icon-color)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              onClick={onSidebarToggle}
              aria-label={isSidebarOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
            >
              {isSidebarOpen ? <X size={26} aria-hidden="true" /> : <Menu size={26} aria-hidden="true" />}
            </button>
          )}
          <FluxoraLogo connected={connected} />
        </div>

        {/* Center: Nav links (desktop) */}
        <nav
  aria-label={connected ? "App navigation" : "Marketing navigation"}
  className="hidden md:flex items-center gap-1"
>
  {/* Primary destinations — full visual weight */}
  {(connected ? APP_PRIMARY_LINKS : ANON_LINKS).map((link) => (
    <NavLink key={link.to} to={link.to} label={link.label} />
  ))}

  {/* Secondary/utility — reduced visual weight, separated */}
  {connected && APP_SECONDARY_LINKS.length > 0 && (
    <>
      <span
        aria-hidden="true"
        style={{
          width: "1px",
          height: "20px",
          background: "var(--navbar-border)",
          margin: "0 var(--space-sm)",
        }}
      />
      {APP_SECONDARY_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          label={link.label}
          variant="secondary"
        />
      ))}
    </>
  )}
</nav>

        {/* Right: Actions (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={onThemeToggle}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border border-[var(--navbar-icon-border)] text-[var(--navbar-icon-color)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {theme === "light" ? (
              <Moon size={16} aria-hidden="true" />
            ) : (
              <Sun size={16} aria-hidden="true" />
            )}
          </button>

          {/* Wallet area */}
          {connecting ? (
            <ConnectingSkeleton />
          ) : connected && address ? (
            <WalletStatus
              address={address}
              network={network ?? "TESTNET"}
              onDisconnect={disconnect}
            />
          ) : (
            <Link
              to="/connect-wallet"
              aria-label="Connect your Stellar wallet"
              className="px-5 h-[44px] rounded-full bg-[var(--cta-bg)] text-white text-sm font-semibold shadow-[var(--cta-shadow)] hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] flex items-center"
            >
              Connect Wallet
            </Link>
          )}
        </div>

        {/* Mobile: hamburger (only in Marketing View or if not using sidebar) */}
        {!isAppView && (
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-md text-[var(--navbar-icon-color)] hover:text-[var(--text)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            onClick={handleMobileToggle}
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {/* Breadcrumb — shown on deep pages (e.g. Streams / STR-001) */}
{showBreadcrumb && (
  <div
    className="w-full border-t border-[var(--navbar-border)] bg-[var(--navbar-bg)] px-4 sm:px-6"
    style={{ paddingTop: "var(--space-sm)", paddingBottom: "var(--space-sm)" }}
  >
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={breadcrumbs} />
    </div>
  </div>
)}

      {/* Mobile menu (Dropdown for marketing site) */}
      {mobileMenuOpen && !isAppView && (
        <div
          id="mobile-nav"
          role="navigation"
          aria-label="Marketing navigation"
          className="md:hidden border-t border-[var(--navbar-border)] bg-[var(--navbar-bg)] px-4 pb-4 pt-2 flex flex-col gap-1"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              label={link.label}
              onClick={closeMobile}
            />
          ))}

          <div className="mt-3 pt-3 border-t border-[var(--navbar-border)] flex items-center gap-3 flex-wrap">
            <button
              onClick={onThemeToggle}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border border-[var(--navbar-icon-border)] text-[var(--navbar-icon-color)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {theme === "light" ? (
                <Moon size={16} aria-hidden="true" />
              ) : (
                <Sun size={16} aria-hidden="true" />
              )}
            </button>

            {connecting ? (
              <ConnectingSkeleton />
            ) : connected && address ? (
              <WalletStatus
                address={address}
                network={network ?? "TESTNET"}
                onDisconnect={() => {
                  disconnect();
                  closeMobile();
                }}
              />
            ) : (
              <Link
                to="/connect-wallet"
                onClick={closeMobile}
                aria-label="Connect your Stellar wallet"
                className="px-5 h-[44px] rounded-full bg-[var(--cta-bg)] text-white text-sm font-semibold shadow-[var(--cta-shadow)] hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] flex items-center"
              >
                Connect Wallet
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
