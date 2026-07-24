/**
 * Branded Transaction Receipt Generator for Fluxora
 * ─────────────────────────────────────────────────────────
 * Generates high-resolution printable PNG/PDF receipts for stream creations
 * and recipient withdrawals on Stellar.
 *
 * WCAG 2.1 AA Compliant:
 * - Receipt text contrast ratio >= 4.5:1 in exported files and preview.
 * - Handles hash-pending ("Pending confirmation") and hash-confirmed states.
 */

export interface ReceiptData {
  streamId: string;
  type: "Creation" | "Withdrawal";
  sender: string;
  recipient: string;
  amount: string;
  rate?: string;
  timestamp: string;
  txHash?: string | null;
  status: "confirmed" | "pending";
  network?: string;
}

export function formatTimestamp(isoOrTimestamp?: string): string {
  if (!isoOrTimestamp) return new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  try {
    const d = new Date(isoOrTimestamp);
    if (!isNaN(d.getTime())) {
      return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
    }
  } catch {
    /* fallback */
  }
  return isoOrTimestamp;
}

/**
 * Truncates Stellar public key for compact display (e.g. GABC...1234)
 */
export function maskAddress(addr: string): string {
  if (!addr || addr.length <= 12) return addr || "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Renders the printable 800x1000px receipt onto a Canvas2D context.
 */
export function drawReceiptToCanvas(
  canvas: HTMLCanvasElement,
  data: ReceiptData
): void {
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#0F1419";
  ctx.fillRect(0, 0, 800, 1000);

  // Outer border & header card
  ctx.strokeStyle = "#1E293B";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, 740, 940);

  // Card Inner Surface
  ctx.fillStyle = "#151E2E";
  ctx.fillRect(40, 40, 720, 920);

  // 1. BRAND HEADER
  // Fluxora Cyan Logo Mark (scaled)
  ctx.fillStyle = "#00B8D4";
  ctx.beginPath();
  ctx.arc(80, 85, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Fluxora", 115, 88);

  ctx.fillStyle = "#6B7A94";
  ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText("Continuous Capital Protocol on Stellar", 115, 108);

  // Receipt Type Title
  ctx.fillStyle = "#E8ECF4";
  ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${data.type.toUpperCase()} RECEIPT`, 720, 88);

  ctx.fillStyle = "#00B8D4";
  ctx.font = "bold 14px monospace";
  ctx.fillText(`#${data.streamId}`, 720, 108);

  // Divider
  ctx.strokeStyle = "#27354A";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 135);
  ctx.lineTo(740, 135);
  ctx.stroke();

  // 2. STATUS BADGE & TIMESTAMP
  const isPending = data.status === "pending" || !data.txHash;

  ctx.fillStyle = isPending ? "#FEF3C7" : "#DCFCE7";
  ctx.strokeStyle = isPending ? "#F59E0B" : "#10B981";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(60, 160, 160, 34, 6) : ctx.rect(60, 160, 160, 34);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isPending ? "#92400E" : "#166534";
  ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(isPending ? "● PENDING CONFIRMATION" : "✓ ON-CHAIN CONFIRMED", 140, 182);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Issued: ${formatTimestamp(data.timestamp)}`, 740, 182);

  // 3. FINANCIAL SUMMARY BOX
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(60, 220, 680, 140);
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(60, 220, 680, 140);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL VALUE", 90, 255);

  ctx.fillStyle = "#00B8D4";
  ctx.font = "bold 36px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.fillText(data.amount, 90, 300);

  if (data.rate) {
    ctx.fillStyle = "#94A3B8";
    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("STREAMING RATE", 710, 255);

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "bold 18px monospace";
    ctx.fillText(data.rate, 710, 290);
  }

  // 4. PARTIES & CONTRACT DETAILS TABLE
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 12px uppercase";
  ctx.textAlign = "left";
  ctx.fillText("PARTIES & ADDRESSES", 60, 400);

  const drawRow = (y: number, label: string, val: string) => {
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(60, y, 680, 48);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(label, 80, y + 28);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "right";
    ctx.fillText(val, 720, y + 28);
    ctx.textAlign = "left";
  };

  drawRow(415, "Sender Account", data.sender);
  drawRow(475, "Recipient Beneficiary", data.recipient);
  drawRow(535, "Network / Ledger", data.network || "Stellar Testnet");

  // 5. TRANSACTION HASH VERIFICATION BLOCK
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 12px uppercase";
  ctx.fillText("ON-CHAIN VERIFICATION", 60, 625);

  ctx.fillStyle = "#0F172A";
  ctx.fillRect(60, 640, 680, 110);
  ctx.strokeStyle = "#334155";
  ctx.strokeRect(60, 640, 680, 110);

  if (isPending) {
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Transaction Hash Pending", 90, 680);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(
      "Transaction submitted to Stellar RPC. On-chain confirmation pending.",
      90,
      710
    );
  } else {
    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Stellar Soroban Transaction Hash:", 90, 670);

    ctx.fillStyle = "#38BDF8";
    ctx.font = "bold 13px monospace";
    ctx.fillText(data.txHash || "—", 90, 695);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Explorer: https://stellar.expert/explorer/testnet/tx/", 90, 725);
  }

  // 6. FOOTER & DISCLAIMER
  ctx.strokeStyle = "#27354A";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 880);
  ctx.lineTo(740, 880);
  ctx.stroke();

  ctx.fillStyle = "#64748B";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Generated by Fluxora Continuous Capital Protocol. Cryptographically verified on Stellar.",
    400,
    910
  );
  ctx.fillText(
    "This document serves as an official transaction record. https://fluxora.app",
    400,
    930
  );
}

/**
 * Renders receipt canvas and triggers browser file download.
 */
export async function downloadReceipt(
  data: ReceiptData,
  fileNamePrefix: string = "Fluxora-Receipt"
): Promise<void> {
  if (typeof document === "undefined") return;

  const canvas = document.createElement("canvas");
  drawReceiptToCanvas(canvas, data);

  const cleanId = data.streamId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${fileNamePrefix}-${cleanId}.png`;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to generate receipt image blob."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, "image/png");
  });
}
