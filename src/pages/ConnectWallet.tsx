import { CSSProperties, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import GlowingDot from "../components/GlowingDot";
import WalletIcon from "../components/WalletIcon";
import ConnectWalletModal from "../components/ConnectWalletModal";
import { useWallet } from "../components/wallet-connect/Walletcontext";

interface ConnectWalletLocationState {
  returnTo?: string;
}

export default function ConnectWallet() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCtaFocused, setIsCtaFocused] = useState(false);
  const wallet = useWallet();
  const location = useLocation();
  const state = location.state as ConnectWalletLocationState | null;
  const returnTo =
    state?.returnTo?.startsWith("/app") ? state.returnTo : "/app";

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
            boxShadow: isCtaFocused
              ? "0 0 0 2px var(--surface-base), 0 0 0 4px var(--interactive-focus-ring), 0 10px 25px rgba(0, 184, 212, 0.26)"
              : styles.connectCta.boxShadow,
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

const styles: Record<string, CSSProperties> = {
  page: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "radial-gradient(circle at 20% 10%, #12375b 0%, #071426 35%, #06111f 100%)",
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
    border: "1px solid rgba(34, 211, 238, 0.22)",
    borderRadius: 16,
    padding: "clamp(20px, 6vw, 36px)",
    background:
      "linear-gradient(180deg, rgba(20,30,48,0.88) 0%, rgba(10,16,28,0.94) 100%)",
    boxShadow: "0 20px 55px rgba(0, 0, 0, 0.4)",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid rgba(34, 211, 238, 0.32)",
    color: "var(--status-info)",
    background: "rgba(34, 211, 238, 0.12)",
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
    color: "rgba(231, 242, 255, 0.78)",
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
    border: "1px solid rgba(148, 195, 255, 0.2)",
    background: "rgba(16, 27, 44, 0.82)",
    color: "rgba(231, 242, 255, 0.9)",
    padding: "10px 12px",
    fontSize: "0.9rem",
    lineHeight: 1.45,
  },
  connectCta: {
    borderRadius: 10,
    border: "1.5px solid var(--color-accent-primary)",
    background: "var(--color-cta-primary-bg)",
    color: "#ffffff",
    fontWeight: 700,
    letterSpacing: "0.01em",
    fontSize: "0.95rem",
    lineHeight: 1.2,
    padding: "12px 20px",
    cursor: "pointer",
    width: "min(320px, 100%)",
    boxShadow: "0 10px 25px rgba(0, 184, 212, 0.26)",
  },
  helperText: {
    margin: "14px 0 0 0",
    color: "rgba(199, 220, 244, 0.68)",
    fontSize: "0.8rem",
    lineHeight: 1.5,
    maxWidth: 420,
  },
};
