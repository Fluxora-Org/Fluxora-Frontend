import { CSSProperties, useEffect, useState } from "react";

import { Navigate, useLocation } from "react-router-dom";
import GlowingDot from "../components/GlowingDot";
import WalletIcon from "../components/WalletIcon";
import ConnectWalletModal from "../components/ConnectWalletModal";
import { sanitizeReturnTo } from "../components/RequireWallet";
import { useWallet } from "../components/wallet-connect/Walletcontext";

/**
 * Connnect Wallet onboarding page.
 *
 * Issue #737: this page previously hardcoded `rgba(...)` and `#xxxxxx` color
 * literals inside an inline `styles` object. That meant the visual look was
 * frozen regardless of the user's `data-theme` choice (light vs dark), and
 * the marketing colours drifted out of the design system.
 *
 * The styling now flows entirely through `--connect-*` tokens defined in
 * `src/design-tokens.css`, which provide light and dark variants so the page
 * adapts to the active theme automatically while keeping the cinematic
 * onboarding look.
 */
export default function ConnectWallet() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCtaFocused, setIsCtaFocused] = useState(false);
  const wallet = useWallet();
  const location = useLocation();
  const state = location.state as { returnTo?: string } | null;
  const returnTo = sanitizeReturnTo(state?.returnTo);

  useEffect(() => {
    if (!wallet.connected) return;
    setIsModalOpen(false);
  }, [wallet.connected]);

  if (wallet.connected) {
    return <Navigate to={returnTo} replace />;
  }

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
