import { describe, expect, it } from "vitest";
import { getSafeExternalUrl } from "../safeExternalUrl";

describe("getSafeExternalUrl", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "/app/streams",
    "//evil.example/phish",
    "   ",
  ])("rejects unsafe or non-external URL %s", (value) => {
    expect(getSafeExternalUrl(value)).toBeNull();
  });

  it("accepts an absolute HTTPS URL and normalizes surrounding whitespace", () => {
    expect(getSafeExternalUrl("  https://example.com/stream/123  ")).toBe(
      "https://example.com/stream/123",
    );
  });

  it("returns the URL parser's canonical HTTPS serialization", () => {
    expect(getSafeExternalUrl("HTTPS://EXAMPLE.COM/stream/../receipt")).toBe(
      "https://example.com/receipt",
    );
  });

  it("rejects HTTP because external navigation is HTTPS-only", () => {
    expect(getSafeExternalUrl("http://example.com/stream/123")).toBeNull();
  });

  it("returns null for missing values", () => {
    expect(getSafeExternalUrl(undefined)).toBeNull();
    expect(getSafeExternalUrl(null)).toBeNull();
  });
});
