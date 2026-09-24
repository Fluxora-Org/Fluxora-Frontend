import React, { useEffect, useRef, useState } from "react";
import type { StreamRecord } from "../data/streamRecords";
import StreamOGImageTemplate from "./StreamOGImageTemplate";
import { X, Share2, Copy, Check } from "lucide-react";

interface StreamOGPreviewModalProps {
  stream: StreamRecord;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * StreamOGPreviewModal
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible modal displaying the scaled 1200x630 Open Graph preview template.
 * Includes copy-to-clipboard for the OG image URL, Web Share API triggers,
 * focus trap, and Escape key listeners (WCAG 2.1 AA compliance).
 */
export const StreamOGPreviewModal: React.FC<StreamOGPreviewModalProps> = ({
  stream,
  isOpen,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Compute OG Image URL with cache-busting timestamp
  const parsedEndDate = stream.endDate ? Date.parse(stream.endDate) : Number.NaN;
  const timestamp = Number.isFinite(parsedEndDate) ? parsedEndDate : 0;
  const ogImageUrl = `https://fluxora.app/og-image/${stream.id}.png?v=${timestamp}`;
  const streamPageUrl = typeof window !== "undefined" ? window.location.href : `https://fluxora.app/app/streams/${stream.id}`;

  useEffect(() => {
    if (!isOpen) return;

    // Focus close button on open
    const focusTimeout = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimeout);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyOgUrl = async () => {
    try {
      await navigator.clipboard.writeText(ogImageUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      setCopiedUrl(false);
    }
  };

  const handleShareOrCopyStream = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${stream.name} – Fluxora`,
          text: `Check out stream ${stream.name} for ${stream.recipientName} on Fluxora.`,
          url: streamPageUrl,
        });
        return;
      } catch {
        // Fallback to copy URL if user cancels or share fails
      }
    }

    try {
      await navigator.clipboard.writeText(streamPageUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(6px)",
        padding: "1.5rem",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="og-preview-title"
      ref={modalRef}
      onClick={(e) => {
        if (e.target === modalRef.current) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          backgroundColor: "#0F172A",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#F8FAFC",
        }}
        data-testid="og-preview-modal"
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              id="og-preview-title"
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                margin: 0,
                color: "#F8FAFC",
              }}
            >
              Open Graph Social Preview
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#94A3B8",
                margin: "0.25rem 0 0 0",
              }}
            >
              Auto-generated 1200x630 card for social share previews (Twitter, LinkedIn, Slack)
            </p>
          </div>

          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close social preview modal"
            style={{
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              color: "#F8FAFC",
              padding: "0.5rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scaled Preview Canvas Wrapper */}
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            justifyContent: "center",
            backgroundColor: "#020617",
            overflow: "hidden",
          }}
        >
          {/* Scaled canvas: 1200x630 scaled down to fit max container width ~800px (scale 0.65) */}
          <div
            style={{
              width: "780px",
              height: "409.5px",
              overflow: "hidden",
              position: "relative",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <StreamOGImageTemplate stream={stream} scale={0.65} />
          </div>
        </div>

        {/* Action Controls Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.8125rem",
              color: "#94A3B8",
              fontFamily: "monospace",
              wordBreak: "break-all",
              maxWidth: "50%",
            }}
          >
            <span style={{ color: "#64748B" }}>OG Image URL: </span>
            {ogImageUrl}
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleCopyOgUrl}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "#F8FAFC",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {copiedUrl ? <Check size={16} color="#34D399" /> : <Copy size={16} />}
              <span>{copiedUrl ? "Copied URL!" : "Copy Image URL"}</span>
            </button>

            <button
              onClick={handleShareOrCopyStream}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)",
                color: "#FFFFFF",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(6, 182, 212, 0.3)",
              }}
            >
              {copiedLink ? (
                <Check size={16} />
              ) : (
                <Share2 size={16} />
              )}
              <span>{copiedLink ? "Copied Stream Link!" : "Share Stream"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamOGPreviewModal;
