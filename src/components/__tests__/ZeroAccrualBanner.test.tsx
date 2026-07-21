import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ZeroAccrualBanner, { ZeroAccrualReason } from "../ZeroAccrualBanner";

describe("ZeroAccrualBanner", () => {
  const reasons: ZeroAccrualReason[] = [
    "cliff",
    "paused",
    "rate-zero",
    "schedule-future",
  ];

  describe("Reason variants rendering", () => {
    it.each([
      [
        "cliff" as const,
        "Streams are live — cliff period in progress",
        "Your streams are active and accruing time-tracked value, but the cliff date hasn't been reached yet. No USDC is withdrawable until the cliff window closes.",
        "View stream details",
      ],
      [
        "paused" as const,
        "All streams are currently paused",
        "Accrual has been suspended by the treasury administrator. No USDC is accumulating while streams are paused. Contact your treasury manager for a status update.",
        "View streams",
      ],
      [
        "rate-zero" as const,
        "Streams configured with zero rate",
        "One or more streams are active but streaming at a rate of 0 USDC per month. This may be intentional or a configuration error. Check your stream settings.",
        "Review streams",
      ],
      [
        "schedule-future" as const,
        "Streams scheduled — not started yet",
        "Your streams are configured and funded, but the start date is in the future. Accrual will begin automatically on the scheduled start date.",
        "View schedule",
      ],
    ])(
      "renders correct copy for reason '%s'",
      (reason, expectedTitle, expectedDesc, expectedDefaultAction) => {
        const onAction = vi.fn();
        render(<ZeroAccrualBanner reason={reason} onAction={onAction} />);

        expect(screen.getByText(expectedTitle)).toBeInTheDocument();
        expect(screen.getByText(expectedDesc)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: expectedDefaultAction })).toBeInTheDocument();
      }
    );
  });

  describe("Next event date chip & formatting", () => {
    it("renders the next event chip with formatted date when nextEventDate is valid", () => {
      render(
        <ZeroAccrualBanner
          reason="cliff"
          nextEventDate="2026-08-01T00:00:00Z"
        />
      );

      const chip = screen.getByText(/Cliff date:/i);
      expect(chip).toBeInTheDocument();
      expect(chip.textContent).toContain("Aug 1, 2026");
    });

    it.each([
      ["cliff" as const, "Cliff date:"],
      ["paused" as const, "Scheduled resume:"],
      ["schedule-future" as const, "Stream start:"],
      ["rate-zero" as const, "Next event:"],
    ])(
      "renders appropriate next event label for reason '%s'",
      (reason, expectedLabelPrefix) => {
        render(
          <ZeroAccrualBanner
            reason={reason}
            nextEventDate="2026-08-01T00:00:00Z"
          />
        );

        expect(screen.getByText(new RegExp(expectedLabelPrefix, "i"))).toBeInTheDocument();
      }
    );

    it("omits the next event chip when nextEventDate is undefined", () => {
      const { container } = render(<ZeroAccrualBanner reason="cliff" />);
      expect(
        container.querySelector(".zero-accrual-banner__next-event")
      ).toBeNull();
    });

    it.each([
      ["empty string", ""],
      ["invalid string", "not-a-date"],
      ["malformed ISO", "2026-99-99T99:99:99Z"],
      ["garbage input", "123456xyz"],
    ])("omits the next event chip without throwing for %s ('%s')", (_, invalidIso) => {
      expect(() => {
        const { container } = render(
          <ZeroAccrualBanner reason="cliff" nextEventDate={invalidIso} />
        );
        expect(
          container.querySelector(".zero-accrual-banner__next-event")
        ).toBeNull();
      }).not.toThrow();
    });
  });

  describe("Action button", () => {
    it("fires onAction callback when clicked", () => {
      const handleAction = vi.fn();
      render(<ZeroAccrualBanner reason="cliff" onAction={handleAction} />);

      const button = screen.getByRole("button", { name: "View stream details" });
      fireEvent.click(button);

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it("uses custom actionLabel when provided", () => {
      const handleAction = vi.fn();
      render(
        <ZeroAccrualBanner
          reason="paused"
          onAction={handleAction}
          actionLabel="Custom Action Label"
        />
      );

      const button = screen.getByRole("button", { name: "Custom Action Label" });
      expect(button).toBeInTheDocument();
      fireEvent.click(button);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it("does not render action button when onAction is omitted", () => {
      render(<ZeroAccrualBanner reason="cliff" />);
      expect(screen.queryByRole("button")).toBeNull();
    });
  });

  describe("Accessibility & semantics", () => {
    it("has status role, aria-live='polite', and descriptive aria-label", () => {
      const { container } = render(<ZeroAccrualBanner reason="cliff" />);
      const banner = container.querySelector(".zero-accrual-banner");

      expect(banner).toHaveAttribute("role", "status");
      expect(banner).toHaveAttribute("aria-live", "polite");
      expect(banner).toHaveAttribute(
        "aria-label",
        "Zero accrual notice: Streams are live — cliff period in progress"
      );
    });

    it("has decorative hourglass icon with aria-hidden='true'", () => {
      const { container } = render(<ZeroAccrualBanner reason="cliff" />);
      const iconWrapper = container.querySelector(
        ".zero-accrual-banner__icon"
      );
      expect(iconWrapper).toHaveAttribute("aria-hidden", "true");
    });
  });
});
