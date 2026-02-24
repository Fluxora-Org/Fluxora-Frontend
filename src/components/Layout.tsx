import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import Footer from './Footer';
import './layout.css';
import ConnectWalletModal from './ConnectWalletModal';
import { useState } from "react";
import { Link, Outlet } from "react-router-dom";
import ConnectWalletModal from "./ConnectWalletModal";
import Footer from "./Footer";
import "./Layout.css";

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

export default function Layout() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleConnectFreighter = () => {
    console.log("Connecting to Freighter...");
    setIsModalOpen(false);
  };

  const handleConnectAlbedo = () => {
    console.log("Connecting to Albedo...");
    setIsModalOpen(false);
  };

  const handleConnectWalletConnect = () => {
    console.log("Connecting to WalletConnect...");
    setIsModalOpen(false);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div style={styles.layout}>
      <Sidebar />

      <aside style={styles.sidebar}>
        <div style={styles.logo}>Fluxora</div>
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>Dashboard</Link>
          <Link to="/streams" style={styles.navLink}>Streams</Link>
          <Link to="/recipient" style={styles.navLink}>Recipient</Link>
    <div className="app-layout">
      <aside className="app-layout__sidebar">
        <div className="app-layout__logo">Fluxora</div>
        <nav className="app-layout__nav">
          <Link to="/" className="app-layout__nav-link">Dashboard</Link>
          <Link to="/streams" className="app-layout__nav-link">Streams</Link>
          <Link to="/recipient" className="app-layout__nav-link">Recipient</Link>
    <div
      className={`app-layout${isSidebarCollapsed ? " is-collapsed" : ""}${isMobileSidebarOpen ? " is-mobile-open" : ""}`}
    >
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
              <span className="app-nav-badge" aria-hidden="true">
                {item.shortLabel}
              </span>
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
            <span />
            <span />
            <span />
          </button>
          <div className="app-mobile-title">Fluxora</div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>

        <Footer />
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
        onConnectFreighter={handleConnectFreighter}
        onConnectAlbedo={handleConnectAlbedo}
        onConnectWalletConnect={handleConnectWalletConnect}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    minHeight: "100vh",
  },

  sidebar: {
    width: 220,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
  },
  logo: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--accent)",
    marginBottom: "2rem",
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    flex: 1,
  },
  navLink: {
    padding: "0.6rem 0.75rem",
    borderRadius: 8,
    color: "var(--text)",
    textDecoration: "none",
  },
  connectButton: {
    marginTop: 'auto',
    padding: '0.75rem 1rem',
    background: 'var(--accent)',
    color: '#0a0e17',
    border: 'none',
    borderRadius: 8,
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  main: {
    flex: 1,
    marginLeft: '260px',
    padding: '24px',
    backgroundColor: '#f9fafb',
    transition: 'margin-left 0.3s ease',
    padding: "2rem",
    overflow: "auto",
  },
};
