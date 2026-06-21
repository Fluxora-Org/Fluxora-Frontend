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
  const shouldVirtualize = items.length > threshold;
  const safeEstimate = Math.max(estimateSize, 1);
  const effectiveOverscan = Math.max(prefersReducedMotion ? 1 : overscan, 0);

  const getRange = useCallback((): VirtualRange => {
    if (!shouldVirtualize || typeof window === "undefined") {
      return { start: 0, end: items.length };
    }

    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || safeEstimate;
    const scrollTop =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    const containerTop =
      (containerRef.current?.getBoundingClientRect().top ?? 0) + scrollTop;
    const viewportStart = Math.max(0, scrollTop - containerTop);
    const viewportEnd = Math.max(viewportStart, scrollTop + viewportHeight - containerTop);
    const start = Math.floor(viewportStart / safeEstimate) - effectiveOverscan;
    const end = Math.ceil(viewportEnd / safeEstimate) + effectiveOverscan + 1;

    return clampRange({ start, end }, items.length);
  }, [effectiveOverscan, items.length, safeEstimate, shouldVirtualize]);

  const [range, setRange] = useState<VirtualRange>(() =>
    clampRange(
      {
        start: 0,
        end: Math.min(items.length, Math.ceil(800 / safeEstimate) + DEFAULT_OVERSCAN + 1),
      },
      items.length,
    ),
  );

  const updateRange = useCallback(() => {
    setRange((current) => {
      const next = getRange();
      return current.start === next.start && current.end === next.end ? current : next;
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

  const mountedRange = shouldVirtualize ? range : { start: 0, end: items.length };
  const mountedItems = useMemo(
    () => items.slice(mountedRange.start, mountedRange.end),
    [items, mountedRange.end, mountedRange.start],
  );
  const beforeHeight = shouldVirtualize ? mountedRange.start * safeEstimate : 0;
  const afterHeight = shouldVirtualize
    ? Math.max(items.length - mountedRange.end, 0) * safeEstimate
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

            return (
              <div
                key={getKey(item, index)}
                className="virtual-list-item"
                role="listitem"
                data-virtual-index={index}
                style={shouldVirtualize ? { minHeight: safeEstimate } : undefined}
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
