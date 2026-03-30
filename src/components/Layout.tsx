import { Outlet, Link, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useState } from "react";
import Footer from "./Footer";
import ConnectWalletModal from "./ConnectWalletModal";
import "./layout.css";

type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Dashboard", shortLabel: "D" },
  { to: "/app/streams", label: "Streams", shortLabel: "S" },
  { to: "/app/recipient", label: "Recipient", shortLabel: "R" },
];

interface LayoutProps {
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
}

export default function Layout({ onThemeToggle, theme = "light" }: LayoutProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const { pathname } = useLocation();

  const handleConnectFreighter = () => {
    setWalletAddress("GABC1234567890XYZ1");
    setIsModalOpen(false);
  };

  const handleConnectAlbedo = () => {
    setWalletAddress("GABC1234567890XYZ1");
    setIsModalOpen(false);
  };

  const handleConnectWalletConnect = () => {
    setWalletAddress("GABC1234567890XYZ1");
    setIsModalOpen(false);
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div
      className={`app-layout${isSidebarCollapsed ? " is-collapsed" : ""}${isMobileSidebarOpen ? " is-mobile-open" : ""}`}
    >
      {/* Sidebar — with collapse toggle, nav links, wallet button */}
      <aside id="app-sidebar" className="app-sidebar" aria-label="Primary navigation">
        <div className="app-sidebar-header">
          <div className="app-logo" aria-label="Fluxora">
            {isSidebarCollapsed ? "Fx" : "Fluxora"}
          </div>
          <button
            type="button"
            className="app-sidebar-toggle"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          >
            <span className={`app-toggle-chevron${isSidebarCollapsed ? " is-rotated" : ""}`} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M15 19l-7-7 7-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>

        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="app-nav-link" onClick={closeMobileSidebar}>
              <span className="app-nav-badge" aria-hidden="true">{item.shortLabel}</span>
              <span className="app-nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <button className="app-connect-button" onClick={() => setIsModalOpen(true)}>
          <span className="app-connect-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 9v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="4" y="6" width="16" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="app-connect-label">
            {walletAddress ? "Switch wallet" : "Connect wallet"}
          </span>
        </button>
      </aside>

      {/* Main content area */}
      <div className="app-content-area">
        <main id="main-content" className="app-main" role="main">
          <Outlet />
        </main>

        {!pathname.includes("treasurypage") && <Footer />}
      </div>

      {/* Sidebar backdrop (mobile overlay close) */}
      <button
        type="button"
        aria-label="Close sidebar"
        className="app-sidebar-backdrop"
        onClick={closeMobileSidebar}
      />

      {/* Wallet connection modal */}
      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnectFreighter={handleConnectFreighter}
        onConnectAlbedo={handleConnectAlbedo}
        onConnectWalletConnect={handleConnectWalletConnect}
      />
    </div>
  );
}
