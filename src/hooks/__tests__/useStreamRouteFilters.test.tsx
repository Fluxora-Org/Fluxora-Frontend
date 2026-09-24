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
});
