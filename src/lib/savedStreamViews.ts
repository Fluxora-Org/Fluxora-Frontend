import {
  parseStreamRouteFilters,
  serializeStreamRouteFilters,
  type StreamRouteFilters,
} from "./streamFilterParams";

export const MAX_SAVED_STREAM_VIEWS = 20;
export const MAX_SAVED_STREAM_VIEW_NAME = 60;
const MAX_STORAGE_LENGTH = 50_000;
export interface SavedStreamView {
  name: string;
  query: string;
}
const key = (account: string) => `fluxora:saved-stream-views:v1:${account}`;
const normalizeName = (name: string) =>
  Array.from(name)
    .filter((char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127)
    .join("")
    .trim()
    .slice(0, MAX_SAVED_STREAM_VIEW_NAME)
    .trim();

/** Browser-local, wallet-scoped preferences. Corrupt or blocked storage is harmless. */
export function readSavedStreamViews(account: string): SavedStreamView[] {
  if (!account) return [];
  try {
    const raw = localStorage.getItem(key(account));
    if (!raw || raw.length > MAX_STORAGE_LENGTH) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const views: SavedStreamView[] = [];
    for (const value of data.slice(0, MAX_SAVED_STREAM_VIEWS)) {
      if (
        !value ||
        typeof value.name !== "string" ||
        typeof value.query !== "string"
      )
        continue;
      const name = normalizeName(value.name);
      if (
        !name ||
        views.some((view) => view.name.toLowerCase() === name.toLowerCase())
      )
        continue;
      const filters = parseStreamRouteFilters(value.query);
      views.push({
        name,
        query: serializeStreamRouteFilters({ ...filters, page: 1 }),
      });
    }
    return views;
  } catch {
    return [];
  }
}

/** Returns false for invalid names, duplicate names, full or unavailable storage. */
export function saveStreamView(
  account: string,
  name: string,
  filters: StreamRouteFilters,
): boolean {
  const normalized = normalizeName(name);
  if (!account || !normalized) return false;
  const views = readSavedStreamViews(account);
  if (
    views.length >= MAX_SAVED_STREAM_VIEWS ||
    views.some((view) => view.name.toLowerCase() === normalized.toLowerCase())
  )
    return false;
  try {
    localStorage.setItem(
      key(account),
      JSON.stringify([
        ...views,
        {
          name: normalized,
          query: serializeStreamRouteFilters({ ...filters, page: 1 }),
        },
      ]),
    );
    return true;
  } catch {
    return false;
  }
}

export function deleteStreamView(account: string, name: string): boolean {
  if (!account) return false;
  try {
    localStorage.setItem(
      key(account),
      JSON.stringify(
        readSavedStreamViews(account).filter((view) => view.name !== name),
      ),
    );
    return true;
  } catch {
    return false;
  }
}
