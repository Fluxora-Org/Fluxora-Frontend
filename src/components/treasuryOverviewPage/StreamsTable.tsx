import { useMemo, useRef, useState } from "react";
import StreamRow from "./StreamRow";
import { Stream } from "./Stream";

export type SortColumn = "stream" | "recipient" | "rate" | "status";
export type SortDirection = "asc" | "desc";

export default function StreamsTable({ streams }: { streams: Stream[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  function handleHeaderClick(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  const sortedStreams = useMemo(() => {
    if (!sortColumn) return streams;

    return streams
      .map((stream, originalIndex) => ({ stream, originalIndex }))
      .sort((a, b) => {
        let valA: string | number;
        let valB: string | number;

        switch (sortColumn) {
          case "stream":
            valA = a.stream.name;
            valB = b.stream.name;
            break;
          case "recipient":
            valA = a.stream.recipient;
            valB = b.stream.recipient;
            break;
          case "rate":
            valA =
              typeof a.stream.accruedAmount === "number"
                ? a.stream.accruedAmount
                : a.stream.rate;
            valB =
              typeof b.stream.accruedAmount === "number"
                ? b.stream.accruedAmount
                : b.stream.rate;
            break;
          case "status":
            valA = a.stream.status;
            valB = b.stream.status;
            break;
        }

        let comp = 0;
        if (typeof valA === "number" && typeof valB === "number") {
          comp = valA - valB;
        } else {
          comp = String(valA).localeCompare(String(valB));
        }

        if (comp !== 0) {
          return sortDirection === "asc" ? comp : -comp;
        }

        // Stable sort: preserve original relative order for equal sort keys
        return a.originalIndex - b.originalIndex;
      })
      .map((entry) => entry.stream);
  }, [streams, sortColumn, sortDirection]);

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

  function getAriaSort(column: SortColumn): "ascending" | "descending" | "none" {
    if (sortColumn !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
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
        aria-rowcount={sortedStreams.length}
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
            <th scope="col" className="py-4 px-3" aria-sort={getAriaSort("stream")}>
              <button
                type="button"
                onClick={() => handleHeaderClick("stream")}
                className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
              >
                STREAM
                {sortColumn === "stream" && (
                  <span aria-hidden="true">{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                )}
              </button>
            </th>
            <th scope="col" className="py-4 px-3" aria-sort={getAriaSort("recipient")}>
              <button
                type="button"
                onClick={() => handleHeaderClick("recipient")}
                className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
              >
                RECIPIENT
                {sortColumn === "recipient" && (
                  <span aria-hidden="true">{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                )}
              </button>
            </th>
            <th scope="col" className="py-4 px-3" aria-sort={getAriaSort("rate")}>
              <button
                type="button"
                onClick={() => handleHeaderClick("rate")}
                className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
              >
                RATE
                {sortColumn === "rate" && (
                  <span aria-hidden="true">{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                )}
              </button>
            </th>
            <th scope="col" className="py-4 px-3" aria-sort={getAriaSort("status")}>
              <button
                type="button"
                onClick={() => handleHeaderClick("status")}
                className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
              >
                STATUS
                {sortColumn === "status" && (
                  <span aria-hidden="true">{sortDirection === "asc" ? " ▲" : " ▼"}</span>
                )}
              </button>
            </th>
            <th scope="col" className="py-4 px-3">
              ACTION
            </th>
          </tr>
        </thead>

        <tbody ref={tbodyRef} onKeyDown={handleKeyDown}>
          {sortedStreams.length > 0 ? (
            sortedStreams.map((s: Stream) => (
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
              <td colSpan={5} className="py-4 px-3 text-gray-500">
                No recent streams available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
