import { CSSProperties, useEffect, useState } from "react";

import { Navigate, useLocation } from "react-router-dom";
import GlowingDot from "../components/GlowingDot";
import WalletIcon from "../components/WalletIcon";
import ConnectWalletModal from "../components/ConnectWalletModal";
import { sanitizeReturnTo } from "../components/RequireWallet";
import { useWallet } from "../components/wallet-connect/Walletcontext";

/**
 * Wallet failure categories for onboarding.
 * Issue #1644: Asserts every wallet connection failure has a distinct, actionable message.
 */
export type WalletFailureType =
  | "rejected"
  | "timeout"
  | "wrong_network"
  | "missing_extension";

export interface WalletFailureInfo {
  title: string;
  actionText: string;
  testId: string;
}

export function getWalletFailureDetails(
  failureType: WalletFailureType,
  expectedNetworkLabel: string = "Testnet"
): WalletFailureInfo {
  switch (failureType) {
    case "rejected":
      return {
        title: "Connection Request Rejected",
        actionText:
          "The connection request was rejected. Please open your wallet extension and approve the request to continue.",
        testId: "wallet-error-rejected",
      };
    case "timeout":
      return {
        title: "Connection Timed Out",
        actionText:
          "Wallet connection timed out. Please check your network connection, unlock your extension, and try again.",
        testId: "wallet-error-timeout",
      };
    case "wrong_network":
      return {
        title: "Wrong Stellar Network",
        actionText: `Your wallet is connected to the wrong network. Please switch your wallet extension network to ${expectedNetworkLabel}.`,
        testId: "wallet-error-wrong-network",
      };
    case "missing_extension":
      return {
        title: "Wallet Extension Missing",
        actionText:
          "Freighter wallet extension is not installed. Please install Freighter from freighter.app to connect your wallet.",
        testId: "wallet-error-missing-extension",
      };
  }
}

export interface ConnectWalletProps {
  initialError?: WalletFailureType | null;
}

/**
 * Connect Wallet onboarding page.
 *
 * Issue #737: styling uses tokens in design-tokens.css.
 * Issue #1644: handles and asserts distinct, actionable failure messages
 * for rejection, timeout, wrong network, and missing extension.
 */
export default function ConnectWallet({ initialError }: ConnectWalletProps = {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCtaFocused, setIsCtaFocused] = useState(false);
  const [modalError, setModalError] = useState<WalletFailureType | null>(null);
  const wallet = useWallet();
  const location = useLocation();
  const state = location.state as { returnTo?: string } | null;
  const returnTo = sanitizeReturnTo(state?.returnTo);

  useEffect(() => {
    if (!wallet.connected) return;
    setIsModalOpen(false);
  }, [wallet.connected]);

  const failureType: WalletFailureType | null = (() => {
    if (initialError) return initialError;
    if (modalError) return modalError;
    if (
      wallet.isNetworkMismatch ||
      (wallet.error && "type" in wallet.error && (wallet.error.type as any) === "network_mismatch")
    ) {
      return "wrong_network";
    }
    if (wallet.error && "type" in wallet.error) {
      if (wallet.error.type === "not_installed") return "missing_extension";
      if (wallet.error.type === "rejected") return "rejected";
      if (wallet.error.type === "network_error") return "timeout";
    }
    return null;
  })();

  if (wallet.connected && !wallet.isNetworkMismatch) {
    return <Navigate to={returnTo} replace />;
  }

  const activeError = failureType
    ? getWalletFailureDetails(failureType, wallet.expectedNetworkLabel)
    : null;

  return (
    <main id="main-content" style={styles.page} aria-labelledby="connect-wallet-heading">
      <GlowingDot top="34%" right="40%" size={18} opacity={0.6} />
      <GlowingDot top="42%" left="40%" size={12} opacity={0.5} />

      <section style={styles.card} aria-describedby="connect-wallet-description">
        <WalletIcon />

        <span style={styles.eyebrow}>Get started</span>

        <h1 id="connect-wallet-heading" style={styles.heading}>
          Connect your wallet
        </h1>

        <p id="connect-wallet-description" style={styles.description}>
          Connect a Stellar wallet to manage treasury streams, track balances,
          and withdraw safely. Fluxora never asks for your private keys.
        </p>

        {activeError && (
          <div
            role="alert"
            aria-live="polite"
            data-testid={activeError.testId}
            style={styles.errorBanner}
          >
            <div style={styles.errorTitle}>
              <span aria-hidden="true">⚠️</span>
              <span>{activeError.title}</span>
            </div>
            <p style={styles.errorText}>{activeError.actionText}</p>
          </div>
        )}

        <ul style={styles.steps} aria-label="Wallet onboarding checklist">
          <li style={styles.stepItem}>Choose a wallet provider</li>
          <li style={styles.stepItem}>Approve the connection request</li>
          <li style={styles.stepItem}>Return to Fluxora to continue</li>
        </ul>

        <button
          type="button"
          style={{
            ...styles.connectCta,
            boxShadow: isCtaFocused ? connectCtaFocusShadow : styles.connectCta.boxShadow,
          }}
          onClick={() => setIsModalOpen(true)}
          onFocus={() => setIsCtaFocused(true)}
          onBlur={() => setIsCtaFocused(false)}
          aria-haspopup="dialog"
          aria-expanded={isModalOpen}
          aria-controls="connect-wallet-modal"
        >
          Connect wallet
        </button>

        <p style={styles.helperText}>
          Having trouble connecting? Make sure your wallet extension is
          installed and unlocked.
        </p>
      </section>

      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onError={(err) => {
          if (err === "not_installed") setModalError("missing_extension");
          else if (err === "rejected") setModalError("rejected");
          else if (err === "network_mismatch") setModalError("wrong_network");
          else if (err === "network_timeout") setModalError("timeout");
        }}
      />
    </main>
  );
}

