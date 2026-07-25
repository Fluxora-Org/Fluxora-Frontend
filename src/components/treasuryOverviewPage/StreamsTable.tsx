import { useMemo, useRef, useState } from "react";
import StreamRow from "./StreamRow";
import { Stream } from "./Stream";

export type SortColumn = "stream" | "recipient" | "rate" | "status";
export type SortDirection = "asc" | "desc";

interface Props {
  streams: Stream[];
  /**
   * Called when the user clicks "Compare" after selecting two streams.
   * Receives the two selected stream IDs in left-pane / right-pane order.
   */
  onCompare?: (leftId: string, rightId: string) => void;
}

export default function StreamsTable({ streams, onCompare }: Props) {
  /** IDs selected for comparison. Capped at 2. */
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Legacy single-select kept for visual highlight; driven by compareIds[0].
  const selectedId = compareIds[0] ?? null;

  function handleHeaderClick(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  /**
   * Toggle a stream into / out of the compare selection.
   * At most two IDs are held at once; selecting a third replaces the oldest.
   */
  function handleCompareToggle(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // drop oldest, add new
      return [...prev, id];
    });
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

        const comp =
          typeof valA === "number" && typeof valB === "number"
            ? valA - valB
            : String(valA).localeCompare(String(valB));

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
   * WCAG 2.1 SC 2.1.1 (Keyboard) / grid pattern.
   */
  function handleKeyDown(e: React.KeyboardEvent<HTMLTableSectionElement>) {
    const rows = Array.from(
      tbodyRef.current?.querySelectorAll<HTMLTableRowElement>("tr[tabindex]") ??
        [],
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

  function getAriaSort(
    column: SortColumn,
  ): "ascending" | "descending" | "none" {
    if (sortColumn !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  const canCompare = compareIds.length === 2;

  return (
    <div>
      {/* ── Compare action bar ── */}
      {compareIds.length > 0 && (
        <div
          role="region"
          aria-label="Compare selection"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.625rem 1rem",
            background: "var(--color-surface-raised, #e8ecf1)",
            borderRadius: "8px 8px 0 0",
            borderBottom: "none",
            border: "1px solid var(--color-border-default, #e0e6ed)",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-secondary, #4a5565)",
              fontWeight: 500,
            }}
          >
            {compareIds.length === 1
              ? "1 stream selected — select one more to compare"
              : "2 streams selected"}
          </span>

          <button
            type="button"
            disabled={!canCompare}
            aria-disabled={!canCompare}
            onClick={() => {
              if (canCompare && onCompare) {
                onCompare(compareIds[0], compareIds[1]);
              }
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.375rem 0.875rem",
              borderRadius: "6px",
              border: "1px solid var(--color-accent-primary, #00a884)",
              background: canCompare
                ? "var(--color-accent-primary, #00a884)"
                : "transparent",
              color: canCompare ? "#fff" : "var(--color-accent-primary, #00a884)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: canCompare ? "pointer" : "default",
              opacity: canCompare ? 1 : 0.5,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            ⇔ Compare streams
          </button>

          <button
            type="button"
            aria-label="Clear compare selection"
            onClick={() => setCompareIds([])}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.375rem 0.625rem",
              borderRadius: "6px",
              border: "1px solid var(--color-border-default, #e0e6ed)",
              background: "transparent",
              color: "var(--color-text-muted, #6b7a94)",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            ✕ Clear
          </button>
        </div>
      )}

      <div
        className="overflow-x-auto rounded-lg"
        style={{
          border: "1px solid var(--color-border-default)",
          borderTopLeftRadius: compareIds.length > 0 ? 0 : undefined,
          borderTopRightRadius: compareIds.length > 0 ? 0 : undefined,
        }}
      >
        <table
          className="w-full text-left border-collapse"
          role="grid"
          aria-label="Active streams"
          aria-rowcount={sortedStreams.length}
          aria-multiselectable="true"
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
              {/* Checkbox column header */}
              <th scope="col" className="py-4 px-3" style={{ width: "2.5rem" }}>
                <span className="sr-only">Select for compare</span>
              </th>
              <th
                scope="col"
                className="py-4 px-3"
                aria-sort={getAriaSort("stream")}
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("stream")}
                  className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
                >
                  STREAM
                  {sortColumn === "stream" && (
                    <span aria-hidden="true">
                      {sortDirection === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </button>
              </th>
              <th
                scope="col"
                className="py-4 px-3"
                aria-sort={getAriaSort("recipient")}
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("recipient")}
                  className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
                >
                  RECIPIENT
                  {sortColumn === "recipient" && (
                    <span aria-hidden="true">
                      {sortDirection === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </button>
              </th>
              <th
                scope="col"
                className="py-4 px-3"
                aria-sort={getAriaSort("rate")}
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("rate")}
                  className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
                >
                  RATE
                  {sortColumn === "rate" && (
                    <span aria-hidden="true">
                      {sortDirection === "asc" ? " ▲" : " ▼"}
                    </span>
                  )}
                </button>
              </th>
              <th
                scope="col"
                className="py-4 px-3"
                aria-sort={getAriaSort("status")}
              >
                <button
                  type="button"
                  onClick={() => handleHeaderClick("status")}
                  className="flex items-center gap-1 font-semibold focus:outline-none hover:underline"
                >
                  STATUS
                  {sortColumn === "status" && (
                    <span aria-hidden="true">
                      {sortDirection === "asc" ? " ▲" : " ▼"}
                    </span>
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
                  isChecked={compareIds.includes(s.id)}
                  onSelect={(id) =>
                    setCompareIds((prev) =>
                      prev.includes(id) ? prev : [id, ...prev].slice(0, 1),
                    )
                  }
                  onCompareToggle={handleCompareToggle}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 px-3" style={{ color: "var(--color-text-muted)" }}>
                  No recent streams available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
