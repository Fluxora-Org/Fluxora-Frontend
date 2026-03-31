import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import ConnectWalletModal from "./ConnectWalletModal";
import Footer from "./Footer";
import "./Layout.css";

type NavItem = { to: string; label: string; shortLabel: string };

const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Dashboard", shortLabel: "D" },
  { to: "/app/streams", label: "Streams", shortLabel: "S" },
  { to: "/app/recipient", label: "Recipient", shortLabel: "R" },
];

interface LayoutProps {
  onThemeToggle?: () => void;
  theme?: "light" | "dark";
}

export default function Layout({
  onThemeToggle: _onThemeToggle,
  theme: _theme = "light",
}: LayoutProps) {
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const showFooter = !location.pathname.includes("/treasurypage");
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  return (
    <div className={`app-layout${isSidebarCollapsed ? " is-collapsed" : ""}${isMobileSidebarOpen ? " is-mobile-open" : ""}`}>
      <div className="app-layout__body">
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
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `app-nav-link${isActive ? " is-active" : ""}`
                }
                onClick={closeMobileSidebar}
              >
                <span className="app-nav-badge" aria-hidden="true">
                  {item.shortLabel}
                </span>
                <span className="app-nav-label">{item.label}</span>
              </NavLink>
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
            <span className="app-connect-label">Connect wallet</span>
          </button>
        </aside>

        <div className="app-content-area">
          <header className="app-mobile-topbar">
            <button
              type="button"
              className="app-mobile-menu-btn"
              onClick={() => setIsMobileSidebarOpen((prev) => !prev)}
              aria-label={isMobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-expanded={isMobileSidebarOpen}
              aria-controls="app-sidebar"
            >
              <span /><span /><span />
            </button>
            <div className="app-mobile-title">Fluxora</div>
          </header>

          <main className="app-main">
            <Outlet />
          </main>

          {showFooter ? <Footer /> : null}
        </div>
      </div>

      <button
        type="button"
        aria-label="Close sidebar"
        className="app-sidebar-backdrop"
        onClick={closeMobileSidebar}
      />

      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnectFreighter={() => setIsModalOpen(false)}
        onConnectAlbedo={() => setIsModalOpen(false)}
        onConnectWalletConnect={() => setIsModalOpen(false)}
      />
    </div>
  );
}
