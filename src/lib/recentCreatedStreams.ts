export interface RecentCreatedStream {
  streamId: string;
  streamUrl: string;
  createdAt: string;
}

const RECENT_CREATED_STREAMS_KEY = "fluxora.recent-created-streams";

function readRecentCreatedStreams(): RecentCreatedStream[] {
  return [];
}

export function rememberCreatedStream(
  stream: Omit<RecentCreatedStream, "createdAt">,
): RecentCreatedStream {
  const record = { ...stream, createdAt: new Date().toISOString() };
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
