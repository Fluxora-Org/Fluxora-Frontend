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

export default function StreamRow({ stream, isSelected = false, onSelect }: Props) {
  const navigate = useNavigate();

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
      style={{
        borderBottom: "1px solid var(--color-border-default)",
        backgroundColor: "var(--color-surface-default)",
        transition:
          "background-color var(--motion-duration-stream-disclosure) var(--motion-ease-stream-disclosure)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-surface-elevated)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-surface-default)";
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
      >
        {stream.recipient}
      </td>

      <td
        className="py-4 px-3"
        style={{ color: "var(--color-text-primary)" }}
      >
        {stream.rate}
      </td>

      <td className="stream-row__cell py-4 px-3">
        <StatusPill status={stream.status} />
      </td>

      <td className="stream-row__cell py-4 px-3">
        <button
          type="button"
          onClick={() => navigate(`/app/streams/${stream.id}`)}
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
