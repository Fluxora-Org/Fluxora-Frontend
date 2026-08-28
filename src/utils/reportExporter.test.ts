import { describe, it, expect, vi, afterEach } from "vitest";
import {
  filterStreamsByDateRange,
  groupStreams,
  buildReportCSV,
  downloadReportCSV,
  printReportAsPDF,
  MAX_REPORT_RANGE_DAYS,
  MAX_REPORT_ROWS,
  ReportExportError,
} from "./reportExporter";
import type { Stream } from "../components/treasuryOverviewPage/Stream";

function makeStream(overrides: Partial<Stream>): Stream {
  return {
    id: "1",
    name: "Test Stream",
    recipient: "GRECIPIENT",
    rate: "10 USDC",
    status: "Active",
    ...overrides,
  };
}

describe("filterStreamsByDateRange", () => {
  const streams: Stream[] = [
    makeStream({ id: "1", startDate: "2026-01-05" }),
    makeStream({ id: "2", startDate: "2026-03-15" }),
    makeStream({ id: "3", startDate: "2026-06-01" }),
    makeStream({ id: "4" }), // no startDate
  ];

  it("returns all streams when no range is given", () => {
    expect(filterStreamsByDateRange(streams, "", "")).toHaveLength(4);
  });

  it("filters streams outside the given range", () => {
    const result = filterStreamsByDateRange(streams, "2026-02-01", "2026-05-01");
    const ids = result.map((s) => s.id);
    expect(ids).toEqual(["2", "4"]); // stream without a startDate is always kept
  });

  it("respects an open-ended start bound", () => {
    const result = filterStreamsByDateRange(streams, "", "2026-03-31");
    expect(result.map((s) => s.id)).toEqual(["1", "2", "4"]);
  });

  it("rejects malformed and oversized date ranges", () => {
    expect(filterStreamsByDateRange(streams, "not-a-date", "2026-03-31")).toEqual([]);
    const end = new Date(Date.UTC(2026, 0, 1 + MAX_REPORT_RANGE_DAYS));
    expect(filterStreamsByDateRange(streams, "2026-01-01", end.toISOString().slice(0, 10))).toEqual([]);
  });

  it("caps unfiltered results deterministically", () => {
    const largeInput = Array.from({ length: MAX_REPORT_ROWS + 2 }, (_, index) =>
      makeStream({ id: String(index) }),
    );
    expect(filterStreamsByDateRange(largeInput, "", "")).toHaveLength(MAX_REPORT_ROWS);
    const boundedResults = filterStreamsByDateRange(largeInput, "", "");
    expect(boundedResults[boundedResults.length - 1]?.id).toBe(String(MAX_REPORT_ROWS - 1));
  });
});

describe("groupStreams", () => {
  const streams: Stream[] = [
    makeStream({ id: "1", recipient: "A", status: "Active" }),
    makeStream({ id: "2", recipient: "B", status: "Paused" }),
    makeStream({ id: "3", recipient: "A", status: "Completed" }),
  ];

  it("returns a single ungrouped bucket for None", () => {
    const groups = groupStreams(streams, "None");
    expect(groups).toHaveLength(1);
    expect(groups[0][1]).toHaveLength(3);
  });

  it("groups by recipient preserving order", () => {
    const groups = groupStreams(streams, "Recipient");
    expect(groups.map(([key]) => key)).toEqual(["A", "B"]);
    expect(groups[0][1].map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("groups by status", () => {
    const groups = groupStreams(streams, "Status");
    expect(groups.map(([key]) => key)).toEqual(["Active", "Paused", "Completed"]);
  });
});

describe("buildReportCSV", () => {
  const streams: Stream[] = [
    makeStream({ id: "1", name: "Stream One", recipient: "A", status: "Active" }),
    makeStream({ id: "2", name: "Stream Two", recipient: "B", status: "Paused" }),
  ];

  it("includes a header row and one row per stream", () => {
    const csv = buildReportCSV(streams, ["name", "status"], "None");
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Status");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Stream One,Active");
  });

  it("inserts a group marker row per group when grouping is set", () => {
    const csv = buildReportCSV(streams, ["name"], "Recipient");
    const lines = csv.split("\n");
    expect(lines).toEqual(["Name", "# A", "Stream One", "# B", "Stream Two"]);
  });

  it("escapes commas and quotes in cell values", () => {
    const csv = buildReportCSV(
      [makeStream({ name: 'Stream, "special"' })],
      ["name"],
      "None"
    );
    expect(csv.split("\n")[1]).toBe('"Stream, ""special"""');
  });

  it("rejects unsupported fields and neutralizes hostile labels", () => {
    expect(() => buildReportCSV(streams, ["unknown" as never], "None")).toThrow(ReportExportError);
    const csv = buildReportCSV([makeStream({ name: "=SUM(A1:A2)" })], ["name"], "None");
    expect(csv).toContain("'=SUM(A1:A2)");
  });
});

describe("downloadReportCSV", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("triggers a real blob download for the generated CSV", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:report");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    const click = vi.fn();
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "a") {
        return { href: "", download: "", click } as unknown as HTMLAnchorElement;
      }
      return realCreateElement(tag);
    });
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

    downloadReportCSV(
      [makeStream({ name: "Alpha", status: "Active" })],
      ["name", "status"],
      "None",
      "Test-Report",
    );

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/csv;charset=utf-8;");
    expect(click).toHaveBeenCalledTimes(1);
  });
});

describe("printReportAsPDF", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when the print window cannot be opened so callers can avoid a fake success toast", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(() =>
      printReportAsPDF([makeStream({})], ["name"], "None"),
    ).toThrow(/Unable to open print window/i);
  });

  it("writes report content and invokes print when a window opens", () => {
    const printWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(printWindow as unknown as Window);

    printReportAsPDF(
      [makeStream({ name: "Alpha", status: "Active" })],
      ["name", "status"],
      "None",
    );

    expect(printWindow.document.write).toHaveBeenCalled();
    expect(printWindow.document.close).toHaveBeenCalled();
    expect(printWindow.focus).toHaveBeenCalled();
    expect(printWindow.print).toHaveBeenCalled();
  });

  it("escapes hostile PDF labels and does not open a window when canceled", () => {
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(printWindow as unknown as Window);
    printReportAsPDF([makeStream({ name: "<img src=x onerror=alert(1)>" })], ["name"], "None");
    expect(printWindow.document.write.mock.calls[0]![0]).toContain("&lt;img src=x onerror=alert(1)&gt;");

    const controller = new AbortController();
    controller.abort();
    expect(() => downloadReportCSV([makeStream({})], ["name"], "None", "Report", controller.signal)).toThrow(
      /canceled/i,
    );
  });
});
