import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WalletButton from "../Walletbutton";

const wallet = vi.hoisted(() => ({
  address: null as string | null,
  network: null as string | null,
  connected: false,
  loading: false,
  error: null,
  expectedNetwork: "TESTNET",
  expectedNetworkLabel: "Testnet",
  isNetworkMismatch: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

const freighter = vi.hoisted(() => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
}));

vi.mock("../Walletcontext", () => ({
  useWallet: () => wallet,
}));

vi.mock("@stellar/freighter-api", () => ({
  isConnected: freighter.isConnected,
  requestAccess: freighter.requestAccess,
  getNetwork: freighter.getNetwork,
}));

describe("WalletButton canonical modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wallet.address = null;
    wallet.network = null;
    wallet.connected = false;
    freighter.isConnected.mockResolvedValue({ isConnected: true });
    freighter.requestAccess.mockResolvedValue({
      address: "GCONNECTED",
      error: null,
    });
    freighter.getNetwork.mockResolvedValue({
      network: "TESTNET",
      error: null,
    });
  });

  it("opens the canonical ConnectWalletModal and restores focus on close", async () => {
    const user = userEvent.setup();
    render(<WalletButton />);

    const trigger = screen.getByRole("button", { name: "Connect wallet" });
    trigger.focus();
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: "Connect with Freighter" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Close wallet connection dialog",
      }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("connects Freighter through the shared wallet context", async () => {
    const user = userEvent.setup();
    render(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(
      screen.getByRole("listitem", { name: "Connect with Freighter" }),
    );

    expect(freighter.requestAccess).toHaveBeenCalledTimes(1);
    expect(freighter.getNetwork).toHaveBeenCalledTimes(1);
    expect(wallet.connect).toHaveBeenCalledWith("GCONNECTED", "TESTNET");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps canonical rejected guidance when Freighter denies access", async () => {
    const user = userEvent.setup();
    freighter.requestAccess.mockResolvedValue({
      address: "",
      error: "User declined access",
    });

    render(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    await user.click(
      screen.getByRole("listitem", { name: "Connect with Freighter" }),
    );

    expect(screen.getByText("Connection Rejected")).toBeInTheDocument();
    expect(wallet.connect).not.toHaveBeenCalled();
  });

  it("prevents duplicate connection requests on rapid double-clicks", async () => {
    const user = userEvent.setup();
    
    // Delay requestAccess so we can simulate in-flight state
    let resolveAccess: any;
    const accessPromise = new Promise((resolve) => {
      resolveAccess = resolve;
    });
    freighter.requestAccess.mockReturnValue(accessPromise);

    render(<WalletButton />);

    await user.click(screen.getByRole("button", { name: "Connect wallet" }));
    const freighterBtn = screen.getByRole("listitem", { name: "Connect with Freighter" });

    // Click multiple times without waiting for promises to resolve
    await user.click(freighterBtn);
    // Since it's disabled after first click, user.click might throw or ignore, 
    // so we just verify it's disabled or try clicking it anyway.
    // If we click it twice rapidly before React rerenders, we'd use fireEvent.
    // userEvent is closer to real user: it'll see it disabled after rerender.
    // But let's verify the first click set it to Connecting and disabled it.
    
    expect(screen.getByText("Connecting...")).toBeInTheDocument();
    expect(freighterBtn).toBeDisabled();

    // Try clicking again
    await user.click(freighterBtn);

    // Verify only one connection request was initiated
    expect(freighter.isConnected).toHaveBeenCalledTimes(1);

    // Cleanup
    resolveAccess({ address: "GCONNECTED", error: null });
  });
});

describe("WalletButton connected dropdown & design tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wallet.address = "GCONNECTED1234567890ABCDEF";
    wallet.network = "PUBLIC";
    wallet.connected = true;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });


  it("renders connected state with design tokens and opens dropdown", async () => {
    const user = userEvent.setup();
    const { container } = render(<WalletButton />);

    expect(screen.getByText("PUBLIC")).toBeInTheDocument();
    expect(screen.getByText("GCONNE...CDEF")).toBeInTheDocument();

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Connected Address")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /copy address/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /view on stellar explorer/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /disconnect/i })).toBeInTheDocument();

    // Verify no literal hex or raw Tailwind palette colors exist in classNames
    const allElements = container.querySelectorAll("*");
    const hexPattern = /#(?:[0-9a-fA-F]{3,8})/;
    const rawTailwindPalettePattern =
      /(?:bg|text|border|ring)-(?:green|gray|red|cyan|emerald|amber|blue|yellow|orange|purple|indigo|pink|rose)-\d+/;

    allElements.forEach((el) => {
      const className = el.getAttribute("class") || "";
      expect(className).not.toMatch(hexPattern);
      expect(className).not.toMatch(rawTailwindPalettePattern);
    });
  });

  it("renders TESTNET network badge with warning design tokens and handles actions", async () => {
    const user = userEvent.setup();
    wallet.network = "TESTNET";
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<WalletButton />);

    expect(screen.getByText("TESTNET")).toBeInTheDocument();

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    // Test explorer link click
    const explorerBtn = screen.getByRole("menuitem", { name: /view on stellar explorer/i });
    await user.click(explorerBtn);
    expect(windowOpenSpy).toHaveBeenCalled();

    // Re-open dropdown and test disconnect
    await user.click(trigger);
    const disconnectBtn = screen.getByRole("menuitem", { name: /disconnect/i });
    await user.click(disconnectBtn);
    expect(wallet.disconnect).toHaveBeenCalledTimes(1);

    windowOpenSpy.mockRestore();
  });

  it("handles copy address, backdrop click, and Escape key navigation", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);

    const { container } = render(<WalletButton />);

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    // Test copying address via menuitem
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const copyMenuItem = screen.getByRole("menuitem", { name: /copy address/i });
    await user.click(copyMenuItem);
    expect(writeTextSpy).toHaveBeenCalledWith("GCONNECTED1234567890ABCDEF");

    // Once copied is true, menuitem shows "Copied!"
    expect(screen.getByRole("menuitem", { name: /copied!/i })).toBeInTheDocument();
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();

    // Test closing via Escape key on menu element directly
    const menu = screen.getByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Test closing via Escape key on trigger button
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Re-open and test closing via backdrop click
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeInTheDocument();
    await user.click(backdrop!);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    writeTextSpy.mockRestore();
  });

  it("handles empty address guard in copy and explorer handlers, and non-Escape key events", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const windowOpenSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    wallet.address = null;
    wallet.connected = true;

    render(<WalletButton />);

    const trigger = screen.getByRole("button", { expanded: false });
    await user.click(trigger);

    // Press a non-Escape key on menu
    const menu = screen.getByRole("menu");
    await user.type(menu, "a");
    expect(screen.getByRole("menu")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: "Copy address" });
    await user.click(copyBtn);
    expect(writeTextSpy).not.toHaveBeenCalled();

    const explorerBtn = screen.getByRole("menuitem", { name: /view on stellar explorer/i });
    await user.click(explorerBtn);
    expect(windowOpenSpy).not.toHaveBeenCalled();

    writeTextSpy.mockRestore();
    windowOpenSpy.mockRestore();
  });
});



