import { useState, useRef, useEffect } from "react";
import { ChevronDown, Copy, ExternalLink, LogOut, Check } from "lucide-react";

interface WalletStatusProps {
  address: string;
  network: string;
  onDisconnect?: () => void;
}

function truncate(addr: string) {
  return addr.length <= 12 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const SUPPORTED_NETWORKS = ["PUBLIC", "TESTNET"];

export default function WalletStatus({ address, network, onDisconnect }: WalletStatusProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isWrongNetwork = !SUPPORTED_NETWORKS.includes(network?.toUpperCase() ?? "");
  const isTestnet = network?.toUpperCase() === "TESTNET";

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(address); } catch { /* noop */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div ref={ref} className="flex items-center gap-2">
      {/* Network badge */}
      {isWrongNetwork ? (
        <span
          role="alert"
          aria-label="Wrong network detected. Please switch to Mainnet or Testnet."
          className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
        >
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-red-400" />
          Wrong Network
        </span>
      ) : (
        <span
          aria-label={`Connected to ${network}`}
          className={[
            "px-3 h-8 rounded-full text-xs font-semibold flex items-center",
            isTestnet
              ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
              : "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30",
          ].join(" ")}
        >
          {isTestnet ? "Testnet" : "Mainnet"}
        </span>
      )}

      {/* Wallet pill + dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Wallet ${truncate(address)}. Open wallet options.`}
          className="flex items-center gap-2 px-3 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-sm font-medium text-[var(--text)] cursor-pointer transition-colors hover:border-[var(--accent)]/50 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.2)]" />
          <span className="font-mono text-xs">{truncate(address)}</span>
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            role="menu"
            aria-label="Wallet options"
            className="absolute right-0 top-[calc(100%+8px)] w-48 bg-[var(--navbar-bg)] border border-[var(--navbar-border)] rounded-xl shadow-[var(--navbar-shadow)] p-1.5 z-50"
          >
            <button
              role="menuitem"
              onClick={handleCopy}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} aria-hidden="true" />}
              {copied ? "Copied!" : "Copy address"}
            </button>
            <button
              role="menuitem"
              onClick={() => { window.open(`https://stellar.expert/explorer/testnet/account/${address}`, "_blank", "noopener"); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ExternalLink size={14} aria-hidden="true" />
              View in explorer
            </button>
            <div role="separator" className="my-1 h-px bg-[var(--navbar-border)]" />
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onDisconnect?.(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-[var(--surface)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <LogOut size={14} aria-hidden="true" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
