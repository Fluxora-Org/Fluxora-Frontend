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
import { MetaTags } from "../components/MetaTags";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { useTreasury } from "../components/treasuryOverviewPage/useTreasury";
import {
  readOnboardingDismissed,
  writeOnboardingDismissed,
} from "../lib/onboarding";
import { formatAssetAmount } from "../lib/formatters";
import { useI18n } from "../i18n";
import { toRecentStream } from "../lib/recentStreamMapper";
import Button from "../components/Button";
import WidgetErrorBoundary from "../components/WidgetErrorBoundary";
import DashboardSummaryWidget from "../components/dashboard/DashboardSummaryWidget";
import DashboardStreamsWidget from "../components/dashboard/DashboardStreamsWidget";
import "../design-tokens.css";
export default function Dashboard() {
  const { t } = useI18n();
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
      announce(t("dashboard.announcement.streamsLoaded", { count: streams.length }));
    }
  }, [loading, streams.length, announce, t]);

  useEffect(() => {
    if (walletConnected && walletAddress) {
      announce(
        t("dashboard.announcement.walletConnected", { address: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` }),
      );
    }
  }, [walletConnected, walletAddress, announce, t]);

  useEffect(() => {
    if (withdrawable !== null) {
      announce(
        t("dashboard.announcement.balanceUpdated", { amount: formatAssetAmount(withdrawable, "USDC") }),
      );
    }
  }, [withdrawable, announce, t]);

  useEffect(() => {
    if (error) {
      const message =
        error === "Unable to load treasury data."
          ? t("dashboard.error.loadFallback")
          : t("dashboard.error.load", { error });
      announceAlert(message);
    }
  }, [error, announceAlert, t]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
  };

  const handleOpenOnboarding = () => {
    writeOnboardingDismissed(false);
    setShowOnboarding(true);
  };

  const handleStreamCreated = (_data?: StreamCreatedData) => {
    setIsModalOpen(false);
    setToast({
      message:
        t("dashboard.toast.streamCreated"),
      variant: "success",
    });
  };

  const handleWalletProviderUnavailable = (providerName: string) => {
    setIsWalletModalOpen(false);
    setToast({
      message: t("dashboard.toast.providerUnavailable", { providerName }),
      variant: "error",
    });
  };

  const hasStreams = streams.length > 0;
  const hasError = !!error;

  return (
    <main id="main-content">
      <MetaTags title={t("dashboard.title")} />
    <div className="dashboard-content">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {alertAnnouncement}
      </div>

      <h1 className="text-heading-1" style={{ marginTop: 0 }}>
        {t("dashboard.heading")}
      </h1>
      <p className="text-body-lg" style={{ color: "var(--muted)" }}>
        {t("dashboard.description")}
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
              {t("dashboard.wallet.connectPrompt")}
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsWalletModalOpen(true)}
            aria-label={t("dashboard.wallet.connectAria")}
          >
            {t("dashboard.wallet.connectAria")}
          </Button>
        </div>
      )}

      <WidgetErrorBoundary name={t("dashboard.summary.boundary")} onRetry={refetch}>
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
          <Button type="button" variant="secondary" onClick={refetch}>
            {t("dashboard.retry")}
          </Button>
        </div>
      )}

      {loading || hasError || hasStreams ? (
        <>
          <WidgetErrorBoundary name={t("dashboard.streams.boundary")} onRetry={refetch}>
            <DashboardStreamsWidget
              streams={streams}
              loading={loading}
              error={error}
              walletConnected={walletConnected}
              onRetry={refetch}
              onCreateStream={() => setIsModalOpen(true)}
            />
          </WidgetErrorBoundary>

          {!loading && !error && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              aria-label={t("dashboard.createStream")}
            >
              {t("dashboard.createStream")}
            </Button>
          )}
        </>

      ) : showOnboarding ? (
        <TreasuryOnboarding
          walletConnected={walletConnected}
          onCreateStream={() => setIsModalOpen(true)}
          onConnectWallet={() => setIsWalletModalOpen(true)}
          onDismiss={handleDismissOnboarding}
        />
      ) : (
        <TreasuryEmptyState
          onCreateStream={() => setIsModalOpen(true)}
          onOpenOnboarding={handleOpenOnboarding}
        />
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
    </div>
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
