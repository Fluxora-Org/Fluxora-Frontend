import { describe, it, expect, vi } from "vitest";
import {
  maskAddress,
  formatTimestamp,
  drawReceiptToCanvas,
  buildReceiptExplorerUrl,
  resolveReceiptNetworkLabel,
  resolveReceiptExplorerSegment,
  ReceiptData,
} from "../receiptGenerator";

function createMockContext() {
  return {
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
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textAlign: "",
  } as unknown as CanvasRenderingContext2D;
}

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

  it("resolves network label and explorer segment from configured values", () => {
    expect(resolveReceiptNetworkLabel("Public Network (Mainnet)")).toBe(
      "Public Network (Mainnet)",
    );
    expect(resolveReceiptExplorerSegment("PUBLIC")).toBe("public");
    expect(resolveReceiptExplorerSegment("Public Network (Mainnet)")).toBe(
      "public",
    );
    expect(resolveReceiptExplorerSegment("Testnet")).toBe("testnet");
    expect(
      buildReceiptExplorerUrl("abc123hash", "Public Network (Mainnet)"),
    ).toBe("https://stellar.expert/explorer/public/tx/abc123hash");
  });

  it("draws receipt to canvas for confirmed and pending states without throwing", () => {
    const mockContext = createMockContext();
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

  it("draws the configured network label and a complete explorer URL with tx hash", () => {
    const mockContext = createMockContext();
    const fillText = mockContext.fillText as ReturnType<typeof vi.fn>;
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(mockContext);

    const txHash =
      "c7b91a8f902183b271a1b2c3d4e5f678901234567890abcdef1234567890ab";
    const confirmedData: ReceiptData = {
      streamId: "STR-101",
      type: "Creation",
      sender: "GAB12345678901234567890123456789012345678901234567890123",
      recipient: "GCD12345678901234567890123456789012345678901234567890123",
      amount: "10,000.00 USDC",
      rate: "0.0261 USDC/sec",
      timestamp: "2026-07-23T17:48:21Z",
      txHash,
      status: "confirmed",
      network: "Public Network (Mainnet)",
    };

    drawReceiptToCanvas(canvas, confirmedData);

    const drawnText = fillText.mock.calls.map((call) => String(call[0]));
    expect(drawnText).toContain("Public Network (Mainnet)");
    expect(drawnText).toContain(
      `Explorer: https://stellar.expert/explorer/public/tx/${txHash}`,
    );
    expect(drawnText.some((t) => t.includes("Stellar Testnet"))).toBe(false);
    expect(
      drawnText.some(
        (t) =>
          t.startsWith("Explorer:") &&
          t.includes("/tx/") &&
          !t.includes(txHash),
      ),
    ).toBe(false);
  });

  it("uses the app-configured network label when callers omit data.network", () => {
    const mockContext = createMockContext();
    const fillText = mockContext.fillText as ReturnType<typeof vi.fn>;
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(mockContext);

    const txHash = "deadbeefcafe0123456789";
    drawReceiptToCanvas(canvas, {
      streamId: "STR-103",
      type: "Withdrawal",
      sender: "Treasury",
      recipient: "GCD12345678901234567890123456789012345678901234567890123",
      amount: "100 USDC",
      timestamp: "2026-07-23T17:48:21Z",
      txHash,
      status: "confirmed",
    });

    const drawnText = fillText.mock.calls.map((call) => String(call[0]));
    const expectedNetwork = resolveReceiptNetworkLabel();
    const expectedSegment = resolveReceiptExplorerSegment();
    expect(drawnText).toContain(expectedNetwork);
    expect(drawnText).toContain(
      `Explorer: https://stellar.expert/explorer/${expectedSegment}/tx/${txHash}`,
    );
  });
});
