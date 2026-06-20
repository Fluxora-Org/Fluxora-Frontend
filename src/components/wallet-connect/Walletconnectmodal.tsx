import React, { useState, useEffect, useRef } from "react";
import { X, ChevronRight, Loader2 } from "lucide-react";
import { isConnected, requestAccess, getNetwork } from "@stellar/freighter-api";
import { useWallet } from "./Walletcontext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type FreighterReadiness =
  | { status: "ready" }
  | { status: "not_installed" }
  | { status: "unresponsive" };

const FREIGHTER_INSTALL_MESSAGE =
  "Freighter is not installed. Install the Freighter browser extension, then try again.";

const FREIGHTER_UNRESPONSIVE_MESSAGE =
  "Freighter is installed but is not responding. Unlock the extension or reload this page, then try again.";

function hasFreighterExtension(): boolean {
  if (typeof window === "undefined") return false;

  const freighterWindow = window as Window & {
    freighter?: unknown;
    freighterApi?: unknown;
  };
  return Boolean(freighterWindow.freighter || freighterWindow.freighterApi);
}

export default function WalletConnectModal({ isOpen, onClose }: Props) {
  const { connect } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus modal on open; close on Escape via onKeyDown on the backdrop.
  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  function handleClose() {
    onClose();
    previouslyFocusedRef.current?.focus();
  }

  function handleBackdropKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") handleClose();
  }

  /**
   * Checks whether Freighter is present before polling for connection readiness.
   * A missing extension needs install guidance, while an installed extension
   * that never responds should ask the user to unlock or reload instead.
   */
  async function waitForFreighter(
    maxRetries = 5,
    delayMs = 300,
  ): Promise<FreighterReadiness> {
    const firstResult = await isConnected();
    if (firstResult.isConnected) return { status: "ready" };
    if (!hasFreighterExtension()) return { status: "not_installed" };
    if (firstResult.error) return { status: "unresponsive" };

    for (let i = 1; i < maxRetries; i++) {
      const result = await isConnected();
      if (result.isConnected) return { status: "ready" };
      await new Promise((res) => setTimeout(res, delayMs));
    }
    return { status: "unresponsive" };
  }

  async function handleFreighter() {
    setError(null);
    setLoading(true);
    try {
      const readiness = await waitForFreighter();
      if (readiness.status === "not_installed") {
        throw new Error(FREIGHTER_INSTALL_MESSAGE);
      }
      if (readiness.status === "unresponsive") {
        throw new Error(FREIGHTER_UNRESPONSIVE_MESSAGE);
      }

      const access = await requestAccess();
      if (access.error) throw new Error(access.error);
      if (!access.address)
        throw new Error("No address returned. Please try again.");

      const net = await getNetwork();
      if (net.error) throw new Error(net.error);

      connect(access.address, net.network);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      onKeyDown={handleBackdropKey}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-sm mx-4 rounded-2xl outline-none shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
        style={{
          backgroundColor: "var(--color-bg-primary)",
          border: "1px solid var(--color-border-default)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5">
          <div>
            <h2 
              id="modal-title" 
              className="text-lg font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Connect wallet
            </h2>
            <p 
              className="mt-0.5 text-sm"
              style={{ color: "var(--color-text-muted)" }}
            >
              Connect your Stellar wallet to use Fluxora
            </p>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close"
            className="p-1.5 rounded-lg transition-colors duration-200"
            style={{ 
              color: "var(--color-text-muted)",
              background: "transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
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
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-left border transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: "var(--color-surface-default)",
              borderColor: "var(--color-border-default)",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-elevated)";
                e.currentTarget.style.borderColor = "var(--color-accent-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = "var(--color-surface-default)";
                e.currentTarget.style.borderColor = "var(--color-border-default)";
              }
            }}
          >
            <img
              src="./freighter-wallet.jpeg"
              alt="Freighter"
              className="w-9 h-9 rounded-[10px] shrink-0"
            />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Freighter
                {loading && (
                  <span className="ml-2 text-xs animate-pulse" style={{ color: "var(--color-accent-primary)" }}>
                    Connecting…
                  </span>
                )}
              </span>
              <span className="block mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Stellar browser extension wallet
              </span>
            </span>
            {loading ? (
              <Loader2
                size={16}
                className="shrink-0 animate-spin"
                style={{ color: "var(--color-accent-primary)" }}
              />
            ) : (
              <ChevronRight size={16} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
            )}
          </button>

          {/* ── Albedo (placeholder) ── */}
          <div 
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border opacity-50 cursor-not-allowed select-none"
            style={{
              backgroundColor: "var(--color-surface-default)",
              borderColor: "var(--color-border-default)",
            }}
          >
            <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center" style={{ backgroundColor: "var(--color-surface-elevated)" }}>
              <span className="text-[#F5C542] text-lg font-bold">A</span>
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Albedo
              </span>
              <span className="block mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Web-based Stellar wallet
              </span>
            </span>
            <span 
              className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ 
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-surface-elevated)",
              }}
            >
              Soon
            </span>
          </div>

          {/* ── WalletConnect (placeholder) ── */}
          <div 
            className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl border opacity-50 cursor-not-allowed select-none"
            style={{
              backgroundColor: "var(--color-surface-default)",
              borderColor: "var(--color-border-default)",
            }}
          >
            <div className="w-9 h-9 rounded-[10px] shrink-0 flex items-center justify-center" style={{ backgroundColor: "var(--color-surface-elevated)" }}>
              <span className="text-[#3B99FC] text-lg font-bold">W</span>
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                WalletConnect
              </span>
              <span className="block mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                Connect with mobile wallets
              </span>
            </span>
            <span 
              className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ 
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-surface-elevated)",
              }}
            >
              Soon
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            role="alert"
            className="mx-4 mb-4 px-4 py-3 rounded-xl text-sm border"
            style={{
              color: "var(--color-danger)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderColor: "rgba(239, 68, 68, 0.2)",
            }}
          >
            {error}
            {error === FREIGHTER_INSTALL_MESSAGE && (
              <>
                {" "}
                <a
                  href="https://www.freighter.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                  style={{ color: "var(--color-accent-primary)" }}
                >
                  Download Freighter
                </a>
              </>
            )}
          </p>
        )}

        {/* Footer */}
        <p className="pb-5 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
          By connecting, you agree to Fluxora&apos;s{" "}
          <a 
            href="#" 
            className="hover:underline"
            style={{ color: "var(--color-accent-primary)" }}
          >
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  );
}
