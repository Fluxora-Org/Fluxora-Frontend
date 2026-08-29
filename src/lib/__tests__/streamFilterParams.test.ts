import { describe, expect, it } from "vitest";
import {
  ALLOWED_PAGE_SIZES,
  DEFAULT_STREAM_ROUTE_FILTERS,
  parsePageNumber,
  parsePageSize,
  parseSearchFilter,
  parseSortMode,
  parseStatusFilter,
  parseStellarAddressFilter,
  parseStreamRouteFilters,
  safeDecode,
  serializeStreamRouteFilters,
  toStreamsServiceFilters,
  type StreamRouteFilters,
  type StreamStatusFilter,
} from "../streamFilterParams";

describe("streamFilterParams", () => {
  describe("safeDecode", () => {
    it.each([
      { input: "normal", expected: "normal" },
      { input: "hello%20world", expected: "hello world" },
      { input: "Stellar%20USDC%2BMore", expected: "Stellar USDC+More" },
      { input: "special%2Fpath%3Fkey%3Dvalue", expected: "special/path?key=value" },
      { input: "malformed%E0%A4%A", expected: expect.any(String) },
      { input: "broken%FF%FE", expected: expect.any(String) },
      { input: "trailing%", expected: expect.any(String) },
    ])("safeDecode($input) does not throw and produces a string", ({ input, expected }) => {
      const result = safeDecode(input);
      if (typeof expected === "string") {
        expect(result).toBe(expected);
      } else {
        expect(typeof result).toBe("string");
      }
    });
  });

  describe("parseStatusFilter", () => {
    it.each([
      { input: "All", expected: "All" },
      { input: "all", expected: "All" },
      { input: "ALL", expected: "All" },
      { input: "Active", expected: "Active" },
      { input: "active", expected: "Active" },
      { input: "ACTIVE", expected: "Active" },
      { input: "Paused", expected: "Paused" },
      { input: "paused", expected: "Paused" },
      { input: "Completed", expected: "Completed" },
      { input: "completed", expected: "Completed" },
      { input: "invalid_status", expected: "All" },
      { input: "123", expected: "All" },
      { input: "", expected: "All" },
      { input: null, expected: "All" },
      { input: undefined, expected: "All" },
    ])("parseStatusFilter($input) -> $expected", ({ input, expected }) => {
      expect(parseStatusFilter(input)).toBe(expected);
    });
  });

  describe("parseSortMode", () => {
    it.each([
      { input: "recent", expected: "recent" },
      { input: "RECENT", expected: "recent" },
      { input: "name", expected: "name" },
      { input: "NAME", expected: "name" },
      { input: "rate", expected: "rate" },
      { input: "RATE", expected: "rate" },
      { input: "unsupported", expected: "recent" },
      { input: "amount", expected: "recent" },
      { input: "", expected: "recent" },
      { input: null, expected: "recent" },
      { input: undefined, expected: "recent" },
    ])("parseSortMode($input) -> $expected", ({ input, expected }) => {
      expect(parseSortMode(input)).toBe(expected);
    });
  });

  describe("parsePageNumber", () => {
    it.each([
      { input: "1", expected: 1 },
      { input: "5", expected: 5 },
      { input: "100", expected: 100 },
      { input: "0", expected: 1 },
      { input: "-1", expected: 1 },
      { input: "-99", expected: 1 },
      { input: "abc", expected: 1 },
      { input: "NaN", expected: 1 },
      { input: "1.5", expected: 1 },
      { input: "", expected: 1 },
      { input: null, expected: 1 },
      { input: undefined, expected: 1 },
    ])("parsePageNumber($input) -> $expected", ({ input, expected }) => {
      expect(parsePageNumber(input)).toBe(expected);
    });
  });

  describe("parsePageSize", () => {
    it.each([
      { input: "10", expected: 10 },
      { input: "5", expected: 5 },
      { input: "20", expected: 20 },
      { input: "50", expected: 50 },
      { input: "100", expected: 100 },
      { input: "0", expected: 10 },
      { input: "-5", expected: 10 },
      { input: "9999", expected: 100 },
      { input: "invalid", expected: 10 },
      { input: "", expected: 10 },
      { input: null, expected: 10 },
      { input: undefined, expected: 10 },
    ])("parsePageSize($input) -> $expected", ({ input, expected }) => {
      expect(parsePageSize(input)).toBe(expected);
    });
  });

  describe("parseSearchFilter", () => {
    it.each([
      { input: "  hello world  ", expected: "hello world" },
      { input: "test\x00query", expected: "testquery" },
      { input: "valid search term", expected: "valid search term" },
      { input: "   ", expected: "" },
      { input: null, expected: "" },
      { input: undefined, expected: "" },
    ])("parseSearchFilter($input) -> $expected", ({ input, expected }) => {
      expect(parseSearchFilter(input)).toBe(expected);
    });
  });

  describe("parseStellarAddressFilter", () => {
    const VALID_ADDR = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
    it.each([
      { input: VALID_ADDR, expected: VALID_ADDR },
      { input: `  ${VALID_ADDR}  `, expected: VALID_ADDR },
      { input: "not-a-stellar-address", expected: undefined },
      { input: "   ", expected: undefined },
      { input: "", expected: undefined },
      { input: null, expected: undefined },
      { input: undefined, expected: undefined },
    ])("parseStellarAddressFilter($input) -> $expected", ({ input, expected }) => {
      expect(parseStellarAddressFilter(input)).toBe(expected);
    });
  });

  describe("parseStreamRouteFilters - Table-driven test suite", () => {
    describe("Empty and default query strings", () => {
      it.each([
        "",
        "?",
        "???",
        "#hash",
        "?#",
        "?status=&sort=&q=&page=&pageSize=",
        new URLSearchParams(),
        {},
        null,
        undefined,
      ])("returns default filters for empty or nil input: %j", (input) => {
        expect(parseStreamRouteFilters(input)).toEqual(DEFAULT_STREAM_ROUTE_FILTERS);
      });
    });

    describe("Unsupported & invalid parameters fallback to defaults", () => {
      it.each([
        {
          query: "?status=bogus&sort=invalid&page=-99&pageSize=abc",
          expected: DEFAULT_STREAM_ROUTE_FILTERS,
        },
        {
          query: "?status=unknown&q=&sort=bad&page=0",
          expected: DEFAULT_STREAM_ROUTE_FILTERS,
        },
        {
          query: "?status=ACTIVE&sort=RATE&page=3&pageSize=20",
          expected: {
            status: "Active",
            search: "",
            sort: "rate",
            page: 3,
            pageSize: 20,
            recipient: undefined,
            treasury: undefined,
          },
        },
      ])("parses $query safely with fallbacks", ({ query, expected }) => {
        expect(parseStreamRouteFilters(query)).toEqual(expected);
      });
    });

    describe("Repeated parameters resolution", () => {
      it.each([
        {
          query: "?status=Paused&status=Active",
          expectedStatus: "Paused",
        },
        {
          query: "?status=Active&status=Paused",
          expectedStatus: "Active",
        },
        {
          query: "?page=5&page=2",
          expectedPage: 5,
        },
        {
          query: "?q=first&q=second",
          expectedSearch: "first",
        },
      ])("resolves repeated parameter deterministically: $query", ({ query, expectedStatus, expectedPage, expectedSearch }) => {
        const result = parseStreamRouteFilters(query);
        if (expectedStatus) expect(result.status).toBe(expectedStatus);
        if (expectedPage) expect(result.page).toBe(expectedPage);
        if (expectedSearch) expect(result.search).toBe(expectedSearch);
      });
    });

    describe("Encoded & malformed parameters", () => {
      it.each([
        {
          query: "?q=Stellar%20USDC%2BMore",
          expectedSearch: "Stellar USDC+More",
        },
        {
          query: "?q=Payroll+%26+Ops",
          expectedSearch: "Payroll & Ops",
        },
        {
          query: "?q=%E0%A4%A&status=Active",
          expectedStatus: "Active",
        },
        {
          query: "?q=%FF%FEbroken&sort=rate",
          expectedSort: "rate",
        },
      ])("handles encoded and malformed query without throwing: $query", ({ query, expectedSearch, expectedStatus, expectedSort }) => {
        const result = parseStreamRouteFilters(query);
        if (expectedSearch) expect(result.search).toBe(expectedSearch);
        if (expectedStatus) expect(result.status).toBe(expectedStatus);
        if (expectedSort) expect(result.sort).toBe(expectedSort);
      });
    });

    describe("Aliases support (q/search/searchQuery, sort/sortBy, limit/pageSize)", () => {
      it.each([
        { query: "?search=treasury", expectedSearch: "treasury" },
        { query: "?searchQuery=ops", expectedSearch: "ops" },
        { query: "?sortBy=name", expectedSort: "name" },
        { query: "?limit=50", expectedPageSize: 50 },
        { query: "?perPage=20", expectedPageSize: 20 },
        { query: "?p=4", expectedPage: 4 },
      ])("supports alias $query", ({ query, expectedSearch, expectedSort, expectedPageSize, expectedPage }) => {
        const result = parseStreamRouteFilters(query);
        if (expectedSearch) expect(result.search).toBe(expectedSearch);
        if (expectedSort) expect(result.sort).toBe(expectedSort);
        if (expectedPageSize) expect(result.pageSize).toBe(expectedPageSize);
        if (expectedPage) expect(result.page).toBe(expectedPage);
      });
    });
  });

  describe("serializeStreamRouteFilters", () => {
    it("serializes to empty string when all filters are defaults and omitDefaults is true", () => {
      expect(serializeStreamRouteFilters(DEFAULT_STREAM_ROUTE_FILTERS)).toBe("");
    });

    it("includes defaults when omitDefaults is false", () => {
      const serialized = serializeStreamRouteFilters(DEFAULT_STREAM_ROUTE_FILTERS, {
        omitDefaults: false,
      });
      expect(serialized).toBe("status=All&sort=recent&page=1&pageSize=10");
    });

    it("adds '?' prefix when prefix option is true", () => {
      const serialized = serializeStreamRouteFilters(
        { status: "Active" },
        { prefix: true },
      );
      expect(serialized).toBe("?status=Active");
    });

    describe("Canonical parameter ordering stability", () => {
      it.each([
        "?sort=rate&status=Active&q=treasury&page=2",
        "?q=treasury&page=2&sort=rate&status=Active",
        "?page=2&status=Active&sort=rate&q=treasury",
      ])("produces identical canonical query string regardless of input order: %s", (query) => {
        const parsed = parseStreamRouteFilters(query);
        const serialized = serializeStreamRouteFilters(parsed);
        // Canonical order is status -> q -> sort -> page
        expect(serialized).toBe("status=Active&q=treasury&sort=rate&page=2");
      });
    });

    describe("Roundtrip invariance", () => {
      it.each([
        {
          filters: {
            status: "Active" as StreamStatusFilter,
            search: "payroll",
            sort: "rate" as const,
            page: 2,
            pageSize: 20,
          },
        },
        {
          filters: {
            status: "Paused" as StreamStatusFilter,
            search: "grant",
            sort: "name" as const,
            page: 5,
            pageSize: 50,
          },
        },
        {
          filters: {
            status: "Completed" as StreamStatusFilter,
            search: "",
            sort: "recent" as const,
            page: 1,
            pageSize: 10,
          },
        },
      ])("preserves filter properties across serialize -> parse roundtrip", ({ filters }) => {
        const serialized = serializeStreamRouteFilters(filters);
        const parsed = parseStreamRouteFilters(serialized);
        expect(parsed.status).toBe(filters.status);
        expect(parsed.search).toBe(filters.search);
        expect(parsed.sort).toBe(filters.sort);
        expect(parsed.page).toBe(filters.page);
        expect(parsed.pageSize).toBe(filters.pageSize);
      });
    });
  });

  describe("toStreamsServiceFilters", () => {
    it("converts route filters to data hook StreamsFilters safely", () => {
      const routeFilters: StreamRouteFilters = {
        status: "Active",
        search: "treasury",
        sort: "rate",
        page: 2,
        pageSize: 20,
        recipient: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
        treasury: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
      };

      const hookFilters = toStreamsServiceFilters(routeFilters);
      expect(hookFilters).toEqual({
        status: "Active",
        recipient: "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI",
        treasury: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
      });
    });

    it("omits recipient and treasury when undefined", () => {
      const hookFilters = toStreamsServiceFilters(DEFAULT_STREAM_ROUTE_FILTERS);
      expect(hookFilters).toEqual({
        status: "All",
        recipient: undefined,
        treasury: undefined,
      });
    });
  });
});
