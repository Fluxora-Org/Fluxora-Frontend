import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ReportBuilderPanel from "../ReportBuilderPanel";
import type { Stream } from "../Stream";
import {
  downloadReportCSV,
  printReportAsPDF,
} from "../../../utils/reportExporter";

const addToast = vi.fn();

// Keep real date filtering / grouping; stub only download side effects.
vi.mock("../../../utils/reportExporter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../utils/reportExporter")>();
  return {
    ...actual,
    downloadReportCSV: vi.fn(),
    printReportAsPDF: vi.fn(),
  };
});

vi.mock("../../toast/ToastProvider", () => ({
  useToast: () => ({ addToast }),
}));

const fixtureStreams: Stream[] = [
  {
    id: "1",
    name: "Stream Alpha",
    recipient: "GAAAAA",
    rate: "100 USDC",
    accruedAmount: 500,
    status: "Active",
    startDate: "2026-01-10",
  },
  {
    id: "2",
    name: "Stream Beta",
    recipient: "GBBBBB",
    rate: "50 USDC",
    accruedAmount: 250,
    status: "Paused",
    startDate: "2026-03-15",
  },
  {
    id: "3",
    name: "Stream Gamma",
    recipient: "GAAAAA",
    rate: "200 USDC",
    status: "Completed",
    startDate: "2026-06-01",
  },
];

function renderPanel(streams: Stream[] = fixtureStreams) {
  const onClose = vi.fn();
  const utils = render(<ReportBuilderPanel streams={streams} onClose={onClose} />);
  return { ...utils, onClose };
}

