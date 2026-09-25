import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import "./VirtualList.css";

interface VirtualRange {
  start: number;
  end: number;
}

export interface VirtualListProps<T> {
  /** Items to render in the list. */
  items: readonly T[];
  /** Stable key for each item. */
  getKey: (item: T, index: number) => string;
  /** Renders the full, interactive subtree for a mounted row. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Accessible label for the list region. */
  ariaLabel: string;
  /** Optional empty state rendered inside the list container. */
  emptyState?: ReactNode;
  /** CSS class applied to the list container. */
  className?: string;
  /** Estimated row height used to preserve scroll space for off-screen rows. */
  estimateSize?: number;
  /** Number of rows mounted before and after the viewport. */
  overscan?: number;
  /** Item count below which virtualization is skipped. */
  threshold?: number;
  /** Test id for focused component tests. */
  testId?: string;
}

const DEFAULT_ESTIMATE_SIZE = 360;
const DEFAULT_OVERSCAN = 2;
const DEFAULT_THRESHOLD = 20;

function clampRange(range: VirtualRange, itemCount: number): VirtualRange {
  const start = Math.min(Math.max(range.start, 0), itemCount);
  const end = Math.min(Math.max(range.end, start), itemCount);
  return { start, end };
}

/** Finds the item index whose [offset, offset + height) span contains `target`. */
function findOffsetIndex(offsets: number[], target: number): number {
  let lo = 0;
  let hi = offsets.length - 2; // offsets has itemCount + 1 entries
  if (hi < 0) return 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function getFocusableElements(element: HTMLElement): HTMLElement[] {
  return Array.from(
    element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ) as HTMLElement[];
}

function focusRowElement(rowEl: HTMLElement, focusableOffset: number | null) {
  const focusables = getFocusableElements(rowEl);
  if (focusables.length > 0) {
    const offset =
      focusableOffset === null
        ? 0
        : Math.min(Math.max(focusableOffset, 0), focusables.length - 1);
    focusables[offset]?.focus({ preventScroll: true });
    return;
  }
  // Rows without interactive children still need to be focusable for keyboard traversal.
  if (!rowEl.hasAttribute("tabindex")) {
    rowEl.tabIndex = -1;
  }
  rowEl.focus({ preventScroll: true });
}

export default function VirtualList<T>({
  items,
  getKey,
  renderItem,
  ariaLabel,
  emptyState,
  className,
  estimateSize = DEFAULT_ESTIMATE_SIZE,
  overscan = DEFAULT_OVERSCAN,
  threshold = DEFAULT_THRESHOLD,
  testId,
}: VirtualListProps<T>) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const focusedRowKeyRef = useRef<string | null>(null);
  const focusedRowIndexRef = useRef<number | null>(null);
  const focusableOffsetRef = useRef<number | null>(null);
  const pendingFocusIndexRef = useRef<number | null>(null);
  const offsetsRef = useRef<number[]>([0]);
  const [pinnedFocusIndex, setPinnedFocusIndex] = useState<number | null>(null);
  const [focusEpoch, setFocusEpoch] = useState(0);
  const shouldVirtualize = items.length > threshold;
  const safeEstimate = Math.max(estimateSize, 1);
  const effectiveOverscan = Math.max(prefersReducedMotion ? 1 : overscan, 0);

  // Measured row heights, keyed by item key. Rows report their real rendered
  // height via ResizeObserver so off-screen spacer sizing (and the mounted
  // range) stay accurate once content pushes a row taller than the estimate.
  const measuredHeightsRef = useRef<Map<string, number>>(new Map());
  const rowElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [heightVersion, setHeightVersion] = useState(0);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const key = target.getAttribute("data-virtual-key");
        if (!key) continue;
        const height = Math.round(
          entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height,
        );
        if (height <= 0) continue;

        const previousHeight = measuredHeightsRef.current.get(key);
        if (previousHeight === height) continue;
        measuredHeightsRef.current.set(key, height);
        changed = true;

        // Deterministic scroll correction: a row that resizes while positioned
        // above the viewport (already scrolled past) shifts everything below
        // it, including the visible content. Compensate the scroll position
        // by the exact delta so the rows the user is looking at do not jump.
        // A row growing/shrinking within the viewport is left alone — that
        // change is visible and expected.
        if (previousHeight !== undefined && typeof window !== "undefined") {
          const top = target.getBoundingClientRect().top;
          if (top < 0) {
            window.scrollBy(0, height - previousHeight);
          }
        }
      }
      if (changed) setHeightVersion((v) => v + 1);
    });
    resizeObserverRef.current = observer;

    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  const rowRefCallbacksRef = useRef<Map<string, (node: HTMLDivElement | null) => void>>(
    new Map(),
  );
  const getRowRefCallback = useCallback((key: string) => {
    let callback = rowRefCallbacksRef.current.get(key);
    if (!callback) {
      callback = (node: HTMLDivElement | null) => {
        const observer = resizeObserverRef.current;
        const previous = rowElementsRef.current.get(key);
        if (previous && previous !== node) {
          observer?.unobserve(previous);
          rowElementsRef.current.delete(key);
        }
        if (node) {
          rowElementsRef.current.set(key, node);
          observer?.observe(node);
        } else {
          rowRefCallbacksRef.current.delete(key);
        }
      };
      rowRefCallbacksRef.current.set(key, callback);
    }
    return callback;
  }, []);

  // Cumulative offsets for every item, using measured heights where known and
  // falling back to the estimate for rows that have never mounted. Rebuilt
  // only when the item set or a measured height actually changes.
  const offsets = useMemo(() => {
    const result = new Array(items.length + 1);
    result[0] = 0;
    for (let i = 0; i < items.length; i++) {
      const key = getKey(items[i], i);
      const height = measuredHeightsRef.current.get(key) ?? safeEstimate;
      result[i + 1] = result[i] + height;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, getKey, safeEstimate, heightVersion]);

  offsetsRef.current = offsets;

  const getRange = useCallback((): VirtualRange => {
    if (!shouldVirtualize || typeof window === "undefined") {
      return { start: 0, end: items.length };
    }

    const viewportHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      safeEstimate;
    const scrollTop =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    const containerTop =
      (containerRef.current?.getBoundingClientRect().top ?? 0) + scrollTop;
    const viewportStart = Math.max(0, scrollTop - containerTop);
    const viewportEnd = Math.max(
      viewportStart,
      scrollTop + viewportHeight - containerTop,
    );
    const start = findOffsetIndex(offsets, viewportStart) - effectiveOverscan;
    const end = findOffsetIndex(offsets, viewportEnd) + effectiveOverscan + 1;

    return clampRange({ start, end }, items.length);
  }, [effectiveOverscan, items.length, offsets, safeEstimate, shouldVirtualize]);

  const [range, setRange] = useState<VirtualRange>(() =>
    clampRange(
      {
        start: 0,
        end: Math.min(
          items.length,
          Math.ceil(800 / safeEstimate) + DEFAULT_OVERSCAN + 1,
        ),
      },
      items.length,
    ),
  );

  const updateRange = useCallback(() => {
    setRange((current) => {
      const next = getRange();
      return current.start === next.start && current.end === next.end
        ? current
        : next;
    });
  }, [getRange]);

  useLayoutEffect(() => {
    updateRange();
  }, [items.length, updateRange]);

  useEffect(() => {
    if (!shouldVirtualize) {
      return undefined;
    }

    updateRange();
    window.addEventListener("scroll", updateRange, { passive: true });
    window.addEventListener("resize", updateRange);

    return () => {
      window.removeEventListener("scroll", updateRange);
      window.removeEventListener("resize", updateRange);
    };
  }, [shouldVirtualize, updateRange]);

  // Track active focus within the list using capturing phase for maximum compatibility (jsdom)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target === container) {
        focusedRowKeyRef.current = null;
        focusedRowIndexRef.current = null;
        focusableOffsetRef.current = null;
        setPinnedFocusIndex(null);
        return;
      }
      const rowEl = target.closest(".virtual-list-item");
      if (rowEl) {
        const indexStr = rowEl.getAttribute("data-virtual-index");
        focusedRowKeyRef.current = rowEl.getAttribute("data-virtual-key");
        if (indexStr !== null) {
          const index = parseInt(indexStr, 10);
          focusedRowIndexRef.current = index;
          setPinnedFocusIndex(index);
          const focusables = getFocusableElements(rowEl as HTMLElement);
          focusableOffsetRef.current = focusables.indexOf(target);
        }
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!relatedTarget || !container.contains(relatedTarget)) {
        focusedRowKeyRef.current = null;
        focusedRowIndexRef.current = null;
        focusableOffsetRef.current = null;
        setPinnedFocusIndex(null);
      }
    };

    container.addEventListener("focus", handleFocusIn, true);
    container.addEventListener("blur", handleFocusOut, true);
    return () => {
      container.removeEventListener("focus", handleFocusIn, true);
      container.removeEventListener("blur", handleFocusOut, true);
    };
  }, []);

  const navigateToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;

      const key = getKey(items[index], index);
      pendingFocusIndexRef.current = index;
      focusedRowIndexRef.current = index;
      focusedRowKeyRef.current = key;
      setPinnedFocusIndex(index);

      if (typeof window !== "undefined" && shouldVirtualize) {
        const scrollTop =
          window.scrollY ||
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          0;
        const containerTop =
          (containerRef.current?.getBoundingClientRect().top ?? 0) + scrollTop;
        const targetTop = containerTop + offsetsRef.current[index];
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }

      // Mount a window around the destination so off-screen rows become reachable.
      setRange(
        clampRange(
          {
            start: index - effectiveOverscan,
            end: index + effectiveOverscan + 1,
          },
          items.length,
        ),
      );
      setFocusEpoch((value) => value + 1);
    },
    [
      effectiveOverscan,
      getKey,
      items,
      prefersReducedMotion,
      shouldVirtualize,
    ],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (items.length === 0) return;

      const target = event.target as HTMLElement;
      const insideRow = Boolean(target.closest?.(".virtual-list-item"));
      if (target !== containerRef.current && !insideRow) {
        return;
      }

      const currentIndex = focusedRowIndexRef.current ?? pinnedFocusIndex;
      let nextIndex: number | null = null;
      switch (event.key) {
        case "ArrowDown":
          nextIndex = Math.min((currentIndex ?? -1) + 1, items.length - 1);
          break;
        case "ArrowUp":
          nextIndex = Math.max(
            (currentIndex ?? items.length) - 1,
            0,
          );
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = items.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      if (nextIndex === currentIndex) {
        return;
      }
      navigateToIndex(nextIndex);
    },
    [items.length, navigateToIndex, pinnedFocusIndex],
  );

  // Apply pending arrow-key / programmatic focus after the destination row mounts.
  useLayoutEffect(() => {
    const pending = pendingFocusIndexRef.current;
    if (pending === null) return;

    const rowEl = containerRef.current?.querySelector<HTMLElement>(
      `.virtual-list-item[data-virtual-index="${pending}"]`,
    );
    if (!rowEl) return;

    focusRowElement(rowEl, focusableOffsetRef.current ?? 0);
    pendingFocusIndexRef.current = null;
  }, [focusEpoch, range, items]);

  // Restore focus by item identity. Keep the focused row mounted when the
  // viewport window shifts so keyboard / SR focus is not stolen.
  useLayoutEffect(() => {
    if (
      focusedRowKeyRef.current === null ||
      focusedRowIndexRef.current === null ||
      focusableOffsetRef.current === null
    ) {
      return;
    }

    if (pendingFocusIndexRef.current !== null) {
      return;
    }

    const focusedIndex = items.findIndex(
      (item, index) => getKey(item, index) === focusedRowKeyRef.current,
    );

    if (focusedIndex === -1) {
      // Focused item was filtered out — move to the nearest remaining row.
      const fallbackIndex = Math.min(
        focusedRowIndexRef.current,
        items.length - 1,
      );
      if (fallbackIndex < 0) {
        containerRef.current?.focus({ preventScroll: true });
        focusedRowKeyRef.current = null;
        focusedRowIndexRef.current = null;
        focusableOffsetRef.current = null;
        setPinnedFocusIndex(null);
        return;
      }

      const mountedRows = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(
          ".virtual-list-item",
        ) ?? [],
      );
      const candidates = mountedRows
        .map((rowEl) => ({
          rowEl,
          index: Number(rowEl.getAttribute("data-virtual-index")),
          focusables: getFocusableElements(rowEl),
        }))
        .filter(({ focusables }) => focusables.length > 0)
        .sort(
          (left, right) =>
            Math.abs(left.index - fallbackIndex) -
            Math.abs(right.index - fallbackIndex),
        );
      const nearest = candidates[0];
      if (nearest) {
        const targetOffset = Math.min(
          focusableOffsetRef.current,
          nearest.focusables.length - 1,
        );
        focusedRowKeyRef.current =
          nearest.rowEl.getAttribute("data-virtual-key");
        focusedRowIndexRef.current = nearest.index;
        focusableOffsetRef.current = targetOffset;
        setPinnedFocusIndex(nearest.index);
        nearest.focusables[targetOffset]?.focus({ preventScroll: true });
        return;
      }
      containerRef.current?.focus({ preventScroll: true });
      focusedRowKeyRef.current = null;
      focusedRowIndexRef.current = null;
      focusableOffsetRef.current = null;
      setPinnedFocusIndex(null);
      return;
    }

    focusedRowIndexRef.current = focusedIndex;
    setPinnedFocusIndex(focusedIndex);

    const rowEl = containerRef.current?.querySelector<HTMLElement>(
      `.virtual-list-item[data-virtual-index="${focusedIndex}"]`,
    );
    if (rowEl && !rowEl.contains(document.activeElement)) {
      // Same keyed row remounted (or was pinned back into the window).
      focusRowElement(rowEl, focusableOffsetRef.current);
    }
  }, [getKey, items, range, pinnedFocusIndex]);

  const viewportRange = shouldVirtualize
    ? range
    : { start: 0, end: items.length };

  // Pin the focused / navigated row into the mounted window so it stays in the
  // accessibility tree and keyboard focus is preserved across scroll shifts.
  const mountedRange = useMemo(() => {
    if (!shouldVirtualize) {
      return { start: 0, end: items.length };
    }
    let { start, end } = viewportRange;
    if (pinnedFocusIndex !== null) {
      start = Math.min(start, pinnedFocusIndex);
      end = Math.max(end, pinnedFocusIndex + 1);
    }
    return clampRange({ start, end }, items.length);
  }, [items.length, pinnedFocusIndex, shouldVirtualize, viewportRange]);

  const mountedItems = useMemo(
    () => items.slice(mountedRange.start, mountedRange.end),
    [items, mountedRange.end, mountedRange.start],
  );
  const beforeHeight = shouldVirtualize ? offsets[mountedRange.start] : 0;
  const afterHeight = shouldVirtualize
    ? Math.max(offsets[items.length] - offsets[mountedRange.end], 0)
    : 0;

  const containerClassName = [
    className,
    prefersReducedMotion ? "virtual-list--reduced-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      role="list"
      aria-label={ariaLabel}
      data-testid={testId}
      data-virtualized={shouldVirtualize ? "true" : "false"}
      data-item-count={items.length}
      tabIndex={items.length > 0 ? 0 : -1}
      style={{ outline: "none" }}
      onKeyDown={handleKeyDown}
    >
      {items.length === 0 ? (
        emptyState
      ) : (
        <>
          {beforeHeight > 0 && (
            <div
              className="virtual-list-spacer"
              style={{ height: beforeHeight }}
              aria-hidden="true"
              data-testid="virtual-list-before-spacer"
            />
          )}
          {mountedItems.map((item, offset) => {
            const index = mountedRange.start + offset;
            const key = getKey(item, index);

            return (
              <div
                key={key}
                ref={getRowRefCallback(key)}
                className="virtual-list-item"
                role="listitem"
                aria-setsize={items.length}
                aria-posinset={index + 1}
                data-virtual-index={index}
                data-virtual-key={key}
                style={
                  shouldVirtualize
                    ? {
                        minHeight:
                          measuredHeightsRef.current.get(key) ?? safeEstimate,
                      }
                    : undefined
                }
              >
                {renderItem(item, index)}
              </div>
            );
          })}
          {afterHeight > 0 && (
            <div
              className="virtual-list-spacer"
              style={{ height: afterHeight }}
              aria-hidden="true"
              data-testid="virtual-list-after-spacer"
            />
          )}
        </>
      )}
    </div>
  );
}
