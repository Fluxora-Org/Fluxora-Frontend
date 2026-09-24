import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateStreamModal from "../CreateStreamModal";
import { createStream, getTransactionStatus } from "../../lib/stellar/tx";
import { useToast } from "../toast/ToastProvider";
import { __resetOfflineQueueForTests } from "../../lib/offlineActionQueue";
import { selectSingleStreamInContainer } from './CreateStreamModal.testUtils';

vi.mock("../wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    address: "GDBWW22BDP5HN3ZTG7LLID665PA72DGOLOONLUM5TKQFRAQA3EYGKIRC",
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

// Mock localStorage for testing
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }
    },
    writable: true
  });
});

const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value: online,
    configurable: true,
  });
}

function goOnline() {
  act(() => {
    setOnline(true);
    window.dispatchEvent(new Event("online"));
  });
}

function advanceToReview(container: HTMLElement) {
  selectSingleStreamInContainer(container);
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

describe("CreateStreamModal offline action queue", () => {
  afterEach(() => {
    setOnline(true);
    __resetOfflineQueueForTests();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  it("captures a step-3 submission into the queue instead of calling createStream when offline", async () => {
    setOnline(false);
    const onClose = vi.fn();
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={onClose} />,
    );

    advanceToReview(container);
    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );

    const banner = await screen.findByText(/queued.*will submit when back online/i);
    expect(banner).toBeInTheDocument();
    expect(banner.closest('[role="status"]')).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText(/queue position: 1 of 1/i)).toBeInTheDocument();
    expect(createStream).not.toHaveBeenCalled();
  });

  it("keeps Close operable while a submission is queued", async () => {
    setOnline(false);
    const onClose = vi.fn();
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={onClose} />,
    );

    advanceToReview(container);
    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );
    await screen.findByText(/queued.*will submit when back online/i);

    const closeButton = screen.getByRole("button", { name: /close create stream modal/i });
    expect(closeButton).not.toBeDisabled();

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("blocks Back/Next while queued so the captured payload can't be edited out from under it", async () => {
    setOnline(false);
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={vi.fn()} />,
    );

    advanceToReview(container);
    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );
    await screen.findByText(/queued.*will submit when back online/i);

    expect(within(container).getByRole("button", { name: /^back$/i })).toBeDisabled();
  });

  it("auto-flushes on reconnect and surfaces a success toast with a View stream action", async () => {
    vi.mocked(createStream).mockResolvedValue({
      status: "SUCCESS",
      txHash: "queuedtxhash123",
    } as any);
    vi.mocked(getTransactionStatus).mockResolvedValue("confirmed");

    setOnline(false);
    const onClose = vi.fn();
    const onStreamCreated = vi.fn();
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={onClose} onStreamCreated={onStreamCreated} />,
    );

    advanceToReview(container);
    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );
    await screen.findByText(/queued.*will submit when back online/i);
    expect(createStream).not.toHaveBeenCalled();

    goOnline();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createStream).toHaveBeenCalledTimes(1);
    expect(createStream).toHaveBeenCalledWith(
      "GDBWW22BDP5HN3ZTG7LLID665PA72DGOLOONLUM5TKQFRAQA3EYGKIRC",
      VALID_STELLAR,
      "1000000000",
      expect.any(Number),
      expect.any(Number),
      undefined,
    );
    expect(onStreamCreated).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    const { addToast } = useToast();
    expect(addToast).toHaveBeenCalledWith(
      expect.stringMatching(/queued stream was submitted/i),
      "success",
      undefined,
      expect.objectContaining({
        label: expect.stringMatching(/view stream/i),
        onClick: expect.any(Function),
      }),
    );
  });

  it("shows a recoverable failure banner if the queued submission is rejected on reconnect", async () => {
    vi.mocked(createStream).mockRejectedValue(
      new Error("Insufficient balance to fund this stream."),
    );

    setOnline(false);
    const { container } = render(
      <CreateStreamModal isOpen={true} onClose={vi.fn()} />,
    );

    advanceToReview(container);
    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );
    await screen.findByText(/queued.*will submit when back online/i);

    goOnline();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      screen.getByText(/queued stream couldn't be submitted/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/insufficient balance to fund this stream/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry now/i })).toBeInTheDocument();

    // No longer shown as queued — it was dequeued when the flush failed.
    expect(
      screen.queryByText(/queued.*will submit when back online/i),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit details/i }));

    expect(
      container.querySelector("#create-stream-recipient"),
    ).toBeInTheDocument();
  });
});
