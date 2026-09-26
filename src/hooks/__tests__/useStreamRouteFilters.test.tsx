import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useStreamRouteFilters } from "../useStreamRouteFilters";
import { DEFAULT_STREAM_ROUTE_FILTERS } from "../../lib/streamFilterParams";

function createWrapper(initialUrl: string = "/app/streams") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialUrl]}>
        {children}
      </MemoryRouter>
    );
  };
}

describe("useStreamRouteFilters", () => {
  it("initializes with default filters when query string is empty", () => {
    const { result } = renderHook(() => useStreamRouteFilters(), {
      wrapper: createWrapper("/app/streams"),
    });

    expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
  });

  it("parses valid search params from initial URL", () => {
    const { result } = renderHook(() => useStreamRouteFilters(), {
      wrapper: createWrapper("/app/streams?status=Active&q=treasury&sort=rate&page=2&pageSize=20"),
    });

    expect(result.current.filters).toEqual({
      status: "Active",
      search: "treasury",
      sort: "rate",
      page: 2,
      pageSize: 20,
      recipient: undefined,
      treasury: undefined,
    });
  });

  it("falls back to defaults for invalid params in initial URL", () => {
    const { result } = renderHook(() => useStreamRouteFilters(), {
      wrapper: createWrapper("/app/streams?status=invalid&sort=unknown&page=-5&pageSize=9999"),
    });

    expect(result.current.filters).toEqual({
      status: "All",
      search: "",
      sort: "recent",
      page: 1,
      pageSize: 100, // clamped
      recipient: undefined,
      treasury: undefined,
    });
  });

  it("updates filters and synchronizes canonical search params", () => {
    const { result } = renderHook(() => useStreamRouteFilters(), {
      wrapper: createWrapper("/app/streams"),
    });

    act(() => {
      result.current.setFilters({ status: "Paused", search: "grants" });
    });

    expect(result.current.filters.status).toBe("Paused");
    expect(result.current.filters.search).toBe("grants");
  });

  it("resets filters back to defaults on resetFilters()", () => {
    const { result } = renderHook(() => useStreamRouteFilters(), {
      wrapper: createWrapper("/app/streams?status=Paused&q=test&sort=rate&page=3"),
    });

    expect(result.current.filters.status).toBe("Paused");

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
  });

  describe("URL round-trip filter persistence", () => {
    it("filters round-trip through the URL", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams"),
      });

      act(() => {
        result.current.setFilters({
          status: "Active",
          search: "treasury",
          sort: "rate",
          page: 2,
          pageSize: 20,
        });
      });

      expect(result.current.filters).toEqual({
        status: "Active",
        search: "treasury",
        sort: "rate",
        page: 2,
        pageSize: 20,
        recipient: undefined,
        treasury: undefined,
      });
    });

    it("filters round-trip through URL with recipient and treasury", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams"),
      });

      const recipient = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
      const treasury = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37";

      act(() => {
        result.current.setFilters({
          status: "Paused",
          search: "grants",
          sort: "name",
          page: 3,
          pageSize: 50,
          recipient,
          treasury,
        });
      });

      expect(result.current.filters).toEqual({
        status: "Paused",
        search: "grants",
        sort: "name",
        page: 3,
        pageSize: 50,
        recipient,
        treasury,
      });
    });
  });

  describe("Back and forward navigation filter restoration", () => {
    it("different URL states produce consistent filter states", () => {
      const { result: result1 } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?status=Active&q=test&sort=rate&page=2"),
      });

      const firstState = { ...result1.current.filters };
      expect(firstState.status).toBe("Active");
      expect(firstState.search).toBe("test");
      expect(firstState.sort).toBe("rate");
      expect(firstState.page).toBe(2);

      const { result: result2 } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?status=Paused&q=grants&sort=name&page=3"),
      });

      const secondState = { ...result2.current.filters };
      expect(secondState.status).toBe("Paused");
      expect(secondState.search).toBe("grants");
      expect(secondState.sort).toBe("name");
      expect(secondState.page).toBe(3);

      const { result: result3 } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?status=Active&q=test&sort=rate&page=2"),
      });

      expect(result3.current.filters).toEqual(firstState);
    });

    it("URL state changes are deterministic and reversible", () => {
      const url1 = "/app/streams?status=Active&sort=rate&page=2";
      const url2 = "/app/streams?status=Paused&sort=name&page=3";

      const { result: result1 } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper(url1),
      });

      const state1 = { ...result1.current.filters };

      const { result: result2 } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper(url2),
      });

      const state2 = { ...result2.current.filters };

      const { result: result3 } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper(url1),
      });

      expect(result3.current.filters).toEqual(state1);

      const { result: result4 } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper(url2),
      });

      expect(result4.current.filters).toEqual(state2);
    });
  });

  describe("Unknown filter value handling", () => {
    it("unknown status filter is ignored and falls back to default", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?status=InvalidStatus"),
      });

      expect(result.current.filters.status).toBe("All");
      expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
    });

    it("unknown sort mode is ignored and falls back to default", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?sort=unknown_sort"),
      });

      expect(result.current.filters.sort).toBe("recent");
      expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
    });

    it("invalid page number is ignored and falls back to default", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?page=-5"),
      });

      expect(result.current.filters.page).toBe(1);
      expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
    });

    it("invalid page size is clamped to valid range", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?pageSize=9999"),
      });

      expect(result.current.filters.pageSize).toBe(100);
    });

    it("unknown query parameters are ignored without breaking the view", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?unknownParam=value&anotherParam=test"),
      });

      expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
    });

    it("combination of valid and invalid filters uses valid ones and defaults for invalid", () => {
      const { result } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?status=Active&sort=invalid&page=3&pageSize=abc"),
      });

      expect(result.current.filters.status).toBe("Active");
      expect(result.current.filters.sort).toBe("recent");
      expect(result.current.filters.page).toBe(3);
      expect(result.current.filters.pageSize).toBe(10);
    });
  });

  describe("Reload filter restoration", () => {
    it("reload restores the same result set from URL", () => {
      const { result, rerender } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams?status=Active&q=treasury&sort=rate&page=2&pageSize=20"),
      });

      const initialState = { ...result.current.filters };

      rerender();

      expect(result.current.filters).toEqual(initialState);
    });

    it("reload with complex filters preserves all filter values", () => {
      const recipient = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
      const treasury = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37";

      const { result, rerender } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper(
          `/app/streams?status=Paused&q=grants&sort=name&page=5&pageSize=50&recipient=${recipient}&treasury=${treasury}`,
        ),
      });

      const initialState = { ...result.current.filters };

      rerender();

      expect(result.current.filters).toEqual(initialState);
      expect(result.current.filters.recipient).toBe(recipient);
      expect(result.current.filters.treasury).toBe(treasury);
    });

    it("reload with empty URL restores default filters", () => {
      const { result, rerender } = renderHook(() => useStreamRouteFilters(), {
        wrapper: createWrapper("/app/streams"),
      });

      expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);

      rerender();

      expect(result.current.filters).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
    });
  });
});