// Box-shadow emitted when the CTA is keyboard-focused. Lives alongside the
// `styles` map rather than as an entry on it, because React's `CSSProperties`
// index signature rejects arbitrary string keys (see issue #737).
const connectCtaFocusShadow = "var(--connect-cta-focus-shadow)";

const styles: Record<string, CSSProperties> = {
  page: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--connect-page-bg)",
    overflow: "hidden",
    fontFamily: '"Plus Jakarta Sans", Inter, system-ui, sans-serif',
    padding: "clamp(16px, 4vw, 28px)",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    width: "min(560px, 100%)",
    border: "var(--connect-card-border)",
    borderRadius: 16,
    padding: "clamp(20px, 6vw, 36px)",
    background: "var(--connect-card-bg)",
    boxShadow: "var(--connect-card-shadow)",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    border: "var(--connect-eyebrow-border)",
    color: "var(--connect-eyebrow-text)",
    background: "var(--connect-eyebrow-bg)",
    borderRadius: 9999,
    padding: "6px 10px",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.03em",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  heading: {
    color: "var(--text-vivid)",
    fontSize: "clamp(1.5rem, 4vw, 2rem)",
    fontWeight: 700,
    margin: "0 0 10px 0",
    letterSpacing: "-0.01em",
    lineHeight: 1.25,
  },
  description: {
    color: "var(--connect-description-text)",
    fontSize: "clamp(0.92rem, 2.2vw, 1rem)",
    lineHeight: 1.65,
    margin: "0 0 14px 0",
    maxWidth: 460,
  },
  errorBanner: {
    width: "min(420px, 100%)",
    marginBottom: 16,
    padding: "12px 16px",
    borderRadius: 10,
    background: "var(--status-error-bg)",
    border: "1px solid var(--status-error)",
    color: "var(--status-error)",
    textAlign: "left",
  },
  errorTitle: {
    fontWeight: 700,
    fontSize: "0.9rem",
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: "0.825rem",
    lineHeight: 1.45,
    margin: 0,
    opacity: 0.95,
  },
  steps: {
    margin: "0 0 20px 0",
    padding: 0,
    listStyle: "none",
    display: "grid",
    gap: 8,
    width: "min(420px, 100%)",
  },
  stepItem: {
    textAlign: "left",
    borderRadius: 10,
    border: "var(--connect-step-border)",
    background: "var(--connect-step-bg)",
    color: "var(--connect-step-text)",
    padding: "10px 12px",
    fontSize: "0.9rem",
    lineHeight: 1.45,
  },
  connectCta: {
    borderRadius: 10,
    border: "1.5px solid var(--color-accent-primary)",
    background: "var(--color-cta-primary-bg)",
    color: "var(--connect-cta-text)",
    fontWeight: 700,
    letterSpacing: "0.01em",
    fontSize: "0.95rem",
    lineHeight: 1.2,
    padding: "12px 20px",
    cursor: "pointer",
    width: "min(320px, 100%)",
    boxShadow: "var(--connect-cta-shadow)",
  },
  helperText: {
    margin: "14px 0 0 0",
    color: "var(--connect-helper-text)",
    fontSize: "0.8rem",
    lineHeight: 1.5,
    maxWidth: 420,
  },
};
