import React, { useEffect } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { useClipboard } from "../../hooks/useClipboard";
import { useOptionalToast } from "../toast/ToastProvider";

type CopyState = "idle" | "copied" | "error";

interface TruncatedAddressProps {
  address: string;
  label?: string;
  className?: string;
  onCopy?: (address: string) => void;
  onCopyStateChange?: (state: CopyState) => void;
}

/** Map the shared hook status to this component's public CopyState. */
function toCopyState(status: "idle" | "copied" | "failed"): CopyState {
  return status === "failed" ? "error" : status;
}

/**
 * TruncatedAddress component provides a consistent way to display Stellar addresses
 * with truncation (ABCD...WXYZ), optional labeling, and copy-to-clipboard functionality.
 * It uses standard design tokens for typography and colors.
 *
 * Copy behavior is delegated to the shared `useClipboard` hook, which uses the
 * async Clipboard API with an `execCommand` fallback for insecure contexts.
 * Failures surface as a visible icon/state, an ARIA live status, an error toast
 * (when a ToastProvider is mounted), and `onCopyStateChange`.
 */
export default function TruncatedAddress({
  address,
  label,
  className = "",
  onCopy,
  onCopyStateChange,
}: TruncatedAddressProps) {
  const { copy, status } = useClipboard();
  const toast = useOptionalToast();
  const copyState = toCopyState(status);

  // Stellar address truncation: first 6 characters + "..." + last 4 characters
  const truncated =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;

  // Notify consumers whenever the copy state changes.
  useEffect(() => {
    onCopyStateChange?.(copyState);
  }, [copyState, onCopyStateChange]);

  const handleCopy = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const didCopy = await copy(address);
    if (didCopy) {
      onCopy?.(address);
    } else {
      toast?.addToast("Failed to copy address. Please copy manually.", "error");
    }
  };

  const stateMessage =
    copyState === "copied"
      ? "Address copied"
      : copyState === "error"
        ? "Address could not be copied"
        : "";

  return (
    <div
      className={`inline-flex items-center gap-2 max-w-full ${className}`}
      title={address}
    >
      {label && (
        <span
          className="text-label-sm whitespace-nowrap"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}:
        </span>
      )}
      <div
        className="flex items-center gap-1.5 group cursor-pointer"
        onClick={handleCopy}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void handleCopy(e);
          }
        }}
        aria-label={`${copyState === "copied" ? "Copied" : "Copy"} ${label || "address"}: ${address}`}
      >
        <code
          className="text-mono-sm truncate"
          style={{
            background: "var(--surface-raised)",
            padding: "2px 8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--color-border-default)",
            color: "var(--color-text-primary)",
            transition: "border-color var(--transition-fast)"
          }}
        >
          {truncated}
        </code>
        <div
          className="flex items-center justify-center transition-colors"
          style={{
            color:
              copyState === "copied"
                ? "var(--color-success)"
                : copyState === "error"
                  ? "var(--color-danger)"
                  : "var(--color-text-muted)",
          }}
        >
          {copyState === "copied" ? (
            <Check size={14} aria-hidden="true" />
          ) : copyState === "error" ? (
            <AlertCircle size={14} aria-hidden="true" />
          ) : (
            <Copy
              size={14}
              aria-hidden="true"
              className="group-hover:text-primary transition-colors opacity-70"
            />
          )}
        </div>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {stateMessage}
        </span>
      </div>
    </div>
  );
}
