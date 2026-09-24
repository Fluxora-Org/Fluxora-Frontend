import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import RecentStreams from "../RecentStreams";
import { toRecentStream } from "../../lib/recentStreamMapper";
import { normalizeStreamRecord } from "../../data/streamRecords";
import {
  OPTIONAL_STREAM_RECORD_FIELDS,
  makeMissingOptionalFieldRecords,
  makeStreamRecord,
  makeStreamRecordMissing,
} from "../../fixtures/malformedStreamRecords";

const mockTranslate = vi.fn((key: string, options?: { count?: number }) => {
  if (key === "recentStreams.foundMatchingStreams") {
    const count = options?.count ?? 0;
    if (count === 0) return "No matching streams found.";
    if (count === 1) return "Found 1 matching stream.";
    return `Found ${count} matching streams.`;
  }
  return key;
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mockTranslate }),
}));

/**
 * Defensive-rendering tests for issue #670, covering the Dashboard path
 * `StreamRecord -> toRecentStream -> RecentStreams`.
 */
describe("RecentStreams with records missing optional fields", () => {
  function renderStreams(streams: Parameters<typeof RecentStreams>[0]["streams"]) {
    return render(
      <MemoryRouter>
        <RecentStreams streams={streams} />
      </MemoryRouter>,
    );
  }

  describe.each(OPTIONAL_STREAM_RECORD_FIELDS)(
    "record missing '%s'",
    (field) => {
      it("renders the row without crashing", () => {
        const record = makeStreamRecordMissing(field);
        renderStreams([toRecentStream(record)]);

        expect(screen.getByText(record.id)).toBeInTheDocument();
        expect(
          screen.getByRole("status", { name: "Status: Active" }),
        ).toBeInTheDocument();
      });
    },
  );

  it("renders one row per missing-optional-field record at once", () => {
    const records = Object.values(makeMissingOptionalFieldRecords());
    renderStreams(records.map(toRecentStream));

    for (const record of records) {
      expect(screen.getByText(record.id)).toBeInTheDocument();
    }
  });

  it("skips malformed entries without blanking the rest of the list", () => {
    const validA = toRecentStream(makeStreamRecord({ id: "STR-OK-1", name: "Good stream A" }));
    const validB = toRecentStream(makeStreamRecord({ id: "STR-OK-2", name: "Good stream B" }));
    const malformed = { id: "STR-BAD-1", name: "Broken" } as any;

    const warnSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderStreams([validA, malformed, validB]);

    expect(screen.getByText("Good stream A")).toBeInTheDocument();
    expect(screen.getByText("Good stream B")).toBeInTheDocument();
    expect(screen.queryByText("Broken")).not.toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("falls back to the stream detail route when the optional detailUrl is absent", () => {
    const record = makeStreamRecord();
    const stream = toRecentStream(record);
    expect(stream.detailUrl).toBeUndefined();

    renderStreams([stream]);

    const row = screen.getByText(record.id).closest("tr") as HTMLElement;
    expect(
      within(row).getByRole("link", {
        name: `View details for ${record.name}`,
      }),
    ).toHaveAttribute("href", `/app/streams/${record.id}`);
  });

  it("uses detailUrl when it is provided", () => {
    const record = makeStreamRecord();
    const stream = { ...toRecentStream(record), detailUrl: "/custom/route" };

    renderStreams([stream]);

    expect(
      screen.getByRole("link", { name: `View details for ${record.name}` }),
    ).toHaveAttribute("href", "/custom/route");
  });

  it("renders a record normalized from an empty payload with safe defaults", () => {
    renderStreams([toRecentStream(normalizeStreamRecord({ id: "STR-EMPTY" }))]);

    expect(screen.getByText("STR-EMPTY")).toBeInTheDocument();
    expect(screen.getByText("Untitled stream")).toBeInTheDocument();
  });
});
