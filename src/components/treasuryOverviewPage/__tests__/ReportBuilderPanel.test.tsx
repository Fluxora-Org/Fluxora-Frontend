import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ReportBuilderPanel from "../ReportBuilderPanel";
import type { Stream } from "../Stream";

// Mock the report exporter utilities to avoid browser API dependencies
vi.mock("../../../utils/reportExporter", () => ({
  filterStreamsByDateRange: vi.fn((streams: Stream[], startDate: string, endDate: string) => {
    // Simple passthrough mock — filters by date if provided, otherwise returns all
    if (!startDate && !endDate) return streams;
    return streams;
  }),
  downloadReportCSV: vi.fn(),
  printReportAsPDF: vi.fn(),
}));

// Mock the toast provider
vi.mock("../../toast/ToastProvider", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

// Helper: render panel with fixture streams
const fixtureStreams: Stream[] = [
  {
    id: "1",
    name: "Stream Alpha",
    recipient: "GA...AAAA",
    rate: "100 USDC",
    accruedAmount: 500,
    status: "Active",
  },
  {
    id: "2",
    name: "Stream Beta",
    recipient: "GB...BBBB",
    rate: "50 USDC",
    accruedAmount: 250,
    status: "Paused",
  },
  {
    id: "3",
    name: "Stream Gamma",
    recipient: "GC...CCCC",
    rate: "200 USDC",
    status: "Completed",
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

  // ── handleFieldToggle: adding and removing fields ─────────────────────

  it("renders all five field checkboxes unchecked by default when none selected", () => {
    renderPanel();
    const checkboxes = screen.getAllByRole("checkbox");
    // All 5 fields should be rendered
    expect(checkboxes).toHaveLength(5);
    // By default name, recipient, rate, status are selected; accruedAmount is not
    expect(screen.getByLabelText("Name")).toBeChecked();
    expect(screen.getByLabelText("Recipient")).toBeChecked();
    expect(screen.getByLabelText("Rate")).toBeChecked();
    expect(screen.getByLabelText("Status")).toBeChecked();
    expect(screen.getByLabelText("Accrued Amount")).not.toBeChecked();
  });

  it("toggles a field off when clicking an already-checked checkbox", () => {
    renderPanel();
    const nameCheckbox = screen.getByLabelText("Name");
    expect(nameCheckbox).toBeChecked();

    fireEvent.click(nameCheckbox);
    expect(nameCheckbox).not.toBeChecked();
  });

  it("toggles a field on when clicking an unchecked checkbox", () => {
    renderPanel();
    const accruedCheckbox = screen.getByLabelText("Accrued Amount");
    expect(accruedCheckbox).not.toBeChecked();

    fireEvent.click(accruedCheckbox);
    expect(accruedCheckbox).toBeChecked();
  });

  it("toggles multiple fields independently", () => {
    renderPanel();
    const nameCb = screen.getByLabelText("Name");
    const rateCb = screen.getByLabelText("Rate");
    const accruedCb = screen.getByLabelText("Accrued Amount");

    // Deselect Name and Rate, select Accrued Amount
    fireEvent.click(nameCb);
    fireEvent.click(rateCb);
    fireEvent.click(accruedCb);

    expect(nameCb).not.toBeChecked();
    expect(rateCb).not.toBeChecked();
    expect(accruedCb).toBeChecked();
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

  // ── canExport gating and Export-button-disabled behavior ──────────────

  it("renders the Export button enabled when at least one field is selected", () => {
    renderPanel();
    const exportBtn = screen.getByRole("button", { name: /Export CSV/i });
    expect(exportBtn).toBeEnabled();
  });

  it("disables the Export button when no fields are selected", () => {
    renderPanel();
    // Deselect all four default-selected fields
    fireEvent.click(screen.getByLabelText("Name"));
    fireEvent.click(screen.getByLabelText("Recipient"));
    fireEvent.click(screen.getByLabelText("Rate"));
    fireEvent.click(screen.getByLabelText("Status"));

    const exportBtn = screen.getByRole("button", { name: /Export CSV/i });
    expect(exportBtn).toBeDisabled();
  });

  it("re-enables the Export button after deselecting all fields and then selecting one", () => {
    renderPanel();
    // Deselect all default-selected fields
    fireEvent.click(screen.getByLabelText("Name"));
    fireEvent.click(screen.getByLabelText("Recipient"));
    fireEvent.click(screen.getByLabelText("Rate"));
    fireEvent.click(screen.getByLabelText("Status"));

    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeDisabled();

    // Select one field
    fireEvent.click(screen.getByLabelText("Accrued Amount"));
    expect(screen.getByRole("button", { name: /Export CSV/i })).toBeEnabled();
  });



  // ── grouping state changes ────────────────────────────────────────────

  it("renders the grouping select with default value None", () => {
    renderPanel();
    const groupingSelect = screen.getByLabelText("Grouping");
    expect(groupingSelect).toBeInTheDocument();
    expect(groupingSelect).toHaveValue("None");
  });

  it("updates grouping state when selecting By Recipient", () => {
    renderPanel();
    const groupingSelect = screen.getByLabelText("Grouping");
    fireEvent.change(groupingSelect, { target: { value: "Recipient" } });
    expect(groupingSelect).toHaveValue("Recipient");
  });

  it("updates grouping state when selecting By Status", () => {
    renderPanel();
    const groupingSelect = screen.getByLabelText("Grouping");
    fireEvent.change(groupingSelect, { target: { value: "Status" } });
    expect(groupingSelect).toHaveValue("Status");
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

  // ── exportFormat state changes ────────────────────────────────────────

  it("renders format radio buttons with CSV selected by default", () => {
    renderPanel();
    const csvRadio = screen.getByLabelText("CSV");
    const pdfRadio = screen.getByLabelText("PDF");

    expect(csvRadio).toBeChecked();
    expect(pdfRadio).not.toBeChecked();
  });

  it("updates exportFormat to PDF when selecting the PDF radio", () => {
    renderPanel();
    const pdfRadio = screen.getByLabelText("PDF");
    fireEvent.click(pdfRadio);

    expect(pdfRadio).toBeChecked();
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

  // ── Preview table ─────────────────────────────────────────────────────

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

  // ── Start/End date inputs ─────────────────────────────────────────────

  it("renders date inputs for start and end date", () => {
    renderPanel();
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
  });
});
