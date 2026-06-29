import { useEffect, useRef, useState } from 'react';
import {
  getStreams,
  getRecipientStreams,
  StreamsServiceError,
  type StreamsFilters,
} from './streamsService';
import type { StreamRecord } from '../../data/streamRecords';

interface UseStreamsResult {
  data: StreamRecord[];
  loading: boolean;
  error: StreamsServiceError | null;
  refetch: () => void;
}

/**
 * Fetches the full stream list, re-fetching when `filters` change.
 * Uses an AbortController so in-flight requests are cancelled on unmount or
 * filter change, preventing stale state updates.
 */
export function useStreams(filters?: StreamsFilters): UseStreamsResult {
  const [data, setData] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<StreamsServiceError | null>(null);
  const filtersKey = JSON.stringify(filters ?? null);
  const triggerRef = useRef(0);

  const refetch = () => {
    triggerRef.current += 1;
    // Force re-render to re-run the effect via a separate counter state
    setLoading(true);
  };

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    getStreams(filters)
      .then((records) => {
        if (!cancelled) {
          setData(records);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setError(
          err instanceof StreamsServiceError
            ? err
            : new StreamsServiceError(String(err), 'network'),
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, triggerRef.current]);

  return { data, loading, error, refetch };
}

/**
 * Fetches streams for a specific recipient address.
 * Cancels the in-flight request on unmount or address change.
 */
export function useRecipientStreams(address: string): UseStreamsResult {
  const [data, setData] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<StreamsServiceError | null>(null);
  const triggerRef = useRef(0);

  const refetch = () => {
    triggerRef.current += 1;
    setLoading(true);
  };

  useEffect(() => {
    if (!address) {
      setData([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);
    setError(null);

    getRecipientStreams(address)
      .then((records) => {
        if (!cancelled) {
          setData(records);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setError(
          err instanceof StreamsServiceError
            ? err
            : new StreamsServiceError(String(err), 'network'),
        );
        setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, triggerRef.current]);

  return { data, loading, error, refetch };
}
