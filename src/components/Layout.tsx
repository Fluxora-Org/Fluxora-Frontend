import { useRef, useState } from "react";
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

export default function Layout() {
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const connectBtnRef = useRef<HTMLButtonElement>(null);

  const showFooter = !location.pathname.includes("/treasurypage");

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    connectBtnRef.current?.focus();
  };

  return (
    <div
      className={[
        "app-layout",
        isSidebarCollapsed && "is-collapsed",
        isMobileSidebarOpen && "is-mobile-open",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="app-layout__body">
        {/* SIDEBAR */}
        <aside
          id="app-sidebar"
          className="app-sidebar"
          aria-label="Primary navigation"
          role="navigation"
        >
          <div className="app-sidebar-header">
            <div className="app-logo">
              {isSidebarCollapsed ? "Fx" : "Fluxora"}
            </div>

            <button
              className="app-sidebar-toggle"
              onClick={() => setIsSidebarCollapsed((p) => !p)}
              aria-label="Toggle sidebar"
              aria-expanded={!isSidebarCollapsed}
              aria-controls="app-sidebar"
            >
              <span
                className={`app-toggle-chevron ${
                  isSidebarCollapsed ? "is-rotated" : ""
                }`}
              >
                <svg viewBox="0 0 24 24">
                  <path
                    d="M15 19l-7-7 7-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
          </div>

          {/* NAV */}
          <nav className="app-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app"}
                className={({ isActive }) =>
                  `app-nav-link ${isActive ? "is-active" : ""}`
                }
                onClick={closeMobileSidebar}
              >
                <span className="app-nav-badge">{item.shortLabel}</span>
                <span className="app-nav-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* CTA */}
          <button
            ref={connectBtnRef}
            className="app-connect-button"
            onClick={() => setIsModalOpen(true)}
            aria-haspopup="dialog"
            aria-label="Connect wallet"
          >
            <span className="app-connect-label">Connect wallet</span>
          </button>
        </aside>

        {/* CONTENT */}
        <div className="app-content-area">
          <header className="app-mobile-topbar">
            <button
              className="app-mobile-menu-btn"
              onClick={() => setIsMobileSidebarOpen((p) => !p)}
              aria-label="Toggle menu"
              aria-expanded={isMobileSidebarOpen}
              aria-controls="app-sidebar"
            >
              <span />
              <span />
              <span />
            </button>

            <div className="app-mobile-title">Fluxora</div>
          </header>

          <main className="app-main">
            <Outlet />
          </main>

          {showFooter && <Footer />}
        </div>
      </div>

      {/* BACKDROP */}
      <button
        className="app-sidebar-backdrop"
        onClick={closeMobileSidebar}
        aria-label="Close sidebar"
        type="button"
      />

      {/* MODAL */}
      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConnectFreighter={handleCloseModal}
        onConnectAlbedo={handleCloseModal}
        onConnectWalletConnect={handleCloseModal}
      />
    </div>
  );
}
