import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import Button from "./Button";

interface UnifiedNavbarProps {
  theme: "light" | "dark";
  onThemeToggle: () => void;
  // App mode props (optional, for authenticated routes)
  pageTitle?: string;
  networkBadge?: "TESTNET" | "MAINNET";
  walletAddress?: string | null;
  onWalletClick?: () => void;
  onDisconnect?: () => void;
  onMobileMenuToggle?: () => void;
  mobileMenuOpen?: boolean;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function usePageTitle(): string {
  const { pathname } = useLocation();
  const map: Record<string, string> = {
    "/app": "Dashboard",
    "/app/streams": "Streams",
    "/app/recipient": "Recipient",
  };
  return map[pathname] ?? "Dashboard";
}

// Icon Components
function MoonIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      {[
        ["12", "1", "12", "3"],
        ["12", "21", "12", "23"],
        ["4.22", "4.22", "5.64", "5.64"],
        ["18.36", "18.36", "19.78", "19.78"],
        ["1", "12", "3", "12"],
        ["21", "12", "23", "12"],
        ["4.22", "19.78", "5.64", "18.36"],
        ["18.36", "5.64", "19.78", "4.22"],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
      aria-hidden="true"
    >
      <polyline
        points="6 9 12 15 18 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Fluxora Logo Component
function FluxoraLogo({ isApp }: { isApp: boolean }) {
  return (
    <Link
      to={isApp ? "/app" : "/"}
      aria-label="Fluxora home"
      style={styles.logoLink}
    >
      <div style={styles.logoBrand}>
        <svg
          width="36"
          height="36"
          viewBox="0 0 46 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginTop: "8px" }}
          aria-hidden="true"
        >
          <defs>
            <filter id="fluxora_logo_filter" x="0" y="0" width="45.9936" height="45.9936" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feMorphology radius="2" operator="erode" in="SourceAlpha" result="effect1_dropShadow" />
              <feOffset dy="2" />
              <feGaussianBlur stdDeviation="2" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feMorphology radius="1" operator="erode" in="SourceAlpha" result="effect2_dropShadow" />
              <feOffset dy="4" />
              <feGaussianBlur stdDeviation="3" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0" />
              <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            </filter>
            <linearGradient id="fluxora_logo_gradient" x1="22.9968" y1="1" x2="22.9968" y2="36.9936" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00B8D4" />
              <stop offset="1" stopColor="#0097A7" />
            </linearGradient>
          </defs>
          <g filter="url(#fluxora_logo_filter)">
            <path d="M5 9.00001C5 4.58173 8.58172 1 13 1H32.9936C37.4119 1 40.9936 4.58172 40.9936 9V28.9936C40.9936 33.4119 37.4119 36.9936 32.9936 36.9936H13C8.58173 36.9936 5 33.4119 5 28.9936V9.00001Z" fill="url(#fluxora_logo_gradient)" />
          </g>
        </svg>
        <span style={styles.logoText}>Fluxora</span>
      </div>
    </Link>
  );
}

// Wallet Dropdown Component
function WalletDropdown({
  address,
  onDisconnect,
}: {
  address: string;
  onDisconnect?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // noop
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleViewExplorer = () => {
    window.open(
      `https://stellar.expert/explorer/testnet/account/${address}`,
      "_blank",
      "noopener"
    );
    setOpen(false);
  };

  const handleDisconnect = () => {
    setOpen(false);
    onDisconnect?.();
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Wallet connected: ${address}`}
        style={styles.walletPill}
      >
        <span style={styles.connectedDot} aria-hidden="true" />
        <span>{truncateAddress(address)}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div style={styles.walletDropdown} role="menu">
          <button
            onClick={handleCopy}
            style={styles.dropdownItem}
            role="menuitem"
          >
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button
            onClick={handleViewExplorer}
            style={styles.dropdownItem}
            role="menuitem"
          >
            View on Stellar Expert
          </button>
          <button
            onClick={handleDisconnect}
            style={styles.dropdownItem}
            role="menuitem"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Unified Navbar Component
 * Works for both marketing (landing) and authenticated app routes.
 * Detects route and renders appropriate chrome.
 *
 * Marketing mode: Shows nav links + "Get started" CTA
 * App mode: Shows page title + network badge + wallet state
 */
export default function UnifiedNavbar({
  theme,
  onThemeToggle,
  pageTitle: overridePageTitle,
  networkBadge,
  walletAddress,
  onWalletClick,
  onDisconnect,
  onMobileMenuToggle,
  mobileMenuOpen = false,
}: UnifiedNavbarProps) {
  const { pathname } = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const isAppRoute = pathname.startsWith("/app");
  const pageTitle = overridePageTitle || usePageTitle();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navbarHeight = isMobile ? "48px" : "64px";

  return (
    <>
      <nav
        style={{
          ...styles.navbar,
          height: navbarHeight,
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          style={{
            ...styles.container,
            height: navbarHeight,
          }}
        >
          {/* Logo */}
          <FluxoraLogo isApp={isAppRoute} />

          {/* Center: Marketing nav OR page title */}
          {!isAppRoute ? (
            <nav style={styles.marketingNav} className={isMobile ? "hidden md:flex" : ""}>
              <Link to="/" style={styles.navLink}>
                Home
              </Link>
              <a href="https://docs.fluxora.dev" style={styles.navLink}>
                Docs
              </a>
              <a
                href="https://github.com/fluxora-ft/fluxora-frontend"
                style={styles.navLink}
              >
                GitHub
              </a>
            </nav>
          ) : (
            <div style={styles.pageTitle}>{pageTitle}</div>
          )}

          {/* Right: Tools + CTA */}
          <div style={styles.rightContainer}>
            {/* Theme toggle */}
            <Button
              variant="icon"
              onClick={onThemeToggle}
              aria-label="Toggle theme"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>

            {/* Network badge (app only) */}
            {networkBadge && (
              <div style={styles.networkBadge}>{networkBadge}</div>
            )}

            {/* Wallet state / CTA */}
            {!isAppRoute ? (
              <Button variant="primary" size="small" onClick={onWalletClick}>
                Get started
              </Button>
            ) : walletAddress ? (
              <WalletDropdown address={walletAddress} onDisconnect={onDisconnect} />
            ) : (
              <Button
                variant="primary"
                size="small"
                onClick={onWalletClick}
              >
                Connect wallet
              </Button>
            )}
          </div>

          {/* Mobile hamburger (for sidebar toggle) */}
          {isMobile && isAppRoute && (
            <Button
              variant="icon"
              onClick={onMobileMenuToggle}
              data-testid="mobile-menu-toggle"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              style={{ marginLeft: "auto", marginRight: 0 }}
            >
              ☰
            </Button>
          )}
        </div>
      </nav>

      {/* Skip link (hidden, visible on focus) */}
      <a href="#main-content" style={styles.skipLink}>
        Skip to main content
      </a>
    </>
  );
}

const styles = {
  skipLink: {
    position: "absolute" as const,
    top: "-40px",
    left: "0",
    background: "var(--accent, #00d4aa)",
    color: "#0a0e17",
    padding: "8px",
    textDecoration: "none",
    zIndex: 100,
    borderRadius: "0 0 4px 0",
    ":focus": {
      top: "0",
    },
  } as any,

  navbar: {
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid var(--navbar-border)",
    background: "var(--navbar-bg)",
    padding: "0 1.5rem",
    position: "sticky" as const,
    top: 0,
    zIndex: 40,
  } as React.CSSProperties,

  container: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "2rem",
    margin: "0 auto",
    maxWidth: "1440px",
  } as React.CSSProperties,

  logoLink: {
    textDecoration: "none",
    color: "var(--navbar-logo-color)",
    flexShrink: 0,
  } as React.CSSProperties,

  logoBrand: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontWeight: 700,
    fontSize: "18px",
  } as React.CSSProperties,

  logoText: {
    color: "var(--navbar-logo-color)",
    display: "none" as const,
    "@media (min-width: 640px)": {
      display: "block" as const,
    },
  } as any,

  marketingNav: {
    display: "flex",
    gap: "2rem",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    "@media (max-width: 768px)": {
      display: "none" as const,
    },
  } as any,

  navLink: {
    fontSize: "14px",
    fontWeight: 500,
    color: "var(--navbar-link-color)",
    textDecoration: "none",
    transition: "color 0.2s ease",
    cursor: "pointer",
    ":hover": {
      color: "var(--accent, #00d4aa)",
    },
  } as any,

  pageTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: "var(--text)",
    flex: 1,
  } as React.CSSProperties,

  rightContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    marginLeft: "auto",
  } as React.CSSProperties,

  networkBadge: {
    padding: "4px 12px",
    background: "rgba(0, 212, 170, 0.1)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    color: "var(--accent)",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,

  walletPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "8px 12px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text)",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s ease",
    whiteSpace: "nowrap" as const,
    position: "relative" as const,
  } as React.CSSProperties,

  connectedDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#52c41a",
    boxShadow: "0 0 4px rgba(82, 196, 26, 0.5)",
  } as React.CSSProperties,

  walletDropdown: {
    position: "absolute" as const,
    top: "calc(100% + 8px)",
    right: 0,
    background: "var(--surface-elevated, #0f1624)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    minWidth: "200px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
    zIndex: 50,
    overflow: "hidden",
  } as React.CSSProperties,

  dropdownItem: {
    display: "block" as const,
    width: "100%",
    padding: "12px 16px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--border)",
    color: "var(--text)",
    textAlign: "left" as const,
    fontSize: "14px",
    cursor: "pointer",
    transition: "background 0.2s ease",
    ":hover": {
      background: "rgba(255,255,255,0.06)",
    },
    ":last-child": {
      borderBottom: "none",
    },
  } as any,
};
