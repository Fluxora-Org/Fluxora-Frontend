import { logger } from "./logger";

type VitalEntry = PerformanceEntry & {
  hadRecentInput?: boolean;
  interactionId?: number;
  value?: number;
};

type VitalName = "LCP" | "CLS" | "INP";

const SAMPLE_RATE = 0.1;
const ROUTE_PATTERNS = [
  "/",
  "/dashboard",
  "/streams",
  "/streams/:streamId",
  "/landing",
  "/app",
  "/app/streams",
  "/app/streams/:streamId",
  "/app/recipient",
  "/app/treasurypage",
  "/app/error",
  "/app/empty-state-demo",
  "/app/component-gallery",
  "/connect-wallet",
  "/embed/streams/:streamId",
];

function getRoutePattern(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  for (const pattern of ROUTE_PATTERNS) {
    const patternSegments = pattern.split("/").filter(Boolean);
    if (
      patternSegments.length === segments.length &&
      patternSegments.every(
        (segment, index) =>
          segment.startsWith(":") || segment === segments[index],
      )
    ) {
      return pattern;
    }
  }

  return "/*";
}

function getInp(interactions: Map<number, number>): number | undefined {
  if (interactions.size === 0) return undefined;

  const durations = [...interactions.values()].sort((a, b) => a - b);
  const index =
    durations.length <= 50
      ? durations.length - 1
      : Math.ceil(durations.length * 0.98) - 1;
  return durations[index];
}

export function initWebVitals(): void {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    typeof PerformanceObserver === "undefined" ||
    Math.random() >= SAMPLE_RATE
  ) {
    return;
  }

  const supportedTypes = PerformanceObserver.supportedEntryTypes;
  const entryTypes = [
    "largest-contentful-paint",
    "layout-shift",
    "event",
  ] as const;
  const canObserve = (type: (typeof entryTypes)[number]) =>
    !supportedTypes || supportedTypes.includes(type);

  if (!entryTypes.some(canObserve)) return;

  let lcp: number | undefined;
  let clsWindowStart = 0;
  let clsLastShift = 0;
  let clsWindowValue = 0;
  let maxCls = 0;
  const interactions = new Map<number, number>();
  const observers: PerformanceObserver[] = [];
  const route = getRoutePattern(window.location.pathname);
  let reported = false;

  const observe = (
    type: (typeof entryTypes)[number],
    callback: (entries: PerformanceObserverEntryList) => void,
  ): boolean => {
    if (!canObserve(type)) return false;

    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => callback(list));
      observer.observe({
        type,
        buffered: true,
        ...(type === "event" ? { durationThreshold: 16 } : {}),
      });
      observers.push(observer);
      return true;
    } catch {
      // Some engines expose PerformanceObserver but reject individual entry types.
      observer?.disconnect();
      return false;
    }
  };

  observe("largest-contentful-paint", (list) => {
    for (const entry of list.getEntries()) {
      lcp = entry.startTime;
    }
  });

  const observesLayoutShift = observe("layout-shift", (list) => {
    for (const rawEntry of list.getEntries()) {
      const entry = rawEntry as VitalEntry;
      if (entry.hadRecentInput || typeof entry.value !== "number") continue;

      if (
        clsWindowValue === 0 ||
        entry.startTime - clsLastShift >= 1000 ||
        entry.startTime - clsWindowStart > 5000
      ) {
        clsWindowStart = entry.startTime;
        clsWindowValue = 0;
      }

      clsWindowValue += entry.value;
      clsLastShift = entry.startTime;
      maxCls = Math.max(maxCls, clsWindowValue);
    }
  });

  observe("event", (list) => {
    for (const rawEntry of list.getEntries()) {
      const entry = rawEntry as VitalEntry;
      if (
        typeof entry.interactionId !== "number" ||
        entry.interactionId === 0 ||
        !Number.isFinite(entry.duration)
      ) {
        continue;
      }

      interactions.set(
        entry.interactionId,
        Math.max(interactions.get(entry.interactionId) ?? 0, entry.duration),
      );
    }
  });

  if (observers.length === 0) return;

  const report = () => {
    if (reported || document.visibilityState !== "hidden") return;
    reported = true;
    document.removeEventListener("visibilitychange", report);
    observers.forEach((observer) => observer.disconnect());

    const metrics: Array<[VitalName, number]> = [];
    if (lcp !== undefined) metrics.push(["LCP", lcp]);
    if (observesLayoutShift) metrics.push(["CLS", maxCls]);
    const inp = getInp(interactions);
    if (inp !== undefined) metrics.push(["INP", inp]);

    for (const [name, value] of metrics) {
      logger.info("Web vital", { name, value, route });
    }
  };

  document.addEventListener("visibilitychange", report);
}
