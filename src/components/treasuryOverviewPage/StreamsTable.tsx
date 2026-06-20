import { useRef, useState } from "react";
import { streams as sampleStreams } from "./sample-streams.tsx";
import StreamRow from "./StreamRow";
import { Stream } from "./Stream";

interface StreamsTableProps {
  streams?: Stream[];
}

export default function StreamsTable({ streams = sampleStreams }: StreamsTableProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  /**
   * Arrow-key navigation within the table body.
   * Up/Down moves focus between rows; Home/End jump to first/last.
   * This satisfies WCAG 2.1 SC 2.1.1 (Keyboard) and the grid pattern.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTableSectionElement>) {
    const rows = Array.from(
      tbodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr[tabindex]") ?? []
    );
    const focused = document.activeElement as HTMLElement;
    const idx = rows.indexOf(focused as HTMLTableRowElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      rows[Math.min(idx + 1, rows.length - 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      rows[Math.max(idx - 1, 0)]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      rows[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      rows[rows.length - 1]?.focus();
    }
  }

  return (
    <div
      className="overflow-x-auto rounded-lg"
      style={{ border: "1px solid var(--color-border-default)" }}
    >
      <table
        className="w-full text-left border-collapse"
        role="grid"
        aria-label="Active streams"
        aria-rowcount={streams.length}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "var(--color-surface-raised)",
              color: "var(--color-text-muted)",
              fontSize: "12px",
              fontWeight: "600",
              letterSpacing: "0.05em",
            }}
          >
            <th scope="col" className="py-4 px-3">STREAM</th>
            <th scope="col" className="py-4 px-3">RECIPIENT</th>
            <th scope="col" className="py-4 px-3">RATE</th>
            <th scope="col" className="py-4 px-3">STATUS</th>
            <th scope="col" className="py-4 px-3">ACTION</th>
          </tr>
        </thead>

        <tbody ref={tbodyRef} onKeyDown={handleKeyDown}>
          {streams.length > 0 ? (
            streams.map((s: Stream) => (
              <StreamRow
                key={s.id}
                stream={s}
                isSelected={selectedId === s.id}
                onSelect={(id) =>
                  setSelectedId((prev) => (prev === id ? null : id))
                }
              />
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="py-8 px-3 text-center"
                style={{ color: "var(--color-text-muted)" }}
              >
                No streams found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
