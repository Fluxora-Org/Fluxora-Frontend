export type StreamSelectionState = "none" | "mixed" | "all";

export function toggleStreamSelection(
  selectedIds: ReadonlySet<string>,
  streamId: string,
  selected: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  if (selected) {
    next.add(streamId);
  } else {
    next.delete(streamId);
  }
  return next;
}

export function toggleStreamGroupSelection(
  selectedIds: ReadonlySet<string>,
  streamIds: readonly string[],
  selected: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  for (const streamId of streamIds) {
    if (selected) {
      next.add(streamId);
    } else {
      next.delete(streamId);
    }
  }
  return next;
}

export function getStreamSelectionState(
  selectedIds: ReadonlySet<string>,
  streamIds: readonly string[],
): StreamSelectionState {
  if (streamIds.length === 0) return "none";
  const selectedCount = streamIds.filter((id) => selectedIds.has(id)).length;
  if (selectedCount === 0) return "none";
  return selectedCount === streamIds.length ? "all" : "mixed";
}
