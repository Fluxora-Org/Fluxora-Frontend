import { useCallback, useEffect, useRef, useState } from "react";
import {
  getStreamById,
  getStreams,
  StreamsServiceError,
  type StreamsFilters,
} from "./streamsService";
import type { StreamRecord } from "../../data/streamRecords";

// ---------------------------------------------------------------------------
// useStreams
// ---------------------------------------------------------------------------

interface UseStreamsResult {
  streams: StreamRecord[];
  loading: boolean;
  error: StreamsServiceError | null;
  refetch: () => void;
}

/**
 * React hook that fetches the list of streams, optionally filtered.
 * Cancels in-flight requests on unmount.
 *
 * @param filters - Optional filters forwarded to {@link getStreams}.
 * @returns `{ streams, loading, error, refetch }`
 */
export function useStreams(filters?: StreamsFilters): UseStreamsResult {
  const [streams, setStreams] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<StreamsServiceError | null>(null);
  const [tick, setTick] = useState(0);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getStreams(filtersRef.current)
      .then((data) => {
        if (!controller.signal.aborted) {
          setStreams(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof StreamsServiceError
              ? err
              : new StreamsServiceError(String(err), "network"),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { streams, loading, error, refetch };
}

// ---------------------------------------------------------------------------
// useStreamById
// ---------------------------------------------------------------------------

interface UseStreamByIdResult {
  stream: StreamRecord | null;
  loading: boolean;
  error: StreamsServiceError | null;
  refetch: () => void;
}

/**
 * React hook that fetches a single stream by its identifier.
 *
 * - When `id` is `null` or an empty string the hook returns immediately with
 *   `{ stream: null, loading: false, error: null }` and does **not** issue a
 *   network request.
 * - Changing `id` while a request is in-flight cancels the previous request
 *   via `AbortController` before starting a new one.
 * - A 404 response from the service resolves to `{ stream: null, error: null }`
 *   rather than an error state.
 *
 * @param id - The stream identifier to resolve, or `null` / `""` to skip.
 * @returns `{ stream, loading, error, refetch }`
 */
export function useStreamById(id: string | null): UseStreamByIdResult {
  const [stream, setStream] = useState<StreamRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<StreamsServiceError | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Skip fetch when id is falsy — no network request, no loading state.
    if (!id) {
      setStream(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getStreamById(id)
      .then((data) => {
        if (!controller.signal.aborted) {
          setStream(data);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof StreamsServiceError
              ? err
              : new StreamsServiceError(String(err), "network"),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { stream, loading, error, refetch };
}
