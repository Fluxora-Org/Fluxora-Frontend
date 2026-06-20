import { act, render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Recipient from "../Recipient";

describe("Recipient page accessibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderLoadedRecipient() {
    const view = render(<Recipient />);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    return view;
  }

  it("renders the loaded recipient portal without axe violations", async () => {
    const { container } = await renderLoadedRecipient();
    vi.useRealTimers();
    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });

  it("exposes an enabled withdraw action when a connected recipient has balance", async () => {
    await renderLoadedRecipient();

    const withdrawButton = screen.getByRole("button", {
      name: /withdraw 22,600 usdc/i,
    });
    expect(withdrawButton).toBeEnabled();

    const summary = screen.getByRole("region", { name: /stream summary/i });
    expect(within(summary).getByText(/withdrawable now/i)).toBeInTheDocument();
    expect(within(summary).getByText(/22,600 usdc/i)).toBeInTheDocument();
  });
});
