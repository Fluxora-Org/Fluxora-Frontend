export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: unknown;
  timestamp: string;
}

export type LogSink = (entry: LogEntry) => void;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_LOG_LEVEL;
const minimumLevel: LogLevel =
  configuredLevel && configuredLevel in LOG_LEVELS
    ? (configuredLevel as LogLevel)
    : import.meta.env?.PROD
      ? "error"
      : "debug";

const defaultSink: LogSink = (entry) => {
  if (entry.level !== "error" || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<LogEntry>("fluxora:log", { detail: entry }));
};

let sink: LogSink = defaultSink;

export function setLogSink(nextSink: LogSink): void {
  sink = nextSink;
}

export function resetLogSink(): void {
  sink = defaultSink;
}

export function log(level: LogLevel, message: string, context?: unknown): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[minimumLevel]) return;
  sink({ level, message, context, timestamp: new Date().toISOString() });
}

export const logger = {
  debug: (message: string, context?: unknown) => log("debug", message, context),
  info: (message: string, context?: unknown) => log("info", message, context),
  warn: (message: string, context?: unknown) => log("warn", message, context),
  error: (message: string, context?: unknown) => log("error", message, context),
};