import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeNewsletter } from "../newsletterService";

describe("subscribeNewsletter", () => {
  afterEach(() => {
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
      expect.any(Object),
    );
  });
});
