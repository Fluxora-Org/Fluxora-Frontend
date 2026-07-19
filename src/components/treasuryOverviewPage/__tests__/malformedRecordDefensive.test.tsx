import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import StreamRow from "../StreamRow";
import RecentStreams from "../RecentStreams";
import { toLegacyStream } from "../useTreasuryOverviewData";
import type { Stream } from "../Stream";
import { normalizeStreamRecord } from "../../../data/streamRecords";
import {
  OPTIONAL_STREAM_RECORD_FIELDS,
  makeMissingOptionalFieldRecords,
  makeOngoingStreamWithoutEndDatePayload,
  makeStreamRecord,
  makeStreamRecordMissing,
} from "../../../fixtures/malformedStreamRecords";

/**
 * Defensive-rendering tests for issue #670.
 *
 * Streams reach these components through the production mapping
 * `StreamRecord -> toLegacyStream -> Stream`, so each fixture record missing
 * an optional field is pushed through that exact path before rendering.
 */

function renderRow(stream: Stream) {
  return render(
    <MemoryRouter>
      <table>
        <tbody>
          <StreamRow stream={stream} />
        </tbody>
      </table>
    </MemoryRouter>,
  );
}

describe("StreamRow with records missing optional fields", () => {
  describe.each(OPTIONAL_STREAM_RECORD_FIELDS)(
    "record missing '%s'",
    (field) => {
      it("renders without crashing and shows the core cells", () => {
        const record = makeStreamRecordMissing(field);
        renderRow(toLegacyStream(record));

        expect(screen.getByText(record.name)).toBeInTheDocument();
        expect(screen.getByText(record.id)).toBeInTheDocument();
        expect(
          screen.getByRole("status", { name: "Active status" }),
        ).toBeInTheDocument();
      });
    },
  );

  it("omits the accrued line when the optional accruedAmount is absent", () => {
    const stream = toLegacyStream(makeStreamRecord());
    delete stream.accruedAmount;
    renderRow(stream);

    expect(screen.getByText(stream.name)).toBeInTheDocument();
    expect(screen.queryByText(/accrued/)).not.toBeInTheDocument();
  });

  it("renders the accrued line when accruedAmount is present", () => {
    renderRow(toLegacyStream(makeStreamRecord({ streamedAmount: 3000 })));

    expect(screen.getByText(/accrued/)).toBeInTheDocument();
  });

  it("renders an ongoing stream whose raw payload had no end date", () => {
    const record = normalizeStreamRecord(
      makeOngoingStreamWithoutEndDatePayload(),
    );
    renderRow(toLegacyStream(record));

    expect(screen.getByText(record.name)).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Active status" }),
    ).toBeInTheDocument();
  });

  it("renders a fully-defaulted record normalized from an empty payload", () => {
    const record = normalizeStreamRecord({});
    renderRow(toLegacyStream(record));

    expect(screen.getByText("Untitled stream")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Active status" }),
    ).toBeInTheDocument();
  });
});

describe("StreamRow interactions on records missing optional fields", () => {
  const record = makeStreamRecordMissing("cliffDate");

  function renderInteractiveRow(options: { onSelect?: boolean; isSelected?: boolean } = {}) {
    const onSelect = options.onSelect === false ? undefined : vi.fn();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route
            path="/"
            element={
              <table>
                <tbody>
                  <StreamRow
                    stream={toLegacyStream(record)}
                    isSelected={options.isSelected}
                    onSelect={onSelect}
                  />
                </tbody>
              </table>
            }
          />
          <Route
            path="/app/streams/:id"
            element={<div data-testid="detail-page" />}
          />
        </Routes>
      </MemoryRouter>,
    );
    return { onSelect, row: screen.getByRole("row") };
  }

  it("selects the row on click", async () => {
    const user = userEvent.setup();
    const { onSelect, row } = renderInteractiveRow();

    await user.click(row);
    expect(onSelect).toHaveBeenCalledWith(record.id);
  });

  it("selects the row via Enter and Space", () => {
    const { onSelect, row } = renderInteractiveRow();

    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "Escape" });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("navigates to the detail route when no onSelect handler is provided", async () => {
    const user = userEvent.setup();
    const { row } = renderInteractiveRow({ onSelect: false });

    await user.click(row);
    expect(screen.getByTestId("detail-page")).toBeInTheDocument();
  });

  it("navigates to the detail route from the View button without selecting the row", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderInteractiveRow();

    const viewButton = screen.getByRole("button", {
      name: `View details for ${record.name}`,
    });
    fireEvent.mouseEnter(viewButton);
    fireEvent.mouseLeave(viewButton);
    await user.click(viewButton);

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByTestId("detail-page")).toBeInTheDocument();
  });

  it("applies and clears hover/focus styling without crashing", () => {
    const { row } = renderInteractiveRow({ isSelected: true });

    fireEvent.focus(row);
    fireEvent.mouseEnter(row);
    // Leaving while still focused keeps the elevated background.
    row.focus();
    fireEvent.mouseLeave(row);
    fireEvent.blur(row);
    row.blur();
    fireEvent.mouseEnter(row);
    fireEvent.mouseLeave(row);

    expect(row).toHaveAttribute("aria-selected", "true");
  });

  it("resets styling for an unselected row on blur and mouse leave", () => {
    const { row } = renderInteractiveRow({ isSelected: false });

    fireEvent.focus(row);
    fireEvent.blur(row);
    fireEvent.mouseEnter(row);
    fireEvent.mouseLeave(row);

    expect(row).toHaveAttribute("aria-selected", "false");
  });
});

describe("treasuryOverviewPage RecentStreams with records missing optional fields", () => {
  it("renders one row per record, none of which crash", () => {
    const records = Object.values(makeMissingOptionalFieldRecords());
    const streams = records.map(toLegacyStream);

    render(
      <MemoryRouter>
        <RecentStreams streams={streams} />
      </MemoryRouter>,
    );

    const grid = screen.getByRole("grid", { name: "Active streams" });
    for (const record of records) {
      expect(within(grid).getByText(record.id)).toBeInTheDocument();
    }
  });

  it("renders records normalized from sparse payloads alongside full records", () => {
    const streams = [
      toLegacyStream(makeStreamRecord()),
      toLegacyStream(normalizeStreamRecord({ id: "STR-SPARSE" })),
    ];

    render(
      <MemoryRouter>
        <RecentStreams streams={streams} />
      </MemoryRouter>,
    );

    expect(screen.getByText("STR-SPARSE")).toBeInTheDocument();
    expect(screen.getByText("Untitled stream")).toBeInTheDocument();
  });
});
