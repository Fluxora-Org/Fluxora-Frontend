import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StreamCreatedModal from "../StreamCreatedModal";

describe("StreamCreatedModal Transaction Recovery", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the modal when open and displays stream details", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ successful: true }),
    } as Response);

    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="STR-RECOVERY-123"
        streamUrl="https://stellar.expert/explorer/public/account/STR-RECOVERY-123"
        onCreateAnother={() => {}}
        txHash="tx-recovery-hash-abc"
      />,
    );

    expect(screen.getAllByText(/stream is now live/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("STR-RECOVERY-123")).toBeInTheDocument();
  });

  it("handles confirmed transaction status gracefully", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ successful: true }),
    } as Response);

    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="STR-CONFIRMED-999"
        streamUrl="https://stellar.expert/explorer/public/account/STR-CONFIRMED-999"
        onCreateAnother={() => {}}
        txHash="tx-confirmed-hash"
      />,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it("handles failed transaction status without crashing", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ successful: false }),
    } as Response);

    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="STR-FAILED-456"
        streamUrl="https://stellar.expert/explorer/public/account/STR-FAILED-456"
        onCreateAnother={() => {}}
        txHash="tx-failed-hash"
      />,
    );

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  it("does not poll when txHash is omitted", () => {
    render(
      <StreamCreatedModal
        isOpen={true}
        onClose={() => {}}
        streamId="STR-NO-HASH"
        streamUrl="https://stellar.expert/explorer/public/account/STR-NO-HASH"
        onCreateAnother={() => {}}
      />,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
