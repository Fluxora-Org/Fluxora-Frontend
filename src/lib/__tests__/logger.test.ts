import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, resetLogSink, setLogSink, type LogEntry } from "../logger";

describe("logger", () => {
  afterEach(() => {
    resetLogSink();
  });

  it("routes all supported levels through the configured sink", () => {
    const entries: LogEntry[] = [];
    setLogSink((entry) => entries.push(entry));

    logger.debug("debug message");
    logger.info("info message");
    logger.warn("warning message");
    logger.error("error message");

    expect(entries.map(({ level }) => level)).toEqual([
      "debug",
      "info",
      "warn",
      "error",
    ]);
    expect(entries.every(({ timestamp }) => timestamp.length > 0)).toBe(true);
  });

  it("dispatches errors to the browser boundary by default", () => {
    const handler = vi.fn();
    window.addEventListener("fluxora:log", handler);

    logger.error("Unable to restore session");

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          level: "error",
          message: "Unable to restore session",
        }),
      }),
    );
    window.removeEventListener("fluxora:log", handler);
  });
});