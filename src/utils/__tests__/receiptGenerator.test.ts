import { describe, it, expect, vi, afterEach } from "vitest";
import {
  maskAddress,
  formatTimestamp,
  drawReceiptToCanvas,
  buildReceiptExplorerUrl,
  resolveReceiptNetworkLabel,
  resolveReceiptExplorerSegment,
  formatReceiptAmount,
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

describe("formatReceiptAmount — precision-safe receipt amounts", () => {
  afterEach(() => {
    // Restore the default locale so other tests are unaffected.
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
    });
  });

  function setMockLocale(locale: string) {
    Object.defineProperty(navigator, "language", {
      value: locale,
      configurable: true,
      writable: true,
    });
  }

  // ── Ordinary and boundary amounts (smallest-unit input) ─────────────────

  it("formats a safe integer amount", () => {
    // 1000 USDC = 10_000_000_000 smallest units at 7 decimals
    expect(formatReceiptAmount("10000000000", 7, "USDC")).toBe(
      "1,000.0000000 USDC",
    );
  });

  it("formats Number.MAX_SAFE_INTEGER exactly", () => {
    expect(formatReceiptAmount("9007199254740991", 0, "USDC")).toBe(
      "9,007,199,254,740,991 USDC",
    );
  });

  it("preserves MAX_SAFE_INTEGER + 1 exactly (never rounded)", () => {
    expect(formatReceiptAmount("9007199254740992", 0, "USDC")).toBe(
      "9,007,199,254,740,992 USDC",
    );
  });

  it("preserves MAX_SAFE_INTEGER + 2 exactly (distinct from +1)", () => {
    expect(formatReceiptAmount("9007199254740993", 0, "USDC")).toBe(
      "9,007,199,254,740,993 USDC",
    );
  });

  it("accepts a bigint amount directly", () => {
    expect(formatReceiptAmount(9_007_199_254_740_993n, 0, "USDC")).toBe(
      "9,007,199,254,740,993 USDC",
    );
  });

  it("preserves a very large token amount exactly", () => {
    expect(formatReceiptAmount("12345678901234567890", 0, "")).toBe(
      "12,345,678,901,234,567,890",
    );
  });

  // ── Fractional precision ────────────────────────────────────────────────

  it("preserves a large amount with the token's full decimal precision", () => {
    // 12_345_678_901_234_567_890.1234567 USDC at 7 decimals
    expect(
      formatReceiptAmount("123456789012345678901234567", 7, "USDC"),
    ).toBe("12,345,678,901,234,567,890.1234567 USDC");
  });

  it("renders the smallest valid unit", () => {
    expect(formatReceiptAmount("1", 7, "USDC")).toBe("0.0000001 USDC");
  });

  it("renders zero with the configured decimal places", () => {
    expect(formatReceiptAmount("0", 7, "USDC")).toBe("0.0000000 USDC");
  });

  it("keeps trailing decimal zeros exactly", () => {
    // 1.0000000 USDC = 10_000_000 smallest units at 7 decimals
    expect(formatReceiptAmount("10000000", 7, "USDC")).toBe(
      "1.0000000 USDC",
    );
  });

  it("uses the documented USDC defaults (7 decimals, USDC asset)", () => {
    // 100 USDC = 1_000_000_000 smallest units
    expect(formatReceiptAmount("1000000000")).toBe("100.0000000 USDC");
  });

  it("supports negative amounts", () => {
    expect(formatReceiptAmount("-1005000000", 7, "USDC")).toBe(
      "-100.5000000 USDC",
    );
  });

  // ── Locale formatting without precision loss ────────────────────────────

  it("formats with en-US grouping and decimal separator by default", () => {
    // 9_007_199_254_740_993.1234567 USDC at 7 decimals
    expect(formatReceiptAmount("90071992547409931234567", 7, "USDC")).toBe(
      "9,007,199,254,740,993.1234567 USDC",
    );
  });

  it("respects the browser locale (de-DE) without losing precision", () => {
    setMockLocale("de-DE");
    expect(formatReceiptAmount("90071992547409931234567", 7, "USDC")).toBe(
      "9.007.199.254.740.993,1234567 USDC",
    );
  });

  // ── Invalid inputs must throw, never silently become a valid amount ─────

  it.each([
    "abc",
    "",
    "1.2.3",
    "NaN",
    "Infinity",
    "-Infinity",
    "1e5",
    "12,34",
    ".",
    "1.",
    "-",
  ])("throws TypeError for malformed amount %j", (input) => {
    expect(() => formatReceiptAmount(input, 7, "USDC")).toThrow(TypeError);
  });

  it("rejects decimal display-unit strings instead of guessing the unit", () => {
    // "100" is ambiguous (100 USDC vs 100 stroops) — must never guess.
    expect(() => formatReceiptAmount("100.5", 7, "USDC")).toThrow(TypeError);
    expect(() => formatReceiptAmount("100.5", 7, "USDC")).toThrow(
      /amountToSmallestUnits/,
    );
  });

  // ── Receipt rendering / exported text ───────────────────────────────────

  it("draws the exact large amount on the receipt canvas (exported text)", () => {
    const mockContext = createMockContext();
    const fillText = mockContext.fillText as ReturnType<typeof vi.fn>;
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(mockContext);

    const amount = formatReceiptAmount(
      "90071992547409931234567",
      7,
      "USDC",
    );
    drawReceiptToCanvas(canvas, {
      streamId: "STR-1422",
      type: "Withdrawal",
      sender: "Treasury Contract",
      recipient: "GCD12345678901234567890123456789012345678901234567890123",
      amount,
      timestamp: "2026-07-23T17:48:21Z",
      txHash: "abc123",
      status: "confirmed",
    });

    const drawnText = fillText.mock.calls.map((call) => String(call[0]));
    expect(drawnText).toContain("9,007,199,254,740,993.1234567 USDC");
    expect(drawnText).not.toContain("9007199254740992"); // no rounding
  });
});
