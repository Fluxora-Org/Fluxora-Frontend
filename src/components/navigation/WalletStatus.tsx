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

export default function WalletStatus({
  address,
  network,
  onDisconnect,
}: WalletStatusProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const focusRingClassName =
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--navbar-bg)]";

  const networkUpper = network?.toUpperCase() ?? "";
  const isWrongNetwork = !SUPPORTED_NETWORKS.includes(networkUpper);
  const isTestnet = networkUpper === "TESTNET";

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
    setAnnouncement(`Wallet connected: ${truncate(address)}`);
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
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Wallet ${truncate(address)}. Open wallet options.`}
          className={`flex items-center gap-2 px-3 h-9 rounded-full bg-[var(--surface)] border border-[var(--border)] text-sm font-medium text-[var(--text)] cursor-pointer transition-colors hover:border-[var(--accent)]/50 ${focusRingClassName}`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs">{truncate(address)}</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-52 bg-[var(--navbar-bg)] border border-[var(--navbar-border)] rounded-xl shadow-md p-1.5 z-50">
            <button
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
                const netPath = network?.toLowerCase() === "public" ? "public" : "testnet";
                window.open(`https://stellar.expert/explorer/${netPath}/account/${address}`, "_blank", "noopener"); 
                setOpen(false); 
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-[var(--text)] rounded-lg hover:bg-[var(--surface)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <ExternalLink size={16} />
              View in explorer
            </button>

            <div className="my-1 h-px bg-[var(--navbar-border)]" />

            <button
              role="menuitem"
              onClick={() => { setOpen(false); onDisconnect?.(); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 rounded-lg hover:bg-[var(--surface)] transition-colors ${focusRingClassName}`}
            >
              <LogOut size={16} />
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
