import { useState, useRef, useEffect } from "react";
import { ChevronDown, Copy, ExternalLink, LogOut, Check } from "lucide-react";
import { maskAddress, stellarExplorerUrl } from "../../lib/stellar";

interface WalletStatusProps {
  address: string;
  network: string;
  onDisconnect?: () => void;
}

const SUPPORTED_NETWORKS = ["PUBLIC", "TESTNET"];

export default function WalletStatus({
  address,
  network,
  onDisconnect,
}: WalletStatusProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const focusRingClassName =
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navbar-bg)]";

  const networkUpper = network?.toUpperCase() ?? "";
  const isWrongNetwork = !SUPPORTED_NETWORKS.includes(networkUpper);
  const isTestnet = networkUpper === "TESTNET";

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmingDisconnect(false);
      }
    };

    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirmingDisconnect(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  useEffect(() => {
    // Announce connection on mount
    setAnnouncement(`Wallet connected: ${maskAddress(address, 6, 4)}`);
    const timer = setTimeout(() => setAnnouncement(""), 1000);
    return () => clearTimeout(timer);
  }, [address]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const closeMenu = () => {
    setOpen(false);
    setConfirmingDisconnect(false);
    triggerRef.current?.focus();
  };

  const handleConfirmDisconnect = () => {
    onDisconnect?.();
    setAnnouncement("Wallet disconnected. Use Connect Wallet to reconnect.");
    closeMenu();
  };

  return (
    <div ref={ref} className="flex items-center gap-2">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      {/* Network Badge */}
      {isWrongNetwork ? (
        <span className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/40">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Wrong Network
        </span>
      ) : (
        <span
          className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold border ${
            isTestnet
              ? "bg-amber-400/15 text-amber-300 border-amber-400/30"
              : "bg-emerald-400/15 text-emerald-300 border-emerald-400/30"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isTestnet ? "bg-amber-300" : "bg-emerald-400"
            }`}
          />
          {isTestnet ? "Testnet" : "Mainnet"}
        </span>
      )}

      {/* Wallet Button */}
      <div className="relative">
        <button
          ref={triggerRef}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Wallet ${maskAddress(address, 6, 4)}. Open wallet options.`}
          className={`flex items-center gap-2 px-3 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-sm font-medium text-[var(--text)] cursor-pointer transition-colors hover:border-[var(--accent)]/50 ${focusRingClassName}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs">
            {maskAddress(address, 6, 4)}
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="menu"
            aria-label="Wallet options"
            className="absolute right-0 mt-2 w-60 bg-[var(--navbar-bg)] border border-[var(--navbar-border)] rounded-xl shadow-md p-1.5 z-50"
          >
            {confirmingDisconnect ? (
              <div className="px-2 py-2">
                <p className="text-sm font-medium text-[var(--text)]">
                  Disconnect wallet?
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Your wallet state will be cleared. You can reconnect from the
                  navbar.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDisconnect(false)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors ${focusRingClassName}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDisconnect}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm text-white bg-red-500 hover:bg-red-600 transition-colors ${focusRingClassName}`}
                  >
                    Disconnect wallet
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  role="menuitem"
                  onClick={handleCopy}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors ${focusRingClassName}`}
                >
                  {copied ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : (
                    <Copy size={16} />
                  )}
                  {copied ? "Copied!" : "Copy address"}
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    window.open(
                      stellarExplorerUrl(address, network),
                      "_blank",
                      "noopener",
                    );
                    closeMenu();
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <ExternalLink size={16} />
                  View in explorer
                </button>

                <div className="my-1 h-px bg-[var(--navbar-border)]" />

                <button
                  role="menuitem"
                  onClick={() => setConfirmingDisconnect(true)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-[var(--surface)] transition-colors ${focusRingClassName}`}
                >
                  <LogOut size={16} />
                  Disconnect
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
