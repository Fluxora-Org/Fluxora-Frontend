import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DEFAULT_STREAM_ROUTE_FILTERS,
  parseStreamRouteFilters,
  serializeStreamRouteFilters,
  type StreamRouteFilters,
  type SerializeOptions,
} from "../lib/streamFilterParams";

export interface UseStreamRouteFiltersResult {
  /**
   * Strongly-typed, validated stream route filters with fallback defaults.
   */
  filters: StreamRouteFilters;
  /**
   * Updates one or more filter parameters and updates the URL search params canonically.
   */
  setFilters: (
    updater:
      | Partial<StreamRouteFilters>
      | ((prev: StreamRouteFilters) => Partial<StreamRouteFilters>),
    options?: { replace?: boolean; serializeOptions?: SerializeOptions },
  ) => void;
  /**
   * Resets all filters back to documented defaults and clears query parameters.
   */
  resetFilters: (options?: { replace?: boolean }) => void;
}

/**
 * React hook that binds stream route filters to URL search parameters.
 * Provides typed filter values, stable canonical serialization, and safe navigation updates.
 */
export function useStreamRouteFilters(): UseStreamRouteFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    return parseStreamRouteFilters(searchParams);
  }, [searchParams]);

  const latestFilters = useRef(filters);
  latestFilters.current = filters;

  const setFilters = useCallback(
    (
      updater:
        | Partial<StreamRouteFilters>
        | ((prev: StreamRouteFilters) => Partial<StreamRouteFilters>),
      options?: { replace?: boolean; serializeOptions?: SerializeOptions },
    ) => {
      const nextPartial =
        typeof updater === "function"
          ? updater(latestFilters.current)
          : updater;
      const merged: StreamRouteFilters = {
        ...latestFilters.current,
        ...nextPartial,
      };
      const serialized = serializeStreamRouteFilters(
        merged,
        options?.serializeOptions ?? { omitDefaults: true },
      );
      latestFilters.current = parseStreamRouteFilters(serialized);
      setSearchParams(new URLSearchParams(serialized), {
        replace: options?.replace ?? false,
      });
    },
    [setSearchParams],
  );

  const resetFilters = useCallback(
    (options?: { replace?: boolean }) => {
      latestFilters.current = { ...DEFAULT_STREAM_ROUTE_FILTERS };
      setSearchParams(new URLSearchParams(), {
        replace: options?.replace ?? false,
      });
    },
    [setSearchParams],
  );

  return { filters, setFilters, resetFilters };
}
