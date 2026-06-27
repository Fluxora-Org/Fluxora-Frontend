import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockWalletState = {
  address: "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN",
  network: "TESTNET",
  connected: true,
  loading: false,
  error: null,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => mockWalletState,
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("../../lib/stellar/tx", () => ({
  withdraw: vi.fn(),
}));

import Recipient from "../Recipient";
import * as txModule from "../../lib/stellar/tx";
import { ToastProvider } from "../../components/toast/ToastProvider";

describe("Recipient page state resets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockWalletState.address = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
    vi.mocked(txModule.withdraw).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderLoadedRecipient() {
    const view = render(
      <ToastProvider>
        <Recipient />
      </ToastProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    return view;
  }

  it("resets txState and errorMsg when wallet address changes", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(txModule.withdraw).mockRejectedValue(new Error("Fake failure"));

    const { rerender } = await renderLoadedRecipient();

    // Trigger failure
    await user.click(screen.getByRole("button", { name: /withdraw 22,600 usdc/i }));
    
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("button", { name: /withdrawal failed/i })).toBeInTheDocument();
    expect(screen.getByText("Fake failure")).toBeInTheDocument();

    // Change address
    mockWalletState.address = "GB2...";
    rerender(
      <ToastProvider>
        <Recipient />
      </ToastProvider>
    );

    // State should reset
    expect(screen.getByRole("button", { name: /withdraw 22,600 usdc/i })).toBeInTheDocument();
    expect(screen.queryByText("Fake failure")).not.toBeInTheDocument();
  });

  it("clears the confirmed timer on unmount to avoid setState errors", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    vi.mocked(txModule.withdraw).mockResolvedValue(undefined as any);

    const { unmount } = await renderLoadedRecipient();

    // Trigger success
    await user.click(screen.getByRole("button", { name: /withdraw 22,600 usdc/i }));
    
    // Fast forward to "confirmed"
    await act(async () => {
      await Promise.resolve(); // flush microtasks for the async withdraw
    });
    
    expect(screen.getByRole("button", { name: /withdrawn successfully/i })).toBeInTheDocument();

    // Unmount before the 5000ms timer fires
    unmount();

    // Fast forward the 5000ms timer; should not throw any act/setState warnings
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
  });
});

describe("Recipient page accessibility", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderLoadedRecipient() {
    const view = render(
      <ToastProvider>
        <Recipient />
      </ToastProvider>
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    return view;
  }

  it("renders the loaded recipient portal without axe violations", async () => {
    const { container } = await renderLoadedRecipient();
    vi.useRealTimers();
    const results = await axe(container);

    expect(results.violations).toEqual([]);
  });

  it("exposes an enabled withdraw action when a connected recipient has balance", async () => {
    await renderLoadedRecipient();

    const withdrawButton = screen.getByRole("button", {
      name: /withdraw 22,600 usdc/i,
    });
    expect(withdrawButton).toBeEnabled();

    const summary = screen.getByRole("region", { name: /stream summary/i });
    expect(within(summary).getByText(/withdrawable now/i)).toBeInTheDocument();
    expect(within(summary).getByText(/22,600 usdc/i)).toBeInTheDocument();
  });
});
