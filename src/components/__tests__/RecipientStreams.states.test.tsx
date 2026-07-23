// @ts-nocheck
// ────────────────────────────────────────────────────────────────────────
// The describe below exercises a fictional RecipientStreams API
// (isLoading, streams, error, onRetry, onEmptyPrimaryAction) that PR #770
// added but the component never adopted. The describe is runtime-skipped
// via .skip, but the JSX inside still type-checks against the real props,
// so @ts-nocheck silences those compile errors. Rewrite against the real
// API (fetchStreamsFn, pollIntervalMs) or expand the component to remove
// this band-aid.
// ────────────────────────────────────────────────────────────────────────

// Tests for RecipientStreams component state handling
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecipientStreams } from "../../components/recipient/RecipientStreams";

// Mock data for a single stream
const mockStream = {
  id: "stream-1",
  senderName: "Alice",
  sender: "GABCD...",
  amount: 1000,
  progress: 50,
  rate: 10,
  status: "active" as const,
  isPinned: false,
  startTime: "2024-01-01T00:00:00Z",
};

describe.skip("RecipientStreams component state matrix", () => {
  // TODO: PR #770 added these tests against a stateful RecipientStreams API
  // (isLoading, streams, error, onRetry, onEmptyPrimaryAction) that does not
  // match the current component (which only accepts fetchStreamsFn and
  // pollIntervalMs). Rewrite against the real API or expand the component.
  it("renders loading skeleton when isLoading is true", () => {
    render(<RecipientStreams isLoading={true} />);
    // Loading skeleton has role="status" and aria-label="Loading recipient portal"
    const loading = screen.getByRole("status", { name: /loading recipient portal/i });
    expect(loading).toBeInTheDocument();
  });

  it("renders empty state with correct CTA and triggers onEmptyPrimaryAction", async () => {
    const onPrimary = vi.fn();
    render(<RecipientStreams streams={[]} onEmptyPrimaryAction={onPrimary} />);
    // Empty state button label should be "Connect wallet" (anonymous CTA)
    const ctaButton = await screen.findByRole("button", { name: /connect wallet/i });
    expect(ctaButton).toBeInTheDocument();
    fireEvent.click(ctaButton);
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("renders error state with message and retry button", async () => {
    const onRetry = vi.fn();
    const errorMessage = "Network error";
    render(<RecipientStreams error={errorMessage} onRetry={onRetry} />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(errorMessage);
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders populated streams list", () => {
    render(<RecipientStreams streams={[mockStream as any]} />);
    const heading = screen.getByRole("heading", { name: /your incoming streams/i });
    expect(heading).toBeInTheDocument();
    // Verify sender name appears
    const sender = screen.getByText(mockStream.senderName);
    expect(sender).toBeInTheDocument();
  });
});
