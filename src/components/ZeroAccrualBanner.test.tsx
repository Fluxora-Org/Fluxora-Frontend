import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ZeroAccrualBanner from "./ZeroAccrualBanner";

describe("ZeroAccrualBanner visible states", () => {
  it("does not show a notice while stream data is loading", () => {
    render(<ZeroAccrualBanner reason="cliff" isLoading />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("does not show a zero-accrual notice when there are no streams", () => {
    render(<ZeroAccrualBanner reason="cliff" isEmpty />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("explains the possible configuration error when a stream has a zero rate", () => {
    render(<ZeroAccrualBanner reason="rate-zero" />);

    expect(screen.getByRole("status")).toBeVisible();
    expect(screen.getByText("Streams configured with zero rate")).toBeVisible();
    expect(
      screen.getByText(
        "One or more streams are active but streaming at a rate of 0 USDC per month. This may be intentional or a configuration error. Check your stream settings.",
      ),
    ).toBeVisible();
  });

  it("shows the populated notice explaining that the cliff period is in progress", () => {
    render(
      <ZeroAccrualBanner
        reason="cliff"
        onAction={() => {}}
        actionLabel="Check cliff date"
      />,
    );

    expect(screen.getByRole("status")).toBeVisible();
    expect(
      screen.getByText("Streams are live — cliff period in progress"),
    ).toBeVisible();
    expect(
      screen.getByText(
        /No USDC is withdrawable until the cliff window closes\./,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Check cliff date" }),
    ).toBeVisible();
  });
});
