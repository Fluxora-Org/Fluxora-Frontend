import React, { useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";

type CopyState = "idle" | "copied" | "error";

interface TruncatedAddressProps {
  address: string;
  label?: string;
  className?: string;
  onCopy?: (address: string) => void;
  onCopyStateChange?: (state: CopyState) => void;
}

/**
 * TruncatedAddress component provides a consistent way to display Stellar addresses
 * with truncation (ABCD...WXYZ), optional labeling, and copy-to-clipboard functionality.
 * It uses standard design tokens for typography and colors.
 *
 * Copy behavior first uses the async Clipboard API. If the API is unavailable
 * or denied, the component falls back to a temporary textarea copy path and
 * exposes the result as `idle`, `copied`, or `error` through visible state,
 * an ARIA live status, and `onCopyStateChange`.
 */
export default function TruncatedAddress({
  address,
  label,
  className = "",
  onCopy,
  onCopyStateChange,
}: TruncatedAddressProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  // Stellar address truncation: first 6 characters + "..." + last 4 characters
  const truncated =
    address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;

  const setCopyResult = (state: CopyState) => {
    setCopyState(state);
    onCopyStateChange?.(state);
  };

  const fallbackCopy = () => {
    const textarea = document.createElement("textarea");
    textarea.value = address;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      return document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const copyAddress = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(address);
      return true;
    }

    return fallbackCopy();
  };

  const handleCopy = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    try {
      const didCopy = await copyAddress();
      if (!didCopy) {
        throw new Error("Fallback copy command failed");
      }

      setCopyResult("copied");
      onCopy?.(address);
      setTimeout(() => setCopyResult("idle"), 2000);
    } catch {
      setCopyResult("error");
      setTimeout(() => setCopyResult("idle"), 3000);
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
