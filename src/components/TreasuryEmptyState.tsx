import React from "react";
import EmptyState from "./EmptyState";

interface TreasuryEmptyStateProps {
  onCreateStream: () => void;
  walletConnected?: boolean;
  walletAddress?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const TreasuryEmptyState: React.FC<TreasuryEmptyStateProps> = ({
  onCreateStream,
  walletConnected = true,
  walletAddress,
  loading = false,
  error = null,
  onRetry,
}) => (
  <EmptyState
    variant="treasury"
    walletConnected={walletConnected}
    walletAddress={walletAddress}
    loading={loading}
    error={error}
    onRetry={onRetry}
    onPrimaryAction={onCreateStream}
  />
);

export default TreasuryEmptyState;
