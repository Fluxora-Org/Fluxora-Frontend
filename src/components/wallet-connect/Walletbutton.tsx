import React, { useState, useRef } from "react";
import { useWallet } from "./Walletcontext";
import ConnectWalletModal from "../ConnectWalletModal";
import { copyToClipboard } from "../../hooks/useClipboard";

import { ChevronDown, Copy, Check, ExternalLink, LogOut, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { stellarExplorerUrl } from "../../lib/stellar";
import { formatAddress } from "../common/TruncatedAddress";

export default function WalletButton() {
  const { address, network, connected, disconnect, isNetworkMismatch, expectedNetwork, loading } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const connectTriggerRef = useRef<HTMLButtonElement>(null);

  // The canonical ConnectWalletModal performs the Freighter connection and
  // error handling internally; WalletButton just closes once it succeeds.
  function handleConnectFreighter() {
    setModalOpen(false);
  }

  function handleOpenModal() {
    setModalOpen(true);
  }

  async function handleCopy() {
    if (!address) return;
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyFailed(true);
      setCopied(false);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  }

  function handleExplorer() {
    if (!address) return;
    window.open(stellarExplorerUrl(address, network), "_blank", "noopener,noreferrer");
    setDropdownOpen(false);
  }

  function handleDisconnect() {
    disconnect();
    setDropdownOpen(false);
    // Defer focus until the connected UI is replaced by the "Connect wallet" button
    requestAnimationFrame(() => connectTriggerRef.current?.focus());
  }

  function handleDropdownKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") setDropdownOpen(false);
  }

  // ── State precedence: loading > disconnected > wrong network > connected ──
  if (loading) {
    return (
      <div className="flex items-center gap-2" aria-label="Loading wallet…" role="status">
        <div className="h-8 w-20 rounded-full bg-[var(--surface)] animate-pulse" />
        <div className="h-9 w-32 rounded-full bg-[var(--surface)] animate-pulse" />
      </div>
    );
  }

  // ── Disconnected ────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <>
        <button
          ref={connectTriggerRef}
          onClick={handleOpenModal}
          className="px-4 py-3 text-base font-medium text-white rounded-lg transition-all duration-200 ease-in-out cursor-pointer"
          style={{
            backgroundColor: "var(--color-accent-primary)",
            boxShadow: "var(--shadow-accent-primary)",
          }}
        >
          Connect wallet
        </button>
        <ConnectWalletModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConnectFreighter={handleConnectFreighter}
          showStateSwitcher={false}
        />
      </>
    );
  }

  // ── Wrong network ────────────────────────────────────────────────────────
  if (isNetworkMismatch) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/40">
          <AlertTriangle size={14} />
          Expected {expectedNetwork}
        </span>
        <button
          ref={connectTriggerRef}
          onClick={handleOpenModal}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 ease-in-out cursor-pointer"
          style={{
            backgroundColor: "var(--color-accent-primary)",
            boxShadow: "var(--shadow-accent-primary)",
          }}
        >
          Switch Network
        </button>
        <ConnectWalletModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConnectFreighter={handleConnectFreighter}
          showStateSwitcher={false}
        />
      </div>
    );
  }

  //Connected
  return (
    <>
      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="relative flex items-center gap-2" ref={containerRef}>
        {/* Network badge */}
        {network && (
          <span
            className={cn(
              "px-2.5 py-1 text-[11px] font-bold tracking-widest rounded-lg select-none border",
              network === "PUBLIC"
                ? "bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-bg)]"
                : "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-bg)]",
            )}
          >
            {network}
          </span>
        )}

        {/* Pill trigger */}
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          onKeyDown={handleDropdownKey}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-[var(--color-text-primary)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)] border cursor-pointer",
            dropdownOpen
              ? "bg-[var(--interactive-bg-active)] border-[var(--focus-ring-color)]"
              : "bg-[var(--color-surface-elevated)] border-[var(--color-border-default)] hover:bg-[var(--interactive-bg-hover)]",
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--status-success)] shrink-0 shadow-[0_0_6px_var(--status-success)]" />
          <span className="font-mono">{formatAddress(address!)}</span>
          <ChevronDown
            size={12}
            className={cn(
              "text-[var(--color-text-secondary)] transition-transform duration-200",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            role="menu"
            onKeyDown={handleDropdownKey}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl z-50 overflow-hidden bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] shadow-[var(--shadow-xl)]"
          >
            {/* Address block */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-muted)] mb-2">
                Connected Address
              </p>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[13px] text-[var(--color-text-primary)] break-all leading-relaxed flex-1">
                  {address}
                </span>
                <button
                  onClick={handleCopy}
                  aria-label="Copy address"
                  className="shrink-0 mt-0.5 p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--interactive-bg-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring-color)]"
                >
                  {copied ? (
                    <Check size={15} className="text-emerald-400" />
                  ) : copyFailed ? (
                    <AlertCircle size={15} className="text-rose-400" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            </div>

            <div className="mx-4 h-px bg-[var(--color-border-default)]" />

            {/* Actions */}
            <div className="py-1.5">
              <button
                role="menuitem"
                onClick={handleCopy}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--interactive-bg-hover)] transition-colors focus:outline-none focus:bg-[var(--interactive-bg-active)]"
              >
                {copied ? (
                  <Check size={15} className="text-emerald-400" />
                ) : copyFailed ? (
                  <AlertCircle size={15} className="text-rose-400" />
                ) : (
                  <Copy size={15} className="text-[var(--color-text-muted)]" />
                )}
                {copied ? "Copied!" : copyFailed ? "Failed to copy!" : "Copy address"}
              </button>

              <button
                role="menuitem"
                onClick={handleExplorer}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--interactive-bg-hover)] transition-colors focus:outline-none focus:bg-[var(--interactive-bg-active)]"
              >
                <ExternalLink size={15} className="text-[var(--color-text-muted)]" />
                View on Stellar Explorer
              </button>

              <div className="mx-4 my-1.5 h-px bg-[var(--color-border-default)]" />

              <button
                role="menuitem"
                onClick={handleDisconnect}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors focus:outline-none focus:bg-[var(--status-error-bg)]"
              >
                <LogOut size={15} />
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
