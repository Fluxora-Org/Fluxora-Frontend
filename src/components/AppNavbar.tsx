import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

interface AppNavbarProps {
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
  network?: "TESTNET" | "MAINNET";
  walletAddress?: string | null;
  onDisconnect?: () => void;
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function usePageTitle(): string {
  const { pathname } = useLocation();
  if (pathname === "/app") return "Dashboard";
  if (pathname.startsWith("/app/streams/")) return "Stream Detail";
  if (pathname.startsWith("/app/streams")) return "Streams";
  if (pathname.startsWith("/app/recipient")) return "Recipient";
  if (pathname.startsWith("/app/treasurypage")) return "Treasury";
  return "Dashboard";
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-lg" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-lg" aria-hidden="true">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      {[["12","1","12","3"],["12","21","12","23"],["4.22","4.22","5.64","5.64"],
        ["18.36","18.36","19.78","19.78"],["1","12","3","12"],["21","12","23","12"],
        ["4.22","19.78","5.64","18.36"],["18.36","5.64","19.78","4.22"]
      ].map(([x1,y1,x2,y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function ChevronDownIcon({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-lg"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
      aria-hidden="true">
      <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-lg" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-lg" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DisconnectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-lg" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FluxoraLogo() {
  return (
    <Link to="/app" aria-label="Fluxora dashboard home" style={styles.logoLink}>
      <div style={styles.logoBrand}>
        <svg width="36" height="36" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ marginTop: "8px" }} aria-hidden="true">
          <defs>
            <filter id="appnav_filter" x="0" y="0" width="45.9936" height="45.9936"
              filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix" />
              <feColorMatrix in="SourceAlpha" type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feMorphology radius="2" operator="erode" in="SourceAlpha" result="effect1_dropShadow" />
              <feOffset dy="2" /><feGaussianBlur stdDeviation="2" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0" />
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
              <feColorMatrix in="SourceAlpha" type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
              <feMorphology radius="1" operator="erode" in="SourceAlpha" result="effect2_dropShadow" />
              <feOffset dy="4" /><feGaussianBlur stdDeviation="3" />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0.721569 0 0 0 0 0.831373 0 0 0 0.2 0" />
              <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
              <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
            </filter>
            <linearGradient id="appnav_gradient" x1="22.9968" y1="1" x2="22.9968" y2="36.9936" gradientUnits="userSpaceOnUse">
              <stop stopColor="#00B8D4" /><stop offset="1" stopColor="#0097A7" />
            </linearGradient>
            <clipPath id="appnav_clip">
              <rect width="19.9952" height="19.9952" fill="white" transform="translate(12.9938 8.99917)" />
            </clipPath>
          </defs>
          <g filter="url(#appnav_filter)">
            <path d="M5 9.00001C5 4.58173 8.58172 1 13 1H32.9936C37.4119 1 40.9936 4.58172 40.9936 9V28.9936C40.9936 33.4119 37.4119 36.9936 32.9936 36.9936H13C8.58173 36.9936 5 33.4119 5 28.9936V9.00001Z"
              fill="url(#appnav_gradient)" shapeRendering="crispEdges" />
            <g clipPath="url(#appnav_clip)">
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
        <span style={styles.logoText}>Fluxora</span>
      </div>
    </Link>
  );
}

interface WalletDropdownProps {
  address: string;
  onDisconnect?: () => void;
}

function WalletDropdown({ address, onDisconnect }: WalletDropdownProps) {
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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(address); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleViewExplorer = () => {
    window.open(`https://stellar.expert/explorer/testnet/account/${address}`, "_blank", "noopener");
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
        aria-label={`Wallet connected: ${address}. Open wallet options.`}
        style={styles.walletPill}
      >
        <span style={styles.connectedDot} aria-hidden="true" />
        <span style={styles.walletAddress}>{truncateAddress(address)}</span>
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div role="menu" aria-label="Wallet options" style={styles.dropdown}>
          <button role="menuitem" onClick={handleCopy} style={styles.dropdownItem}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <CopyIcon />
            {copied ? "Copied!" : "Copy address"}
          </button>
          <button role="menuitem" onClick={handleViewExplorer} style={styles.dropdownItem}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <ExternalLinkIcon />
            View in explorer
          </button>
          <div style={styles.dropdownDivider} role="separator" />
          <button role="menuitem" onClick={handleDisconnect} style={{ ...styles.dropdownItem, color: "var(--status-error)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <DisconnectIcon />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppNavbar({
  onThemeToggle,
  theme = "light",
  network = "TESTNET",
  walletAddress = null,
  onDisconnect,
}: AppNavbarProps) {
  const pageTitle = usePageTitle();
  const isTestnet = network === "TESTNET";

  return (
    <header role="banner" aria-label="App navigation" style={styles.navbar}>
      <div style={styles.left}>
        <FluxoraLogo />
      </div>
      <div style={styles.center}>
        <h1 style={styles.pageTitle}>{pageTitle}</h1>
      </div>
      <nav aria-label="Toolbar" style={styles.right}>
        <button
          onClick={onThemeToggle}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          style={styles.iconButton}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          aria-label={`Network: ${network}. Click to switch network.`}
          style={{
            ...styles.networkBadge,
            background: isTestnet ? "var(--network-testnet-bg)" : "var(--network-mainnet-bg)",
            color: isTestnet ? "var(--network-testnet-text)" : "var(--network-mainnet-text)",
          }}
        >
          {network}
        </button>
        {walletAddress ? (
          <WalletDropdown address={walletAddress} onDisconnect={onDisconnect} />
        ) : (
          <span style={styles.noWallet} aria-label="No wallet connected">
            <span style={{ ...styles.connectedDot, background: "var(--text-muted)" }} />
            Not connected
          </span>
        )}
      </nav>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  navbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 1.5rem",
    height: "60px",
    background: "var(--navbar-bg)",
    borderBottom: "1px solid var(--navbar-border)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    gap: "1rem",
    boxSizing: "border-box",
  },
  left: { display: "flex", alignItems: "center", flexShrink: 0 },
  center: { flex: 1, display: "flex", justifyContent: "center", minWidth: 0 },
  right: { display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 },
  logoLink: { display: "flex", alignItems: "center", textDecoration: "none", color: "inherit", outline: "none", minHeight: "44px" },
  logoBrand: { display: "flex", alignItems: "center", gap: "0.5rem", height: "44px" },
  logoText: { fontSize: "1.15rem", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "var(--navbar-logo-color)", letterSpacing: "-0.4px", whiteSpace: "nowrap" },
  pageTitle: { margin: 0, padding: 0, fontSize: "1rem", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: "var(--text)", letterSpacing: "-0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  iconButton: { background: "transparent", border: "1px solid var(--navbar-icon-border)", borderRadius: "50%", width: "40px", height: "40px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--navbar-icon-color)", transition: "background 0.2s ease", padding: 0, outline: "none" },
  networkBadge: { display: "inline-flex", alignItems: "center", padding: "0 12px", height: "32px", minHeight: "44px", borderRadius: "20px", border: "none", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.07em", cursor: "pointer", whiteSpace: "nowrap", transition: "opacity 0.15s", outline: "none" },
  walletPill: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 12px", height: "36px", minHeight: "44px", borderRadius: "20px", border: "none", background: "var(--surface)", color: "var(--text)", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: "0.82rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", outline: "none", transition: "background 0.15s" },
  connectedDot: { width: "8px", height: "8px", borderRadius: "50%", background: "var(--status-success)", flexShrink: 0, boxShadow: "0 0 0 2px rgba(30, 201, 142, 0.25)" },
  walletAddress: { fontFamily: "monospace", fontSize: "0.8rem" },
  noWallet: { display: "inline-flex", alignItems: "center", gap: "6px", padding: "0 12px", height: "36px", borderRadius: "20px", background: "var(--surface)", color: "var(--muted)", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: "0.82rem", whiteSpace: "nowrap" },
  dropdown: { position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: "185px", background: "var(--navbar-bg)", border: "1px solid var(--navbar-border)", borderRadius: "10px", boxShadow: "var(--navbar-shadow)", padding: "5px", zIndex: 200 },
  dropdownItem: { display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "8px 10px", border: "none", background: "transparent", color: "var(--text)", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", borderRadius: "6px", textAlign: "left", minHeight: "36px", transition: "background 0.15s" },
  dropdownDivider: { height: "1px", background: "var(--navbar-border)", margin: "4px 0" },
};
