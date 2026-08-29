import { MouseEvent, useEffect, useRef, useState } from "react";
import { Download, AlertCircle, AlertTriangle, ArrowLeft, RefreshCw, Timer, Loader2, Cpu, Lock, PowerOff, Smartphone, Check } from "lucide-react";
import styles from "./ConnectWalletModal.module.css";
import { isConnected, requestAccess, getNetwork } from "@stellar/freighter-api";
import { useWallet } from "./wallet-connect/Walletcontext";
import { getExpectedStellarNetwork } from "../lib/stellarNetwork";
import { getNetworkLabel } from "../lib/config";
import WalletIcon from "./WalletIcon";
import { isMobileViewport, VIEWPORT_RESIZE_DEBOUNCE_MS } from "../lib/breakpoints";
import { useWalletStateMachine } from "./wallet-connect/useWalletStateMachine";

/** Duration (ms) before the Freighter network check is considered hung. */
const NETWORK_TIMEOUT_MS = 5000;

/**
 * Wraps a promise with a timeout that rejects after `ms` milliseconds.
 * The underlying timer is cleared when the promise settles, preventing
 * unnecessary work after resolution or rejection.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("NETWORK_CHECK_TIMEOUT")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectFreighter?: () => void;
  onConnectAlbedo?: () => void;
  onConnectWalletConnect?: () => void;
  /**
   * Optional controlled error state to drive the modal view from a parent
   * component (e.g. Design QA preview tool). When provided this overrides
   * the machine's derived view state.
   */
  errorState?:
    | "not_installed"
    | "rejected"
    | "network_mismatch"
    | "network_timeout"
    | "device-searching"
    | "device-found-selecting"
    | "awaiting-device-confirmation"
    | "device-locked-error"
    | "wrong-app-error"
    | "unplugged-error"
    | "mobile-unsupported"
    | null;
  /** Handler for retrying connection */
  onRetryConnection?: () => void;
  /** Handler for downloading extension */
  onDownloadFreighter?: () => void;
  /**
   * Optional flag to explicitly show or hide the Design QA Preview switcher
   * (default: true for reviewability).
   */
  showStateSwitcher?: boolean;
  expectedNetworkLabel?: string;
  actualNetworkLabel?: string | null;
}

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconSrc?: string;
  action: () => void;
  disabled?: boolean;
}

// Deterministic network label — memoized so it is identical across
// rerenders even if getNetworkLabel or getExpectedStellarNetwork have
// side effects or are replaced between renders.
const stableExpectedNetworkLabel = getNetworkLabel(getExpectedStellarNetwork());

/**
 * Maps the state machine's canonical state name to the legacy
 * `errorState` string shape used by the prop API and the Design QA toolbar.
 */
type LegacyErrorState =
  | "not_installed"
  | "rejected"
  | "network_mismatch"
  | "network_timeout"
  | "device-searching"
  | "device-found-selecting"
  | "awaiting-device-confirmation"
  | "device-locked-error"
  | "wrong-app-error"
  | "unplugged-error"
  | "mobile-unsupported"
  | null;

