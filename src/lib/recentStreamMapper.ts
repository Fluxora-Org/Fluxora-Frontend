import type { Stream } from "../components/RecentStreams";
import type { StreamRecord } from "../data/streamRecords";
import { formatUsdc } from "./formatters";

export { formatUsdc };

/**
 * Map a normalized {@link StreamRecord} onto the lightweight row shape the
 * dashboard RecentStreams table renders. `detailUrl` is intentionally left
 * unset so the table falls back to the canonical stream detail route.
 */
export function toRecentStream(record: StreamRecord): Stream {
  return {
    name: record.name,
    id: record.id,
    recipient: record.recipientAddress || record.recipientName,
    rate: `${formatUsdc(record.monthlyRate)} / mo`,
    status: record.status,
  };
}
