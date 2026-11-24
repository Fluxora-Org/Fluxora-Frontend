import { describe, expect, it } from "vitest";
import {
  getStreamSelectionState,
  toggleStreamGroupSelection,
  toggleStreamSelection,
} from "./streamSelection";

describe("stream selection helpers", () => {
  it("adds and removes a single stream without changing the prior set", () => {
    const initial = new Set(["stream-1"]);
    const selected = toggleStreamSelection(initial, "stream-2", true);
    const deselected = toggleStreamSelection(selected, "stream-1", false);

    expect([...initial]).toEqual(["stream-1"]);
    expect([...selected]).toEqual(["stream-1", "stream-2"]);
    expect([...deselected]).toEqual(["stream-2"]);
  });

  it("selects and deselects a page while preserving IDs from other pages", () => {
    const initial = new Set(["other-page"]);
    const selected = toggleStreamGroupSelection(
      initial,
      ["page-1", "page-2"],
      true,
    );
    const deselected = toggleStreamGroupSelection(
      selected,
      ["page-1", "page-2"],
      false,
    );

    expect([...selected]).toEqual(["other-page", "page-1", "page-2"]);
    expect([...deselected]).toEqual(["other-page"]);
  });

  it.each([
    [[], "none"],
    [["stream-1", "stream-2"], "all"],
    [["stream-1"], "mixed"],
  ] as const)(
    "reports header selection state for selected IDs %j",
    (selected, expected) => {
      const state = getStreamSelectionState(new Set(selected), [
        "stream-1",
        "stream-2",
      ]);
      expect(state).toBe(expected);
    },
  );
});
