import { afterEach, describe, expect, it, vi } from "vitest";
import { resetLogSink, setLogSink, type LogEntry } from "../logger";
import { initWebVitals } from "../webVitals";

type Entry = PerformanceEntry & {
  duration?: number;
  hadRecentInput?: boolean;
  interactionId?: number;
  value?: number;
};

class FakePerformanceObserver {
  static supportedEntryTypes = [
    "largest-contentful-paint",
    "layout-shift",
    "event",
  ];

  static instances: FakePerformanceObserver[] = [];

  constructor(private readonly callback: PerformanceObserverCallback) {
    FakePerformanceObserver.instances.push(this);
  }

  observe = vi.fn();
  disconnect = vi.fn();

  emit(entries: Entry[]): void {
    this.callback(
      { getEntries: () => entries } as PerformanceObserverEntryList,
      this as unknown as PerformanceObserver,
    );
  }
}

function entry(entryType: string, values: Partial<Entry>): Entry {
  return {
    entryType,
    name: "",
    startTime: 0,
    duration: 0,
    toJSON: () => ({}),
    ...values,
  };
}

describe("web vitals", () => {
  const originalVisibilityState = Object.getOwnPropertyDescriptor(
    document,
    "visibilityState",
  );

  afterEach(() => {
    resetLogSink();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    FakePerformanceObserver.instances = [];
    if (originalVisibilityState) {
      Object.defineProperty(
        document,
        "visibilityState",
        originalVisibilityState,
      );
    }
    window.history.replaceState({}, "", "/");
  });

  it("reports LCP, CLS, and INP once with a route template, excluding recent-input shifts", () => {
    const logs: LogEntry[] = [];
    setLogSink((log) => logs.push(log));
    vi.stubGlobal("PerformanceObserver", FakePerformanceObserver);
    vi.spyOn(Math, "random").mockReturnValue(0);
    window.history.replaceState({}, "", "/app/streams/GABC123?address=GSECRET");

    initWebVitals();

    const [lcpObserver, clsObserver, eventObserver] =
      FakePerformanceObserver.instances;
    lcpObserver.emit([entry("largest-contentful-paint", { startTime: 1200 })]);
    clsObserver.emit([
      entry("layout-shift", {
        startTime: 100,
        value: 0.1,
        hadRecentInput: false,
      }),
      entry("layout-shift", {
        startTime: 200,
        value: 0.9,
        hadRecentInput: true,
      }),
      entry("layout-shift", {
        startTime: 300,
        value: 0.2,
        hadRecentInput: false,
      }),
    ]);
    eventObserver.emit([
      entry("event", { interactionId: 1, duration: 80 }),
      entry("event", { interactionId: 1, duration: 120 }),
      entry("event", { interactionId: 2, duration: 50 }),
    ]);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));

    expect(logs.map(({ message }) => message)).toEqual([
      "Web vital",
      "Web vital",
      "Web vital",
    ]);
    expect(logs.map(({ context }) => context)).toMatchObject([
      { name: "LCP", value: 1200, route: "/app/streams/:streamId" },
      { name: "CLS", route: "/app/streams/:streamId" },
      { name: "INP", value: 120, route: "/app/streams/:streamId" },
    ]);
    expect((logs[1].context as { value: number }).value).toBeCloseTo(0.3);
    expect(JSON.stringify(logs)).not.toContain("GABC123");
    expect(JSON.stringify(logs)).not.toContain("GSECRET");
    expect(
      FakePerformanceObserver.instances.every(
        ({ disconnect }) => disconnect.mock.calls.length === 1,
      ),
    ).toBe(true);
  });

  it("does not observe an unsampled page", () => {
    vi.stubGlobal("PerformanceObserver", FakePerformanceObserver);
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    initWebVitals();

    expect(FakePerformanceObserver.instances).toHaveLength(0);
  });

  it("reports zero CLS when no qualifying shifts occur", () => {
    const logs: LogEntry[] = [];
    setLogSink((log) => logs.push(log));
    vi.stubGlobal("PerformanceObserver", FakePerformanceObserver);
    vi.spyOn(Math, "random").mockReturnValue(0);

    initWebVitals();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(logs.map(({ context }) => context)).toContainEqual({
      name: "CLS",
      value: 0,
      route: "/",
    });
  });

  it("is a no-op when PerformanceObserver is unavailable", () => {
    vi.stubGlobal("PerformanceObserver", undefined);
    vi.spyOn(Math, "random").mockReturnValue(0);

    expect(() => initWebVitals()).not.toThrow();
  });
});
