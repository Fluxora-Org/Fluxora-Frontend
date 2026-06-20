import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateStreamModal from "../CreateStreamModal";
import { createStream, getTransactionStatus } from "../../lib/stellar/tx";

vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
    network: "TESTNET",
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("../../lib/stellar/tx", () => ({
  createStream: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function advanceToReview(container: HTMLElement) {
  fireEvent.change(
    container.querySelector("#create-stream-recipient") as HTMLInputElement,
    { target: { value: VALID_STELLAR } },
  );
  fireEvent.change(
    container.querySelector("#create-stream-deposit") as HTMLInputElement,
    { target: { value: "100" } },
  );
  fireEvent.click(within(container).getByRole("button", { name: /^next$/i }));
  fireEvent.click(within(container).getByRole("button", { name: /^next$/i }));
}

describe("CreateStreamModal transaction confirmation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("waits for polled confirmation before opening the success receipt", async () => {
    vi.useFakeTimers();
    vi.mocked(createStream).mockResolvedValue({
      status: "SUCCESS",
      txHash: "abcdef1234567890",
    } as any);
    vi.mocked(getTransactionStatus)
      .mockResolvedValueOnce("pending")
      .mockResolvedValueOnce("confirmed");

    const onClose = vi.fn();
    const onStreamCreated = vi.fn();
    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamCreated={onStreamCreated}
      />,
    );

    advanceToReview(container);
    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByText(/waiting for stellar confirmation/i),
    ).toBeInTheDocument();

    expect(createStream).toHaveBeenCalledTimes(1);
    expect(onStreamCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });

    expect(onStreamCreated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(getTransactionStatus).toHaveBeenCalledWith(
      "abcdef1234567890",
      expect.objectContaining({ attempt: 1 }),
    );

  });
});
