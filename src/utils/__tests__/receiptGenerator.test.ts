import { describe, it, expect, vi } from "vitest";
import {
  maskAddress,
  formatTimestamp,
  drawReceiptToCanvas,
  downloadReceipt,
  ReceiptData,
} from "../receiptGenerator";

describe("receiptGenerator utility", () => {
  it("formats maskAddress for compact display", () => {
    expect(
      maskAddress("GAB12345678901234567890123456789012345678901234567890123")
    ).toBe("GAB123...0123");
    expect(maskAddress("GAB123")).toBe("GAB123");
    expect(maskAddress("")).toBe("—");
  });

  it("formats timestamp cleanly", () => {
    const ts = formatTimestamp("2026-07-23T17:48:21.000Z");
    expect(ts).toBe("2026-07-23 17:48:21 UTC");
  });

  it("draws receipt to canvas for confirmed and pending states without throwing", () => {
    const mockContext = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      rect: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      font: "",
      textAlign: "",
    } as unknown as CanvasRenderingContext2D;

    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(mockContext);

    const confirmedData: ReceiptData = {
      streamId: "STR-101",
      type: "Creation",
      sender: "GAB12345678901234567890123456789012345678901234567890123",
      recipient: "GCD12345678901234567890123456789012345678901234567890123",
      amount: "10,000.00 USDC",
      rate: "0.0261 USDC/sec",
      timestamp: "2026-07-23T17:48:21Z",
      txHash: "c7b91a8f902183b271",
      status: "confirmed",
    };

    const pendingData: ReceiptData = {
      streamId: "STR-102",
      type: "Withdrawal",
      sender: "Treasury Contract",
      recipient: "GCD12345678901234567890123456789012345678901234567890123",
      amount: "2,500.00 USDC",
      timestamp: "2026-07-23T17:48:21Z",
      txHash: null,
      status: "pending",
    };

    expect(() => drawReceiptToCanvas(canvas, confirmedData)).not.toThrow();
    expect(() => drawReceiptToCanvas(canvas, pendingData)).not.toThrow();
  });
});
