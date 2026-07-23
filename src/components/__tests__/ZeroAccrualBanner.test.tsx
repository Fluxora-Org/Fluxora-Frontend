import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";
import ZeroAccrualBanner from "../ZeroAccrualBanner";

describe("ZeroAccrualBanner", () => {
  it("renders correctly for cliff reason without nextEventDate", () => {
    render(<ZeroAccrualBanner reason="cliff" />);

    expect(
      screen.getByRole("status", {
        name: /Zero accrual notice: Streams are live — cliff period in progress/i,
      })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Streams are live — cliff period in progress")
    ).toBeInTheDocument();
  });

  it("triggers onAction callback when action button is clicked", async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();

    render(
      <ZeroAccrualBanner
        reason="paused"
        onAction={handleAction}
        actionLabel="Resume Streams"
      />
    );

    const button = screen.getByRole("button", { name: "Resume Streams" });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  describe("i18n and Date Formatting", () => {
    let languageGetter: ReturnType<typeof vi.spyOn>;

    afterEach(() => {
      if (languageGetter) {
        languageGetter.mockRestore();
      }
    });

    it("formats nextEventDate using the browser resolved locale (e.g., es-ES) instead of hardcoding en-US", () => {
      languageGetter = vi.spyOn(navigator, "language", "get").mockReturnValue("es-ES");

      const isoDate = "2026-12-25T00:00:00Z";
      const expectedDateStr = new Intl.DateTimeFormat("es-ES", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(isoDate));

      render(
        <ZeroAccrualBanner
          reason="cliff"
          nextEventDate={isoDate}
        />
      );

      const chip = screen.getByText(/Cliff date:/i);
      expect(chip).toBeInTheDocument();
      expect(chip.textContent).toContain(expectedDateStr);
    });

    it("formats nextEventDate using another non-en-US locale (de-DE)", () => {
      languageGetter = vi.spyOn(navigator, "language", "get").mockReturnValue("de-DE");

      const isoDate = "2026-05-10T00:00:00Z";
      const expectedDateStr = new Intl.DateTimeFormat("de-DE", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(isoDate));

      render(
        <ZeroAccrualBanner
          reason="schedule-future"
          nextEventDate={isoDate}
        />
      );

      const chip = screen.getByText(/Stream start:/i);
      expect(chip).toBeInTheDocument();
      expect(chip.textContent).toContain(expectedDateStr);
    });
  });
});
