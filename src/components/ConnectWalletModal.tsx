import { MouseEvent, useEffect, useRef, useState } from "react";
import { Download, AlertCircle, AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import styles from "./ConnectWalletModal.module.css";
import { isConnected, requestAccess, getNetwork } from "@stellar/freighter-api";
import { useWallet } from "./wallet-connect/Walletcontext";

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectFreighter?: () => void;
  onConnectAlbedo?: () => void;
  onConnectWalletConnect?: () => void;
  // Optional controlled error state to drive the modal view from a parent component
  errorState?: "not_installed" | "rejected" | "network_mismatch" | null;
  // Handler for retrying connection
  onRetryConnection?: () => void;
  // Handler for downloading extension
  onDownloadFreighter?: () => void;
  // Optional flag to explicitly show or hide the Design QA Preview switcher (default: true for reviewability)
  showStateSwitcher?: boolean;
}

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  action: () => void;
}

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
}: ConnectWalletModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  // Track hovered/focused options in default view
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [focusedOptionId, setFocusedOptionId] = useState<string | null>(null);
  
  const { connect } = useWallet();

  // Internal error state for uncontrolled usage/simulation
  const [internalErrorState, setInternalErrorState] = useState<
    "not_installed" | "rejected" | "network_mismatch" | null
  >(null);

  // Determine active state (controlled prop takes priority over internal state)
  const currentErrorState = errorState !== undefined ? errorState : internalErrorState;

  // Handle Freighter selection: perform actual connection and network verification
  const handleFreighterClick = async () => {
    setInternalErrorState(null);
    try {
      const ready = await isConnected();
      if (!ready.isConnected) {
        setInternalErrorState("not_installed");
        if (onDownloadFreighter) {
          onDownloadFreighter();
        }
        return;
      }

      const access = await requestAccess();
      if (access.error || !access.address) {
        setInternalErrorState("rejected");
        return;
      }

      const net = await getNetwork();
      if (net.error || !net.network) {
        setInternalErrorState("rejected");
        return;
      }

      const expectedNet = import.meta.env.VITE_NETWORK || "TESTNET";
      if (net.network.toUpperCase() !== expectedNet.toUpperCase()) {
        setInternalErrorState("network_mismatch");
        return;
      }

      // Successful connection!
      connect(access.address, net.network);
      if (onConnectFreighter) {
        onConnectFreighter();
      }
      onClose();
    } catch {
      setInternalErrorState("rejected");
    }
  };

  // Reset internal error state back to default wallet list
  const handleBackToWalletSelection = () => {
    setInternalErrorState(null);
    if (onRetryConnection) {
      onRetryConnection();
    }
  };

  // Keyboard navigation & Focus Trapping
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
    };
  }, [isOpen, onClose]);

  // Focus Management: Automatically shift focus to the primary recovery action when the screen changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (currentErrorState) {
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
  }, [isOpen, currentErrorState]);

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
      action: handleFreighterClick,
    },
    {
      id: "albedo",
      name: "Albedo",
      description: "Open in-browser wallet for quick secure approvals.",
      icon: "⭐",
      action: onConnectAlbedo ?? (() => {}),
    },
    {
      id: "walletconnect",
      name: "WalletConnect",
      description: "Pair with compatible mobile wallets via QR.",
      icon: "🔗",
      action: onConnectWalletConnect ?? (() => {}),
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
        {!currentErrorState && (
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
                  hoveredOptionId === wallet.id || focusedOptionId === wallet.id;

                return (
                  <button
                    key={wallet.id}
                    type="button"
                    role="listitem"
                    className={styles.walletOption}
                    style={{
                      background: isActive ? "var(--surface-elevated)" : "var(--surface-neutral)",
                      borderColor: isActive ? "var(--border-interactive)" : "var(--border-neutral)",
                      boxShadow: isActive
                        ? "0 0 0 2px var(--surface-base), 0 0 0 4px var(--interactive-focus-ring)"
                        : "none",
                    }}
                    onClick={wallet.action}
                    onMouseEnter={() => setHoveredOptionId(wallet.id)}
                    onMouseLeave={() => setHoveredOptionId(null)}
                    onFocus={() => setFocusedOptionId(wallet.id)}
                    onBlur={() => setFocusedOptionId(null)}
                    aria-label={`Connect with ${wallet.name}`}
                  >
                    <div className={styles.walletIcon} aria-hidden="true">
                      {wallet.icon}
                    </div>
                    <div className={styles.walletInfo}>
                      <div className={styles.walletName}>{wallet.name}</div>
                      <div className={styles.walletDescription}>{wallet.description}</div>
                    </div>
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
        {currentErrorState === "not_installed" && (
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
        {currentErrorState === "rejected" && (
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
                onClick={handleFreighterClick}
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
        {currentErrorState === "network_mismatch" && (
          <div className={styles.errorContainer} data-testid="error-state-network-mismatch">
            <div className={`${styles.errorIcon} ${styles.iconMismatch}`} aria-hidden="true">
              <AlertTriangle size={28} />
            </div>

            <span className={styles.badge} id="badge-network-mismatch">Network Mismatch</span>
            <h2 id="connect-wallet-modal-title" className={styles.errorTitle}>
              Wrong Stellar Network
            </h2>
            <p id="connect-wallet-modal-description" className={styles.errorDescription}>
              Your wallet is connected to the wrong network. Fluxora is configured for Stellar 
              <strong> Public Network (Mainnet)</strong>, but your wallet is currently on <strong>Testnet</strong>.
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
                  Select <strong>Public Network (Mainnet)</strong> and return here.
                </span>
              </li>
            </ol>

            <div className={styles.actionGroup}>
              <button
                type="button"
                className={styles.primaryButton}
                data-autofocus="true"
                onClick={handleFreighterClick}
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

        {/* DESIGN QA PREVIEW TOOLBAR - Rendered exclusively for Design Review & Verification */}
        {showStateSwitcher && (
          <div className={styles.previewToolbar} data-testid="design-qa-toolbar">
            <span className={styles.previewTitle}>Design QA Preview:</span>
            <div className={styles.previewBtnGroup} role="group" aria-label="Select design preview state">
              <button
                type="button"
                className={`${styles.previewButton} ${
                  currentErrorState === null ? styles.previewButtonActive : ""
                }`}
                onClick={() => setInternalErrorState(null)}
                aria-pressed={currentErrorState === null}
              >
                Default View
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  currentErrorState === "not_installed" ? styles.previewButtonActive : ""
                }`}
                onClick={() => setInternalErrorState("not_installed")}
                aria-pressed={currentErrorState === "not_installed"}
              >
                Not Installed
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  currentErrorState === "rejected" ? styles.previewButtonActive : ""
                }`}
                onClick={() => setInternalErrorState("rejected")}
                aria-pressed={currentErrorState === "rejected"}
              >
                Rejected
              </button>
              <button
                type="button"
                className={`${styles.previewButton} ${
                  currentErrorState === "network_mismatch" ? styles.previewButtonActive : ""
                }`}
                onClick={() => setInternalErrorState("network_mismatch")}
                aria-pressed={currentErrorState === "network_mismatch"}
              >
                Wrong Network
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