export default function ConnectWalletModal({
  isOpen,
  onClose,
  onConnectFreighter,
  onConnectAlbedo,
  onConnectWalletConnect,
  errorState,
  onRetryConnection,
  onDownloadFreighter,
  showStateSwitcher = true,
  expectedNetworkLabel = stableExpectedNetworkLabel,
  actualNetworkLabel = null,
}: ConnectWalletModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const customPathInputRef = useRef<HTMLInputElement>(null);

  // ── State machine ──────────────────────────────────────────────────────────
  const { machineState, send, setRequestInFlight } = useWalletStateMachine();

  // Track hovered/focused options in default view
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [focusedOptionId, setFocusedOptionId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Keep a ref-based in-flight guard that the async handler can read
  // synchronously (avoids stale closure issues with the ref inside the hook).
  const isRequestInFlight = useRef(false);

  const { connect } = useWallet();

  // Hardware wallet configuration states (not part of the machine – purely UI)
  const [selectedDevice, setSelectedDevice] = useState<"ledger" | "trezor">("ledger");
  const [derivationPath, setDerivationPath] = useState<string>("m/44'/148'/0'");
  const [customPath, setCustomPath] = useState<string>("m/44'/148'/0'");
  const [pathError, setPathError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(() => isMobileViewport());
  const [isSimulatingHardwareFlow, setIsSimulatingHardwareFlow] = useState(false);

  // ── Derive the effective display state ────────────────────────────────────
  // The `errorState` prop (Design-QA / controlled mode) takes priority over
  // the machine state so that parent components can still drive the view for
  // review purposes without interfering with production flows.
  const effectiveDisplayState: LegacyErrorState = (() => {
    if (errorState !== undefined) return errorState ?? null;
    switch (machineState) {
      case "not_installed":        return "not_installed";
      case "rejected":             return "rejected";
      case "network_mismatch":     return "network_mismatch";
      case "network_timeout":      return "network_timeout";
      case "device_searching":     return "device-searching";
      case "device_found_selecting": return "device-found-selecting";
      case "awaiting_device_confirmation": return "awaiting-device-confirmation";
      case "device_locked_error":  return "device-locked-error";
      case "wrong_app_error":      return "wrong-app-error";
      case "unplugged_error":      return "unplugged-error";
      case "mobile_unsupported":   return "mobile-unsupported";
      default:                     return null; // idle, connecting, connected
    }
  })();

  // Whether the modal is currently in the default wallet-list view.
  const isDefaultView = effectiveDisplayState === null && machineState !== "connecting";
  // Show connecting spinner on the Freighter option while machine is connecting.
  const isConnecting = machineState === "connecting";

  // ── Viewport resize tracking ───────────────────────────────────────────────
  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout> | undefined;

    const syncMobileState = () => {
      const mobile = isMobileViewport();
      setIsMobile((prev) => (prev === mobile ? prev : mobile));
    };

    const handleResize = () => {
      clearTimeout(debounceId);
      debounceId = setTimeout(syncMobileState, VIEWPORT_RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(debounceId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleCustomPathChange = (val: string) => {
    setCustomPath(val);
    const regex = /^m\/44'\/148'\/[0-9]+'?$/;
    if (!regex.test(val)) {
      setPathError("Invalid Stellar derivation path format (e.g. m/44'/148'/0')");
    } else {
      setPathError(null);
    }
  };

  useEffect(() => {
    if (derivationPath === "custom") {
      const timer = setTimeout(() => {
        customPathInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [derivationPath]);

  // Simulate desktop scanning transition (only in Design QA simulation mode)
  useEffect(() => {
    if (effectiveDisplayState === "device-searching" && isSimulatingHardwareFlow) {
      const timer = setTimeout(() => {
        send({ type: "DEVICE_FOUND" });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [effectiveDisplayState, isSimulatingHardwareFlow, send]);

  // Simulate on-device approval confirmation transition (Design QA only)
  useEffect(() => {
    if (effectiveDisplayState === "awaiting-device-confirmation" && isSimulatingHardwareFlow) {
      const timer = setTimeout(() => {
        connect("GDU4D7EXAMPLEADDRESS0L50DR222222222222222222222222222222", "TESTNET");
        send({ type: "CONNECTION_SUCCESS" });
        setIsSimulatingHardwareFlow(false);
        if (onConnectFreighter) {
          onConnectFreighter();
        }
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [effectiveDisplayState, isSimulatingHardwareFlow, connect, onClose, onConnectFreighter, send]);

  /** Handle hardware wallet selection (drives the machine). */
  const handleHardwareClick = () => {
    setIsSimulatingHardwareFlow(true);
    if (isMobile) {
      send({ type: "SELECT_HARDWARE_MOBILE" });
    } else {
      send({ type: "SELECT_HARDWARE" });
    }
  };

  /**
   * Handle Freighter selection: drives the machine to `connecting`, performs
   * the actual Freighter API calls, then sends the appropriate result event.
   */
  const handleFreighterClick = async () => {
    // Machine-level guard: SELECT_FREIGHTER is ignored while in-flight.
    if (isRequestInFlight.current) return;

    // Drive the machine into the connecting state BEFORE marking in-flight,
    // so the machine's send() guard (which checks the hook's inFlightRef) does
    // not swallow the SELECT_FREIGHTER event.
    send({ type: "SELECT_FREIGHTER" });

    isRequestInFlight.current = true;
    setRequestInFlight(true);
    setConnectingId("freighter");

    try {
      const ready = await isConnected();
      if (!ready.isConnected) {
        send({ type: "ERROR", error: "not_installed" });
        if (onDownloadFreighter) {
          onDownloadFreighter();
        }
        return;
      }

      const access = await requestAccess();
      if (access.error || !access.address) {
        send({ type: "ERROR", error: "rejected" });
        return;
      }

      const net = await withTimeout(getNetwork(), NETWORK_TIMEOUT_MS);
      if (net.error || !net.network) {
        send({ type: "ERROR", error: "rejected" });
        return;
      }

      const expectedNet = getExpectedStellarNetwork();
      const actualUpper = net.network.toUpperCase();
      const expectedUpper = expectedNet.toUpperCase();
      if (actualUpper !== expectedUpper) {
        send({ type: "ERROR", error: "network_mismatch" });
        return;
      }

      // Successful connection!
      connect(access.address, net.network);
      send({ type: "CONNECTION_SUCCESS" });
      if (onConnectFreighter) {
        onConnectFreighter();
      }
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === "NETWORK_CHECK_TIMEOUT") {
        send({ type: "ERROR", error: "network_timeout" });
      } else {
        send({ type: "ERROR", error: "rejected" });
      }
    } finally {
      isRequestInFlight.current = false;
      setRequestInFlight(false);
      setConnectingId(null);
    }
  };

  /** Retry Freighter connection from an error state. */
  const handleRetryFreighter = () => {
    send({ type: "RETRY" });
    if (onRetryConnection) {
      onRetryConnection();
    }
    // Re-attempt the connection after driving the machine to `connecting`.
    void handleFreighterClick();
  };

  /** Return to the wallet selection list (idle). */
  const handleBackToWalletSelection = () => {
    send({ type: "BACK" });
    if (onRetryConnection) {
      onRetryConnection();
    }
  };

  // ── Keyboard navigation & Focus Trapping ───────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isRequestInFlight.current) {
          return;
        }
        onClose();
        return;
      }

      if (e.key !== "Tab") {
        return;
      }

      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Auto-focus the close button or primary action when the modal opens
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [isOpen, onClose]);

  // Focus Management: Automatically shift focus to the primary recovery action when the screen changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (effectiveDisplayState) {
        const autofocusElement = modalRef.current?.querySelector<HTMLElement>(
          '[data-autofocus="true"]'
        );
        if (autofocusElement) {
          autofocusElement.focus();
        } else {
          closeButtonRef.current?.focus();
        }
      } else {
        closeButtonRef.current?.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, effectiveDisplayState]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const walletOptions: WalletOption[] = [
    {
      id: "freighter",
      name: "Freighter",
      description: "Recommended browser extension for Stellar wallets.",
      icon: "🚀",
      iconSrc: "/src/assets/images/freighter.svg",
      action: handleFreighterClick,
    },
    {
      id: "albedo",
      name: "Albedo",
      description: "Open in-browser wallet for quick secure approvals.",
      icon: "⭐",
      iconSrc: "/src/assets/images/albedo.svg",
      action: onConnectAlbedo ?? (() => {}),
      disabled: !onConnectAlbedo,
    },
    {
      id: "walletconnect",
      name: "WalletConnect",
      description: "Pair with compatible mobile wallets via QR.",
      icon: "🔗",
      iconSrc: "/src/assets/images/walletconnect.svg",
      action: onConnectWalletConnect ?? (() => {}),
      disabled: !onConnectWalletConnect,
    },
    {
      id: "hardware",
      name: "Hardware Wallet",
      description: "Connect via Ledger or Trezor device.",
      icon: "🛠️",
      iconSrc: "/src/assets/images/hardware.svg",
      action: handleHardwareClick,
    },
  ];

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      data-testid="connect-wallet-backdrop"
    >
      <div
        id="connect-wallet-modal"
        className={styles.modal}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-wallet-modal-title"
        aria-describedby="connect-wallet-modal-description"
      >
        {/* Close button - always visible and accessible in any view */}
        <button
          type="button"
          ref={closeButtonRef}
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close wallet connection dialog"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* DEFAULT STATE: Choose Wallet Provider */}
        {isDefaultView && (
          <>
            <div className={styles.header}>
              <span className={styles.badge} id="badge-default">Step 1 of 1</span>
              <h2 id="connect-wallet-modal-title" className={styles.title}>
                Choose your wallet
              </h2>
              <p id="connect-wallet-modal-description" className={styles.subtitle}>
                Select a provider below to connect. You will review and approve the
                request in your wallet.
              </p>
            </div>

            <div className={styles.walletList} role="list" aria-label="Wallet providers">
              {walletOptions.map((wallet) => {
                const isActive =
                  !wallet.disabled &&
                  (hoveredOptionId === wallet.id || focusedOptionId === wallet.id);
                const isConnectingThis = isConnecting && connectingId === wallet.id;
                const isDisabled = wallet.disabled || isConnecting;

                return (
                  <button
                    key={wallet.id}
                    type="button"
                    role="listitem"
                    className={styles.walletOption}
                    style={{
                      background: wallet.disabled
                        ? "var(--surface-neutral)"
                        : isActive
                          ? "var(--surface-elevated)"
                          : "var(--surface-neutral)",
                      borderColor: wallet.disabled
                        ? "var(--border-neutral)"
                        : isActive
                          ? "var(--border-interactive)"
                          : "var(--border-neutral)",
                      boxShadow:
                        !wallet.disabled && isActive
                          ? "0 0 0 2px var(--surface-base), 0 0 0 4px var(--interactive-focus-ring)"
                          : "none",
                      opacity: wallet.disabled ? 0.5 : 1,
                      cursor: isDisabled ? "not-allowed" : "pointer",
                    }}
                    onClick={isDisabled ? undefined : wallet.action}
                    onMouseEnter={() => !wallet.disabled && setHoveredOptionId(wallet.id)}
                    onMouseLeave={() => setHoveredOptionId(null)}
                    onFocus={() => !wallet.disabled && setFocusedOptionId(wallet.id)}
                    onBlur={() => setFocusedOptionId(null)}
                    aria-label={
                      wallet.disabled
                        ? `${wallet.name} — coming soon`
                        : `Connect with ${wallet.name}`
                    }
                    aria-disabled={isDisabled}
                    disabled={isDisabled}
                  >
                    <div className={styles.walletIcon} aria-hidden="true">
                      {isConnectingThis ? (
                        <Loader2 size={24} className={styles.spinning} />
                      ) : (
                        <WalletIcon name={wallet.name} iconSrc={wallet.iconSrc} />
                      )}
                    </div>
                    <div className={styles.walletInfo}>
                      <div className={styles.walletName}>
                        {wallet.name}
                        {wallet.disabled && (
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.7em",
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              color: "var(--text-tertiary, #888)",
                              border: "1px solid currentColor",
                              borderRadius: "4px",
                              padding: "1px 5px",
                              verticalAlign: "middle",
                            }}
                            aria-hidden="true"
                          >
                            coming soon
                          </span>
                        )}
                      </div>
                      <div className={styles.walletDescription}>
                        {isConnectingThis ? "Connecting..." : wallet.description}
                      </div>
                    </div>
                    {!wallet.disabled && !isConnectingThis && (
                      <svg
                        className={styles.chevron}
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 3l5 5-5 5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            <p className={styles.footer}>
              By continuing, you agree to Fluxora&apos;s{" "}
              <a href="/terms" className={styles.termsLink}>
                Terms of Service
              </a>
              .
            </p>
          </>
        )}

        {/* ERROR STATE: Freighter Not Installed */}
        {effectiveDisplayState === "not_installed" && (
          <div className={styles.errorContainer} data-testid="error-state-not-installed">
            <div className={`${styles.errorIcon} ${styles.iconNotInstalled}`} aria-hidden="true">
              <Download size={28} />
            </div>

            <span className={styles.badge} id="badge-not-installed">Extension Required</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Freighter Not Installed
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              Freighter is the official browser extension for Stellar and Soroban.
              You will need to install the extension to securely connect your wallet to Fluxora.
            </p>

            <div className={styles.actionGroup}>
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryButton}
                data-autofocus="true"
                onClick={onDownloadFreighter}
                aria-label="Download Freighter browser extension"
              >
                <Download size={18} />
                Download Freighter
              </a>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE: Connection Request Rejected */}
        {effectiveDisplayState === "rejected" && (
          <div className={styles.errorContainer} data-testid="error-state-rejected">
            <div className={`${styles.errorIcon} ${styles.iconRejected}`} aria-hidden="true">
              <AlertCircle size={28} />
            </div>

            <span className={styles.badge} id="badge-rejected">Connection Failed</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Connection Rejected
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              The connection was declined in your wallet extension. To interact with Fluxora,
              please grant permission to view your Stellar public key. No funds can be accessed without your explicit signature.
            </p>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                data-autofocus="true"
                onClick={handleRetryFreighter}
                aria-label="Retry connecting to Freighter wallet"
              >
                <RefreshCw size={18} />
                Retry Connection
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE: Network Mismatch */}
        {effectiveDisplayState === "network_mismatch" && (
          <div className={styles.errorContainer} data-testid="error-state-network-mismatch">
            <div className={`${styles.errorIcon} ${styles.iconMismatch}`} aria-hidden="true">
              <AlertTriangle size={28} />
            </div>

            <span className={styles.badge} id="badge-network-mismatch">Network Mismatch</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Wrong Stellar Network
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              Your wallet is connected to the wrong network. Fluxora is configured for Stellar{" "}
              <strong>{expectedNetworkLabel}</strong>, but your wallet is currently on{" "}
              <strong>{actualNetworkLabel ?? "an unsupported network"}</strong>.
            </p>

            <ol className={styles.errorInstructions} aria-label="Instructions to switch network">
              <li className={styles.instructionItem}>
                <span className={styles.instructionNumber}>1</span>
                <span className={styles.instructionText}>
                  Open your <strong>Freighter extension</strong> in your browser toolbar.
                </span>
              </li>
              <li className={styles.instructionItem}>
                <span className={styles.instructionNumber}>2</span>
                <span className={styles.instructionText}>
                  Click the <strong>network dropdown</strong> at the top of the extension popup.
                </span>
              </li>
              <li className={styles.instructionItem}>
                <span className={styles.instructionNumber}>3</span>
                <span className={styles.instructionText}>
                  Select <strong>{expectedNetworkLabel}</strong> and return here.
                </span>
              </li>
            </ol>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                data-autofocus="true"
                onClick={handleRetryFreighter}
                aria-label="Check network configuration again"
              >
                <RefreshCw size={18} />
                Check Network Again
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE: Network Check Timed Out */}
        {effectiveDisplayState === "network_timeout" && (
          <div className={styles.errorContainer} data-testid="error-state-network-timeout">
            <div className={`${styles.errorIcon} ${styles.iconRejected}`} aria-hidden="true">
              <Timer size={28} />
            </div>

            <span className={styles.badge} id="badge-timeout">Timed Out</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Network Check Timed Out
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              The network check did not respond in time. This can happen if the Freighter
              extension is hung or unresponsive. Please try again.
            </p>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                data-autofocus="true"
                onClick={handleRetryFreighter}
                aria-label="Retry network check"
              >
                <RefreshCw size={18} />
                Retry Connection
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* HARDWARE WALLET: Device Searching */}
        {effectiveDisplayState === "device-searching" && (
          <div className={styles.errorContainer} data-testid="error-state-device-searching">
            <div className={styles.radarContainer} aria-hidden="true">
              <div className={styles.radarRing}></div>
              <div className={styles.radarRing2}></div>
              <div className={styles.pulseDot}></div>
            </div>

            <div className={styles.ariaLiveContainer} role="status" aria-live="polite">
              Scanning for connected hardware wallets...
            </div>

            <span className={styles.badge} id="badge-device-searching">Step 1 of 3</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Connect via USB
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              Searching for connected hardware wallets... Please plug in your Ledger or Trezor device via USB, unlock it with your PIN, and ensure the Stellar app is open.
            </p>

            <div className={styles.actionGroup}>
              {showStateSwitcher && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => send({ type: "DEVICE_FOUND" })}
                  aria-label="Simulate device detected"
                >
                  Simulate Found
                </button>
              )}
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* HARDWARE WALLET: Device Found & Selection */}
        {effectiveDisplayState === "device-found-selecting" && (
          <div className={styles.errorContainer} data-testid="error-state-device-found-selecting">
            <div className={`${styles.errorIcon} ${styles.iconNotInstalled}`} aria-hidden="true">
              <Cpu size={28} />
            </div>

            <span className={styles.badge} id="badge-device-found-selecting">Step 2 of 3</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Configure Device
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              Select your hardware wallet and choose a derivation path configuration.
            </p>

            <div
              className={styles.deviceList}
              role="radiogroup"
              aria-label="Select USB hardware wallet device"
            >
              <button
                type="button"
                role="radio"
                aria-checked={selectedDevice === "ledger"}
                className={`${styles.deviceOption} ${
                  selectedDevice === "ledger" ? styles.deviceOptionActive : ""
                }`}
                onClick={() => setSelectedDevice("ledger")}
                aria-label="Ledger Nano X or S"
              >
                <div className={styles.walletIcon} aria-hidden="true" style={{ fontSize: "1.2rem" }}>
                  L
                </div>
                <div className={styles.walletInfo}>
                  <div className={styles.walletName}>Ledger Nano X / S</div>
                  <div className={styles.walletDescription}>Connect via USB and confirm public key.</div>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={selectedDevice === "trezor"}
                className={`${styles.deviceOption} ${
                  selectedDevice === "trezor" ? styles.deviceOptionActive : ""
                }`}
                onClick={() => setSelectedDevice("trezor")}
                aria-label="Trezor Model T or One"
              >
                <div className={styles.walletIcon} aria-hidden="true" style={{ fontSize: "1.2rem" }}>
                  T
                </div>
                <div className={styles.walletInfo}>
                  <div className={styles.walletName}>Trezor Model T / One</div>
                  <div className={styles.walletDescription}>Connect via USB and unlock via screen.</div>
                </div>
              </button>
            </div>

            <div className={styles.derivationPathContainer}>
              <label htmlFor="derivation-path-select" className={styles.derivationPathLabel}>
                Derivation Path
              </label>
              <select
                id="derivation-path-select"
                className={styles.selectInput}
                value={derivationPath}
                onChange={(e) => {
                  setDerivationPath(e.target.value);
                  if (e.target.value !== "custom") {
                    setPathError(null);
                  }
                }}
              >
                <option value="m/44'/148'/0'">Stellar Standard (m/44'/148'/0')</option>
                <option value="m/44'/148'/1'">Stellar Secondary (m/44'/148'/1')</option>
                <option value="custom">Custom Derivation Path...</option>
              </select>

              {derivationPath === "custom" && (
                <div>
                  <input
                    type="text"
                    ref={customPathInputRef}
                    id="custom-derivation-path-input"
                    className={styles.customPathInput}
                    value={customPath}
                    onChange={(e) => handleCustomPathChange(e.target.value)}
                    placeholder="m/44'/148'/0'"
                    aria-label="Enter custom Stellar derivation path"
                    aria-invalid={pathError !== null}
                    aria-describedby={pathError ? "custom-path-error" : undefined}
                  />
                  {pathError && (
                    <span
                      id="custom-path-error"
                      style={{
                        color: "var(--status-error)",
                        fontSize: "0.85em",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {pathError}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={derivationPath === "custom" && pathError !== null}
                onClick={() => send({ type: "DEVICE_CONFIRMED" })}
                aria-label="Confirm selection and connect"
              >
                <Check size={18} />
                Confirm & Connect
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => send({ type: "BACK" })}
                aria-label="Back to device scanning"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back
              </button>
            </div>
          </div>
        )}

        {/* HARDWARE WALLET: Awaiting Device Confirmation */}
        {effectiveDisplayState === "awaiting-device-confirmation" && (
          <div className={styles.errorContainer} data-testid="error-state-awaiting-device-confirmation">
            <div className={styles.radarContainer} aria-hidden="true">
              <div className={styles.radarRing} style={{ animationDuration: "1.5s" }}></div>
              <div className={styles.pulseDot} style={{ background: "var(--status-info)", boxShadow: "0 0 8px var(--status-info)" }}></div>
            </div>

            <div className={styles.ariaLiveContainer} role="status" aria-live="polite">
              Confirm Connection on Device... Please review public key on your hardware wallet.
            </div>

            <span className={styles.badge} id="badge-awaiting-device-confirmation">Step 3 of 3</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Confirm on Device
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              Please review and approve the public key connection request on your physical hardware wallet screen. Ensure the Stellar app is active.
            </p>

            <div className={styles.actionGroup}>
              {showStateSwitcher && (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    connect("GDU4D7EXAMPLEADDRESS0L50DR222222222222222222222222222222", "TESTNET");
                    send({ type: "CONNECTION_SUCCESS" });
                    if (onConnectFreighter) onConnectFreighter();
                    onClose();
                  }}
                  aria-label="Simulate successful connection"
                >
                  Simulate Success
                </button>
              )}
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => send({ type: "BACK" })}
                aria-label="Cancel confirmation and go back to configure"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back
              </button>
            </div>
          </div>
        )}

        {/* HARDWARE WALLET: Device Locked Error */}
        {effectiveDisplayState === "device-locked-error" && (
          <div className={styles.errorContainer} data-testid="error-state-device-locked-error">
            <div className={`${styles.errorIcon} ${styles.iconRejected}`} aria-hidden="true">
              <Lock size={28} />
            </div>

            <span className={styles.badge} id="badge-device-locked">Device Locked</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Hardware Wallet Locked
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              Your hardware wallet is locked. Please enter your PIN on the physical device to unlock it and try again.
            </p>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => send({ type: "RETRY" })}
                aria-label="Retry connection scan"
              >
                <RefreshCw size={18} />
                Retry Connection
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* HARDWARE WALLET: Wrong App Error */}
        {effectiveDisplayState === "wrong-app-error" && (
          <div className={styles.errorContainer} data-testid="error-state-wrong-app-error">
            <div className={`${styles.errorIcon} ${styles.iconMismatch}`} aria-hidden="true">
              <AlertTriangle size={28} />
            </div>

            <span className={styles.badge} id="badge-wrong-app">Stellar App Closed</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Stellar App Not Open
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              The Stellar application is not open on your device. Please open the Stellar application on your Ledger or Trezor device before continuing.
            </p>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => send({ type: "RETRY" })}
                aria-label="Retry connection scan"
              >
                <RefreshCw size={18} />
                Retry Connection
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* HARDWARE WALLET: Unplugged Error */}
        {effectiveDisplayState === "unplugged-error" && (
          <div className={styles.errorContainer} data-testid="error-state-unplugged-error">
            <div className={`${styles.errorIcon} ${styles.iconRejected}`} aria-hidden="true">
              <PowerOff size={28} />
            </div>

            <span className={styles.badge} id="badge-unplugged">Disconnected</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Device Disconnected
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              The hardware wallet was unplugged or disconnected mid-flow. Please check your USB cable and reconnect the device.
            </p>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => send({ type: "RETRY" })}
                aria-label="Scan for hardware wallet again"
              >
                <RefreshCw size={18} />
                Scan for Device
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* HARDWARE WALLET: Mobile Fallback */}
        {effectiveDisplayState === "mobile-unsupported" && (
          <div className={styles.errorContainer} data-testid="error-state-mobile-unsupported">
            <div className={`${styles.errorIcon} ${styles.iconMismatch}`} aria-hidden="true">
              <Smartphone size={28} />
            </div>

            <span className={styles.badge} id="badge-mobile-unsupported">Mobile Fallback</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Device Unsupported on Mobile
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              USB hardware wallet connections are not supported on mobile web browsers. Please connect using a supported mobile-friendly wallet instead.
            </p>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  send({ type: "RESET" });
                  if (onConnectWalletConnect) onConnectWalletConnect();
                }}
                aria-label="Connect using WalletConnect mobile flow"
              >
                Connect via WalletConnect
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleBackToWalletSelection}
                aria-label="Back to wallet selection list"
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                Back to wallet list
              </button>
            </div>
          </div>
        )}

        {/* DESIGN QA PREVIEW TOOLBAR - Rendered exclusively for Design Review & Verification */}
        {showStateSwitcher && (
          <div className={styles.previewToolbar} data-testid="design-qa-toolbar">
            <span className={styles.previewTitle}>Design QA Preview:</span>
            <div className={styles.previewBtnGroup} role="group" aria-label="Select design preview state">
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === null ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                }}
                aria-pressed={effectiveDisplayState === null}
              >
                Default View
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "not_installed" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "SELECT_FREIGHTER" });
                  send({ type: "ERROR", error: "not_installed" });
                }}
                aria-pressed={effectiveDisplayState === "not_installed"}
              >
                Not Installed
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "rejected" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "SELECT_FREIGHTER" });
                  send({ type: "ERROR", error: "rejected" });
                }}
                aria-pressed={effectiveDisplayState === "rejected"}
              >
                Rejected
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "network_mismatch" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "SELECT_FREIGHTER" });
                  send({ type: "ERROR", error: "network_mismatch" });
                }}
                aria-pressed={effectiveDisplayState === "network_mismatch"}
              >
                Wrong Network
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "network_timeout" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "SELECT_FREIGHTER" });
                  send({ type: "ERROR", error: "network_timeout" });
                }}
                aria-pressed={effectiveDisplayState === "network_timeout"}
              >
                Timed Out
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "device-searching" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                  send({ type: "SELECT_HARDWARE" });
                }}
                aria-pressed={effectiveDisplayState === "device-searching"}
              >
                HW: Search
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "device-found-selecting" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                  send({ type: "SELECT_HARDWARE" });
                  send({ type: "DEVICE_FOUND" });
                }}
                aria-pressed={effectiveDisplayState === "device-found-selecting"}
              >
                HW: Select
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "awaiting-device-confirmation" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                  send({ type: "SELECT_HARDWARE" });
                  send({ type: "DEVICE_FOUND" });
                  send({ type: "DEVICE_CONFIRMED" });
                }}
                aria-pressed={effectiveDisplayState === "awaiting-device-confirmation"}
              >
                HW: Confirm
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "device-locked-error" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                  send({ type: "SELECT_HARDWARE" });
                  send({ type: "ERROR", error: "device_locked_error" });
                }}
                aria-pressed={effectiveDisplayState === "device-locked-error"}
              >
                HW: Locked
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "wrong-app-error" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                  send({ type: "SELECT_HARDWARE" });
                  send({ type: "ERROR", error: "wrong_app_error" });
                }}
                aria-pressed={effectiveDisplayState === "wrong-app-error"}
              >
                HW: Wrong App
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "unplugged-error" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                  send({ type: "SELECT_HARDWARE" });
                  send({ type: "ERROR", error: "unplugged_error" });
                }}
                aria-pressed={effectiveDisplayState === "unplugged-error"}
              >
                HW: Unplugged
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  effectiveDisplayState === "mobile-unsupported" ? styles.previewButtonActive : ""
                }`}
                onClick={() => {
                  setIsSimulatingHardwareFlow(false);
                  send({ type: "RESET" });
                  send({ type: "SELECT_HARDWARE_MOBILE" });
                }}
                aria-pressed={effectiveDisplayState === "mobile-unsupported"}
              >
                HW: Mobile Unsupported
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
