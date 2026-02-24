import React, { useState, useRef } from "react";
import { useWallet } from "./Walletcontext";
import WalletConnectModal from "./Walletconnectmodal";

import { ChevronDown, Copy, Check, ExternalLink, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function explorerUrl(address: string, network: string | null) {
  const net = network === "PUBLIC" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/account/${address}`;
}

export default function WalletButton() {
  const { address, network, connected, disconnect } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleCopy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleExplorer() {
    if (!address) return;
    window.open(explorerUrl(address, network), "_blank", "noopener,noreferrer");
    setDropdownOpen(false);
  }

  function handleDisconnect() {
    disconnect();
    setDropdownOpen(false);
  }

  function handleDropdownKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") setDropdownOpen(false);
  }

  // ── Not connected ────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <>
        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2 text-sm font-medium text-white rounded-xl bg-red-400 dark:bg-linear-to-br from-[#00B8D4] to-[#0097A7] shadow-[0_0_20px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0d1117] cursor-pointer"
        >
          Connect wallet
        </button>
        <WalletConnectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </>
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
                ? "bg-green-500/10 text-green-300 border-green-500/30"
                : "bg-[#7B33064D] text-[#FFB900] border-[#BB4D004D]",
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
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-white transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0d1117] border cursor-pointer",
            dropdownOpen
              ? "bg-white/10 border-cyan-500/45"
              : "bg-[#1E2939] border-white/12 hover:bg-white/8",
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[#00C950] shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
          <span className="font-mono">{truncate(address!)}</span>
          <ChevronDown
            size={12}
            className={cn(
              "text-gray-400 transition-transform duration-200",
              dropdownOpen && "rotate-180",
            )}
          />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            role="menu"
            onKeyDown={handleDropdownKey}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl z-50 overflow-hidden bg-[#1E2939] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            {/* Address block */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-500 mb-2">
                Connected Address
              </p>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[13px] text-gray-100 break-all leading-relaxed flex-1">
                  {address}
                </span>
                <button
                  onClick={handleCopy}
                  aria-label="Copy address"
                  className="shrink-0 mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {copied ? (
                    <Check size={15} className="text-emerald-400" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            </div>

            <div className="mx-4 h-px bg-white/8" />

            {/* Actions */}
            <div className="py-1.5">
              <button
                role="menuitem"
                onClick={handleCopy}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/6 transition-colors focus:outline-none focus:bg-white/8"
              >
                {copied ? (
                  <Check size={15} className="text-emerald-400" />
                ) : (
                  <Copy size={15} className="text-gray-400" />
                )}
                {copied ? "Copied!" : "Copy address"}
              </button>

              <button
                role="menuitem"
                onClick={handleExplorer}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-white hover:bg-white/6 transition-colors focus:outline-none focus:bg-white/8"
              >
                <ExternalLink size={15} className="text-gray-400" />
                View on Stellar Explorer
              </button>

              <div className="mx-4 my-1.5 h-px bg-white/8" />

              <button
                role="menuitem"
                onClick={handleDisconnect}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors focus:outline-none focus:bg-red-500/10"
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
