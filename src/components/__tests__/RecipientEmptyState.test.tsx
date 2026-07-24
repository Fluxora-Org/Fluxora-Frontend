import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RecipientEmptyState from "../RecipientEmptyState";

describe("RecipientEmptyState", () => {
  it("renders recipient empty state region and heading when connected vs disconnected", () => {
    const { rerender } = render(<RecipientEmptyState walletConnected={false} />);
    expect(
      screen.getByRole("region", { name: "Recipient empty state" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /connect your wallet/i }),
    ).toBeInTheDocument();

    rerender(<RecipientEmptyState walletConnected={true} />);
    expect(
      screen.getByRole("heading", { name: /no active streams/i }),
    ).toBeInTheDocument();
  });

  it("renders connect wallet CTA when wallet is disconnected", () => {
    render(<RecipientEmptyState walletConnected={false} />);
    expect(
      screen.getByRole("button", { name: "Connect wallet" }),
    ).toBeInTheDocument();
  });

  it("delegates onPrimaryAction to CTA click", () => {
    const onPrimaryAction = vi.fn();
    render(
      <RecipientEmptyState
        walletConnected={false}
        onPrimaryAction={onPrimaryAction}
      />,
    );
    screen.getByRole("button", { name: "Connect wallet" }).click();
    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
  });

  it("renders loading status skeleton when loading is true", () => {
    render(<RecipientEmptyState loading={true} />);
    expect(
      screen.getByRole("status", { name: "Loading content" }),
    ).toBeInTheDocument();
  });

  it("renders error banner and handles retry action", () => {
    const onRetry = vi.fn();
    render(
      <RecipientEmptyState error="Failed to fetch streams" onRetry={onRetry} />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch streams")).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /retry/i });
    retryBtn.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
