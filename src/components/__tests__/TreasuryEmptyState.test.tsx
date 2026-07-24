import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TreasuryEmptyState from "../TreasuryEmptyState";

// ── Default state (walletConnected=true, no loading/error) ─────────────────────

describe("TreasuryEmptyState — default state", () => {
  it("forwards variant='treasury' to EmptyState", () => {
    const onCreateStream = vi.fn();
    render(<TreasuryEmptyState onCreateStream={onCreateStream} />);
    expect(screen.getByRole("region", { name: "Treasury empty state" })).toBeInTheDocument();
  });

  it("renders with default walletConnected=true", () => {
    const onCreateStream = vi.fn();
    render(<TreasuryEmptyState onCreateStream={onCreateStream} />);
    expect(screen.getByRole("button", { name: "Create stream" })).toBeInTheDocument();
  });

  it("maps onCreateStream to onPrimaryAction", () => {
    const onCreateStream = vi.fn();
    render(<TreasuryEmptyState onCreateStream={onCreateStream} />);
    screen.getByRole("button", { name: "Create stream" }).click();
    expect(onCreateStream).toHaveBeenCalledTimes(1);
  });
});

// ── Wallet disconnected state ───────────────────────────────────────────────────

describe("TreasuryEmptyState — wallet disconnected", () => {
  it("forwards walletConnected=false to EmptyState", () => {
    const onCreateStream = vi.fn();
    render(<TreasuryEmptyState onCreateStream={onCreateStream} walletConnected={false} />);
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
  });

  it("shows connect wallet CTA when walletConnected=false", () => {
    const onCreateStream = vi.fn();
    render(<TreasuryEmptyState onCreateStream={onCreateStream} walletConnected={false} />);
    expect(screen.getByRole("button", { name: "Connect wallet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create stream" })).not.toBeInTheDocument();
  });
});

// ── Loading state ───────────────────────────────────────────────────────────────

describe("TreasuryEmptyState — loading state", () => {
  it("forwards loading=true to EmptyState", () => {
    const onCreateStream = vi.fn();
    render(<TreasuryEmptyState onCreateStream={onCreateStream} loading={true} />);
    expect(screen.getByRole("status", { name: "Loading content" })).toBeInTheDocument();
  });

  it("renders loading skeleton instead of empty state content", () => {
    const onCreateStream = vi.fn();
    render(<TreasuryEmptyState onCreateStream={onCreateStream} loading={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Treasury empty state" })).not.toBeInTheDocument();
  });
});

// ── Error state with retry ───────────────────────────────────────────────────────

describe("TreasuryEmptyState — error state with retry", () => {
  it("forwards error to EmptyState", () => {
    const onCreateStream = vi.fn();
    render(
      <TreasuryEmptyState onCreateStream={onCreateStream} error="Network error" />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("forwards onRetry to EmptyState", () => {
    const onCreateStream = vi.fn();
    const onRetry = vi.fn();
    render(
      <TreasuryEmptyState onCreateStream={onCreateStream} error="Oops" onRetry={onRetry} />
    );
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onCreateStream = vi.fn();
    const onRetry = vi.fn();
    render(
      <TreasuryEmptyState onCreateStream={onCreateStream} error="Oops" onRetry={onRetry} />
    );
    screen.getByRole("button", { name: /retry/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onCreateStream).not.toHaveBeenCalled();
  });

  it("does not render retry button when onRetry is not provided", () => {
    const onCreateStream = vi.fn();
    render(
      <TreasuryEmptyState onCreateStream={onCreateStream} error="Oops" />
    );
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });
});

// ── Prop forwarding verification ─────────────────────────────────────────────────

describe("TreasuryEmptyState — prop forwarding contract", () => {
  it("forwards all props correctly in combination", () => {
    const onCreateStream = vi.fn();
    const onRetry = vi.fn();
    render(
      <TreasuryEmptyState
        onCreateStream={onCreateStream}
        walletConnected={true}
        loading={false}
        error="Test error"
        onRetry={onRetry}
      />
    );
    // Verify variant is treasury
    expect(screen.getByRole("region", { name: "Treasury empty state" })).toBeInTheDocument();
    // Verify walletConnected is forwarded (shows Create stream CTA)
    expect(screen.getByRole("button", { name: "Create stream" })).toBeInTheDocument();
    // Verify error is forwarded
    expect(screen.getByText("Test error")).toBeInTheDocument();
    // Verify onRetry is forwarded (retry button exists)
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
