import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi } from "vitest";
import PreviewValidateStep from "../PreviewValidateStep";
import type { CsvRow } from "../types";

const VALID_ADDR_1 = "GAEA6FQ5EQVTEOKAI5HFKXDDNJYXQ74GRWKJXIVJWC335ROM2PNODIMK";
const VALID_ADDR_2 = "GAERAFY6EUWDGOSBJBHVMXLENNZHTAEHR2KZZI5KWG4L7RWN2TN6EMHG";

function createRow(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    id: `row-${Math.random().toString(36).slice(2, 7)}`,
    rowNumber: 1,
    recipient: VALID_ADDR_1,
    depositAmount: "100",
    accrualRatePerDay: "10",
    durationDays: "30",
    status: "valid",
    fieldErrors: {},
    ...overrides,
  };
}

describe("PreviewValidateStep — duplicate handling, validation, and actions", () => {
  it("renders duplicate badge and duplicate hint for duplicate-recipient rows", () => {
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [2],
      }),
      createRow({
        id: "r2",
        rowNumber: 2,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [1],
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={vi.fn()}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    expect(screen.getByText("2 duplicates")).toBeInTheDocument();
    expect(screen.getByText("Also in row 2")).toBeInTheDocument();
    expect(screen.getByText("Also in row 1")).toBeInTheDocument();
  });

  it("shows both Edit and Skip buttons for duplicate-recipient rows", () => {
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [2],
      }),
      createRow({
        id: "r2",
        rowNumber: 2,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [1],
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={vi.fn()}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    const editButtons = screen.getAllByRole("button", { name: /Edit row/i });
    const skipButtons = screen.getAllByRole("button", { name: /Skip row/i });

    expect(editButtons).toHaveLength(2);
    expect(skipButtons).toHaveLength(2);
  });

  it("disables the review button when all rows are duplicate-recipient or invalid", () => {
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [2],
      }),
      createRow({
        id: "r2",
        rowNumber: 2,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [1],
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={vi.fn()}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    const reviewBtn = screen.getByRole("button", {
      name: /Review batch to dry-run preview/i,
    });
    expect(reviewBtn).toBeDisabled();
  });

  it("enables the review button and calls onReview when at least one row is strictly valid", () => {
    const onReview = vi.fn();
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        recipient: VALID_ADDR_1,
        status: "valid",
      }),
      createRow({
        id: "r2",
        rowNumber: 2,
        recipient: VALID_ADDR_2,
        status: "duplicate-recipient",
        duplicateRows: [3],
      }),
      createRow({
        id: "r3",
        rowNumber: 3,
        recipient: VALID_ADDR_2,
        status: "duplicate-recipient",
        duplicateRows: [2],
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={vi.fn()}
        onReview={onReview}
        onReplaceFile={vi.fn()}
      />,
    );

    const reviewBtn = screen.getByRole("button", {
      name: /Review batch to dry-run preview/i,
    });
    expect(reviewBtn).toBeEnabled();

    fireEvent.click(reviewBtn);
    expect(onReview).toHaveBeenCalledTimes(1);
  });

  it("skipping one duplicate dynamically unblocks the remaining duplicate row to valid", () => {
    const onRowsChange = vi.fn();
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [2],
      }),
      createRow({
        id: "r2",
        rowNumber: 2,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [1],
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={onRowsChange}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    const skipRow2Btn = screen.getByRole("button", { name: "Skip row 2" });
    fireEvent.click(skipRow2Btn);

    expect(onRowsChange).toHaveBeenCalledTimes(1);
    const updatedRows: CsvRow[] = onRowsChange.mock.calls[0][0];

    // Row 1 should be restored to valid and duplicateRows cleared
    expect(updatedRows[0].status).toBe("valid");
    expect(updatedRows[0].duplicateRows).toBeUndefined();

    // Row 2 should be marked skipped
    expect(updatedRows[1].status).toBe("skipped");
  });

  it("editing a duplicate row to a unique address dynamically restores both rows to valid", () => {
    const onRowsChange = vi.fn();
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [2],
      }),
      createRow({
        id: "r2",
        rowNumber: 2,
        recipient: VALID_ADDR_1,
        status: "duplicate-recipient",
        duplicateRows: [1],
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={onRowsChange}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    // Click edit on row 2
    const editBtn = screen.getByRole("button", { name: "Edit row 2" });
    fireEvent.click(editBtn);

    // Find the recipient input
    const recipientInput = screen.getByLabelText(/^Recipient$/i);
    fireEvent.change(recipientInput, { target: { value: VALID_ADDR_2 } });

    // Click Save
    const saveBtn = screen.getByRole("button", { name: "Save" });
    fireEvent.click(saveBtn);

    expect(onRowsChange).toHaveBeenCalledTimes(1);
    const updatedRows: CsvRow[] = onRowsChange.mock.calls[0][0];

    expect(updatedRows[0].status).toBe("valid");
    expect(updatedRows[0].duplicateRows).toBeUndefined();
    expect(updatedRows[1].status).toBe("valid");
    expect(updatedRows[1].duplicateRows).toBeUndefined();
    expect(updatedRows[1].recipient).toBe(VALID_ADDR_2);
  });

  it("handles invalid inline edit values by showing validation error and not saving", () => {
    const onRowsChange = vi.fn();
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        recipient: VALID_ADDR_1,
        status: "valid",
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={onRowsChange}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit row 1" }));

    const depositInput = screen.getByLabelText(/^Deposit$/i);
    fireEvent.change(depositInput, { target: { value: "-50" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Deposit must be a positive number"),
    ).toBeInTheDocument();
    expect(onRowsChange).not.toHaveBeenCalled();

    // Cancel edit
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText(/^Deposit$/i)).not.toBeInTheDocument();
  });

  it("skips all invalid rows via the bulk skip button", () => {
    const onRowsChange = vi.fn();
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        status: "valid",
      }),
      createRow({
        id: "r2",
        rowNumber: 2,
        recipient: "invalid-address",
        status: "needs-fix",
        fieldErrors: { recipient: "Invalid Stellar address" },
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={onRowsChange}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    const skipAllBtn = screen.getByRole("button", {
      name: "Skip invalid rows",
    });
    fireEvent.click(skipAllBtn);

    expect(onRowsChange).toHaveBeenCalledTimes(1);
    const updatedRows: CsvRow[] = onRowsChange.mock.calls[0][0];
    expect(updatedRows[0].status).toBe("valid");
    expect(updatedRows[1].status).toBe("skipped");
  });

  it("renders loading state when isLoading is true", () => {
    render(
      <PreviewValidateStep
        rows={[]}
        onRowsChange={vi.fn()}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
        isLoading
      />,
    );

    expect(screen.getByText("Loading preview...")).toBeInTheDocument();
  });

  it("renders error state with retry and replace actions", () => {
    const onRetry = vi.fn();
    const onReplaceFile = vi.fn();

    render(
      <PreviewValidateStep
        rows={[]}
        onRowsChange={vi.fn()}
        onReview={vi.fn()}
        onReplaceFile={onReplaceFile}
        error="Failed to load preview."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText("Failed to load preview.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Replace CSV" }));
    expect(onReplaceFile).toHaveBeenCalledTimes(1);
  });

  it("opens and confirms the Replace CSV modal", () => {
    const onReplaceFile = vi.fn();
    const rows: CsvRow[] = [
      createRow({
        id: "r1",
        rowNumber: 1,
        status: "valid",
      }),
    ];

    render(
      <PreviewValidateStep
        rows={rows}
        onRowsChange={vi.fn()}
        onReview={vi.fn()}
        onReplaceFile={onReplaceFile}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Replace CSV file" }));
    expect(screen.getByText("Replace CSV File?")).toBeInTheDocument();

    // Cancel first
    const cancelBtns = screen.getAllByRole("button", { name: "Cancel" });
    fireEvent.click(cancelBtns[0]);
    expect(screen.queryByText("Replace CSV File?")).not.toBeInTheDocument();
    expect(onReplaceFile).not.toHaveBeenCalled();

    // Reopen and confirm
    fireEvent.click(screen.getByRole("button", { name: "Replace CSV file" }));
    fireEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(onReplaceFile).toHaveBeenCalledTimes(1);
  });

  it("renders empty state when rows array is empty", () => {
    render(
      <PreviewValidateStep
        rows={[]}
        onRowsChange={vi.fn()}
        onReview={vi.fn()}
        onReplaceFile={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        (_, element) => element?.textContent === "Reviewing 0 streams",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No valid rows found in this file."),
    ).toBeInTheDocument();
  });
});
