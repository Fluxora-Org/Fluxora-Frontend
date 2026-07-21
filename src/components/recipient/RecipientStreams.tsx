// src/components/recipient/RecipientStreams.tsx
import { useEffect, useState } from "react";
import { mockRecipientStreams, type RecipientStream } from "../../fixtures/recipientStreams";
import RecipientEmptyState from "../RecipientEmptyState";
import RecipientLoading from "../RecipientLoading";

export type RecipientStreamsSortKey = "pinned" | "newest" | "rate";

const STATUS_LABELS: Record<RecipientStream["status"], string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const STATUS_CLASSES: Record<RecipientStream["status"], string> = {
  active: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  paused: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  completed: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

export interface RecipientStreamsProps {
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Data streams to render */
  streams?: RecipientStream[];
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Primary CTA for empty state */
  onEmptyPrimaryAction?: () => void;
}

export function sortRecipientStreams(
  streams: RecipientStream[],
  sortKey: RecipientStreamsSortKey
) {
  return [...streams].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    if (sortKey === "newest") {
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    }
    if (sortKey === "rate") {
      return b.rate - a.rate;
    }
    return 0;
  });
}

export default function RecipientStreams({
  isLoading = false,
  error = null,
  streams = mockRecipientStreams,
  onRetry,
  onEmptyPrimaryAction,
}: RecipientStreamsProps) {
  const [streamData, setStreamData] = useState<RecipientStream[]>(streams);

  useEffect(() => {
    setStreamData(streams);
  }, [streams]);

  const handlePinToggle = (id: string) => {
    setStreamData((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isPinned: !s.isPinned } : s
      )
    );
  };
  const [sortKey, setSortKey] = useState<RecipientStreamsSortKey>("pinned");

  if (isLoading) {
    return <RecipientLoading />;
  }

  if (error) {
    return <RecipientEmptyState loading={false} error={error} onRetry={onRetry} />;
  }

  if (!streamData || streamData.length === 0) {
    return (
      <RecipientEmptyState
        loading={false}
        error={null}
        onPrimaryAction={onEmptyPrimaryAction}
      />
    );
  }

  const sortedStreams = sortRecipientStreams(streamData, sortKey);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--text)" }} id="streams-list-heading">
          Your Incoming Streams
        </h2>
        <div className="flex items-center gap-2">
          <label htmlFor="streams-sort" className="text-xs font-medium text-slate-500 uppercase tracking-widest">
            Sort by:
          </label>
          <select
            id="streams-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as RecipientStreamsSortKey)}
            className="bg-transparent border border-[var(--border)] text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            style={{ background: "var(--surface)", color: "var(--text)" }}
          >
            <option value="pinned">Priority (Pinned)</option>
            <option value="newest">Newest First</option>
            <option value="rate">Highest Rate</option>
          </select>
        </div>
      </div>

      <div className="hidden md:grid grid-cols-[minmax(240px,1fr)_1fr_96px_96px] gap-6 px-5 text-xs font-bold text-slate-500 uppercase tracking-widest">
        <span>From</span>
        <span>Accrued</span>
        <span>Rate</span>
        <span>Status</span>
      </div>

      <ul className="grid gap-4" aria-labelledby="streams-list-heading" role="list">
        {sortedStreams.map((stream) => (
          <li
            key={stream.id}
            className={`stream-card group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
              stream.isPinned ? "is-active" : ""
            }`}
            style={{ background: "var(--card-gradient)", borderColor: "var(--border)" }}
          >
            {stream.isPinned && (
              <div aria-hidden="true" className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            )}
            <article aria-label={`Stream from ${stream.senderName}`} className="p-5 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex items-center gap-4 min-w-[240px]">
                <div
                  aria-hidden="true"
                  className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg ${
                    stream.isPinned ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {stream.senderName.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold" style={{ color: "var(--text)" }}>{stream.senderName}</span>
                  <span className="text-xs tabular-nums font-mono" style={{ color: "var(--muted)" }}>{stream.sender}</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold" style={{ color: "var(--text)" }}>{stream.amount.toLocaleString()}</span>
                    <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>USDC Total</span>
                  </div>
                  <span className={`text-xs font-bold ${stream.isPinned ? "text-cyan-400" : "text-slate-400"}`} aria-label={`${stream.progress}% streamed`}>{stream.progress}%</span>
                </div>
                <div role="progressbar" aria-valuenow={stream.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${stream.senderName} stream progress: ${stream.progress}%`} className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div aria-hidden="true" className={`h-full rounded-full transition-all duration-1000 ${
                    stream.isPinned ? "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "bg-slate-600"
                  }`} style={{ width: `${stream.progress}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-8 min-w-[200px] justify-between">
                <dl className="flex flex-col gap-2">
                  <div className="flex flex-col">
                    <dt className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rate</dt>
                    <dd className="text-sm font-bold" style={{ color: "var(--text)" }}>{stream.rate} USDC/hr</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="sr-only">Status</dt>
                    <dd>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${STATUS_CLASSES[stream.status]}`} role="status" aria-label={`Stream status: ${STATUS_LABELS[stream.status]}`}>
                        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${
                          stream.status === "active" ? "bg-emerald-400 animate-pulse" : stream.status === "paused" ? "bg-amber-400" : "bg-blue-400"
                        }`} />
                        {STATUS_LABELS[stream.status]}
                      </span>
                    </dd>
                  </div>
                </dl>
                <div className="flex items-center gap-3">
                  <button
                     aria-label={stream.isPinned ? `Unpin stream from ${stream.senderName}` : `Pin stream from ${stream.senderName}`}
                     aria-pressed={stream.isPinned}
                     onClick={() => handlePinToggle(stream.id)}
                     className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black"
                   >
                     {/* Pin icon (placeholder) */}
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                       <path d="M5 12h14M12 5l7 7-7 7" />
                     </svg>
                   </button>
                  <button aria-label={`View details for stream from ${stream.senderName}`} className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-1 focus-visible:ring-offset-black">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
