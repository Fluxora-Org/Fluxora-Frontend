import { useRef, useState, useEffect } from "react";
import styles from "./StreamCreatedModal.module.css";
import successIcon from "../../assets/images/success.svg";
import { useModalAccessibility } from "../useModalAccessibility";

interface StreamCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  streamUrl: string;
  onCreateAnother: () => void;
}

export default function StreamCreatedModal({
  isOpen,
  onClose,
  streamId,
  streamUrl,
  onCreateAnother,
}: StreamCreatedModalProps) {
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAnnouncement("Success! Your USDC stream is now live on Stellar.");
      setIsPopupBlocked(false);
      const timer = setTimeout(() => setAnnouncement(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useModalAccessibility({
    isOpen,
    onClose,
    modalRef,
    initialFocusRef: closeButtonRef,
  });

  if (!isOpen) return null;

  const fallbackCopy = (): boolean => {
    const textarea = document.createElement("textarea");
    textarea.value = streamUrl;
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

  const writeToClipboard = async (): Promise<boolean> => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(streamUrl);
      return true;
    }

    return fallbackCopy();
  };

  /**
   * Copies the stream URL to the clipboard and toggles the copied visual state on success.
   *
   * Uses the async Clipboard API when available. In insecure contexts where
   * `navigator.clipboard` is undefined, falls back to a temporary textarea
   * with `document.execCommand("copy")`. The URL bar remains visible and
   * selectable as a manual fallback.
   *
   * On failure (permission denied or fallback copy failure), announces an
   * accessible error via the modal's aria-live region without logging the URL.
   * The 2s reset timer applies only to the success checkmark state.
   */
  const handleCopy = async () => {
    try {
      const didCopy = await writeToClipboard();
      if (!didCopy) {
        throw new Error("Fallback copy command failed");
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setAnnouncement(
        "Could not copy stream URL. Please select and copy the URL manually.",
      );
      setTimeout(() => setAnnouncement(""), 3000);
    }
  };

  /**
   * Opens the stream URL in a new tab.
   * Enforces https: scheme for security (preventing javascript: or data: injection).
   * Detects popup-blocker null return and shows an accessible inline link fallback.
   */
  const handleViewStream = () => {
    try {
      const parsedUrl = new URL(streamUrl);
      if (parsedUrl.protocol !== "https:") {
        console.error("Invalid URL scheme. Only https is allowed.");
        return;
      }
    } catch {
      console.error("Invalid URL provided.");
      return;
    }

    const newWindow = window.open(streamUrl, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      setIsPopupBlocked(true);
      setAnnouncement("Popup blocked. Please use the fallback link to view your stream.");
    } else {
      setIsPopupBlocked(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stream-created-title"
        aria-describedby="stream-created-description"
        tabIndex={-1}
      >
        <div className="sr-only" aria-live="assertive">
          {announcement}
        </div>
        <button
          ref={closeButtonRef}
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close stream created modal"
          type="button"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </button>

        <div className={styles.successIconWrapper}>
          <img
            src={successIcon}
            alt="Success"
            className={styles.successIconImg}
          />
        </div>

        <h2 id="stream-created-title" className={styles.title}>
          Stream created!
        </h2>
        <p id="stream-created-description" className={styles.description}>
          Your USDC stream is now live on Stellar. The recipient can start
          withdrawing accrued funds anytime.
        </p>

        <div className={styles.streamInfoCard}>
          <div className={styles.streamIdRow}>
            <span className={styles.streamIdLabel}>Stream ID</span>
            <span className={styles.streamIdValue}>#{streamId}</span>
          </div>
          <div className={styles.urlContainer}>
            <div className={styles.urlBar}>{streamUrl}</div>
            <button
              className={`${styles.copyButton} ${copied ? styles.copied : ""}`}
              onClick={() => void handleCopy()}
              type="button"
              aria-label="Copy stream URL"
            >
              {copied ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className={styles.nextStepsBox}>
          <p className={styles.nextStepsText}>
            <span className={styles.nextStepsTitle}>Next steps:</span> Share the
            stream link with your recipient. They can view real-time accrual and
            withdraw funds from the Recipient portal.
          </p>
        </div>

        {isPopupBlocked && (
          <div className={styles.popupBlockedMessage} role="alert">
            Popup blocked.{" "}
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.fallbackLink}
            >
              Click here to view your stream
            </a>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onCreateAnother}
            type="button"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create another
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleViewStream}
            type="button"
          >
            View stream
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