describe("ReportBuilderPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Render & close ────────────────────────────────────────────────────

  it("renders the panel with title and close button", () => {
    renderPanel();
    expect(screen.getByRole("heading", { name: /Export Treasury Report/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Close report builder/i })).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Close report builder/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── handleFieldToggle ─────────────────────────────────────────────────

  it("renders field checkboxes with the documented defaults", () => {
    renderPanel();
    expect(screen.getAllByRole("checkbox")).toHaveLength(5);
    expect(screen.getByLabelText("Name")).toBeChecked();
    expect(screen.getByLabelText("Recipient")).toBeChecked();
    expect(screen.getByLabelText("Rate")).toBeChecked();
    expect(screen.getByLabelText("Status")).toBeChecked();
    expect(screen.getByLabelText("Accrued Amount")).not.toBeChecked();
  });

  it("toggles a field off when clicking an already-checked checkbox", () => {
    renderPanel();
    const nameCheckbox = screen.getByLabelText("Name");
    fireEvent.click(nameCheckbox);
    expect(nameCheckbox).not.toBeChecked();
  });

  it("toggles a field on when clicking an unchecked checkbox", () => {
    renderPanel();
    const accruedCheckbox = screen.getByLabelText("Accrued Amount");
    fireEvent.click(accruedCheckbox);
    expect(accruedCheckbox).toBeChecked();
  });

  it("toggles multiple fields independently", () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText("Name"));
    fireEvent.click(screen.getByLabelText("Rate"));
    fireEvent.click(screen.getByLabelText("Accrued Amount"));

    expect(screen.getByLabelText("Name")).not.toBeChecked();
    expect(screen.getByLabelText("Rate")).not.toBeChecked();
    expect(screen.getByLabelText("Accrued Amount")).toBeChecked();
    expect(screen.getByLabelText("Recipient")).toBeChecked();
    expect(screen.getByLabelText("Status")).toBeChecked();
  });

  it("re-adds a field after toggling it off", () => {
    renderPanel();
    const nameCb = screen.getByLabelText("Name");
    fireEvent.click(nameCb);
    expect(nameCb).not.toBeChecked();
    fireEvent.click(nameCb);
    expect(nameCb).toBeChecked();
  });

  // ── canExport gating ──────────────────────────────────────────────────

  it("renders the Export button enabled when at least one field is selected", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeEnabled();
  });

  it("disables the Export button when no fields are selected", () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText("Name"));
    fireEvent.click(screen.getByLabelText("Recipient"));
    fireEvent.click(screen.getByLabelText("Rate"));
    fireEvent.click(screen.getByLabelText("Status"));
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeDisabled();
  });

  it("re-enables the Export button after deselecting all fields and then selecting one", () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText("Name"));
    fireEvent.click(screen.getByLabelText("Recipient"));
    fireEvent.click(screen.getByLabelText("Rate"));
    fireEvent.click(screen.getByLabelText("Status"));
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Accrued Amount"));
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeEnabled();
  });

  // ── grouping ──────────────────────────────────────────────────────────

  it("renders the grouping select with default value None", () => {
    renderPanel();
    expect(screen.getByLabelText("Grouping")).toHaveValue("None");
  });

  it("updates grouping state when selecting By Recipient", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Grouping"), { target: { value: "Recipient" } });
    expect(screen.getByLabelText("Grouping")).toHaveValue("Recipient");
  });

  it("updates grouping state when selecting By Status", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Grouping"), { target: { value: "Status" } });
    expect(screen.getByLabelText("Grouping")).toHaveValue("Status");
  });

  it("cycles through grouping options", () => {
    renderPanel();
    const groupingSelect = screen.getByLabelText("Grouping") as HTMLSelectElement;
    fireEvent.change(groupingSelect, { target: { value: "Recipient" } });
    expect(groupingSelect.value).toBe("Recipient");
    fireEvent.change(groupingSelect, { target: { value: "Status" } });
    expect(groupingSelect.value).toBe("Status");
    fireEvent.change(groupingSelect, { target: { value: "None" } });
    expect(groupingSelect.value).toBe("None");
  });

  // ── exportFormat ──────────────────────────────────────────────────────

  it("renders format radio buttons with CSV selected by default", () => {
    renderPanel();
    expect(screen.getByLabelText("CSV")).toBeChecked();
    expect(screen.getByLabelText("PDF")).not.toBeChecked();
  });

  it("updates exportFormat to PDF when selecting the PDF radio", () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText("PDF"));
    expect(screen.getByLabelText("PDF")).toBeChecked();
    expect(screen.getByLabelText("CSV")).not.toBeChecked();
  });

  it("updates export button label when switching between CSV and PDF", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("PDF"));
    expect(screen.getByRole("button", { name: /Export PDF/i })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("CSV"));
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeInTheDocument();
  });

  // ── Preview / filtering / grouping ────────────────────────────────────

  it("shows stream names in the preview table", () => {
    renderPanel();
    expect(screen.getByText("Stream Alpha")).toBeInTheDocument();
    expect(screen.getByText("Stream Beta")).toBeInTheDocument();
    expect(screen.getByText("Stream Gamma")).toBeInTheDocument();
  });

  it("shows 'No data to preview' when there are no streams", () => {
    renderPanel([]);
    expect(screen.getByText("No data to preview.")).toBeInTheDocument();
  });

  it("filters the live preview when the date range changes", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-04-30" } });

    expect(screen.queryByText("Stream Alpha")).not.toBeInTheDocument();
    expect(screen.getByText("Stream Beta")).toBeInTheDocument();
    expect(screen.queryByText("Stream Gamma")).not.toBeInTheDocument();
  });

  it("groups the live preview when grouping by recipient", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Grouping"), { target: { value: "Recipient" } });

    expect(screen.getByText("GAAAAA")).toBeInTheDocument();
    expect(screen.getByText("GBBBBB")).toBeInTheDocument();

    const names = screen.getAllByText(/Stream (Alpha|Beta|Gamma)/).map((el) => el.textContent);
    // Recipient groups preserve encounter order: GAAAAA (Alpha, Gamma), then GBBBBB (Beta)
    expect(names).toEqual(["Stream Alpha", "Stream Gamma", "Stream Beta"]);
  });

  it("shows no preview rows when the date range excludes every stream", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2027-01-01" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2027-12-31" } });
    expect(screen.getByText("No data to preview.")).toBeInTheDocument();
  });

  // ── Date inputs / validation ──────────────────────────────────────────

  it("renders date inputs for start and end date", () => {
    renderPanel();
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
  });

  it("shows date error when end date is before start date", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-06-10" } });
    expect(screen.getByText("End date must be on or after the start date.")).toBeInTheDocument();
  });

  it("hides date error when dates are valid", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-06-10" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-06-15" } });
    expect(screen.queryByText("End date must be on or after the start date.")).not.toBeInTheDocument();
  });

  it("disables Export button when date error is present", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-06-10" } });
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeDisabled();
  });

  it("does not show date error when only one date is set", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-06-15" } });
    expect(screen.queryByText("End date must be on or after the start date.")).not.toBeInTheDocument();
  });

  // ── Keyboard handling ─────────────────────────────────────────────────

  it("calls onClose when Escape key is pressed", () => {
    const { onClose } = renderPanel();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on other key presses", () => {
    const { onClose } = renderPanel();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("includes streams without startDate regardless of date filter", () => {
    const streamsWithMissingDates: Stream[] = [
      ...fixtureStreams,
      {
        id: "4",
        name: "Stream No Date",
        recipient: "GCCCCC",
        rate: "75 USDC",
        status: "Active",
      },
    ];
    renderPanel(streamsWithMissingDates);
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2027-01-01" } });
    expect(screen.getByText("Stream No Date")).toBeInTheDocument();
    expect(screen.queryByText("Stream Alpha")).not.toBeInTheDocument();
  });

  it("sets aria-describedby on date inputs when date error is present", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-06-10" } });
    expect(screen.getByLabelText("Start Date")).toHaveAttribute("aria-describedby", "date-error");
    expect(screen.getByLabelText("End Date")).toHaveAttribute("aria-describedby", "date-error");
  });

  it("does not set aria-describedby on date inputs when no error", () => {
    renderPanel();
    expect(screen.getByLabelText("Start Date")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText("End Date")).not.toHaveAttribute("aria-describedby");
  });

  // ── Real export trigger path ──────────────────────────────────────────

  it("exports CSV with the date-filtered streams, selected fields, and grouping", () => {
    const { onClose } = renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-04-30" } });
    fireEvent.change(screen.getByLabelText("Grouping"), { target: { value: "Status" } });
    fireEvent.click(screen.getByLabelText("Rate")); // deselect rate

    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));

    expect(downloadReportCSV).toHaveBeenCalledTimes(1);
    const [streamsArg, fieldsArg, groupingArg] = vi.mocked(downloadReportCSV).mock.calls[0]!;
    expect(streamsArg.map((s) => s.id)).toEqual(["2"]);
    expect(fieldsArg).toEqual(["name", "recipient", "status"]);
    expect(groupingArg).toBe("Status");
    expect(addToast).toHaveBeenCalledWith("Successfully exported report as CSV", "success");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("exports PDF through printReportAsPDF and only then shows success", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByLabelText("PDF"));
    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    expect(printReportAsPDF).toHaveBeenCalledTimes(1);
    expect(downloadReportCSV).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith("Successfully exported report as PDF", "success");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not show a success toast when CSV export throws", () => {
    vi.mocked(downloadReportCSV).mockImplementationOnce(() => {
      throw new Error("Export failed");
    });
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));

    expect(addToast).toHaveBeenCalledWith("Failed to export report. Please try again.", "error");
    expect(addToast).not.toHaveBeenCalledWith(
      expect.stringContaining("Successfully exported"),
      "success",
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Retry Export/i })).toBeInTheDocument();
  });

  it("does not show a success toast when PDF export throws", () => {
    vi.mocked(printReportAsPDF).mockImplementationOnce(() => {
      throw new Error("Popup blocked");
    });
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByLabelText("PDF"));
    fireEvent.click(screen.getByRole("button", { name: /Export PDF/i }));

    expect(addToast).toHaveBeenCalledWith("Failed to export report. Please try again.", "error");
    expect(addToast).not.toHaveBeenCalledWith(
      expect.stringContaining("Successfully exported"),
      "success",
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows retry button when export fails", () => {
    vi.mocked(downloadReportCSV).mockImplementationOnce(() => {
      throw new Error("Export failed");
    });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(screen.getByRole("button", { name: /Retry Export/i })).toBeInTheDocument();
  });

  it("hides retry button after retry succeeds", () => {
    vi.mocked(downloadReportCSV)
      .mockImplementationOnce(() => {
        throw new Error("Export failed");
      })
      .mockImplementationOnce(() => {});
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(screen.getByRole("button", { name: /Retry Export/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry Export/i }));
    expect(screen.queryByRole("button", { name: /Retry Export/i })).not.toBeInTheDocument();
  });

  it("shows retry button again when retry fails", () => {
    vi.mocked(downloadReportCSV)
      .mockImplementationOnce(() => {
        throw new Error("Export failed");
      })
      .mockImplementationOnce(() => {
        throw new Error("Retry also failed");
      });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(screen.getByRole("button", { name: /Retry Export/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Retry Export/i }));
    expect(screen.getByRole("button", { name: /Retry Export/i })).toBeInTheDocument();
    expect(addToast).toHaveBeenCalledWith("Failed to export report. Please try again.", "error");
  });

  it("export succeeds with empty streams array", () => {
    const { onClose } = renderPanel([]);
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));
    expect(downloadReportCSV).toHaveBeenCalledWith([], expect.any(Array), "None");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders an aria-live region for export status announcements", () => {
    renderPanel();
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveClass("sr-only");
  });

  it("displays accrued amount as dash when value is undefined", () => {
    const streamsWithUndefinedAccrued: Stream[] = [
      {
        id: "5",
        name: "Stream No Accrued",
        recipient: "GDDDDD",
        rate: "30 USDC",
        status: "Active",
        startDate: "2026-02-01",
      },
    ];
    renderPanel(streamsWithUndefinedAccrued);
    fireEvent.click(screen.getByLabelText("Accrued Amount"));
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  // ── ARIA attributes ───────────────────────────────────────────────────

  it("renders with correct dialog ARIA attributes", () => {
    renderPanel();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Export Treasury Report");
  });

  it("marks date inputs as invalid when date error is present", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-06-10" } });
    expect(screen.getByLabelText("Start Date")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("End Date")).toHaveAttribute("aria-invalid", "true");
  });

  it("sets aria-busy on preview region during loading", () => {
    renderPanel();
    const previewRegion = screen.getByRole("region", { name: /Live Preview/i });
    expect(previewRegion).toHaveAttribute("aria-busy");
  });

  it("renders alert role for date error message", () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-06-10" } });
    expect(screen.getByRole("alert")).toHaveTextContent("End date must be on or after the start date.");
  });
});
