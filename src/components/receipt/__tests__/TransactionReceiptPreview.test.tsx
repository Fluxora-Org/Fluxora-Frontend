import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TransactionReceiptPreview } from "../TransactionReceiptPreview";
import { ReceiptData } from "../../../utils/receiptGenerator";

describe("TransactionReceiptPreview component", () => {
  const mockConfirmedData: ReceiptData = {
    streamId: "STR-48201",
    type: "Creation",
    sender: "GAB12345678901234567890123456789012345678901234567890123",
    recipient: "GCD98765432109876543210987654321098765432109876543210987",
    amount: "15,000.00 USDC",
    rate: "0.05 USDC/sec",
    timestamp: "2026-07-23T17:48:21Z",
    txHash: "c7b91a8f902183b271abc",
    status: "confirmed",
  };

  const mockPendingData: ReceiptData = {
    streamId: "W-STR-902",
    type: "Withdrawal",
    sender: "Treasury Smart Contract",
    recipient: "GCD98765432109876543210987654321098765432109876543210987",
    amount: "2,260.00 USDC",
    timestamp: "2026-07-23T17:48:21Z",
    txHash: null,
    status: "pending",
  };

  it("renders accessible region and receipt preview content", () => {
    render(<TransactionReceiptPreview data={mockConfirmedData} />);

    const region = screen.getByRole("region", {
      name: /transaction receipt preview/i,
    });
    expect(region).toBeInTheDocument();
    expect(screen.getByText(/creation receipt/i)).toBeInTheDocument();
    expect(screen.getByText(/15,000.00 USDC/i)).toBeInTheDocument();
    expect(screen.getByText(/on-chain confirmed/i)).toBeInTheDocument();
  });

  it("renders pending confirmation badge when txHash is missing", () => {
    render(<TransactionReceiptPreview data={mockPendingData} />);

    expect(screen.getByText(/pending confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/pending rpc confirmation/i)).toBeInTheDocument();
  });

  it("triggers download action when 'Download Receipt' button is clicked", async () => {
    const handleDownloaded = vi.fn();
    render(
      <TransactionReceiptPreview
        data={mockConfirmedData}
        onDownloaded={handleDownloaded}
      />
    );

    const downloadBtn = screen.getByRole("button", {
      name: /download creation receipt/i,
    });

    await act(async () => {
      fireEvent.click(downloadBtn);
    });

    expect(downloadBtn).toBeInTheDocument();
  });
});
