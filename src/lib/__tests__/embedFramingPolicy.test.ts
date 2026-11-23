import { describe, it, expect } from "vitest";
import {
  getConfiguredEmbedOrigins,
  getEmbedderOrigin,
  getFramingContext,
  type FramingWindowLike,
} from "../embedFramingPolicy";

function makeWindow(opts: {
  framed: boolean;
  referrer?: string;
  origin?: string;
}): FramingWindowLike {
  const self = {};
  return {
    top: opts.framed ? {} : self,
    self,
    location: { origin: opts.origin ?? "https://widget.example" },
    document: { referrer: opts.referrer ?? "" },
  };
}

describe("getConfiguredEmbedOrigins", () => {
  it("returns an empty set when unset", () => {
    expect(getConfiguredEmbedOrigins({}).size).toBe(0);
    expect(getConfiguredEmbedOrigins({ VITE_EMBED_ALLOWED_ORIGINS: "" }).size).toBe(0);
  });

  it("parses, trims, and origin-normalizes a comma-separated list", () => {
    const origins = getConfiguredEmbedOrigins({
      VITE_EMBED_ALLOWED_ORIGINS:
        "https://app.example, https://host.example/path, http://localhost:3000",
    });
    expect(origins).toEqual(
      new Set(["https://app.example", "https://host.example", "http://localhost:3000"])
    );
  });

  it("ignores malformed entries and the opaque null origin", () => {
    const origins = getConfiguredEmbedOrigins({
      VITE_EMBED_ALLOWED_ORIGINS: "not a url, null, https://ok.example",
    });
    expect(origins).toEqual(new Set(["https://ok.example"]));
  });
});

describe("getEmbedderOrigin", () => {
  it("returns its own origin when the document is top-level", () => {
    const win = makeWindow({ framed: false, origin: "https://widget.example" });
    expect(getEmbedderOrigin(win)).toBe("https://widget.example");
  });

  it("derives the framing origin from document.referrer when framed", () => {
    const win = makeWindow({ framed: true, referrer: "https://app.example/embed" });
    expect(getEmbedderOrigin(win)).toBe("https://app.example");
  });

  it("returns null for an empty or unparseable referrer when framed", () => {
    expect(getEmbedderOrigin(makeWindow({ framed: true, referrer: "" }))).toBeNull();
    expect(getEmbedderOrigin(makeWindow({ framed: true, referrer: "not a url" }))).toBeNull();
  });
});

describe("getFramingContext", () => {
  it("trusts a top-level document regardless of allowlist", () => {
    const win = makeWindow({ framed: false });
    expect(getFramingContext({ win, configuredOrigins: new Set() })).toEqual({
      trusted: true,
      isFramed: false,
      embedderOrigin: "https://widget.example",
    });
  });

  it("trusts a framed document whose referrer is allowlisted", () => {
    const win = makeWindow({ framed: true, referrer: "https://app.example/embed" });
    const context = getFramingContext({
      win,
      configuredOrigins: new Set(["https://app.example"]),
    });
    expect(context).toEqual({
      trusted: true,
      isFramed: true,
      embedderOrigin: "https://app.example",
    });
  });

  it("does not trust a framed document whose referrer is not allowlisted", () => {
    const win = makeWindow({ framed: true, referrer: "https://evil.example" });
    const context = getFramingContext({
      win,
      configuredOrigins: new Set(["https://app.example"]),
    });
    expect(context.trusted).toBe(false);
    expect(context.isFramed).toBe(true);
  });

  it("fails closed for framed documents when no allowlist is configured", () => {
    const win = makeWindow({ framed: true, referrer: "https://app.example/embed" });
    expect(getFramingContext({ win, configuredOrigins: new Set() }).trusted).toBe(false);
  });

  it("fails closed when framed with a missing referrer even if an allowlist exists", () => {
    const win = makeWindow({ framed: true, referrer: "" });
    expect(
      getFramingContext({ win, configuredOrigins: new Set(["https://app.example"]) }).trusted
    ).toBe(false);
  });
});