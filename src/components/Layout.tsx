import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import ConnectWalletModal from "./ConnectWalletModal";
import Footer from "./Footer";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import "./Layout.css";

type NavItem = { to: string; label: string; shortLabel: string };

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

interface PwaBannerState {
  reminderAt: number | null;
  dismissedPermanently: boolean;
}

const PWA_BANNER_STORAGE_KEY = "fluxora-pwa-banner-state";
const PWA_REMINDER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Dashboard", shortLabel: "D" },
  { to: "/app/streams", label: "Streams", shortLabel: "S" },
  { to: "/app/recipient", label: "Recipient", shortLabel: "R" },
];

function getStoredPwaBannerState(): PwaBannerState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PWA_BANNER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PwaBannerState>;
    const reminderAt =
      typeof parsed.reminderAt === "number" ? parsed.reminderAt : null;
    const dismissedPermanently = Boolean(parsed.dismissedPermanently);

    return { reminderAt, dismissedPermanently };
  } catch {
    return null;
  }
}

function persistPwaBannerState(state: PwaBannerState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PWA_BANNER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures; the banner can still render as a best-effort UI.
  }
}

export default function Layout() {
  const location = useLocation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  const connectBtnRef = useRef<HTMLButtonElement>(null);

  const showFooter = !location.pathname.includes("/treasurypage");

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    connectBtnRef.current?.focus();
  };

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setShowInstallBanner(false);
      setIsStandalone(true);
      persistPwaBannerState({ reminderAt: null, dismissedPermanently: true });
    }
  };

  const handleBannerDismiss = () => {
    const reminderAt = Date.now() + PWA_REMINDER_WINDOW_MS;
    persistPwaBannerState({ reminderAt, dismissedPermanently: false });
    setShowInstallBanner(false);
  };

  const handleBannerPermanentDismiss = () => {
    persistPwaBannerState({ reminderAt: null, dismissedPermanently: true });
    setShowInstallBanner(false);
  };

  useEffect(() => {
    const stored = getStoredPwaBannerState();
    const isReminderDue =
      stored?.reminderAt !== null && stored?.reminderAt !== undefined
        ? stored.reminderAt <= Date.now()
        : true;

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const updateStandaloneState = () => {
      const nextStandalone = mediaQuery.matches;
      setIsStandalone(nextStandalone);
      if (nextStandalone) {
        setShowInstallBanner(false);
      }
    };

    updateStandaloneState();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setShowInstallBanner(
        !stored?.dismissedPermanently && isReminderDue && !mediaQuery.matches,
      );
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowInstallBanner(false);
      persistPwaBannerState({ reminderAt: null, dismissedPermanently: true });
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateStandaloneState);
    } else {
      mediaQuery.addListener(updateStandaloneState);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateStandaloneState);
      } else {
        mediaQuery.removeListener(updateStandaloneState);
      }

      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return (
    <div>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
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
              type="button"
              className="app-sidebar-toggle"
              onClick={() => setIsSidebarCollapsed((p) => !p)}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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

          {!isStandalone && showInstallBanner && (
            <section
              className="app-install-banner"
              role="region"
              aria-labelledby="app-install-banner-title"
            >
              <div className="app-install-banner__content">
                <div>
                  <p className="app-install-banner__eyebrow">Install Fluxora</p>
                  <h2 id="app-install-banner-title" className="app-install-banner__title">
                    Install the app for a faster, standalone experience.
                  </h2>
                </div>
                <div className="app-install-banner__actions">
                  <button
                    type="button"
                    className="app-install-banner__primary"
                    onClick={handleInstallClick}
                  >
                    Install
                  </button>
                  <button
                    type="button"
                    className="app-install-banner__secondary"
                    onClick={handleBannerDismiss}
                  >
                    Remind me later
                  </button>
                  <button
                    type="button"
                    className="app-install-banner__ghost"
                    onClick={handleBannerPermanentDismiss}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </section>
          )}

          <main id="main-content" className="app-main">
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
      <KeyboardShortcutsModal />
    </div>
  );
}
