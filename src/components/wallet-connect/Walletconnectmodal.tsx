import React, { useState, useEffect, useRef } from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import { isConnected, requestAccess, getNetwork } from "@stellar/freighter-api";
import { useWallet } from "./Walletcontext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletConnectModal({ isOpen, onClose }: Props) {
  const { connect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus modal on open; close on Escape via onKeyDown on the backdrop
  useEffect(() => {
    if (isOpen) modalRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  function handleBackdropKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") onClose();
  }

  async function waitForFreighter(
    maxRetries = 5,
    delayMs = 300,
  ): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      const result = await isConnected();
      if (result.isConnected) return true;
      await new Promise((res) => setTimeout(res, delayMs));
    }
    return false;
  }

  async function handleFreighter() {
    setError(null);
    setLoading(true);
    try {
      const extensionReady = await waitForFreighter();
      if (!extensionReady) throw new Error("Freighter extension not found...");

      const access = await requestAccess();
      if (access.error) throw new Error(access.error);
      if (!access.address)
        throw new Error("No address returned. Please try again.");

      const net = await getNetwork();
      if (net.error) throw new Error(net.error);

      connect(access.address, net.network);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleBackdropKey}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-sm mx-4 rounded-2xl outline-none bg-[#101828] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5">
          <div>
            <h2 id="modal-title" className="text-lg font-semibold text-white">
              Connect wallet
            </h2>
            <p className="mt-0.5 text-sm text-gray-400">
              Connect your Stellar wallet to use Fluxora
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <X size={16} />
          </button>
        </div>

        {/* Wallet list */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          {/* ── Freighter (implemented) ── */}
          <button
            onClick={handleFreighter}
            disabled={loading}
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-left bg-[#1E2939] border border-white/8 hover:bg-white/8 hover:border-cyan-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <img
              src="./freighter-wallet.jpeg"
              alt="Freighter"
              className="w-9 h-9 rounded-[10px] shrink-0"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-white">
                Freighter
                {loading && (
                  <span className="ml-2 text-xs text-cyan-400 animate-pulse">
                    Connecting…
                  </span>
                )}
              </span>
              <span className="block mt-0.5 text-xs text-gray-400">
                Stellar browser extension wallet
              </span>
            </span>
            {loading ? (
              <Loader2
                size={16}
                className="shrink-0 text-cyan-400 animate-spin"
              />
            ) : (
              <ChevronRight size={16} className="shrink-0 text-gray-500" />
            )}
          </button>

          {/* ── Albedo (placeholder) ── */}
          <div className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-white/2 border border-white/6 opacity-50 cursor-not-allowed select-none">
            <div className="w-9 h-9 rounded-[10px] bg-[#1E1E2E] shrink-0 flex items-center justify-center">
              <span className="text-[#F5C542] text-lg font-bold">A</span>
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-white">
                Albedo
              </span>
              <span className="block mt-0.5 text-xs text-gray-400">
                Web-based Stellar wallet
              </span>
            </span>
            <span className="shrink-0 text-[10px] font-medium text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
              Soon
            </span>
          </div>

          {/* ── WalletConnect (placeholder) ── */}
          <div className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-white/2 border border-white/6 opacity-50 cursor-not-allowed select-none">
            <div className="w-9 h-9 rounded-[10px] bg-[#1E1E2E] shrink-0 flex items-center justify-center">
              <span className="text-[#3B99FC] text-lg font-bold">W</span>
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-white">
                WalletConnect
              </span>
              <span className="block mt-0.5 text-xs text-gray-400">
                Connect with mobile wallets
              </span>
            </span>
            <span className="shrink-0 text-[10px] font-medium text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
              Soon
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mx-4 mb-4 px-4 py-3 rounded-xl text-sm text-red-300 bg-red-500/10 border border-red-500/20">
            {error}
          </p>
        )}

        {/* Footer */}
        <p className="pb-5 text-center text-xs text-gray-500">
          By connecting, you agree to Fluxora&apos;s{" "}
          <a href="#" className="text-[#00B8D4] hover:underline">
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
}
