import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NewsletterServiceError,
  NewsletterTimeoutError,
  subscribeNewsletter,
} from "../newsletterService";

describe("subscribeNewsletter", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses VITE_API_URL without duplicating a trailing slash", async () => {
    vi.stubEnv("VITE_API_URL", " https://api.example.test/ ");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);

    await expect(subscribeNewsletter("user@example.com")).resolves.toBe(
      "success",
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.test/newsletter/subscribe",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("aborts and throws NewsletterTimeoutError after default 10s timeout without retrying", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          });
        });
      });

    const promise = subscribeNewsletter("user@example.com");
    const assertion = expect(promise).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof NewsletterTimeoutError &&
        err instanceof NewsletterServiceError &&
        err.kind === "timeout" &&
        err.message === "Newsletter request timed out after 10000ms"
      );
    });

    await vi.advanceTimersByTimeAsync(9999);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("aborts after custom timeoutMs and throws distinguishable timeout error", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          });
        });
      });

    const promise = subscribeNewsletter("user@example.com", {
      timeoutMs: 1500,
    });
    const assertion = expect(promise).rejects.toMatchObject({
      name: "NewsletterTimeoutError",
      kind: "timeout",
      message: "Newsletter request timed out after 1500ms",
    });

    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("forwards caller AbortSignal to fetch and rejects with AbortError when aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_url, init) => {
        return new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      });

    const promise = subscribeNewsletter("user@example.com", {
      signal: controller.signal,
      timeoutMs: 5000,
    });
    controller.abort();

    await expect(promise).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects immediately without calling fetch if caller signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      subscribeNewsletter("user@example.com", { signal: controller.signal }),
    ).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
