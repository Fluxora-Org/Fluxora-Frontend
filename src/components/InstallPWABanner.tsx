import { useState, useEffect } from "react";
import "./InstallPWABanner.css";

// Declare the beforeinstallprompt event type for TypeScript
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/** `localStorage` key that records the banner's dismissal state. */
export const PWA_BANNER_STORAGE_KEY = "pwa-banner-dismissed";

/** How long "Remind me later" suppresses the banner: seven days. */
export const PWA_BANNER_REMIND_LATER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Copy for the polite live region. Each value describes the outcome of an
 * action so the banner's visual state changes are also conveyed non-visually.
 */
const ANNOUNCEMENTS = {
  available:
    "Fluxora can be installed on this device. Install, remind me later, or dismiss the banner.",
  installed: "Fluxora installation started.",
  notInstalled: "Fluxora was not installed. You can try again.",
  dismissed:
    "Install banner dismissed. You can install Fluxora later from the browser menu.",
  remindLater: "Reminder set. Fluxora will offer installation again in 7 days.",
};

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  // Announced through a polite live region that outlives the banner itself, so
  // the outcome is still spoken after the banner has been removed.
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if banner was permanently dismissed or remind later was set
    const dismissedState = localStorage.getItem(PWA_BANNER_STORAGE_KEY);
    if (dismissedState === "permanently") {
      return;
    }
    if (dismissedState) {
      const remindTime = parseInt(dismissedState, 10);
      if (Date.now() < remindTime) {
        return;
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setShowBanner(true);
      // The banner appears without moving focus, so announce its arrival.
      setAnnouncement(ANNOUNCEMENTS.available);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setAnnouncement(ANNOUNCEMENTS.installed);
      localStorage.setItem(PWA_BANNER_STORAGE_KEY, "permanently");
    } else {
      setAnnouncement(ANNOUNCEMENTS.notInstalled);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setAnnouncement(ANNOUNCEMENTS.dismissed);
    localStorage.setItem(PWA_BANNER_STORAGE_KEY, "permanently");
  };

  const handleRemindLater = () => {
    setShowBanner(false);
    setAnnouncement(ANNOUNCEMENTS.remindLater);
    // Remind in 7 days
    const remindTime = Date.now() + PWA_BANNER_REMIND_LATER_MS;
    localStorage.setItem(PWA_BANNER_STORAGE_KEY, remindTime.toString());
  };

  return (
    <>
      {/* Always mounted: a live region must exist before its text changes for
          assistive technology to announce the update reliably. */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>
      {showBanner && (
        <div
          className="pwa-banner"
          role="region"
          aria-label="Install App"
        >
          <div className="pwa-banner__content">
            <div className="pwa-banner__text">
              <strong>Install Fluxora</strong>
              <p>Install our app for a better experience, offline access, and easy access from your home screen.</p>
            </div>
            <div className="pwa-banner__actions">
              <button
                type="button"
                className="pwa-banner__btn pwa-banner__btn--primary"
                onClick={handleInstallClick}
              >
                Install
              </button>
              <button
                type="button"
                className="pwa-banner__btn pwa-banner__btn--secondary"
                onClick={handleRemindLater}
              >
                Remind me later
              </button>
              <button
                type="button"
                className="pwa-banner__btn pwa-banner__btn--icon"
                onClick={handleDismiss}
                aria-label="Dismiss permanently"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                  <path
                    d="M18 6L6 18M6 6l12 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
