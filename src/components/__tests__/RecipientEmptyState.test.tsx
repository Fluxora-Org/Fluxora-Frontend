import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RecipientEmptyState from "../RecipientEmptyState";

describe("RecipientEmptyState", () => {
  // ── Issue #1732: the two empty-state conditions must be distinguishable ──

  it("renders different content for the not-connected vs no-streams conditions (#1732)", () => {
    // Not-connected render
    const disconnected = render(
      <RecipientEmptyState walletConnected={false} />,
    );
    expect(
      screen.getByRole("heading", { name: /connect your wallet/i }),
    ).toBeInTheDocument();

    // No-streams render (wallet connected, nothing to show yet)
    const connected = render(<RecipientEmptyState walletConnected={true} />);

    // The two conditions must render different content, not one shared tree.
    expect(connected.container).not.toEqual(disconnected.container);

    disconnected.unmount();
    connected.unmount();

    // The not-connected state offers connection…
    render(<RecipientEmptyState walletConnected={false} />);
    expect(
      screen.getByRole("button", { name: "Connect wallet" }),
    ).toBeInTheDocument();

    // …while the no-streams state explains what would populate the view.
    render(<RecipientEmptyState walletConnected={true} />);
    expect(
      screen.getByRole("heading", { name: /no active streams/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /when someone streams usdc to your wallet address, it will appear here/i,
      ),
    ).toBeInTheDocument();
  });

  it("is not shown while loading — neither condition renders during the loading skeleton (#1732)", () => {
    render(<RecipientEmptyState loading={true} />);

    expect(
      screen.getByRole("status", { name: "Loading content" }),
    ).toBeInTheDocument();

    // Neither the not-connected content…
    expect(
      screen.queryByRole("heading", { name: /connect your wallet/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Connect wallet" }),
    ).not.toBeInTheDocument();

    // …nor the no-streams content.
    expect(
      screen.queryByRole("heading", { name: /no active streams/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /view docs/i }),
    ).not.toBeInTheDocument();
  });

  it("wires the not-connected CTA through onPrimaryAction so the page can offer connection (#1732)", () => {
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

  // ── Existing behaviour coverage ──────────────────────────────────────────

  it("renders recipient empty state region and heading when connected vs disconnected", () => {
    const { rerender } = render(
      <RecipientEmptyState walletConnected={false} />,
    );
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

  it("disables error Retry button when ctaDisabled is true", () => {
    const onRetry = vi.fn();
    render(
      <RecipientEmptyState
        error="still fetching"
        onRetry={onRetry}
        ctaDisabled={true}
      />,
    );
    const retryBtn = screen.getByRole("button", { name: "Retry loading data" });
    expect(retryBtn).toBeDisabled();
    expect(retryBtn).toHaveAttribute("aria-disabled", "true");
    retryBtn.click();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("forwards retryButtonRef to the error Retry button element", () => {
    const retryButtonRef = { current: null as HTMLButtonElement | null };
    render(
      <RecipientEmptyState
        error="Service down"
        onRetry={vi.fn()}
        retryButtonRef={retryButtonRef}
      />,
    );
    expect(retryButtonRef.current).toBeInstanceOf(HTMLButtonElement);
    expect(retryButtonRef.current).toBe(
      screen.getByRole("button", { name: "Retry loading data" }),
    );
  });
});
