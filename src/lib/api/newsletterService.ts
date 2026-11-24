export type NewsletterResult =
  | "success"
  | "already-subscribed"
  | "rate-limited";

export interface NewsletterRequestOptions {
  /**
   * Request timeout in milliseconds. Defaults to `VITE_API_TIMEOUT_MS` env var
   * or 10,000ms. Pass `0` or `Infinity` to disable timeout.
   */
  timeoutMs?: number;
  /**
   * Optional external `AbortSignal`. When aborted by caller, an `AbortError`
   * is thrown and the in-flight request is cancelled immediately.
   */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class NewsletterServiceError extends Error {
  readonly kind: "network" | "http" | "timeout";
  readonly status?: number;

  constructor(
    message: string,
    kind: "network" | "http" | "timeout",
    status?: number,
  ) {
    super(message);
    this.name = "NewsletterServiceError";
    this.kind = kind;
    this.status = status;
  }
}

export class NewsletterTimeoutError extends NewsletterServiceError {
  constructor(timeoutMs: number) {
    super(
      `Newsletter request timed out after ${timeoutMs}ms`,
      "timeout",
    );
    this.name = "NewsletterTimeoutError";
  }
}

function readFiniteEnvInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNewsletterEndpoint(): string {
  const rawBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? "";
  const baseUrl = rawBaseUrl.endsWith("/")
    ? rawBaseUrl.slice(0, -1)
    : rawBaseUrl;
  return `${baseUrl}/newsletter/subscribe`;
}

export async function subscribeNewsletter(
  email: string,
  options: NewsletterRequestOptions = {},
): Promise<NewsletterResult> {
  const defaultTimeoutMs = readFiniteEnvInt(
    import.meta.env.VITE_API_TIMEOUT_MS,
    DEFAULT_TIMEOUT_MS,
  );
  const timeoutMs =
    options.timeoutMs !== undefined ? options.timeoutMs : defaultTimeoutMs;
  const callerSignal = options.signal;

  const timeoutController = new AbortController();
  let timedOut = false;
  let timerId: ReturnType<typeof setTimeout> | undefined;

  if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
    timerId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
  }

  const onCallerAbort = () => {
    timeoutController.abort();
  };

  if (callerSignal) {
    if (callerSignal.aborted) {
      if (timerId !== undefined) clearTimeout(timerId);
      throw new DOMException("Aborted", "AbortError");
    }
    callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }

  try {
    let response: Response;
    try {
      response = await fetch(getNewsletterEndpoint(), {
        method: "POST",
        signal: timeoutController.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      if (timedOut) {
        throw new NewsletterTimeoutError(timeoutMs);
      }
      if (
        callerSignal?.aborted ||
        (error instanceof DOMException &&
          error.name === "AbortError" &&
          !timedOut)
      ) {
        throw new DOMException("Aborted", "AbortError");
      }
      throw error;
    }

    if (response.status === 409) return "already-subscribed";
    if (response.status === 429) return "rate-limited";
    if (!response.ok) {
      throw new NewsletterServiceError(
        `Newsletter signup failed with status ${response.status}`,
        "http",
        response.status,
      );
    }

    return "success";
  } finally {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    if (callerSignal) {
      callerSignal.removeEventListener("abort", onCallerAbort);
    }
  }
}
