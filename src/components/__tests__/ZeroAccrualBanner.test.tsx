/**
 * ZeroAccrualBanner — regression test suite
 *
 * Covers every documented edge case from the visibility contract:
 *   • All 4 reason variants (copy, title, description, default label)
 *   • nextEventDate chip: valid date, absent prop, invalid string
 *   • Per-reason chip label (cliff, paused, schedule-future, rate-zero)
 *   • onAction absent → no button; present → button with correct aria-label
 *   • actionLabel="" → falls back to defaultActionLabel (not empty button)
 *   • Keyboard activation: Enter and Space both fire onAction
 *   • Re-render stability: reason prop change updates copy without remount
 *   • Accessibility attributes: role, aria-live, aria-label, aria-hidden
 *   • Locale-aware date formatting (es-ES, de-DE)
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import ZeroAccrualBanner, { ZeroAccrualReason } from "../ZeroAccrualBanner";

// ─── helpers ─────────────────────────────────────────────────────────────────

function renderBanner(props: React.ComponentProps<typeof ZeroAccrualBanner>) {
  return render(<ZeroAccrualBanner {...props} />);
}

// ─── Copy / reason variants ───────────────────────────────────────────────────

describe("ZeroAccrualBanner — reason variants", () => {
  it("cliff: renders correct title and description", () => {
    renderBanner({ reason: "cliff" });

    expect(
      screen.getByText("Streams are live — cliff period in progress"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cliff date hasn't been reached yet/i),
    ).toBeInTheDocument();
  });

  it("paused: renders correct title and description", () => {
    renderBanner({ reason: "paused" });

    expect(
      screen.getByText("All streams are currently paused"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/suspended by the treasury administrator/i),
    ).toBeInTheDocument();
  });

  it("rate-zero: renders correct title and description", () => {
    renderBanner({ reason: "rate-zero" });

    expect(
      screen.getByText("Streams configured with zero rate"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/streaming at a rate of 0 USDC per month/i),
    ).toBeInTheDocument();
  });

  it("schedule-future: renders correct title and description", () => {
    renderBanner({ reason: "schedule-future" });

    expect(
      screen.getByText("Streams scheduled — not started yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/start date is in the future/i),
    ).toBeInTheDocument();
  });

  it("not-started: renders correct title and description", () => {
    renderBanner({ reason: "not-started" });

    expect(
      screen.getByText("Streams haven't started yet"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/start date hasn't been reached/i),
    ).toBeInTheDocument();
  });

  it("pre-cliff: renders correct title and description", () => {
    renderBanner({ reason: "pre-cliff" });

    expect(
      screen.getByText("Streams are live — pre-cliff period"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/cliff date hasn't been reached yet/i),
    ).toBeInTheDocument();
  });
});

// ─── Default action labels ────────────────────────────────────────────────────

describe("ZeroAccrualBanner — default action labels", () => {
  const cases: Array<{ reason: ZeroAccrualReason; label: string }> = [
    { reason: "cliff", label: "View stream details" },
    { reason: "paused", label: "View streams" },
    { reason: "rate-zero", label: "Review streams" },
    { reason: "schedule-future", label: "View schedule" },
    { reason: "not-started", label: "View schedule" },
    { reason: "pre-cliff", label: "View stream details" },
  ];

  cases.forEach(({ reason, label }) => {
    it(`${reason}: shows default label "${label}" when onAction is provided and no actionLabel prop`, () => {
      renderBanner({ reason, onAction: vi.fn() });
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
  });
});

// ─── Action button visibility ─────────────────────────────────────────────────

describe("ZeroAccrualBanner — action button visibility", () => {
  it("renders no button when onAction is not provided", () => {
    renderBanner({ reason: "cliff" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the action button when onAction is provided", () => {
    renderBanner({ reason: "cliff", onAction: vi.fn() });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("uses custom actionLabel over defaultActionLabel", () => {
    renderBanner({
      reason: "cliff",
      onAction: vi.fn(),
      actionLabel: "Go to cliff details",
    });
    expect(
      screen.getByRole("button", { name: "Go to cliff details" }),
    ).toBeInTheDocument();
  });

  it("falls back to defaultActionLabel when actionLabel is an empty string", () => {
    // actionLabel="" is truthy-falsy edge: must not render an empty button.
    renderBanner({ reason: "paused", onAction: vi.fn(), actionLabel: "" });
    const button = screen.getByRole("button");
    // Should show the default, not be blank
    expect(button).toHaveAccessibleName("View streams");
    expect(button.textContent?.trim()).not.toBe("");
  });

  it("falls back to defaultActionLabel when actionLabel is whitespace only", () => {
    // actionLabel="   " is truthy but visually empty; the component must trim it.
    renderBanner({ reason: "cliff", onAction: vi.fn(), actionLabel: "   " });
    const button = screen.getByRole("button");
    expect(button).toHaveAccessibleName("View stream details");
    expect(button.textContent?.trim()).toBe("View stream details");
  });
});

// ─── onAction callback ────────────────────────────────────────────────────────

describe("ZeroAccrualBanner — onAction callback", () => {
  it("calls onAction once on click", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderBanner({ reason: "paused", onAction, actionLabel: "Resume Streams" });

    await user.click(screen.getByRole("button", { name: "Resume Streams" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not call onAction more than once per click", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderBanner({ reason: "cliff", onAction });

    const btn = screen.getByRole("button");
    await user.click(btn);
    await user.click(btn);
    expect(onAction).toHaveBeenCalledTimes(2);
    // Each click is independent — verifies no accidental double-fire per event
  });
});

// ─── Keyboard activation ──────────────────────────────────────────────────────

describe("ZeroAccrualBanner — keyboard interaction", () => {
  it("fires onAction when the button is activated with Enter", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderBanner({ reason: "cliff", onAction, actionLabel: "Check cliff" });

    const btn = screen.getByRole("button", { name: "Check cliff" });
    btn.focus();
    await user.keyboard("{Enter}");
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("fires onAction when the button is activated with Space", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    renderBanner({ reason: "rate-zero", onAction, actionLabel: "Fix rate" });

    const btn = screen.getByRole("button", { name: "Fix rate" });
    btn.focus();
    await user.keyboard(" ");
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("button is focusable via Tab", async () => {
    const user = userEvent.setup();
    renderBanner({ reason: "cliff", onAction: vi.fn() });

    await user.tab();
    expect(screen.getByRole("button")).toHaveFocus();
  });
});

// ─── nextEventDate chip ───────────────────────────────────────────────────────

describe("ZeroAccrualBanner — nextEventDate chip", () => {
  it("renders no chip when nextEventDate is absent", () => {
    renderBanner({ reason: "cliff" });
    expect(screen.queryByText(/Cliff date:/i)).not.toBeInTheDocument();
  });

  it("renders chip with label 'Cliff date' for reason=cliff", () => {
    renderBanner({ reason: "cliff", nextEventDate: "2027-03-15T00:00:00Z" });
    expect(screen.getByText(/Cliff date:/i)).toBeInTheDocument();
  });

  it("renders chip with label 'Scheduled resume' for reason=paused", () => {
    renderBanner({ reason: "paused", nextEventDate: "2027-04-01T00:00:00Z" });
    expect(screen.getByText(/Scheduled resume:/i)).toBeInTheDocument();
  });

  it("renders chip with label 'Stream start' for reason=schedule-future", () => {
    renderBanner({
      reason: "schedule-future",
      nextEventDate: "2027-05-20T00:00:00Z",
    });
    expect(screen.getByText(/Stream start:/i)).toBeInTheDocument();
  });

  it("renders chip with label 'Stream start' for reason=not-started", () => {
    renderBanner({
      reason: "not-started",
      nextEventDate: "2027-06-01T00:00:00Z",
    });
    expect(screen.getByText(/Stream start:/i)).toBeInTheDocument();
  });

  it("renders chip with label 'Cliff date' for reason=pre-cliff", () => {
    renderBanner({
      reason: "pre-cliff",
      nextEventDate: "2027-07-01T00:00:00Z",
    });
    expect(screen.getByText(/Cliff date:/i)).toBeInTheDocument();
  });

  it("renders chip with label 'Next event' for reason=rate-zero", () => {
    renderBanner({
      reason: "rate-zero",
      nextEventDate: "2027-06-10T00:00:00Z",
    });
    expect(screen.getByText(/Next event:/i)).toBeInTheDocument();
  });

  it("renders no chip when nextEventDate is an invalid string", () => {
    // Previously the component would fall through to formatLocalDate's "Not set"
    // fallback, rendering the chip with misleading content. The fixed component
    // must suppress the chip entirely for unparseable input.
    renderBanner({ reason: "cliff", nextEventDate: "not-a-date" });
    expect(screen.queryByText(/Cliff date:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not set/i)).not.toBeInTheDocument();
  });

  it("renders no chip when nextEventDate is an empty string", () => {
    renderBanner({ reason: "cliff", nextEventDate: "" });
    expect(screen.queryByText(/Cliff date:/i)).not.toBeInTheDocument();
  });

  it("renders chip when nextEventDate is a numeric timestamp string (JS parses '0' as epoch)", () => {
    // new Date("0") → Jan 1, 2000 in JS. The component defers to native
    // Date parsing; this test verifies the date is rendered without crashing.
    renderBanner({ reason: "cliff", nextEventDate: "0" });
    expect(screen.getByText(/Cliff date:/i)).toBeInTheDocument();
  });

  it("renders chip when nextEventDate has only a year component (JS parses '2027' as ISO year)", () => {
    // new Date("2027") → Jan 1, 2027 in JS. The component defers to native
    // Date parsing; this test verifies the date is rendered without crashing.
    renderBanner({ reason: "cliff", nextEventDate: "2027" });
    expect(screen.getByText(/Cliff date:/i)).toBeInTheDocument();
  });

  it("renders chip for valid date-time string with timezone offset", () => {
    renderBanner({
      reason: "schedule-future",
      nextEventDate: "2027-08-01T12:00:00+05:30",
    });
    expect(screen.getByText(/Stream start:/i)).toBeInTheDocument();
  });
});

// ─── Accessibility attributes ─────────────────────────────────────────────────

describe("ZeroAccrualBanner — accessibility", () => {
  it("has role='status' on the wrapper element", () => {
    renderBanner({ reason: "cliff" });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has aria-live='polite' on the wrapper element", () => {
    renderBanner({ reason: "cliff" });
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("composes aria-label from the reason title", () => {
    renderBanner({ reason: "paused" });
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Zero accrual notice: All streams are currently paused",
    );
  });

  it("aria-label updates when reason prop changes", () => {
    const { rerender } = renderBanner({ reason: "cliff" });
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Zero accrual notice: Streams are live — cliff period in progress",
    );

    rerender(<ZeroAccrualBanner reason="rate-zero" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Zero accrual notice: Streams configured with zero rate",
    );
  });

  it("icon container has aria-hidden='true'", () => {
    renderBanner({ reason: "cliff" });
    // The outer icon div carries aria-hidden
    const iconWrappers = document
      .querySelectorAll("[aria-hidden='true']");
    expect(iconWrappers.length).toBeGreaterThan(0);
  });

  it("action button has a non-empty accessible name", () => {
    renderBanner({ reason: "schedule-future", onAction: vi.fn() });
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBeTruthy();
    expect(btn.getAttribute("aria-label")).not.toBe("");
  });
});

// ─── Re-render stability ──────────────────────────────────────────────────────

describe("ZeroAccrualBanner — re-render stability", () => {
  it("updates title when reason prop changes without unmounting", () => {
    const { rerender } = renderBanner({ reason: "cliff" });
    expect(
      screen.getByText("Streams are live — cliff period in progress"),
    ).toBeInTheDocument();

    rerender(<ZeroAccrualBanner reason="paused" />);
    expect(
      screen.getByText("All streams are currently paused"),
    ).toBeInTheDocument();
    // Previous content must be gone
    expect(
      screen.queryByText("Streams are live — cliff period in progress"),
    ).not.toBeInTheDocument();
  });

  it("shows and hides the date chip as nextEventDate prop toggles", () => {
    const { rerender } = renderBanner({
      reason: "cliff",
      nextEventDate: "2027-09-01T00:00:00Z",
    });
    expect(screen.getByText(/Cliff date:/i)).toBeInTheDocument();

    rerender(<ZeroAccrualBanner reason="cliff" />);
    expect(screen.queryByText(/Cliff date:/i)).not.toBeInTheDocument();
  });

  it("shows and hides the action button as onAction prop toggles", () => {
    const onAction = vi.fn();
    const { rerender } = renderBanner({ reason: "cliff", onAction });
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(<ZeroAccrualBanner reason="cliff" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders identically on repeated renders with same props (no flicker)", () => {
    const { rerender } = renderBanner({ reason: "rate-zero" });
    const firstText = screen.getByRole("status").textContent;

    rerender(<ZeroAccrualBanner reason="rate-zero" />);
    expect(screen.getByRole("status").textContent).toBe(firstText);

    rerender(<ZeroAccrualBanner reason="rate-zero" />);
    expect(screen.getByRole("status").textContent).toBe(firstText);
  });
});

// ─── Locale-aware date formatting ─────────────────────────────────────────────

describe("ZeroAccrualBanner — locale-aware date formatting", () => {
  let languageGetter: ReturnType<typeof vi.spyOn>;

  afterEach(() => {
    if (languageGetter) languageGetter.mockRestore();
  });

  it("formats the date using the browser locale (es-ES)", () => {
    languageGetter = vi
      .spyOn(navigator, "language", "get")
      .mockReturnValue("es-ES");

    const isoDate = "2026-12-25T00:00:00Z";
    const expected = new Intl.DateTimeFormat("es-ES", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(isoDate));

    renderBanner({ reason: "cliff", nextEventDate: isoDate });

    const chip = screen.getByText(/Cliff date:/i);
    expect(chip.textContent).toContain(expected);
  });

  it("formats the date using another non-en-US locale (de-DE)", () => {
    languageGetter = vi
      .spyOn(navigator, "language", "get")
      .mockReturnValue("de-DE");

    const isoDate = "2026-05-10T00:00:00Z";
    const expected = new Intl.DateTimeFormat("de-DE", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(isoDate));

    renderBanner({ reason: "schedule-future", nextEventDate: isoDate });

    const chip = screen.getByText(/Stream start:/i);
    expect(chip.textContent).toContain(expected);
  });
});

// ─── Edge-case visibility locks ───────────────────────────────────────────────

describe("ZeroAccrualBanner — edge-case visibility locks", () => {
  it("renders normally when no lock props are passed (happy path)", () => {
    const { container } = renderBanner({ reason: "cliff" });
    expect(container).not.toBeEmptyDOMElement();
  });

  it("suppresses rendering when isLoading is true", () => {
    const { container } = renderBanner({ reason: "cliff", isLoading: true });
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses rendering when isEmpty is true", () => {
    const { container } = renderBanner({ reason: "cliff", isEmpty: true });
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses rendering when isRetry is true", () => {
    const { container } = renderBanner({ reason: "cliff", isRetry: true });
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses rendering when isKeyboardOpen is true", () => {
    const { container } = renderBanner({ reason: "cliff", isKeyboardOpen: true });
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses rendering when isResponsiveHide is true", () => {
    const { container } = renderBanner({ reason: "cliff", isResponsiveHide: true });
    expect(container).toBeEmptyDOMElement();
  });

  it("suppresses rendering when ALL lock props are true simultaneously", () => {
    const { container } = renderBanner({
      reason: "cliff",
      isLoading: true,
      isEmpty: true,
      isRetry: true,
      isKeyboardOpen: true,
      isResponsiveHide: true,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders normally when all lock props are explicitly false", () => {
    const { container } = renderBanner({
      reason: "cliff",
      isLoading: false,
      isEmpty: false,
      isRetry: false,
      isKeyboardOpen: false,
      isResponsiveHide: false,
    });
    expect(container).not.toBeEmptyDOMElement();
  });

  it("removes banner from DOM (not just hidden) when suppressed", () => {
    // Verify the banner element with role="status" is absent from the DOM,
    // not merely visually hidden. Stale live regions can confuse AT.
    const { container, rerender } = renderBanner({ reason: "cliff" });
    expect(container.querySelector('[role="status"]')).toBeInTheDocument();

    rerender(<ZeroAccrualBanner reason="cliff" isLoading />);
    expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
  });

  it("does not crash on unknown reason and renders fallback content", () => {
    // Simulates a runtime value that bypasses TypeScript (e.g. from an API).
    const { container } = renderBanner({
      reason: "unknown" as ZeroAccrualReason,
    });
    // Must not throw; fallback (rate-zero) content should render.
    expect(container).not.toBeEmptyDOMElement();
    expect(
      screen.getByText("Streams configured with zero rate"),
    ).toBeInTheDocument();
  });
});
