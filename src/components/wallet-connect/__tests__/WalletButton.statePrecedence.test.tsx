import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WalletButton from "../Walletbutton";

const walletState = vi.hoisted(() => ({
  connected: false,
  loading: false,
  address: null as string | null,
  network: null as string | null,
  isNetworkMismatch: false,
  expectedNetwork: "TESTNET",
}));

vi.mock("../Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    error: null,
    disconnect: vi.fn(),
    connect: vi.fn(),
  }),
}));

vi.mock("../../lib/stellar", () => ({
  stellarExplorerUrl: vi.fn(() => "https://stellar.expert"),
}));

vi.mock("../../lib/utils", () => ({
  cn: (...classes: (string | boolean | undefined)[]) =>
    classes.filter(Boolean).join(" "),
}));

vi.mock("../common/TruncatedAddress", () => ({
  formatAddress: (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`,
}));

describe("WalletButton state precedence", () => {
  it("shows loading skeleton when loading is true (highest precedence)", () => {
    walletState.loading = true;
    walletState.connected = true;
    walletState.address = "GABCD...1234";
    walletState.network = "PUBLIC";
    walletState.isNetworkMismatch = false;

    render(<WalletButton />);

    expect(screen.getByLabelText("Loading wallet…")).toBeInTheDocument();
    expect(screen.queryByText("Connect wallet")).not.toBeInTheDocument();
    expect(screen.queryByText(/GABCD/)).not.toBeInTheDocument();
  });

  it("shows connect button when disconnected", () => {
    walletState.loading = false;
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    walletState.isNetworkMismatch = false;

    render(<WalletButton />);

    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading wallet…")).not.toBeInTheDocument();
  });

  it("shows network warning instead of address when on wrong network", () => {
    walletState.loading = false;
    walletState.connected = true;
    walletState.address = "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";
    walletState.network = "PUBLIC";
    walletState.isNetworkMismatch = true;
    walletState.expectedNetwork = "TESTNET";

    render(<WalletButton />);

    expect(screen.getByText(/Expected TESTNET/)).toBeInTheDocument();
    expect(screen.getByText("Switch Network")).toBeInTheDocument();
    // Critical: address should NOT be shown on wrong network
    expect(screen.queryByText(/GABCD/)).not.toBeInTheDocument();
    expect(screen.queryByText("Connect wallet")).not.toBeInTheDocument();
  });

  it("shows address and network badge when connected on correct network", () => {
    walletState.loading = false;
    walletState.connected = true;
    walletState.address = "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;

    render(<WalletButton />);

    expect(screen.getByText(/GABCD1/)).toBeInTheDocument();
    expect(screen.getByText("TESTNET")).toBeInTheDocument();
    expect(screen.queryByText("Connect wallet")).not.toBeInTheDocument();
    expect(screen.queryByText(/Expected/)).not.toBeInTheDocument();
  });

  it("loading takes precedence over wrong network", () => {
    walletState.loading = true;
    walletState.connected = true;
    walletState.address = "GABCD...1234";
    walletState.network = "PUBLIC";
    walletState.isNetworkMismatch = true;

    render(<WalletButton />);

    expect(screen.getByLabelText("Loading wallet…")).toBeInTheDocument();
    expect(screen.queryByText(/Expected/)).not.toBeInTheDocument();
  });

  it("loading takes precedence over connected state", () => {
    walletState.loading = true;
    walletState.connected = true;
    walletState.address = "GABCD...1234";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;

    render(<WalletButton />);

    expect(screen.getByLabelText("Loading wallet…")).toBeInTheDocument();
    expect(screen.queryByText(/GABCD/)).not.toBeInTheDocument();
  });

  it("wrong network takes precedence over connected state", () => {
    walletState.loading = false;
    walletState.connected = true;
    walletState.address = "GABCD...1234";
    walletState.network = "PUBLIC";
    walletState.isNetworkMismatch = true;

    render(<WalletButton />);

    expect(screen.getByText(/Expected/)).toBeInTheDocument();
    expect(screen.queryByText(/GABCD/)).not.toBeInTheDocument();
  });

  it("disconnected takes precedence over connected when connected is false", () => {
    walletState.loading = false;
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    walletState.isNetworkMismatch = false;

    render(<WalletButton />);

    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
  });
});

describe("WalletButton state transitions", () => {
  it("transitions from loading to connected", () => {
    walletState.loading = true;
    walletState.connected = true;
    walletState.address = "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;

    const { rerender } = render(<WalletButton />);
    expect(screen.getByLabelText("Loading wallet…")).toBeInTheDocument();

    walletState.loading = false;
    rerender(<WalletButton />);

    expect(screen.queryByLabelText("Loading wallet…")).not.toBeInTheDocument();
    expect(screen.getByText(/GABCD1/)).toBeInTheDocument();
  });

  it("transitions from connected to wrong network", () => {
    walletState.loading = false;
    walletState.connected = true;
    walletState.address = "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;

    const { rerender } = render(<WalletButton />);
    expect(screen.getByText(/GABCD1/)).toBeInTheDocument();

    walletState.isNetworkMismatch = true;
    walletState.network = "PUBLIC";
    rerender(<WalletButton />);

    expect(screen.queryByText(/GABCD/)).not.toBeInTheDocument();
    expect(screen.getByText(/Expected TESTNET/)).toBeInTheDocument();
  });

  it("transitions from wrong network to correct network", () => {
    walletState.loading = false;
    walletState.connected = true;
    walletState.address = "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";
    walletState.network = "PUBLIC";
    walletState.isNetworkMismatch = true;

    const { rerender } = render(<WalletButton />);
    expect(screen.getByText(/Expected TESTNET/)).toBeInTheDocument();

    walletState.isNetworkMismatch = false;
    walletState.network = "TESTNET";
    rerender(<WalletButton />);

    expect(screen.queryByText(/Expected/)).not.toBeInTheDocument();
    expect(screen.getByText(/GABCD1/)).toBeInTheDocument();
  });

  it("transitions from connected to disconnected", () => {
    walletState.loading = false;
    walletState.connected = true;
    walletState.address = "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";
    walletState.network = "TESTNET";
    walletState.isNetworkMismatch = false;

    const { rerender } = render(<WalletButton />);
    expect(screen.getByText(/GABCD1/)).toBeInTheDocument();

    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    rerender(<WalletButton />);

    expect(screen.queryByText(/GABCD/)).not.toBeInTheDocument();
    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
  });

  it("transitions from wrong network to disconnected", () => {
    walletState.loading = false;
    walletState.connected = true;
    walletState.address = "GABCD1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890123";
    walletState.network = "PUBLIC";
    walletState.isNetworkMismatch = true;

    const { rerender } = render(<WalletButton />);
    expect(screen.getByText(/Expected TESTNET/)).toBeInTheDocument();

    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    walletState.isNetworkMismatch = false;
    rerender(<WalletButton />);

    expect(screen.queryByText(/Expected/)).not.toBeInTheDocument();
    expect(screen.getByText("Connect wallet")).toBeInTheDocument();
  });
});
