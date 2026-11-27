import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteStreamView,
  MAX_SAVED_STREAM_VIEWS,
  readSavedStreamViews,
  saveStreamView,
} from "../savedStreamViews";
import {
  DEFAULT_STREAM_ROUTE_FILTERS,
  parseStreamRouteFilters,
} from "../streamFilterParams";
const account = "alice";
const key = `fluxora:saved-stream-views:v1:${account}`;
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("saved stream views", () => {
  it("creates, reloads, applies and deletes wallet-scoped views", () => {
    expect(readSavedStreamViews(account)).toEqual([]);
    expect(
      saveStreamView(account, " Payroll ", {
        ...DEFAULT_STREAM_ROUTE_FILTERS,
        status: "Active",
        search: "%20",
        page: 8,
      }),
    ).toBe(true);
    const [view] = readSavedStreamViews(account);
    expect(view.name).toBe("Payroll");
    expect(parseStreamRouteFilters(view.query)).toMatchObject({
      status: "Active",
      search: "%20",
      page: 1,
    });
    expect(readSavedStreamViews("bob")).toEqual([]);
    expect(deleteStreamView(account, "Payroll")).toBe(true);
    expect(readSavedStreamViews(account)).toEqual([]);
  });
  it("rejects empty/duplicate names and caps writes", () => {
    expect(saveStreamView("", "name", DEFAULT_STREAM_ROUTE_FILTERS)).toBe(
      false,
    );
    expect(saveStreamView(account, " ", DEFAULT_STREAM_ROUTE_FILTERS)).toBe(
      false,
    );
    expect(saveStreamView(account, "Name", DEFAULT_STREAM_ROUTE_FILTERS)).toBe(
      true,
    );
    expect(saveStreamView(account, "name", DEFAULT_STREAM_ROUTE_FILTERS)).toBe(
      false,
    );
    for (let n = 1; n < MAX_SAVED_STREAM_VIEWS; n++)
      expect(
        saveStreamView(account, String(n), DEFAULT_STREAM_ROUTE_FILTERS),
      ).toBe(true);
    expect(saveStreamView(account, "full", DEFAULT_STREAM_ROUTE_FILTERS)).toBe(
      false,
    );
  });
  it("validates and caps untrusted storage and uses only whitelisted params", () => {
    localStorage.setItem(
      key,
      JSON.stringify([
        null,
        {},
        { name: "missing query" },
        { name: "", query: "" },
        { name: "A", query: "q=alice&status=BAD&evil=x&page=9" },
        { name: "a", query: "" },
        { name: "b".repeat(100), query: "recipient=bad&q=" + "x".repeat(500) },
      ]),
    );
    const views = readSavedStreamViews(account);
    expect(views).toHaveLength(2);
    expect(views[0]).toEqual({ name: "A", query: "q=alice" });
    expect(views[1].name).toHaveLength(60);
    expect(parseStreamRouteFilters(views[1].query).search).toHaveLength(120);
    localStorage.setItem(
      key,
      JSON.stringify(
        Array.from({ length: 30 }, (_, n) => ({ name: String(n), query: "" })),
      ),
    );
    expect(readSavedStreamViews(account)).toHaveLength(20);
  });
  it.each(["{", "null", "{}", "x".repeat(50001)])(
    "handles invalid or oversized storage",
    (raw) => {
      localStorage.setItem(key, raw);
      expect(readSavedStreamViews(account)).toEqual([]);
    },
  );
  it("handles absent identity and blocked/failed storage", () => {
    expect(readSavedStreamViews("")).toEqual([]);
    expect(deleteStreamView("", "x")).toBe(false);
    vi.spyOn(localStorage, "getItem").mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    expect(readSavedStreamViews(account)).toEqual([]);
    vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => {
      throw new Error("quota");
    });
    expect(saveStreamView(account, "x", DEFAULT_STREAM_ROUTE_FILTERS)).toBe(
      false,
    );
    vi.spyOn(localStorage, "setItem").mockImplementationOnce(() => { throw new Error("quota"); });
    expect(deleteStreamView(account, "x")).toBe(false);
  });
});
