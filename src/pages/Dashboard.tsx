import React, { useEffect, useState } from "react";
import RecentStreams, { Stream } from "../components/RecentStreams";
import CreateStreamModal from "../components/CreateStreamModal";
import TreasuryOverviewLoading from "../components/TreasuryOverviewLoading";
import TreasuryEmptyState from "../components/TreasuryEmptyState";
import TreasuryOnboarding from "../components/TreasuryOnboarding";
import ConnectWalletModal from "../components/ConnectWalletModal";
import ToastNotification, {
  type ToastVariant,
} from "../components/ToastNotification";
import { useLiveAnnouncer } from "../hooks/useLiveAnnouncer";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import "../design-tokens.css";

const ONBOARDING_KEY = "fluxora_onboarding_dismissed";

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return false;
  }
}

function markOnboardingSeen(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // Storage unavailable; treat as transient.
  }
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [streams] = useState<Stream[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: ToastVariant;
  } | null>(null);
  const [withdrawable, setWithdrawable] = useState<number | null>(null);
  const { announcement, announce } = useLiveAnnouncer();
  const wallet = useWallet();
  const walletConnected = wallet.connected;
  const walletAddress = wallet.address;

  useEffect(() => {
    setWithdrawable(walletConnected ? 22600 : null);
  }, [walletConnected]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!loading && streams.length === 0 && !hasSeenOnboarding()) {
      setShowOnboarding(true);
    }

    if (!loading && streams.length > 0) {
      announce(`${streams.length} active streams loaded.`);
    }
  }, [loading, streams.length, announce]);

  useEffect(() => {
    if (walletConnected && walletAddress) {
      announce(
        `Wallet connected: ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
      );
    }
  }, [walletConnected, walletAddress, announce]);

  useEffect(() => {
    if (withdrawable !== null) {
      announce(
        `Available balance updated to ${withdrawable.toLocaleString()} USDC.`,
      );
    }
  }, [withdrawable, announce]);

  const handleDismissOnboarding = () => {
    markOnboardingSeen();
    setShowOnboarding(false);
  };

  const handleOnboardingCreateStream = () => {
    markOnboardingSeen();
    setShowOnboarding(false);
    setIsModalOpen(true);
  };

  const handleStreamCreated = () => {
    setIsModalOpen(false);
    setToast({
      message:
        "Stream created successfully. Review the new stream from the treasury overview.",
      variant: "success",
    });
  };

  const handleWalletProviderUnavailable = (providerName: string) => {
    setIsWalletModalOpen(false);
    setToast({
      message: `${providerName} connection is not available in this demo yet. Try again once wallet integration is enabled.`,
      variant: "error",
    });
  };

  if (loading) return <TreasuryOverviewLoading />;

  const hasStreams = streams.length > 0;

  return (
    <div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <h1 className="text-heading-1" style={{ marginTop: 0 }}>
        Treasury overview
      </h1>
      <p className="text-body-lg" style={{ color: "var(--muted)" }}>
        Treasury overview and active stream summary. Connect your wallet to see
        real-time capital flow.
      </p>

      {!walletConnected && !showOnboarding && (
        <div style={walletBannerStyle} role="alert" aria-live="polite">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
              style={{ color: "var(--status-warning)", flexShrink: 0 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-body-md" style={{ color: "var(--text)" }}>
              Connect your Stellar wallet to see real balances and create
              streams.
            </span>
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => setIsWalletModalOpen(true)}
            aria-label="Connect Stellar wallet"
          >
            Connect wallet
          </button>
        </div>
      )}

      <div style={cardGrid}>
        <div style={card}>
          <div
            className="text-label-md"
            style={{ color: "var(--muted)", marginBottom: "0.25rem" }}
          >
            Active Streams
          </div>
          <div className="text-heading-2">{streams.length || "--"}</div>
        </div>
        <div style={card}>
          <div
            className="text-label-md"
            style={{ color: "var(--muted)", marginBottom: "0.25rem" }}
          >
            Total Streaming
          </div>
          <div className="text-heading-2">-- USDC</div>
        </div>
        <div style={card}>
          <div
            className="text-label-md"
            style={{ color: "var(--muted)", marginBottom: "0.25rem" }}
          >
            Withdrawable
          </div>
          <div className="text-heading-2">
            {withdrawable !== null
              ? `${withdrawable.toLocaleString()} USDC`
              : "-- USDC"}
          </div>
        </div>
      </div>

      {hasStreams ? (
        <>
          <RecentStreams streams={streams} />
          <button
            type="button"
            className="button button--primary"
            onClick={() => setIsModalOpen(true)}
            aria-label="Create stream"
          >
            Create stream
          </button>
        </>
      ) : showOnboarding ? (
        <TreasuryOnboarding
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          onConnectWallet={() => setIsWalletModalOpen(true)}
          onCreateStream={handleOnboardingCreateStream}
          onDismiss={handleDismissOnboarding}
        />
      ) : (
        <TreasuryEmptyState onCreateStream={() => setIsModalOpen(true)} />
      )}

      <CreateStreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStreamCreated={handleStreamCreated}
      />

      <ConnectWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnectFreighter={() => handleWalletProviderUnavailable("Freighter")}
        onConnectAlbedo={() => handleWalletProviderUnavailable("Albedo")}
        onConnectWalletConnect={() =>
          handleWalletProviderUnavailable("WalletConnect")
        }
      />

      {toast ? (
        <ToastNotification
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  );
}

const walletBannerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "0.75rem",
  background: "rgba(245, 158, 11, 0.06)",
  border: "1px solid rgba(245, 158, 11, 0.25)",
  borderRadius: "10px",
  padding: "0.75rem 1rem",
  marginTop: "0.75rem",
  marginBottom: "0.25rem",
};

const cardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: "1rem",
  marginTop: "1.5rem",
};

const card: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "1.25rem",
};
