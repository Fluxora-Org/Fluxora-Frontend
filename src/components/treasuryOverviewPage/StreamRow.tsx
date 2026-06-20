import { useNavigate } from "react-router-dom";
import StatusPill from "./StatusPill";
import type { Stream } from "./Stream";

interface Props {
  stream: Stream;
  /** Whether this row is currently selected */
  isSelected?: boolean;
  /** Called when the row is activated (click or Enter/Space) */
  onSelect?: (id: string) => void;
}

function truncateAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

function formatAccruedAmount(amount: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(amount)} USDC accrued`;
}

export default function StreamRow({ stream, isSelected = false, onSelect }: Props) {
  const navigate = useNavigate();
  const recipientLabel = truncateAddress(stream.recipient);

  function handleActivate() {
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
        e.currentTarget.style.backgroundColor = "var(--color-surface-elevated)";
        e.currentTarget.style.outline = "2px solid var(--color-accent-primary)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.backgroundColor = isSelected
          ? "var(--color-surface-elevated)"
          : "var(--color-surface-default)";
        e.currentTarget.style.outline = "none";
      }}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-surface-elevated)";
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.currentTarget) {
          e.currentTarget.style.backgroundColor = isSelected
            ? "var(--color-surface-elevated)"
            : "var(--color-surface-default)";
        }
      }}
    >
      <td className="py-4 px-3">
        <div
          className="font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {stream.name}
        </div>
        <div
          className="text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          {stream.id}
        </div>
      </td>

      <td
        className="py-4 px-3"
        style={{ color: "var(--color-text-primary)" }}
        title={stream.recipient}
        aria-label={`Recipient ${stream.recipient}`}
      >
        {recipientLabel}
      </td>

      <td
        className="py-4 px-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        <div>{stream.rate}</div>
        {typeof stream.accruedAmount === "number" && (
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {formatAccruedAmount(stream.accruedAmount)}
          </div>
        )}
      </td>

      <td className="stream-row__cell py-4 px-3">
        <StatusPill status={stream.status} />
      </td>

      <td className="stream-row__cell py-4 px-3">
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
      </td>
    </tr>
  );
}
