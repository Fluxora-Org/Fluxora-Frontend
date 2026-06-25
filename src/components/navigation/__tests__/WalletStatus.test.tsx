import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import WalletStatus from "../WalletStatus";

const ADDRESS = "GDU4D7EXAMPLEADDRESS0L50DR222222222222222222222222222222";

function renderWalletStatus() {
  render(<WalletStatus address={ADDRESS} network="TESTNET" />);
}

async function openWalletMenu() {
  await userEvent.click(
    screen.getByRole("button", {
      name: /open wallet options/i,
    }),
  );
}

function mockClipboard(writeText?: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

function mockExecCommand(result: boolean) {
  const execCommand = vi.fn().mockReturnValue(result);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: execCommand,
  });
  return execCommand;
}

describe("WalletStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
  });

  it("shows copied feedback when the async clipboard succeeds", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);

    renderWalletStatus();
    await openWalletMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Copy address" }));

    expect(writeText).toHaveBeenCalledWith(ADDRESS);
    expect(screen.getByRole("menuitem", { name: "Copied!" })).toBeInTheDocument();
    expect(screen.getByText("Wallet address copied.")).toBeInTheDocument();
  });

  it("uses the textarea fallback when the async clipboard is unavailable", async () => {
    mockClipboard();
    const execCommand = mockExecCommand(true);

    renderWalletStatus();
    await openWalletMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Copy address" }));

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("menuitem", { name: "Copied!" })).toBeInTheDocument();
  });

  it("surfaces failure feedback when both copy paths fail", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    mockClipboard(writeText);
    mockExecCommand(false);

    renderWalletStatus();
    await openWalletMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: "Copy address" }));

    expect(screen.getByRole("menuitem", { name: "Copy failed" })).toBeInTheDocument();
    expect(screen.getByText("Wallet address could not be copied.")).toBeInTheDocument();
  });
});
