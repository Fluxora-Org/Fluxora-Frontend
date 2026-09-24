export interface RecentCreatedStream {
  streamId: string;
  streamUrl: string;
  createdAt: string;
}

const RECENT_CREATED_STREAMS_KEY = "fluxora.recent-created-streams";
const MAX_RECENT_CREATED_STREAMS = 10;

function readRecentCreatedStreams(): RecentCreatedStream[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.sessionStorage.getItem(RECENT_CREATED_STREAMS_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentCreatedStream[]) : [];
  } catch {
    return [];
  }
}

export function rememberCreatedStream(
  stream: Omit<RecentCreatedStream, "createdAt">,
): RecentCreatedStream {
  const record = { ...stream, createdAt: new Date().toISOString() };
  const recent = [
    record,
    ...readRecentCreatedStreams().filter(
      (item) => item.streamId !== stream.streamId,
    ),
  ].slice(0, MAX_RECENT_CREATED_STREAMS);

  try {
    window.sessionStorage.setItem(
      RECENT_CREATED_STREAMS_KEY,
      JSON.stringify(recent),
    );
  } catch {
    // Session storage can be unavailable in private or restricted contexts.
  }

  return record;
}

export function getRecentCreatedStreams(): RecentCreatedStream[] {
  return readRecentCreatedStreams();
}

export function clearRecentCreatedStreams(): void {
  try {
    window.sessionStorage.removeItem(RECENT_CREATED_STREAMS_KEY);
  } catch {
    // Session storage can be unavailable in private or restricted contexts.
  }
}