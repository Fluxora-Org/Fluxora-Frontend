import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
        return;
      }
      const rowEl = target.closest(".virtual-list-item");
      if (rowEl) {
        const indexStr = rowEl.getAttribute("data-virtual-index");
        focusedRowKeyRef.current = rowEl.getAttribute("data-virtual-key");
        if (indexStr !== null) {
          const index = parseInt(indexStr, 10);
          focusedRowIndexRef.current = index;
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
      }
    };

    container.addEventListener("focus", handleFocusIn, true);
    container.addEventListener("blur", handleFocusOut, true);
    return () => {
      container.removeEventListener("focus", handleFocusIn, true);
      container.removeEventListener("blur", handleFocusOut, true);
    };
  }, []);

  // Restore focus by item identity, using the previous index only for fallback.
  useLayoutEffect(() => {
    if (
      focusedRowKeyRef.current === null ||
      focusedRowIndexRef.current === null ||
      focusableOffsetRef.current === null
    ) {
      return;
    }

    const { start, end } = range;
    const focusedIndex = items.findIndex(
      (item, index) => getKey(item, index) === focusedRowKeyRef.current,
    );
    const focusedRowIsMounted = focusedIndex >= start && focusedIndex < end;
    if (focusedRowIsMounted) {
      focusedRowIndexRef.current = focusedIndex;
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
          Math.abs(left.index - focusedRowIndexRef.current!) -
          Math.abs(right.index - focusedRowIndexRef.current!),
      );
    const nearest = candidates[0];

    if (nearest) {
      const targetOffset = Math.min(
        focusableOffsetRef.current,
        nearest.focusables.length - 1,
      );
      if (targetOffset >= 0 && nearest.focusables[targetOffset]) {
        // Update tracking to the new focus target before focusing
        focusedRowKeyRef.current =
          nearest.rowEl.getAttribute("data-virtual-key");
        focusedRowIndexRef.current = nearest.index;
        focusableOffsetRef.current = targetOffset;
        nearest.focusables[targetOffset].focus({ preventScroll: true });
        return;
      }
    }

    // Fallback: focus the list container itself if no mounted row contains focusable elements
    if (containerRef.current) {
      containerRef.current.focus({ preventScroll: true });
      focusedRowKeyRef.current = null;
      focusedRowIndexRef.current = null;
      focusableOffsetRef.current = null;
    }
  }, [getKey, items, range]);

  const mountedRange = shouldVirtualize
    ? range
    : { start: 0, end: items.length };
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
      tabIndex={-1}
      style={{ outline: "none" }}
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
                data-virtual-index={index}
                data-virtual-key={key}
                style={
                  shouldVirtualize
                    ? { minHeight: measuredHeightsRef.current.get(key) ?? safeEstimate }
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
