import React from "react";
import EmptyState from "./EmptyState";

interface TreasuryEmptyStateProps {
  onCreateStream: () => void;
  onOpenOnboarding?: () => void;
  walletConnected?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const TreasuryEmptyState: React.FC<TreasuryEmptyStateProps> = ({
  onCreateStream,
  onOpenOnboarding,
  walletConnected = true,
  loading = false,
  error = null,
  onRetry,
}) => (
  <EmptyState
    variant="treasury"
    walletConnected={walletConnected}
    loading={loading}
    error={error}
    onRetry={onRetry}
    onPrimaryAction={onCreateStream}
    secondaryActionLabel={onOpenOnboarding ? "View onboarding" : undefined}
    onSecondaryAction={onOpenOnboarding}
  />
);

export default TreasuryEmptyState;
