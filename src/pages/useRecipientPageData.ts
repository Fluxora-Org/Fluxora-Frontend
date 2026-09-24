import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { MAX_LOADING_RETRIES } from "../components/Skeleton";
import { useRecipientStreams } from "../components/treasuryOverviewPage/useTreasury";
import type { StreamRecord } from "../data/streamRecords";

const MIN_LOADING_MS = 300;

interface RecipientPageIdentity {
  address: string | null | undefined;
  connected: boolean;
}

export interface RecipientPageData {
  streams: StreamRecord[];
  hasLiveStreams: boolean;
  hasStreams: boolean;
  walletConnected: boolean;
  balance: number;
  activeStreams: number;
  totalAccrued: number;
  totalWithdrawn: number;
  pageLoading: boolean;
  effectiveEmptyStateLoading: boolean;
  isRetryingDisabled: boolean;
  pageRefetchState: "idle" | "retrying";
  error: string | null;
  retryCount: number;
  isRetryExhausted: boolean;
  retryButtonRef: RefObject<HTMLButtonElement>;
  refetch: () => Promise<void>;
}

const DEMO_BALANCE = 22600.0;
const DEMO_ACTIVE = 2;
const DEMO_TOTAL_ACCRUED = 43250.0;
const DEMO_TOTAL_WITHDRAWN = 20650.0;

export function useRecipientPageData({
  address,
  connected,
}: RecipientPageIdentity): RecipientPageData {
  const recipientStreams = useRecipientStreams(address);
  const [minLoadingElapsed, setMinLoadingElapsed] = useState(false);
  const [pageRefetchState, setPageRefetchState] = useState<"idle" | "retrying">("idle");
  const prevStreamsErrorRef = useRef<string | null>(null);
  const minLoadingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null!);

  useEffect(() => {
    minLoadingRef.current = setTimeout(() => setMinLoadingElapsed(true), MIN_LOADING_MS);
    return () => {
      if (minLoadingRef.current) clearTimeout(minLoadingRef.current);
    };
  }, []);

  useEffect(() => {
    const hadError = Boolean(prevStreamsErrorRef.current);
    const hasError = Boolean(recipientStreams.error);
    if (!hadError && hasError) retryButtonRef.current?.focus();
    prevStreamsErrorRef.current = recipientStreams.error ?? null;
  }, [recipientStreams.error]);

  useEffect(() => {
    setMinLoadingElapsed(false);
    if (minLoadingRef.current) clearTimeout(minLoadingRef.current);
    minLoadingRef.current = setTimeout(() => setMinLoadingElapsed(true), MIN_LOADING_MS);
    prevStreamsErrorRef.current = null;
  }, [address]);

  const refetch = useCallback(async () => {
    setPageRefetchState("retrying");
    try {
      recipientStreams.refetch();
      await new Promise((resolve) => setTimeout(resolve, 250));
    } finally {
      setPageRefetchState("idle");
    }
  }, [recipientStreams]);

  const streams = recipientStreams.streams;
  const hasLiveStreams = streams.length > 0 && !recipientStreams.error;
  const pageLoading = useMemo(
    () => connected && (recipientStreams.loading || !minLoadingElapsed),
    [connected, recipientStreams.loading, minLoadingElapsed],
  );
  const effectiveEmptyStateLoading = useMemo(
    () => connected && !recipientStreams.error && (recipientStreams.loading || pageRefetchState === "retrying"),
    [connected, recipientStreams.error, recipientStreams.loading, pageRefetchState],
  );
  const balance = hasLiveStreams
    ? streams.reduce((sum, stream) => sum + stream.withdrawableAmount, 0)
    : DEMO_BALANCE;
  const activeStreams = hasLiveStreams
    ? streams.filter((stream) => stream.status === "Active").length
    : DEMO_ACTIVE;
  const totalAccrued = hasLiveStreams
    ? streams.reduce((sum, stream) => sum + stream.streamedAmount, 0)
    : DEMO_TOTAL_ACCRUED;
  const totalWithdrawn = hasLiveStreams
    ? streams.reduce((sum, stream) => sum + Math.max(0, stream.streamedAmount - stream.withdrawableAmount), 0)
    : DEMO_TOTAL_WITHDRAWN;

  return {
    streams,
    hasLiveStreams,
    hasStreams: activeStreams > 0,
    walletConnected: connected,
    balance,
    activeStreams,
    totalAccrued,
    totalWithdrawn,
    pageLoading,
    effectiveEmptyStateLoading,
    isRetryingDisabled: pageRefetchState === "retrying" || recipientStreams.loading,
    pageRefetchState,
    error: recipientStreams.error,
    retryCount: recipientStreams.retryCount,
    isRetryExhausted: Boolean(recipientStreams.error && recipientStreams.retryCount >= MAX_LOADING_RETRIES),
    retryButtonRef: retryButtonRef as RefObject<HTMLButtonElement>,
    refetch,
  };
}
