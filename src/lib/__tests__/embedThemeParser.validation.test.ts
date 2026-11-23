import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EmbedThemeValidationError,
  MAX_EMBED_THEME_PARAM_LENGTH,
  parseAccentColorFromQuery,
  parseAccentColorFromQueryStrict,
  parseThemeConfigFromQueryStrict,
  parseThemeFromQuery,
  parseThemeFromQueryStrict,
} from "../embedThemeParser";

function captureError(run: () => unknown): EmbedThemeValidationError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(EmbedThemeValidationError);
    expect(error).toBeInstanceOf(Error);
    return error as EmbedThemeValidationError;
  }

  throw new Error("Expected the parser to reject the input");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseThemeFromQueryStrict", () => {
  it("returns null only when the parameter is absent", () => {
    expect(parseThemeFromQueryStrict(null)).toBeNull();
  });

  it("accepts and normalizes valid themes", () => {
    expect(parseThemeFromQueryStrict("light")).toBe("light");
    expect(parseThemeFromQueryStrict("DARK")).toBe("dark");
    expect(parseThemeFromQueryStrict("  Light  ")).toBe("light");
  });

  it.each(["", "   "])("rejects empty input %j", (value) => {
    const error = captureError(() => parseThemeFromQueryStrict(value));
    expect(error.name).toBe("EmbedThemeValidationError");
    expect(error.code).toBe("EMPTY_INPUT");
    expect(error.field).toBe("theme");
  });

  it("rejects oversized input", () => {
    const error = captureError(() =>
      parseThemeFromQueryStrict("a".repeat(MAX_EMBED_THEME_PARAM_LENGTH + 1)),
    );
    expect(error.code).toBe("OVERSIZED_INPUT");
    expect(error.field).toBe("theme");
  });

  it("accepts a value exactly at the size limit when it is otherwise valid", () => {
    const padded = `${" ".repeat(MAX_EMBED_THEME_PARAM_LENGTH - 5)}light`;
    expect(parseThemeFromQueryStrict(padded)).toBe("light");
  });

  it.each([
    "invalid",
    "cyberpunk",
    "light-dark",
    'light" onload="alert(1)',
    "dark><script>alert()</script>",
  ])("rejects malformed theme %j", (value) => {
    const error = captureError(() => parseThemeFromQueryStrict(value));
    expect(error.code).toBe("MALFORMED_INPUT");
    expect(error.field).toBe("theme");
    expect(error.message).toContain("light");
    expect(error.message).toContain("dark");
  });

  it("rejects non-string runtime input with a typed error", () => {
    const error = captureError(() =>
      parseThemeFromQueryStrict(42 as unknown as string),
    );
    expect(error.code).toBe("INVALID_TYPE");
    expect(error.field).toBe("theme");
  });
});

describe("parseAccentColorFromQueryStrict", () => {
  it("returns null only when the parameter is absent", () => {
    expect(parseAccentColorFromQueryStrict(null)).toBeNull();
  });

  it("accepts valid 3- and 6-digit hex colors", () => {
    expect(parseAccentColorFromQueryStrict("#00AEEF")).toBe("#00AEEF");
    expect(parseAccentColorFromQueryStrict("#abc")).toBe("#abc");
    expect(parseAccentColorFromQueryStrict("  #DEF  ")).toBe("#DEF");
  });

  it.each(["", "   "])("rejects empty input %j", (value) => {
    const error = captureError(() => parseAccentColorFromQueryStrict(value));
    expect(error.code).toBe("EMPTY_INPUT");
    expect(error.field).toBe("accentColor");
  });

  it("rejects oversized input", () => {
    const error = captureError(() =>
      parseAccentColorFromQueryStrict(
        `#${"a".repeat(MAX_EMBED_THEME_PARAM_LENGTH)}`,
      ),
    );
    expect(error.code).toBe("OVERSIZED_INPUT");
    expect(error.field).toBe("accentColor");
  });

  it.each([
    "red",
    "#gggggg",
    "#12345",
    "#1234567",
    "123456",
    "rgb(255,0,0)",
    "hsl(120,100%,50%)",
    'url("evil.com")',
    "javascript:alert()",
    "data:text/html,<script>alert()</script>",
    "#00AEEF;background:red",
  ])("rejects malformed accent color %j", (value) => {
    const error = captureError(() =>
      parseAccentColorFromQueryStrict(value),
    );
    expect(error.code).toBe("MALFORMED_INPUT");
    expect(error.field).toBe("accentColor");
    expect(error.message).toContain("hex color");
  });

  it("rejects non-string runtime input with a typed error", () => {
    const error = captureError(() =>
      parseAccentColorFromQueryStrict({} as unknown as string),
    );
    expect(error.code).toBe("INVALID_TYPE");
  });
});

describe("parseThemeConfigFromQueryStrict", () => {
  it("returns defaults when neither parameter is supplied", () => {
    expect(
      parseThemeConfigFromQueryStrict({ theme: null, accentColor: null }),
    ).toEqual({ theme: null, accentColor: null });
  });

  it("returns a complete config for valid input", () => {
    expect(
      parseThemeConfigFromQueryStrict({
        theme: "DARK",
        accentColor: " #00AEEF ",
      }),
    ).toEqual({ theme: "dark", accentColor: "#00AEEF" });
  });

  it("reports every invalid field in one typed error", () => {
    const error = captureError(() =>
      parseThemeConfigFromQueryStrict({
        theme: "cyberpunk",
        accentColor: "not-a-hex",
      }),
    );

    expect(error.issues).toHaveLength(2);
    expect(error.issues.map((issue) => issue.field)).toEqual([
      "theme",
      "accentColor",
    ]);
    expect(error.issues.every((issue) => issue.code === "MALFORMED_INPUT")).toBe(
      true,
    );
    expect(error.code).toBe("MALFORMED_INPUT");
    expect(error.field).toBe("theme");
    expect(error.message).toContain("theme");
    expect(error.message).toContain("accentColor");
  });

  it("rejects the whole config before any DOM state is written", () => {
    const html = document.documentElement;
    const setAttributeSpy = vi.spyOn(html, "setAttribute");
    const setPropertySpy = vi.spyOn(html.style, "setProperty");

    const error = captureError(() =>
      parseThemeConfigFromQueryStrict({
        theme: "dark",
        accentColor: "javascript:alert()",
      }),
    );

    expect(error.field).toBe("accentColor");
    expect(setAttributeSpy).not.toHaveBeenCalled();
    expect(setPropertySpy).not.toHaveBeenCalled();
    expect(html.getAttribute("data-theme")).not.toBe("dark");
    expect(html.style.getPropertyValue("--color-accent-primary")).toBe("");
  });
});

describe("tolerant query parsers", () => {
  it("keep returning null for rejected input instead of throwing", () => {
    expect(parseThemeFromQuery("")).toBeNull();
    expect(parseThemeFromQuery("cyberpunk")).toBeNull();
    expect(parseThemeFromQuery("a".repeat(MAX_EMBED_THEME_PARAM_LENGTH + 1))).toBeNull();

    expect(parseAccentColorFromQuery("   ")).toBeNull();
    expect(parseAccentColorFromQuery("javascript:alert()")).toBeNull();
    expect(
      parseAccentColorFromQuery(
        `#${"a".repeat(MAX_EMBED_THEME_PARAM_LENGTH)}`,
      ),
    ).toBeNull();
  });

  it("are unaffected for valid input", () => {
    expect(parseThemeFromQuery(" Light ")).toBe("light");
    expect(parseAccentColorFromQuery(" #abc ")).toBe("#abc");
  });
});
