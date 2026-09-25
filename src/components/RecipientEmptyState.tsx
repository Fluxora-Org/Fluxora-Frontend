import { type Ref } from "react";
import EmptyState from "./EmptyState";

interface RecipientEmptyStateProps {
  walletConnected?: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPrimaryAction?: () => void;
  ctaDisabled?: boolean;
  retryButtonRef?: Ref<HTMLButtonElement>;
}

export default function RecipientEmptyState({
  walletConnected = false,
  loading = false,
  error = null,
  onRetry,
  onPrimaryAction,
  ctaDisabled = false,
  retryButtonRef,
}: RecipientEmptyStateProps) {
  return (
    <EmptyState
      variant="recipient"
      walletConnected={walletConnected}
      loading={loading}
      error={error}
      onRetry={onRetry}
      onPrimaryAction={onPrimaryAction}
      ctaDisabled={ctaDisabled}
      retryButtonRef={retryButtonRef}
    />
  );
}
