import React, { useEffect } from "react";
import { AlertCircle, Check, Copy, Loader2, Share2 } from "lucide-react";
import { useClipboard } from "../../hooks/useClipboard";
import { useOptionalToast } from "../toast/ToastProvider";
import TruncatedReveal from "./TruncatedReveal";

type CopyState = "idle" | "copied" | "error";

interface TruncatedAddressProps {
  address: string;
  label?: string;
  className?: string;
  onCopy?: (address: string) => void;
  onCopyStateChange?: (state: CopyState) => void;
}

/** Map the shared hook status to this component's public CopyState. */
function toCopyState(status: "idle" | "copied" | "shared" | "cancelled" | "failed" | "sharing"): CopyState {
  return status === "failed" ? "error" : status === "copied" || status === "shared" ? "copied" : "idle";
}

/**
 * TruncatedAddress component provides a consistent way to display Stellar addresses
 * with truncation (ABCD...WXYZ), optional labeling, and copy-to-clipboard / Web Share API functionality.
 * It uses standard design tokens for typography and colors.
 *
 * Accessibility: The full address is always present in the accessibility tree via an
 * sr-only span inside TruncatedReveal (see docs/SR_ONLY_REVEAL_PATTERN_SPEC.md).
 * A visual reveal chip also appears on hover/focus for sighted keyboard users.
 *
 * Copy and share behavior is delegated to the shared `useClipboard` hook, which uses the
 * native Web Share API on supported devices and falls back to async Clipboard API / execCommand.
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
  const { copy, share, status, support } = useClipboard();
  const toast = useOptionalToast();
  const copyState = toCopyState(status);
  const shareSupported = support.share;

  // Stellar address truncation: first 6 characters + "..." + last 4 characters
  const truncated =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;

  // Notify consumers whenever the copy state changes.
  useEffect(() => {
    onCopyStateChange?.(copyState);
  }, [copyState, onCopyStateChange]);

  const handleAction = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();

    if (status === "sharing") return;

    if (shareSupported) {
      const outcome = await share({
        title: "Stellar address",
        text: `Stellar address: ${address}`,
      });

      if (outcome === "shared") {
        return;
      }

      if (outcome === "cancelled") {
        return;
      }
    }

    const didCopy = await copy(address);
    if (didCopy) {
      onCopy?.(address);
    } else {
      toast?.addToast("Failed to copy address. Please copy manually.", "error");
    }
  };

  const actionVerb =
    status === "sharing"
      ? "Sharing"
      : status === "shared"
        ? "Shared"
        : status === "copied"
          ? "Copied"
          : shareSupported
            ? "Share"
            : "Copy";

  const stateMessage =
    status === "sharing"
      ? "Opening share sheet"
      : status === "shared"
        ? "Address shared"
        : status === "cancelled"
          ? "Share cancelled"
          : copyState === "copied"
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
        className={`flex items-center gap-1.5 group ${status === "sharing" ? "cursor-wait opacity-75" : "cursor-pointer"}`}
        onClick={handleAction}
        role="button"
        tabIndex={0}
        aria-busy={status === "sharing"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void handleAction(e);
          }
        }}
        aria-label={`${actionVerb} ${label || "address"}: ${address}`}
      >
        {/*
         * TruncatedReveal: full address always in accessibility tree (sr-only span)
         * plus a visual chip that slides in on hover/focus of the copy button.
         * The copy button's own aria-label already carries the full address for
         * the AT "copy" action; TruncatedReveal adds a standalone readable span
         * so ATs can encounter the full value without activating the button.
         */}
        <TruncatedReveal fullValue={address} mono>
          <code
            className="text-mono-sm truncate"
            style={{
              background: "var(--surface-raised)",
              padding: "2px 8px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-primary)",
              transition: "border-color var(--transition-fast)",
            }}
          >
            {truncated}
          </code>
        </TruncatedReveal>
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
          {status === "sharing" ? (
            <Loader2 size={14} aria-hidden="true" className="animate-spin" />
          ) : copyState === "copied" ? (
            <Check size={14} aria-hidden="true" />
          ) : copyState === "error" ? (
            <AlertCircle size={14} aria-hidden="true" />
          ) : shareSupported ? (
            <Share2
              size={14}
              aria-hidden="true"
              className="group-hover:text-primary transition-colors opacity-70"
            />
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

