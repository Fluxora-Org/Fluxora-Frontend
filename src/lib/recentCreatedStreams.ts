export interface RecentCreatedStream {
  streamId: string;
  streamUrl: string;
  createdAt: string;
}

const RECENT_CREATED_STREAMS_KEY = "fluxora.recent-created-streams";
const MAX_RECENT_CREATED_STREAMS = 10;

function readRecentCreatedStreams(): RecentCreatedStream[] {
  return [];
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
