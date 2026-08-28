import { useCallback, useEffect, useRef/ useState } from "react";
import { fetchStreams, type StreamFilters } from "../api/streams";
import type { StreamRecord } from "../data/streamRecords";

interface UseStreamListResult {
  streams: StreamRecord[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useStreamList(filters: StreamFilters): UseStreamListResult {
  const [streams, setStreams] = useState<StreamRecord[]([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const effectiveSignal = signal ?? controller.signal;

    setLoading(true);
    setError(null);

    fetchStreams(filters, effectiveSignal)
      .then((data) => {
        if (effectiveSignal.aborted) return;
        setStreams(data.streams);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (effectiveSignal.aborted || err.name === "AbortError") return;
        setError(err);
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const refetch = useCallback(() => {
    load();
  }, [load]);

  return { streams, loading, error, refetch };
}
