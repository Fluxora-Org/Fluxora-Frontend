import React, { useEffect, useMemo, useState } from "react";
import type { Stream } from "../components/RecentStreams";
import CreateStreamModal from "../components/CreateStreamModal";
import type { StreamCreatedData } from "../components/CreateStreamModal";
import TreasuryEmptyState from "../components/TreasuryEmptyState";
import TreasuryOnboarding from "../components/TreasuryOnboarding";
import ConnectWalletModal from "../components/ConnectWalletModal";
import ToastNotification, {
  type ToastVariant,
} from "../components/ToastNotification";
import CreateStreamFab from "../components/CreateStreamFab";
import { useLiveAnnouncer } from "../hooks/useLiveAnnouncer";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { useTreasury } from "../components/treasuryOverviewPage/useTreasury";
import {
  readOnboardingDismissed,
  writeOnboardingDismissed,
} from "../lib/onboarding";
import { formatAssetAmount } from "../lib/formatters";
import { toRecentStream } from "../lib/recentStreamMapper";
import Button from "../components/Button";
import WidgetErrorBoundary from "../components/WidgetErrorBoundary";
import DashboardSummaryWidget from "../components/dashboard/DashboardSummaryWidget";
import DashboardStreamsWidget from "../components/dashboard/DashboardStreamsWidget";
import "../design-tokens.css";

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant: ToastVariant;
  } | null>(null);
  const [withdrawable, setWithdrawable] = useState<number | null>(null);
  const { announcement, alertAnnouncement, announce, announceAlert } =
    useLiveAnnouncer();
  const wallet = useWallet();
  const walletConnected = wallet.connected;
  const walletAddress = wallet.address;
  const treasury = useTreasury(undefined, wallet.accountContextVersion);
  const { loading, error, refetch } = treasury;
  const streams = useMemo<Stream[]>(
    () => treasury.streams.map(toRecentStream),
    [treasury.streams],
  );
  const totalStreaming = useMemo(
    () =>
      treasury.streams
        .filter((record) => record.status === "Active")
        .reduce((sum, record) => sum + record.depositAmount, 0),
    [treasury.streams],
  );

  useEffect(() => {
    setWithdrawable(walletConnected ? 22600 : null);
  }, [walletConnected]);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!loading && streams.length === 0 && !readOnboardingDismissed()) {
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
        `Available balance updated to ${formatAssetAmount(withdrawable, "USDC")}.`,
      );
    }
  }, [withdrawable, announce]);

  useEffect(() => {
    if (error) {
      const message =
        error === "Unable to load treasury data."
          ? "Failed to load dashboard data."
          : `Failed to load dashboard data: ${error}`;
      announceAlert(message);
    }
  }, [error, announceAlert]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
  };

  const handleOpenOnboarding = () => {
    writeOnboardingDismissed(false);
    setShowOnboarding(true);
  };

  const handleOnboardingCreateStream = () => {
    setShowOnboarding(false);
    setIsModalOpen(true);
  };

  const handleStreamCreated = (_data?: StreamCreatedData) => {
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

  const hasStreams = streams.length > 0;
  const hasError = !!error;

  return (
    <main id="main-content">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {alertAnnouncement}
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsWalletModalOpen(true)}
            aria-label="Connect Stellar wallet"
          >
            Connect wallet
          </Button>
        </div>
      )}

      <WidgetErrorBoundary name="Treasury summary" onRetry={refetch}>
        <DashboardSummaryWidget
          streamCount={streams.length}
          totalStreaming={totalStreaming}
          withdrawable={withdrawable}
          loading={loading}
        />
      </WidgetErrorBoundary>

      {hasError && (
        <div role="alert" style={walletBannerStyle}>
          <span style={{ color: "var(--text)" }}>{error}</span>
          <Button
            type="button"
            variant="secondary"
            onClick={refetch}
          >
            Retry
          </Button>
        </div>
      )}

      {loading || hasError || hasStreams ? (
        <>
          <WidgetErrorBoundary name="Recent streams" onRetry={refetch}>
            <DashboardStreamsWidget
              streams={streams}
              loading={loading}
              error={error}
              walletConnected={walletConnected}
              onRetry={refetch}
              onCreateStream={() => setIsModalOpen(true)}
            />
          </WidgetErrorBoundary>
          <ErrorBoundary>
            <RecentStreams
              streams={streams}
              loading={loading}
              error={error}
              onRetry={refetch}
              walletConnected={walletConnected}
            />
          </ErrorBoundary>
          {!loading && !error && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              aria-label="Create stream"
            >
              Create stream
            </Button>
          )}
        </>
        <WidgetErrorBoundary name="Recent streams" onRetry={refetch}>
          <DashboardStreamsWidget
            streams={streams}
            loading={loading}
            error={error}
            walletConnected={walletConnected}
            onRetry={refetch}
            onCreateStream={() => setIsModalOpen(true)}
          />
        </WidgetErrorBoundary>

      ) : showOnboarding ? (
        <ErrorBoundary>
          <TreasuryOnboarding
            walletConnected={walletConnected}
            onRetry={refetch}
            onCreateStream={() => setIsModalOpen(true)}
          />
        </WidgetErrorBoundary>
      ) : showOnboarding ? (
        <TreasuryOnboarding
          walletConnected={walletConnected}
          walletAddress={walletAddress}
          onConnectWallet={() => setIsWalletModalOpen(true)}
          onCreateStream={handleOnboardingCreateStream}
          onDismiss={handleDismissOnboarding}
        />
      ) : (
        <ErrorBoundary>
          <TreasuryEmptyState
            onCreateStream={() => setIsModalOpen(true)}
            onOpenOnboarding={handleOpenOnboarding}
          />
        </ErrorBoundary>
        <TreasuryEmptyState onCreateStream={() => setIsModalOpen(true)} />
      )}

      <CreateStreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStreamCreated={handleStreamCreated}
        onStreamError={refetch}
      />

      <CreateStreamFab
        onCreateStream={() => setIsModalOpen(true)}
        disabled={!walletConnected}
        hidden={isModalOpen}
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
    </main>
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

