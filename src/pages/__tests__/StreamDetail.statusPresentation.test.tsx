import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import StreamDetail, { getStreamStatusPresentation } from "../StreamDetail";
import * as streamsService from "../../lib/api/streamsService";
import type { StreamRecord, StreamStatus } from "../../data/streamRecords";
// The test setup globally mocks the i18n module; unmock it so the page renders
// through the real provider and the zx pseudo-locale assertions below are
// meaningful (see src/i18n/__tests__/missingTranslationFallback.test.tsx).
vi.unmock("../../i18n");
import { I18nProvider } from "../../i18n";

const baseStream: StreamRecord = {
  id: "STR-1640",
  name: "Status Coverage Stream",
  summary: "Stream used to assert every status renders a defined state.",
  recipientName: "Alice",
  recipientAddress: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  treasuryName: "Treasury",
  treasuryAddress: "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBWHF",
  depositAmount: 10000,
  streamedAmount: 4000,
  withdrawableAmount: 2000,
  remainingAmount: 6000,
  monthlyRate: 1000,
  startDate: "2026-01-01T00:00:00Z",
  endDate: "2026-10-01T00:00:00Z",
  status: "Active",
  health: "Healthy",
  healthNote: "Stream is running normally",
  asset: "USDC",
  progress: 40,
  auditNote: "",
  tags: [],
  timeline: [],
};

function renderStreamDetail(stream: StreamRecord) {
  vi.spyOn(streamsService, "getStreamById").mockResolvedValue(stream);
  return render(
    <I18nProvider>
      <HelmetProvider>
        <MemoryRouter initialEntries={["/app/streams/STR-1640"]}>
          <Routes>
            <Route path="/app/streams/:streamId" element={<StreamDetail />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    </I18nProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

const knownStatuses: Array<{ status: string; label: string }> = [
  { status: "Active", label: "Active" },
  { status: "Paused", label: "Paused" },
  { status: "Completed", label: "Completed" },
  { status: "Cancelled", label: "Cancelled" },
  { status: "Matured", label: "Matured" },
];

describe("StreamDetail status presentation", () => {
  it.each(knownStatuses)(
    "renders a defined presentation for the $status status",
    async ({ status, label }) => {
      renderStreamDetail({ ...baseStream, status: status as StreamStatus });

      const region = await screen.findByTestId("stream-status");
      expect(region).toHaveAttribute("data-status", status.toLowerCase());
      expect(region).toHaveAttribute("data-status-recognized", "true");
      expect(within(region).getByText(label)).toBeInTheDocument();
      expect(
        within(region).getByTestId("stream-status-description").textContent ?? "",
      ).not.toBe("");
      expect(within(region).queryByTestId("stream-status-fallback")).toBeNull();
    },
  );

  it("renders an explicit fallback (not a blank region) for an unknown status", async () => {
    renderStreamDetail({
      ...baseStream,
      status: "OnHold" as unknown as StreamStatus,
    });

    const region = await screen.findByTestId("stream-status");
    expect(region).toHaveAttribute("data-status-recognized", "false");

    const fallback = within(region).getByTestId("stream-status-fallback");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveTextContent("OnHold");
    expect(
      within(region).getByTestId("stream-status-description").textContent ?? "",
    ).toMatch(/not recognised/i);
  });

  it("keeps the loading state distinct from the resolved status state", () => {
    vi.spyOn(streamsService, "getStreamById").mockImplementation(
      () => new Promise(() => { }),
    );

    render(
      <I18nProvider>
        <HelmetProvider>
          <MemoryRouter initialEntries={["/app/streams/STR-1640"]}>
            <Routes>
              <Route path="/app/streams/:streamId" element={<StreamDetail />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>
      </I18nProvider>,
    );

    expect(
      screen.getByRole("status", { name: /loading stream/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("stream-status")).not.toBeInTheDocument();
  });

  it("keeps the error state distinct from the resolved status state", async () => {
    vi.spyOn(streamsService, "getStreamById").mockRejectedValue(
      new Error("Network connection failed"),
    );

    render(
      <I18nProvider>
        <HelmetProvider>
          <MemoryRouter initialEntries={["/app/streams/STR-1640"]}>
            <Routes>
              <Route path="/app/streams/:streamId" element={<StreamDetail />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>
      </I18nProvider>,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByTestId("stream-status")).not.toBeInTheDocument();
  });

  it("renders catalog copy pseudo-localized when the page is shown under the zx locale (#2112)", async () => {
    vi.spyOn(streamsService, "getStreamById").mockResolvedValue({
      ...baseStream,
      status: "Active" as StreamStatus,
    });

    render(
      <I18nProvider defaultLocale="zx">
        <HelmetProvider>
          <MemoryRouter initialEntries={["/app/streams/STR-1640"]}>
            <Routes>
              <Route path="/app/streams/:streamId" element={<StreamDetail />} />
            </Routes>
          </MemoryRouter>
        </HelmetProvider>
      </I18nProvider>,
    );

    const region = await screen.findByTestId("stream-status");

    // The sr-only status heading is catalog copy: under zx it must carry the
    // pseudo-locale markers instead of the bare English string.
    const srHeading = within(region).getByText(
      (_, element) =>
        element?.tagName.toLowerCase() === "h2" &&
        element?.id === "stream-status-heading",
    );
    expect(srHeading.textContent ?? "").toMatch(/^\[.+\]$/s);
    expect(srHeading.textContent).not.toBe("Stream status");

    // The status pill label and description come from the catalog too: the
    // heading, pill, and description all render pseudo-localized under zx,
    // so no English copy bypasses the i18n layer in this region.
    expect(
      within(region).getAllByText(/^\[.+\]$/s).length,
    ).toBeGreaterThanOrEqual(3);
  });
});

describe("getStreamStatusPresentation", () => {
  it("returns a recognised presentation for every known status", () => {
    for (const key of [
      "active",
      "paused",
      "completed",
      "cancelled",
      "matured",
    ]) {
      const presentation = getStreamStatusPresentation(key);
      expect(presentation.recognized).toBe(true);
      expect(presentation.label).not.toBe("");
      expect(presentation.description).not.toBe("");
    }
  });

  it("returns an explicit unknown fallback for unrecognised values", () => {
    const presentation = getStreamStatusPresentation("mystery");
    expect(presentation.recognized).toBe(false);
    expect(presentation.label).toBe("Mystery");
    expect(presentation.description).toMatch(/not recognised/i);
  });
});
