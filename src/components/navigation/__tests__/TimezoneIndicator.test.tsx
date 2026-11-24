import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import TimezoneIndicator from "../TimezoneIndicator";

vi.mock("../../../hooks/useTickingNow", () => ({
  useTickingNow: () => "2026-07-28T14:45:00.000Z",
}));

const NativeDateTimeFormat = Intl.DateTimeFormat;

function mockResolvedTimezone(timezone: string | undefined) {
  mockDateTimeFormat((nativeResolvedOptions) => {
    const resolved = nativeResolvedOptions();
    return { ...resolved, timeZone: timezone };
  });
}

function mockTimezoneDetectionFailure() {
  mockDateTimeFormat(() => {
    throw new Error("Intl unavailable");
  });
}

function mockDateTimeFormat(
  resolveOptions: (
    nativeResolvedOptions: () => Intl.ResolvedDateTimeFormatOptions,
  ) => Intl.ResolvedDateTimeFormatOptions,
) {
  const DateTimeFormatWithMockedTimezone = function (
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    const formatter = new NativeDateTimeFormat(locales, options);
    if (locales === undefined && options === undefined) {
      const nativeResolvedOptions = formatter.resolvedOptions.bind(formatter);
      Object.defineProperty(formatter, "resolvedOptions", {
        value: () => resolveOptions(nativeResolvedOptions),
      });
    }
    return formatter;
  } as typeof Intl.DateTimeFormat;
  vi.stubGlobal(
    "Intl",
    Object.assign(Object.create(Intl), {
      DateTimeFormat: DateTimeFormatWithMockedTimezone,
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TimezoneIndicator", () => {
  it("does not mistake a successfully resolved UTC zone for a detection failure", () => {
    mockResolvedTimezone("UTC");
    render(<TimezoneIndicator />);

    expect(
      screen.getByRole("button", { name: /Current time: Local:.*UTC/ }),
    ).toBeInTheDocument();
  });

  it("shows a local desktop label, compact mobile label, and zoned tooltip details", () => {
    mockResolvedTimezone("Asia/Kolkata");
    render(<TimezoneIndicator />);

    const trigger = screen.getByRole("button", {
      name: /Current time: Local:/,
    });
    const clockLabels = trigger.querySelectorAll("span");
    expect(clockLabels).toHaveLength(2);
    clockLabels.forEach((label) =>
      expect(label).toHaveAttribute("aria-live", "off"),
    );
    expect(clockLabels[0]).toHaveTextContent("Local:");
    expect(clockLabels[1]).not.toHaveTextContent(/Asia|GMT|IST|UTC/);
    expect(trigger).toHaveAttribute("aria-describedby", "navbar-time-tooltip");

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(tooltip.textContent).toMatch(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+05:30/,
    );
    expect(tooltip).toHaveTextContent("Asia/Kolkata");
    expect(tooltip).toHaveTextContent("UTC+05:30");

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(tooltip).not.toBeVisible();
  });

  it.each([undefined, "", "Etc/Unknown"])(
    "displays the UTC fallback when timezone detection returns %s",
    (timezone) => {
      mockResolvedTimezone(timezone);
      render(<TimezoneIndicator />);

      const trigger = screen.getByRole("button", {
        name: /Current time: UTC:/,
      });
      fireEvent.click(trigger);

      const tooltip = screen.getByRole("tooltip");
      expect(tooltip).toHaveTextContent("Fallback");
      expect(tooltip).toHaveTextContent("UTC+00:00");
      expect(tooltip).toHaveTextContent(
        "Timezone detection unavailable. Using UTC fallback.",
      );
    },
  );

  it("displays the UTC fallback when timezone detection throws", () => {
    mockTimezoneDetectionFailure();
    render(<TimezoneIndicator />);

    const trigger = screen.getByRole("button", { name: /Current time: UTC:/ });
    fireEvent.click(trigger);

    expect(screen.getByRole("tooltip")).toHaveTextContent("Fallback");
  });

  it("has no automated accessibility violations when expanded", async () => {
    mockResolvedTimezone("Europe/London");
    const { container } = render(<TimezoneIndicator />);
    fireEvent.focus(screen.getByRole("button", { name: /Current time:/ }));

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  }, 15_000);
});
