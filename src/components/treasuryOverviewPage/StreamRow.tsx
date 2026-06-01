import { useNavigate } from "react-router-dom";
import StatusPill from "./StatusPill";
import { Stream } from "./Stream";
import "./StreamRow.css";

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
      className={`stream-row${isSelected ? " stream-row--selected" : ""}`}
      role="row"
      tabIndex={0}
      aria-selected={isSelected}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <td className="stream-row__cell py-4 px-3">
        <div className="stream-row__name">{stream.name}</div>
        <div className="stream-row__id">{stream.id}</div>
      </td>

      <td className="stream-row__cell py-4 px-3">
        <span className="stream-row__text">{stream.recipient}</span>
      </td>

      <td className="stream-row__cell py-4 px-3">
        <span className="stream-row__text">{stream.rate}</span>
      </td>

      <td className="stream-row__cell py-4 px-3">
        <StatusPill status={stream.status} />
      </td>

      <td className="stream-row__cell py-4 px-3">
        <button
          type="button"
          className="stream-row__action-btn"
          tabIndex={-1}
          aria-label={`View stream ${stream.name}`}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/app/streams/${stream.id}`);
          }}
        >
          View ↗
        </button>
      </td>
    </tr>
  );
}
