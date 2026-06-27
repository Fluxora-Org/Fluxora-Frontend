import EmptyState from "./EmptyState";

interface RecipientEmptyStateProps {
  walletConnected?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPrimaryAction?: () => void;
}

export default function RecipientEmptyState({
  walletConnected = false,
  loading = false,
  error = null,
  onRetry,
  onPrimaryAction,
}: RecipientEmptyStateProps) {
  return (
    <EmptyState
      variant="recipient"
      walletConnected={walletConnected}
      loading={loading}
      error={error}
      onRetry={onRetry}
      onPrimaryAction={onPrimaryAction}
    />
  );
}
