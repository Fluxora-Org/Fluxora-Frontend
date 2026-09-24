import React, { useState } from "react";
import {
  Download,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ReceiptData, downloadReceipt, maskAddress, formatTimestamp, buildReceiptExplorerUrl } from "../../utils/receiptGenerator";
import { clsx } from "clsx";
import { SAFE_EXTERNAL_LINK_ATTRIBUTES } from "../../lib/safeExternalUrl";

export interface TransactionReceiptPreviewProps {
  data: ReceiptData;
  onDownloaded?: () => void;
  className?: string;
}

export const TransactionReceiptPreview: React.FC<TransactionReceiptPreviewProps> = ({
  data,
  onDownloaded,
  className,
}) => {
  const [downloadState, setDownloadState] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPending = data.status === "pending" || !data.txHash;

  const handleDownload = async () => {
    setDownloadState("generating");
    setErrorMsg(null);

    try {
      await downloadReceipt(data, `Fluxora-${data.type}`);
      setDownloadState("success");
      if (onDownloaded) onDownloaded();
      setTimeout(() => setDownloadState("idle"), 3000);
    } catch {
      setDownloadState("error");
      setErrorMsg("Failed to export receipt. Please try again.");
    }
  };

  return (
    <section
      aria-label="Transaction receipt preview"
      role="region"
      className={clsx(
        "w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-neutral)] p-4 sm:p-6 space-y-5 text-left text-[var(--text-vivid)] shadow-md transition-all",
        className
      )}
    >
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] border border-[var(--color-accent-primary)]/30 flex items-center justify-center font-bold text-lg">
            F
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">
              {data.type} Receipt
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-mono">
              ID: #{data.streamId}
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
              <Clock size={14} className="animate-spin-slow" />
              Pending Confirmation
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 size={14} />
              On-Chain Confirmed
            </span>
          )}
        </div>
      </div>

      {/* 2. Amount & Rate Summary Card */}
      <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-neutral)] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
            Total Value
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-[var(--color-accent-primary)]">
            {data.amount}
          </span>
        </div>

        {data.rate && (
          <div className="sm:text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Streaming Rate
            </span>
            <span className="text-sm font-mono font-bold text-[var(--text-vivid)]">
              {data.rate}
            </span>
          </div>
        )}
      </div>

      {/* 3. Parties & Addresses */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Parties & Addresses
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              Sender Account
            </span>
            <span className="font-mono font-semibold text-[var(--text-vivid)] block truncate" title={data.sender}>
              {maskAddress(data.sender)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              Recipient Beneficiary
            </span>
            <span className="font-mono font-semibold text-[var(--text-vivid)] block truncate" title={data.recipient}>
              {maskAddress(data.recipient)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. On-Chain Verification & Tx Hash */}
      <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-neutral)] space-y-2 text-xs">
        <div className="flex items-center justify-between text-[var(--text-muted)] font-semibold">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[var(--color-accent-primary)]" />
            Stellar On-Chain Verification
          </span>
          <span className="font-mono text-[11px]">
            {formatTimestamp(data.timestamp)}
          </span>
        </div>

        {isPending ? (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
            <p className="font-semibold">Pending RPC Confirmation</p>
            <p className="text-[11px] opacity-90">
              Submitted to Stellar network. The downloaded receipt will reflect current pending status.
            </p>
          </div>
        ) : (
          <div className="space-y-1 pt-1">
            <span className="text-[11px] text-[var(--text-muted)] block">
              Transaction Hash:
            </span>
            <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-[var(--color-accent-primary)] truncate">
              <span className="truncate">{data.txHash}</span>
              <a
                href={buildReceiptExplorerUrl(data.txHash!, data.network)}
                {...SAFE_EXTERNAL_LINK_ATTRIBUTES}
                className="inline-flex items-center gap-1 hover:underline flex-shrink-0 text-xs font-sans"
              >
                Explorer <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Error state alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 5. Download Button Action */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloadState === "generating"}
          aria-label={`Download ${data.type} receipt as PNG image`}
          className={clsx(
            "w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
            downloadState === "success"
              ? "bg-emerald-600 text-white"
              : "bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-dark)] text-white"
          )}
        >
          {downloadState === "generating" ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating Receipt...
            </>
          ) : downloadState === "success" ? (
            <>
              <CheckCircle2 size={16} />
              Downloaded!
            </>
          ) : (
            <>
              <Download size={16} />
              Download Receipt (.PNG)
            </>
          )}
        </button>
      </div>
    </section>
  );
};
