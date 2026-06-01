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
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAnnouncement("Success! Your USDC stream is now live on Stellar.");
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

  const handleCopy = () => {
    navigator.clipboard.writeText(streamUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              onClick={handleCopy}
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
            onClick={() =>
              window.open(streamUrl, "_blank", "noopener,noreferrer")
            }
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
