import { useRef, useState, useEffect, useId, type KeyboardEvent } from "react";
import styles from "./StreamCreatedModal.module.css";
import successIcon from "../../assets/images/success.svg";
import { useModalAccessibility } from "../useModalAccessibility";
import { useOptionalTheme } from "../../theme/ThemeProvider";
import { TransactionReceiptPreview } from "../receipt/TransactionReceiptPreview";
import { useClipboard } from "../../hooks/useClipboard";
import { useOptionalToast } from "../toast/ToastProvider";
import { config } from "../../lib/config";
import {
  getSafeExternalUrl,
  SAFE_EXTERNAL_LINK_ATTRIBUTES,
} from "../../lib/safeExternalUrl";
import {
  type ShareFlowState,
  type ShareProvider,
  MOCK_SHARE_CHANNELS,
  connectWorkspace,
  getConnectedWorkspace,
  getShareProviderLabel,
  isProviderConnected,
} from "../../lib/shareWorkspaces";

interface StreamCreatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  streamUrl: string;
  onCreateAnother: () => void;
  txHash?: string;
  amount?: string;
  rate?: string;
  cliff?: string;
  sender?: string;
  recipient?: string;
  /** Test hook: force the next send attempt to fail. */
  forceShareFailure?: boolean;
}

export default function StreamCreatedModal({
  isOpen,
  onClose,
  streamId,
  streamUrl,
  onCreateAnother,
  txHash,
  amount = "10,000.00 USDC",
  rate = "0.0261 USDC/sec",
  cliff = "None",
  sender = "GAB...TREASURY",
  recipient = "GCD...RECIPIENT",
  forceShareFailure = false,
}: StreamCreatedModalProps) {
  const { theme } = useOptionalTheme();
  const { copy, share, status, support } = useClipboard();
  const toast = useOptionalToast();
  const [announcement, setAnnouncement] = useState("");
  const [isPopupBlocked, setIsPopupBlocked] = useState(false);
  const [shareProvider, setShareProvider] = useState<ShareProvider | null>(
    null,
  );
  const [shareFlow, setShareFlow] = useState<ShareFlowState>("idle");
  const [channelQuery, setChannelQuery] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null,
  );
  const [listOpen, setListOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const channelInputRef = useRef<HTMLInputElement>(null);
  const channelListId = useId();
  const channelInputId = useId();
  const previewHeadingId = useId();

  useEffect(() => {
    if (isOpen) {
      setAnnouncement("Success! Your USDC stream is now live on Stellar.");
      setIsPopupBlocked(false);
      setShareProvider(null);
      setShareFlow("idle");
      setChannelQuery("");
      setSelectedChannelId(null);
      setListOpen(false);
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

  const channels = shareProvider
    ? MOCK_SHARE_CHANNELS[shareProvider].filter((channel) =>
        channel.name.toLowerCase().includes(channelQuery.trim().toLowerCase()),
      )
    : [];
  const selectedChannel =
    shareProvider && selectedChannelId
      ? MOCK_SHARE_CHANNELS[shareProvider].find(
          (channel) => channel.id === selectedChannelId,
        )
      : undefined;
  const workspace =
    shareProvider != null ? getConnectedWorkspace(shareProvider) : undefined;
  const showPicker =
    shareFlow === "connected-channel-picker" ||
    shareFlow === "sending" ||
    shareFlow === "sent" ||
    shareFlow === "send-failed";
  const safeStreamUrl = getSafeExternalUrl(streamUrl);

  const announce = (message: string, clearMs = 2000) => {
    setAnnouncement(message);
    setTimeout(() => setAnnouncement(""), clearMs);
  };

  /**
   * Copies the stream URL to the clipboard or invokes the native Web Share
   * API when available. Delegates all clipboard and share logic to the
   * shared {@link useClipboard} hook so that copy, share, status feedback,
   * and environment feature detection are handled consistently.
   *
   * - Web Share API (mobile / supported browsers): opens the native
   *   share sheet. Falls back to clipboard copy when the user cancels or
   *   the API is unsupported.
   * - Clipboard: uses {@link useClipboard.copy} which prefers the async
   *   Clipboard API and falls back to {@code document.execCommand("copy")}
   *   in older or insecure contexts.
   * - Announcements are set via {@code setAnnouncement} and cleared with
   *   automatic timeouts.
   */
  const handleShareOrCopy = async () => {
    if (status === "sharing") return;

    if (support.share) {
      const outcome = await share({
        title: "Stream created",
        text: "View my Stellar stream and withdraw funds.",
        url: streamUrl,
      });

      if (outcome === "shared") {
        announce("Stream URL shared");
        return;
      }

      if (outcome === "cancelled") {
        announce("Share cancelled");
        return;
      }
    }

    const didCopy = await copy(streamUrl);
    if (didCopy) {
      announce("Stream URL copied");
    } else {
      announce(
        "Could not copy stream URL. Please select and copy the URL manually.",
        3000,
      );
    }
  };

  /**
   * Opens the stream URL in a new tab.
   * Enforces https: scheme for security (preventing javascript: or data: injection).
   * Detects popup-blocker null return and shows an accessible inline link fallback.
   */
  const handleViewStream = () => {
    if (!safeStreamUrl) {
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

      console.error("Invalid URL provided.");
      return;
    }

    const newWindow = window.open(safeStreamUrl, "_blank", "noopener,noreferrer");
    if (!newWindow) {
      setIsPopupBlocked(true);
      announce(
        "Popup blocked. Please use the fallback link to view your stream.",
        3000,
      );
    } else {
      setIsPopupBlocked(false);
    }
  };

  const selectShareProvider = (provider: ShareProvider) => {
    setShareProvider(provider);
    setChannelQuery("");
    setSelectedChannelId(null);
    setListOpen(false);
    if (isProviderConnected(provider)) {
      setShareFlow("connected-channel-picker");
      announce(`${getShareProviderLabel(provider)} workspace ready`);
    } else {
      setShareFlow("not-connected");
      announce(`${getShareProviderLabel(provider)} is not connected`);
    }
  };

  const handleConnectWorkspace = () => {
    if (!shareProvider || shareFlow === "connecting") return;
    setShareFlow("connecting");
    announce(`Connecting to ${getShareProviderLabel(shareProvider)}…`);

    window.setTimeout(() => {
      const connected = connectWorkspace(shareProvider);
      setShareFlow("connected-channel-picker");
      toast?.addToast(
        `${getShareProviderLabel(shareProvider)} workspace connected.`,
        "success",
      );
      announce(
        `${getShareProviderLabel(shareProvider)} connected to ${connected.workspaceName}`,
      );
      requestAnimationFrame(() => channelInputRef.current?.focus());
    }, 600);
  };

  const handleSelectChannel = (channelId: string, channelName: string) => {
    setSelectedChannelId(channelId);
    setChannelQuery(channelName);
    setListOpen(false);
    announce(`Channel ${channelName} selected`);
  };

  const handleChannelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!listOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setListOpen(true);
      setActiveOptionIndex(0);
      return;
    }

    if (event.key === "Escape") {
      setListOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveOptionIndex((index) =>
        channels.length === 0 ? 0 : (index + 1) % channels.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveOptionIndex((index) =>
        channels.length === 0
          ? 0
          : (index - 1 + channels.length) % channels.length,
      );
      return;
    }

    if (event.key === "Enter" && listOpen && channels[activeOptionIndex]) {
      event.preventDefault();
      const channel = channels[activeOptionIndex];
      handleSelectChannel(channel.id, channel.name);
    }
  };

  const handleSendToChannel = () => {
    if (
      !shareProvider ||
      !selectedChannel ||
      shareFlow === "sending" ||
      shareFlow === "connecting"
    ) {
      return;
    }

    setShareFlow("sending");
    announce(`Sending stream summary to ${selectedChannel.name}…`);

    window.setTimeout(() => {
      if (forceShareFailure) {
        setShareFlow("send-failed");
        toast?.addToast(
          `Could not share to ${getShareProviderLabel(shareProvider)}. Try again.`,
          "error",
        );
        announce("Share failed. You can try again.");
        return;
      }

      setShareFlow("sent");
      toast?.addToast(
        `Stream summary shared to ${selectedChannel.name} on ${getShareProviderLabel(shareProvider)}.`,
        "success",
      );
      announce(`Shared to ${selectedChannel.name}`);
    }, 700);
  };

  const previewBadge =
    shareFlow === "sending"
      ? "Sending…"
      : shareFlow === "sent"
        ? "Sent"
        : shareFlow === "send-failed"
          ? "Send failed"
          : "Ready to share";

  return (
    <div
      className={`${styles.overlay}${theme === "cyberpunk" ? ` ${styles.cyberpunkSkin}` : ""}`}
      onClick={onClose}
      data-skin={theme === "cyberpunk" ? "cyberpunk" : undefined}
    >
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
              className={`${styles.copyButton} ${status === "copied" || status === "shared" ? styles.copied : ""}`}
              onClick={() => void handleShareOrCopy()}
              type="button"
              disabled={status === "sharing"}
              aria-busy={status === "sharing"}
              aria-label={`${status === "sharing" ? "Sharing" : status === "copied" || status === "shared" ? "Copied" : support.share ? "Share" : "Copy"} stream URL`}
            >
              {status === "copied" || status === "shared" ? (
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
              ) : status === "sharing" ? (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.spinning}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    strokeDasharray="32"
                    strokeDashoffset="10"
                  ></circle>
                </svg>
              ) : support.share ? (
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
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                  <polyline points="16 6 12 2 8 6"></polyline>
                  <line x1="12" y1="2" x2="12" y2="15"></line>
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

        <div
          className={styles.shareSection}
          role="region"
          aria-label="Share stream"
        >
          <h3 className={styles.shareSectionTitle}>Share with your team</h3>
          <div
            className={styles.shareGroup}
            role="group"
            aria-label="Share to messaging apps"
          >
            <button
              type="button"
              className={`${styles.shareButton} ${shareProvider === "slack" ? styles.shareButtonActive : ""}`}
              aria-pressed={shareProvider === "slack"}
              disabled={shareFlow === "connecting" || shareFlow === "sending"}
              onClick={() => selectShareProvider("slack")}
            >
              Share to Slack
            </button>
            <button
              type="button"
              className={`${styles.shareButton} ${shareProvider === "teams" ? styles.shareButtonActive : ""}`}
              aria-pressed={shareProvider === "teams"}
              disabled={shareFlow === "connecting" || shareFlow === "sending"}
              onClick={() => selectShareProvider("teams")}
            >
              Share to Teams
            </button>
          </div>

          {shareFlow === "not-connected" && shareProvider && (
            <div className={styles.shareConnectPanel}>
              <p className={styles.shareConnectState}>
                Connect {getShareProviderLabel(shareProvider)} once to post
                stream summaries to a workspace channel. Fluxora only requests
                channel list and message post scopes.
              </p>
              <button
                type="button"
                className={styles.shareConnectButton}
                onClick={handleConnectWorkspace}
              >
                Connect {getShareProviderLabel(shareProvider)}
              </button>
            </div>
          )}

          {shareFlow === "connecting" && shareProvider && (
            <p
              className={styles.shareConnectState}
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              Connecting to {getShareProviderLabel(shareProvider)}…
            </p>
          )}

          {showPicker && shareProvider && (
            <div className={styles.sharePickerPanel}>
              {workspace && (
                <p className={styles.shareWorkspaceHint}>
                  Connected to {workspace.workspaceName}
                </p>
              )}

              <div className={styles.channelPicker}>
                <label htmlFor={channelInputId} className={styles.channelLabel}>
                  Channel
                </label>
                <div className={styles.channelCombobox}>
                  <input
                    ref={channelInputRef}
                    id={channelInputId}
                    type="text"
                    role="combobox"
                    aria-expanded={listOpen}
                    aria-controls={channelListId}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      listOpen && channels[activeOptionIndex]
                        ? `${channelListId}-option-${channels[activeOptionIndex].id}`
                        : undefined
                    }
                    className={styles.channelInput}
                    placeholder="Search channels"
                    value={channelQuery}
                    disabled={shareFlow === "sending"}
                    onChange={(event) => {
                      setChannelQuery(event.target.value);
                      setSelectedChannelId(null);
                      setListOpen(true);
                      setActiveOptionIndex(0);
                    }}
                    onFocus={() => setListOpen(true)}
                    onKeyDown={handleChannelKeyDown}
                  />
                  {listOpen && (
                    <ul
                      id={channelListId}
                      role="listbox"
                      className={styles.channelList}
                      aria-label="Available channels"
                    >
                      {channels.length === 0 ? (
                        <li
                          className={styles.channelEmpty}
                          role="presentation"
                        >
                          No channels match
                        </li>
                      ) : (
                        channels.map((channel, index) => (
                          <li
                            key={channel.id}
                            id={`${channelListId}-option-${channel.id}`}
                            role="option"
                            aria-selected={selectedChannelId === channel.id}
                            className={`${styles.channelOption} ${index === activeOptionIndex ? styles.channelOptionActive : ""}`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelectChannel(channel.id, channel.name);
                            }}
                          >
                            #{channel.name}
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              </div>

              <article
                className={styles.sharePreviewCard}
                aria-labelledby={previewHeadingId}
              >
                <div className={styles.sharePreviewHeader}>
                  <h4 id={previewHeadingId} className={styles.sharePreviewLabel}>
                    Message preview
                  </h4>
                  <span className={styles.shareStatusBadge}>{previewBadge}</span>
                </div>
                <dl className={styles.sharePreviewBody}>
                  <div className={styles.sharePreviewRow}>
                    <dt>Recipient</dt>
                    <dd>{recipient}</dd>
                  </div>
                  <div className={styles.sharePreviewRow}>
                    <dt>Rate</dt>
                    <dd>{rate}</dd>
                  </div>
                  <div className={styles.sharePreviewRow}>
                    <dt>Cliff</dt>
                    <dd>{cliff}</dd>
                  </div>
                  <div className={styles.sharePreviewRow}>
                    <dt>Stream link</dt>
                    <dd>
                      {safeStreamUrl ? (
                        <a
                          href={safeStreamUrl}
                          {...SAFE_EXTERNAL_LINK_ATTRIBUTES}
                          className={styles.sharePreviewLink}
                        >
                          {streamUrl}
                        </a>
                      ) : (
                        <span className={styles.sharePreviewLink}>{streamUrl}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </article>

              {shareFlow === "send-failed" && (
                <p className={styles.shareError} role="alert">
                  Could not post to the selected channel. Check the connection
                  and try again.
                </p>
              )}

              <button
                type="button"
                className={styles.shareSendButton}
                disabled={!selectedChannel || shareFlow === "sending"}
                aria-busy={shareFlow === "sending"}
                onClick={handleSendToChannel}
              >
                {shareFlow === "sending"
                  ? "Sending…"
                  : shareFlow === "sent"
                    ? "Sent"
                    : shareFlow === "send-failed"
                      ? "Retry send"
                      : "Send to channel"}
              </button>
            </div>
          )}
        </div>

        {/* Transaction Receipt Preview & Download Button */}
        <div className="my-4">
          <TransactionReceiptPreview
            data={{
              streamId,
              type: "Creation",
              sender,
              recipient,
              amount,
              rate,
              timestamp: new Date().toISOString(),
              txHash: txHash || null,
              status: txHash ? "confirmed" : "pending",
              network: config.networkLabel,
            }}
          />
        </div>

        {isPopupBlocked && safeStreamUrl && (
          <div className={styles.popupBlockedMessage} role="alert">
            Popup blocked.{" "}
            <a
              href={safeStreamUrl}
              {...SAFE_EXTERNAL_LINK_ATTRIBUTES}
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
