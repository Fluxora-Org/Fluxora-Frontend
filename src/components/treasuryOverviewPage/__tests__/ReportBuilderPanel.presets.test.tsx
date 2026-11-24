import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ReportBuilderPanel from "../ReportBuilderPanel";
import type { Stream } from "../Stream";

const addToast = vi.fn();

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
    accruedAmount: 0,
    status: "Completed",
    startDate: "2026-06-01",
  },
];

function renderPanel(streams: Stream[] = fixtureStreams) {
  const onClose = vi.fn();
  const utils = render(<ReportBuilderPanel streams={streams} onClose={onClose} />);
  return { ...utils, onClose };
}

describe("ReportBuilderPanel saved presets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("creates, applies, renames, and deletes a saved preset with live announcements", () => {
    const { unmount } = renderPanel();

    // Configure custom filters
    fireEvent.change(screen.getByLabelText("Start Date"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("End Date"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Grouping"), { target: { value: "Status" } });
    fireEvent.click(screen.getByRole("button", { name: "Active" }));
    fireEvent.click(screen.getByLabelText("PDF"));

    // Save preset
    fireEvent.click(screen.getByRole("button", { name: "Save Preset" }));
    const nameInput = screen.getByLabelText("New preset name");
    fireEvent.change(nameInput, { target: { value: "Q1 Active PDF" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Save" }));

    expect(screen.getByRole("status")).toHaveTextContent('Saved preset "Q1 Active PDF".');
    expect(screen.getByLabelText(/Saved Presets/i)).toHaveTextContent("Q1 Active PDF");

    // Rename preset
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    const renameInput = screen.getByLabelText("Rename preset");
    fireEvent.change(renameInput, { target: { value: "Q1 Active Report" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Rename" }));

    expect(screen.getByRole("status")).toHaveTextContent('Renamed preset to "Q1 Active Report".');

    // Remount fresh panel and apply the saved preset
    unmount();
    renderPanel();

    const presetSelect = screen.getByLabelText(/Saved Presets/i) as HTMLSelectElement;
    const savedOption = Array.from(presetSelect.options).find(
      (opt) => opt.textContent === "Q1 Active Report"
    );
    expect(savedOption).toBeDefined();

    fireEvent.change(presetSelect, { target: { value: savedOption!.value } });

    expect(screen.getByRole("status")).toHaveTextContent('Applied preset "Q1 Active Report".');
    expect(screen.getByLabelText("Start Date")).toHaveValue("2026-01-01");
    expect(screen.getByLabelText("End Date")).toHaveValue("2026-04-01");
    expect(screen.getByLabelText("Grouping")).toHaveValue("Status");
    expect(screen.getByRole("button", { name: "Active" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("PDF")).toBeChecked();
    expect(screen.getByText("Stream Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Stream Beta")).not.toBeInTheDocument();

    // Delete preset
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("status")).toHaveTextContent('Deleted preset "Q1 Active Report".');
    expect(screen.getByLabelText(/Saved Presets/i)).toHaveTextContent("No saved presets");
  });

  it("saves and re-resolves a relative date range preset", () => {
    const { unmount } = renderPanel();

    fireEvent.change(screen.getByLabelText("Date Range Preset"), {
      target: { value: "last_30_days" },
    });
    expect((screen.getByLabelText("Start Date") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((screen.getByLabelText("End Date") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    fireEvent.click(screen.getByRole("button", { name: "Save Preset" }));
    fireEvent.change(screen.getByLabelText("New preset name"), {
      target: { value: "Rolling 30d" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Save" }));

    unmount();
    renderPanel();

    const presetSelect = screen.getByLabelText(/Saved Presets/i) as HTMLSelectElement;
    const savedOption = Array.from(presetSelect.options).find(
      (opt) => opt.textContent === "Rolling 30d"
    );
    fireEvent.change(presetSelect, { target: { value: savedOption!.value } });

    expect(screen.getByLabelText("Date Range Preset")).toHaveValue("last_30_days");
    expect((screen.getByLabelText("Start Date") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("cancels inline preset form on Escape without closing the dialog", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Save Preset" }));
    expect(screen.getByLabelText("New preset name")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByLabelText("New preset name")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
