// Tests for the production `RecipientStreams` component state surface.
//
// The original suite (#770) was written against a planned
// `isLoading`/`streams`/`error`/`onRetry`/`onEmptyPrimaryAction` prop shape
// that never landed in the shipped component. The component today exposes
// `fetchStreamsFn` (returns `Promise<Stream[]>`) and `pollIntervalMs`, so
// the assertions are wired against the real API.
//
// See `src/components/recipient/RecipientStreams.tsx` for the source of truth.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  RecipientStreams,
  type Stream,
} from "../recipient/RecipientStreams";

const sampleStream: Stream = {
  id: "stream-1",
  sender: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
  amount: "1,250",
  status: "active",
  isPinned: false,
};

function renderWith(fetchStreamsFn: () => Promise<Stream[]>) {
  return render(
    <RecipientStreams fetchStreamsFn={fetchStreamsFn} pollIntervalMs={0} />,
  );
}

describe("RecipientStreams (real fetchStreamsFn API)", () => {
  it("renders nothing-while-loading, then renders streams once the fetcher resolves", async () => {
    const fetchStreamsFn = vi.fn().mockResolvedValue([sampleStream]);

    renderWith(fetchStreamsFn);

    // Loading row is rendered immediately; the real stream row appears once
    // the fetcher resolves. Tie the amount regex to the fixture so any
    // future `formatNumber` wrapping the value does not break the test.
    expect(fetchStreamsFn).toHaveBeenCalledTimes(1);

    const amountPattern = new RegExp(
      `${sampleStream.amount.replace(/[,]/g, "[,\\s]")}\\s+XLM`,
    );
    const row = await screen.findByText(amountPattern);
    expect(row).toBeInTheDocument();
    expect(
      screen.getByText(/GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN/i),
    ).toBeInTheDocument();
  });

  it("shows a human-readable error when the fetcher rejects", async () => {
    const fetchStreamsFn = vi.fn().mockRejectedValue(new Error("network down"));

    renderWith(fetchStreamsFn);

    const alert = await screen.findByRole("status");
    expect(alert).toHaveTextContent(/Failed to sync/i);
  });

  it("renders the manual refresh button labelled 'Refresh Status'", async () => {
    const fetchStreamsFn = vi.fn().mockResolvedValue([sampleStream]);

    renderWith(fetchStreamsFn);
    await waitFor(() =>
      expect(
        screen.getByText(
          new RegExp(
            `${sampleStream.amount.replace(/[,]/g, "[,\\s]")}\\s+XLM`,
          ),
        ),
      ).toBeInTheDocument(),
    );

    const button = screen.getByRole("button", { name: /refresh status/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("toggles the pinned state of a stream via the star button", async () => {
    const fetchStreamsFn = vi.fn().mockResolvedValue([sampleStream]);

    renderWith(fetchStreamsFn);
    await waitFor(() =>
      expect(
        screen.getByText(
          new RegExp(
            `${sampleStream.amount.replace(/[,]/g, "[,\\s]")}\\s+XLM`,
          ),
        ),
      ).toBeInTheDocument(),
    );

    const pinButton = screen.getByRole("button", { name: /pin stream/i });
    // Initial unpinned state shows an empty star; after clicking, a filled star.
    expect(pinButton).toHaveTextContent("☆");
    await userEvent.click(pinButton);
    expect(pinButton).toHaveTextContent("★");
  });
});
