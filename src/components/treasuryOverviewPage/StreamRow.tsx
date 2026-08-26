import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Copy, ExternalLink, Pause, MoreVertical } from "lucide-react";
import StatusPill from "./StatusPill";
import type { Stream } from "./Stream";
import { formatNumber } from "../../lib/formatters";
import { useOptionalToast } from "../toast/ToastProvider";
import { useClipboard } from "../../hooks/useClipboard";
import { stellarExplorerUrl } from "../../lib/stellar";
import TruncatedAddress from "../common/TruncatedAddress";
import "./StreamRow.css";

interface Props {
  stream: Stream;
  /** Whether this row is currently selected (single-select highlight) */
  isSelected?: boolean;
  /** Whether the row's compare checkbox is checked */
  isChecked?: boolean;
  /** Called when the row is activated (click or Enter/Space) */
  onSelect?: (id: string) => void;
  /**
   * Called when the compare checkbox is toggled.
   * If provided, a checkbox column is rendered to the left of the row.
   */
  onCompareToggle?: (id: string) => void;
}

function formatAccruedAmount(amount: number) {
  // Use `formatNumber` (locale-aware, no hardcoded "en-US") — issue #388
  return `${formatNumber(amount, 2)} USDC accrued`;
}

export default function StreamRow({
  stream,
  isSelected = false,
  isChecked = false,
  onSelect,
  onCompareToggle,
}: Props) {
  const navigate = useNavigate();
  const toast = useOptionalToast();
  const { copy } = useClipboard();

  // Menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Long press / Touch states
  const [showProgressRing, setShowProgressRing] = useState(false);
  const [progressRingCoords, setProgressRingCoords] = useState({ x: 0, y: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressedRef = useRef(false);

  const openMenu = (x: number, y: number, viaTrigger: boolean) => {
    setIsMenuOpen(true);
    setFocusedIndex(0);

    let targetX = x;
    let targetY = y;

    const menuWidth = 185;
    const menuHeight = 175;

    // Use trigger coordinates if opened via trigger or keyboard context menu
    if ((viaTrigger || (x === 0 && y === 0)) && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      targetX = rect.right - menuWidth;
      targetY = rect.bottom + 4;
    }

    // Viewport edge collision handling
    if (targetX + menuWidth > window.innerWidth) {
      targetX = window.innerWidth - menuWidth - 8;
    }
    if (targetX < 8) {
      targetX = 8;
    }

    if (targetY + menuHeight > window.innerHeight) {
      if ((viaTrigger || (x === 0 && y === 0)) && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        targetY = rect.top - menuHeight - 4;
      } else {
        targetY = y - menuHeight;
      }
    }
    if (targetY < 8) {
      targetY = 8;
    }

    setMenuCoords({ x: targetX, y: targetY });
  };


  // Close menu and restore focus if necessary
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsMenuOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  // Handle roving focus on menu item changes
  useEffect(() => {
    if (isMenuOpen) {
      const itemEl = menuRef.current?.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
      itemEl?.focus();
    }
  }, [isMenuOpen, focusedIndex]);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  function handleActivate() {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    if (onSelect) {
      onSelect(stream.id);
    } else {
      navigate(`/app/streams/${stream.id}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY, false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    touchStartPos.current = { x, y };
    longPressedRef.current = false;
    setShowProgressRing(true);
    setProgressRingCoords({ x, y });

    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    longPressTimer.current = setTimeout(() => {
      openMenu(x, y, false);
      setShowProgressRing(false);
      longPressTimer.current = null;
      longPressedRef.current = true;
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;

    const touch = e.touches[0];
    const distance = Math.hypot(
      touch.clientX - touchStartPos.current.x,
      touch.clientY - touchStartPos.current.y
    );

    if (distance > 10) {
      cancelLongPress();
    }
  };

  const handleTouchEnd = () => {
    cancelLongPress();
  };

  const handleTouchCancel = () => {
    cancelLongPress();
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setShowProgressRing(false);
    touchStartPos.current = null;
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const itemsCount = 4;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % itemsCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + itemsCount) % itemsCount);
    }
  };

  return (
    <tr
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      style={{
        borderBottom: "1px solid var(--color-border-default)",
        backgroundColor: isSelected
          ? "var(--color-surface-elevated)"
          : "var(--color-surface-default)",
        transition:
          "background-color var(--motion-duration-stream-disclosure) var(--motion-ease-stream-disclosure)",
        cursor: "pointer",
        outline: "none",
      }}
      onFocus={(e) => {
        e.currentTarget.style.backgroundColor =
          "var(--color-surface-elevated)";
        e.currentTarget.style.outline =
          "2px solid var(--color-accent-primary)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.backgroundColor = isSelected
          ? "var(--color-surface-elevated)"
          : "var(--color-surface-default)";
        e.currentTarget.style.outline = "none";
      }}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          "var(--color-surface-elevated)";
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.backgroundColor = isSelected
            ? "var(--color-surface-elevated)"
            : "var(--color-surface-default)";
        }
      }}
    >
      {/* Compare checkbox — only rendered when parent supplies onCompareToggle */}
      {onCompareToggle !== undefined && (
        <td
          className="py-4 px-3"
          style={{ width: "2.5rem" }}
          onClick={(e) => e.stopPropagation()}
          data-label=""
        >
          <input
            type="checkbox"
            checked={isChecked}
            aria-label={`Select ${stream.name} for comparison`}
            onChange={() => onCompareToggle(stream.id)}
            style={{
              width: "1rem",
              height: "1rem",
              cursor: "pointer",
              accentColor: "var(--color-accent-primary, #00a884)",
            }}
          />
        </td>
      )}

      <td className="py-4 px-3" data-label="STREAM">
        <div
          className="font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {stream.name}
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {stream.id}
        </div>
      </td>

      <td
        className="py-4 px-3"
        data-label="RECIPIENT"
        style={{ color: "var(--color-text-primary)" }}
        title={stream.recipient}
        aria-label={`Recipient ${stream.recipient}`}
      >
        <TruncatedAddress address={stream.recipient} label="" className="stream-row__address" />
      </td>

      <td className="stream-row__cell py-4 px-3" data-label="RATE" style={{ color: "var(--color-text-primary)" }}>
        <div className="stream-row__amount">{stream.rate}</div>
        {typeof stream.accruedAmount === "number" && (
          <div className="stream-row__amount text-xs" style={{ color: "var(--color-text-muted)" }}>
            {formatAccruedAmount(stream.accruedAmount)}
          </div>
        )}
      </td>

      <td className="stream-row__cell py-4 px-3" data-label="STATUS">
        <StatusPill status={stream.status} />
      </td>

      <td className="stream-row__cell py-4 px-3" data-label="ACTION">
        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/app/streams/${stream.id}`);
            }}
            aria-label={`View details for ${stream.name}`}
            className="font-medium flex items-center gap-1"
            style={{
              color: "var(--color-accent-primary)",
              transition:
                "color var(--motion-duration-stream-disclosure) var(--motion-ease-stream-disclosure)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-accent-primary-dark)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-accent-primary)";
            }}
          >
            View -&gt;
          </button>

          <button
            ref={triggerRef}
            type="button"
            aria-label={`Actions for stream ${stream.name}`}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            className={`stream-row__ellipsis-btn ${isMenuOpen ? "stream-row__ellipsis-btn--active" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              if (isMenuOpen) {
                setIsMenuOpen(false);
              } else {
                const rect = event.currentTarget.getBoundingClientRect();
                openMenu(rect.right - 185, rect.bottom + 4, true);
              }
            }}
          >
            <MoreVertical size={16} />
          </button>
        </div>

        {showProgressRing && (
          <div
            className="long-press-feedback"
            style={{
              left: progressRingCoords.x,
              top: progressRingCoords.y,
            }}
          >
            <svg>
              <circle className="long-press-feedback__bg" cx="22" cy="22" r="20" />
              <circle className="long-press-feedback__progress" cx="22" cy="22" r="20" />
            </svg>
          </div>
        )}

        {isMenuOpen && (
          <div
            ref={menuRef}
            className="context-menu"
            style={{
              left: menuCoords.x,
              top: menuCoords.y,
            }}
            role="menu"
            aria-label={`Actions for stream ${stream.name}`}
            onKeyDown={handleMenuKeyDown}
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="context-menu__list" role="none">
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  data-index={0}
                  tabIndex={focusedIndex === 0 ? 0 : -1}
                  className="context-menu__item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate(`/app/streams/${stream.id}`);
                  }}
                >
                  <Eye size={16} aria-hidden="true" />
                  <span>View details</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  data-index={1}
                  tabIndex={focusedIndex === 1 ? 0 : -1}
                  className="context-menu__item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    copy(stream.recipient);
                    if (toast) {
                      toast.addToast("Address copied to clipboard", "success");
                    }
                  }}
                >
                  <Copy size={16} aria-hidden="true" />
                  <span>Copy address</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  data-index={2}
                  tabIndex={focusedIndex === 2 ? 0 : -1}
                  className="context-menu__item"
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.open(stellarExplorerUrl(stream.recipient), "_blank", "noopener,noreferrer");
                  }}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  <span>View in explorer</span>
                </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  data-index={3}
                  tabIndex={focusedIndex === 3 ? 0 : -1}
                  className="context-menu__item context-menu__item--danger"
                  disabled={stream.status === "Completed"}
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (toast) {
                      toast.addToast(`Stream ${stream.status === "Paused" ? "resumed" : "paused"} successfully`, "success");
                    }
                  }}
                >
                  <Pause size={16} aria-hidden="true" />
                  <span>Pause/Cancel</span>
                </button>
              </li>
            </ul>
          </div>
        )}
      </td>
    </tr>
  );
}
