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

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if banner was permanently dismissed or remind later was set
    const dismissedState = localStorage.getItem("pwa-banner-dismissed");
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
      localStorage.setItem("pwa-banner-dismissed", "permanently");
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", "permanently");
  };

  const handleRemindLater = () => {
    setShowBanner(false);
    // Remind in 7 days
    const remindTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("pwa-banner-dismissed", remindTime.toString());
  };

  if (!showBanner) return null;

  return (
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
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
  );
}
