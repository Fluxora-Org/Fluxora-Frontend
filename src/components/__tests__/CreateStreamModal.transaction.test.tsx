import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreateStreamModal from "../CreateStreamModal";
import { createStream, getTransactionStatus } from "../../lib/stellar/tx";
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

const VALID_STELLAR =
  "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";

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

describe("CreateStreamModal transaction confirmation", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("submits the transaction with the correct cliffTime when a cliff date is set", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00"));

    vi.mocked(createStream).mockResolvedValue({
      status: "SUCCESS",
      txHash: "abcdef1234567890",
    } as any);
    vi.mocked(getTransactionStatus).mockResolvedValue("confirmed");

    const onClose = vi.fn();
    const onStreamCreated = vi.fn();
    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={onClose}
        onStreamCreated={onStreamCreated}
      />,
    );
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

    fireEvent.click(screen.getByText(/enable cliff/i));
    const cliffDateInput = container.querySelector(
      "#create-stream-cliff-date"
    ) as HTMLInputElement;
    fireEvent.change(cliffDateInput, { target: { value: "2026-06-21T15:00" } });
    fireEvent.click(within(container).getByRole("button", { name: /^next$/i }));

    fireEvent.click(
      within(container).getByRole("button", { name: /^create stream$/i }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createStream).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(createStream).mock.calls[0];
    const expectedStart = Math.floor(new Date("2026-06-20T12:00:00").getTime() / 1000);
    const expectedCliff = Math.floor(new Date("2026-06-21T15:00").getTime() / 1000);

    expect(callArgs[0]).toBe("GDBWW22BDP5HN3ZTG7LLID665PA72DGOLOONLUM5TKQFRAQA3EYGKIRC");
    expect(callArgs[1]).toBe(VALID_STELLAR);
    expect(callArgs[2]).toBe("1000000000");
    expect(callArgs[3]).toBe(expectedStart);
    expect(callArgs[5]).toBe(expectedCliff);
  });

  it("guards against duplicate submissions while the request is pending", async () => {
    vi.useFakeTimers();
    let resolve: (value: { txHash: string }) => void;
    vi.mocked(createStream).mockImplementation(
      () =>
        new Promise<{ txHash: string }>((r) => {
          resolve = r;
        }),
    );
    vi.mocked(getTransactionStatus).mockResolvedValue("pending");

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
      />,
    );

    advanceToReview(container);
    const createButton = within(container).getByRole("button", {
      name: /^create stream$/i,
    });

    fireEvent.click(createButton);
    fireEvent.click(createButton);

    expect(createStream).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve!({ txHash: "hash-1" });
      await Promise.resolve();
    });
  });

  it("surfaces a submission error and allows retry", async () => {
    vi.useFakeTimers();
    vi.mocked(createStream).mockRejectedValue(new Error("wallet rejected"));
    vi.mocked(getTransactionStatus).mockResolvedValue("pending");

    const { container } = render(
      <CreateStreamModal
        isOpen={true}
        onClose={() => {}}
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

    expect(createStream).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("wallet rejected").length).toBeGreaterThan(0);

    vi.mocked(createStream).mockResolvedValue({
      status: "SUCCESS",
      txHash: "hash-retry",
    } as any);
    vi.mocked(getTransactionStatus).mockResolvedValue("confirmed");

    fireEvent.click(screen.getByRole("button", { name: /^try again$/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(createStream).toHaveBeenCalledTimes(2);
  });
});
