/**
 * Issue #1678 — the wallet context recovers a dropped connection without
 * losing view state.
 *
 * A *dropped* connection (extension locked/unavailable, network lost, page
 * backgrounded) must be reported and recovered in place: the user stays on the
 * same view, entered form data survives, and no in-flight request is repeated.
 * A *user-initiated* disconnect keeps its existing behaviour.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import {
  getAddress,
  getNetwork,
  isAllowed,
  isConnected,
  WatchWalletChanges,
} from "@stellar/freighter-api";
import { WalletProvider, useWallet } from "../Walletcontext";
import WalletConnectionNotice from "../WalletConnectionNotice";
import RequireWallet from "../../RequireWallet";
import CreateStreamModal from "../../CreateStreamModal";
import { I18nProvider } from "../../../i18n";
import { createStream } from "../../../lib/stellar/tx";
import { selectSingleStreamInContainer } from "../../__tests__/CreateStreamModal.testUtils";

// src/test/setup.ts stubs the wallet context globally; this suite exercises
// the real provider.
vi.unmock("../Walletcontext");

// These tests render the full CreateStreamModal (~2.5s cold on a dev machine),
// which can exceed the 5s default when the whole suite runs in parallel.
vi.setConfig({ testTimeout: 20_000 });

// Module boundary for the wallet extension: every connection state (connected,
// locked, unavailable, revoked) is driven through these mocks.
vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  isAllowed: vi.fn(),
  getAddress: vi.fn(),
  getNetwork: vi.fn(),
  WatchWalletChanges: vi.fn(),
}));

vi.mock("../../../lib/stellar/tx", () => ({
  createStream: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

// The bulk-CSV preview step is not part of the single-stream flow exercised
// here, and it imports `react-i18next`, which is not installed on main.
vi.mock("../../csv-upload/PreviewValidateStep", () => ({
  default: () => null,
}));

const ACCOUNT_A = "GATDOSCZNJ5YZHNOX7IOD4QDCQSTMR2YNF5IXHFNX3H6B4ICCMSDLOWN";
const ACCOUNT_B = "GBWWOK4D6M5FU4OSMXJGHEY5WGIX75SEE55J7RMN6OMWPSJDYLZ42KXP";
const RECIPIENT = "GAPMUZC432MUHKQR5N63SM6FWZL2KUHLDB4HPSV7SX637CM54ANQ6LVV";
const PASSPHRASE = "Test SDF Network ; September 2015";

const mockedIsConnected = vi.mocked(isConnected);
const mockedIsAllowed = vi.mocked(isAllowed);
const mockedGetAddress = vi.mocked(getAddress);
const mockedGetNetwork = vi.mocked(getNetwork);
const mockedWatchWalletChanges = vi.mocked(WatchWalletChanges);
const mockedCreateStream = vi.mocked(createStream);

type WatchParams = {
  address: string;
  network: string;
  networkPassphrase: string;
  error?: unknown;
};
let watchCallback: (params: WatchParams) => void = () => {};
let watchers: Array<{
  watch: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}> = [];

let online = true;
let visibility: DocumentVisibilityState = "visible";

function walletUnlocked(address = ACCOUNT_A) {
  mockedIsConnected.mockResolvedValue({ isConnected: true });
  mockedIsAllowed.mockResolvedValue({ isAllowed: true });
  mockedGetAddress.mockResolvedValue({ address });
  mockedGetNetwork.mockResolvedValue({
    network: "TESTNET",
    networkPassphrase: PASSPHRASE,
  });
}

/** Freighter returns an empty address (no popup) while the extension is locked. */
function walletLocked() {
  mockedGetAddress.mockResolvedValue({ address: "" });
}

function emitWatch(address: string, extra: Partial<WatchParams> = {}) {
  act(() => {
    watchCallback({
      address,
      network: "TESTNET",
      networkPassphrase: PASSPHRASE,
      ...extra,
    });
  });
}

function goOffline() {
  online = false;
  act(() => {
    window.dispatchEvent(new Event("offline"));
  });
}

function goOnline() {
  online = true;
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
}

function returnToTab() {
  visibility = "visible";
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

function WalletProbe() {
  const wallet = useWallet();
  return (
    <div>
      <output
        data-testid="wallet-probe"
        data-status={wallet.connectionStatus}
        data-address={wallet.address ?? ""}
        data-version={wallet.accountContextVersion}
      />
      <button type="button" onClick={wallet.disconnect}>
        probe-disconnect
      </button>
    </div>
  );
}

function probe() {
  const el = screen.getByTestId("wallet-probe");
  return {
    status: el.getAttribute("data-status"),
    address: el.getAttribute("data-address"),
    version: Number(el.getAttribute("data-version")),
  };
}

function StreamSetupView() {
  return (
    <main>
      <h1>Stream setup</h1>
      <CreateStreamModal isOpen onClose={() => {}} />
    </main>
  );
}

function renderApp() {
  return render(
    <I18nProvider>
      <MemoryRouter initialEntries={["/app/streams"]}>
        <WalletProvider>
          <WalletConnectionNotice />
          <WalletProbe />
          <Routes>
            <Route
              path="/app/streams"
              element={
                <RequireWallet>
                  <StreamSetupView />
                </RequireWallet>
              }
            />
            <Route path="/connect-wallet" element={<h1>Connect a wallet</h1>} />
          </Routes>
        </WalletProvider>
      </MemoryRouter>
    </I18nProvider>,
  );
}

async function renderConnected() {
  const utils = renderApp();
  await waitFor(() => {
    expect(probe().address).toBe(ACCOUNT_A);
    expect(mockedWatchWalletChanges).toHaveBeenCalled();
  });
  return utils;
}

function modal() {
  return screen.getByRole("dialog");
}

function field(id: string) {
  return modal().querySelector(`#${id}`) as HTMLInputElement;
}

/** Fills step 1 and step 2 of the single-stream wizard, stopping on step 2. */
function fillStreamSetup() {
  selectSingleStreamInContainer(modal());
  fireEvent.change(field("create-stream-recipient"), {
    target: { value: RECIPIENT },
  });
  fireEvent.change(field("create-stream-deposit"), {
    target: { value: "150" },
  });
  fireEvent.click(within(modal()).getByRole("button", { name: /^next$/i }));
  fireEvent.change(field("create-stream-accrual-rate"), {
    target: { value: "7" },
  });
  fireEvent.change(field("create-stream-duration"), {
    target: { value: "45" },
  });
}

function expectStep2Intact() {
  expect(
    screen.getByRole("heading", { name: "Stream setup" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Connect a wallet" }),
  ).not.toBeInTheDocument();
  expect(field("create-stream-accrual-rate").value).toBe("7");
  expect(field("create-stream-duration").value).toBe("45");
}

function expectStep1Intact() {
  fireEvent.click(within(modal()).getByRole("button", { name: /^back$/i }));
  expect(field("create-stream-recipient").value).toBe(RECIPIENT);
  expect(field("create-stream-deposit").value).toBe("150");
}

function notice() {
  return screen.getByRole("status", { name: "Wallet connection status" });
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  watchers = [];
  watchCallback = () => {};
  online = true;
  visibility = "visible";
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  walletUnlocked();
  mockedWatchWalletChanges.mockImplementation(
    function MockWatchWalletChanges() {
      const watcher = {
        watch: vi.fn((cb: (params: WatchParams) => void) => {
          watchCallback = cb;
          return {};
        }),
        stop: vi.fn(),
      };
      watchers.push(watcher);
      return watcher;
    } as unknown as typeof WatchWalletChanges,
  );
});

afterEach(() => {
  // Remove the instance-level overrides so the jsdom prototype getters apply again.
  Reflect.deleteProperty(navigator, "onLine");
  Reflect.deleteProperty(document, "visibilityState");
  vi.useRealTimers();
});

describe("#1678 integration: drop mid-flow, reconnect, view and data intact", () => {
  it("keeps the stream-setup view and every entered value across a drop and reconnect", async () => {
    await renderConnected();
    fillStreamSetup();
    expectStep2Intact();
    const versionBefore = probe().version;

    // Drop: the extension locks. Freighter's watcher reports an empty address.
    walletLocked();
    emitWatch("");
    await act(async () => {});

    // Criterion 2 + 3 while dropped: no redirect, form still mounted.
    expectStep2Intact();

    // Criterion 1: the drop is detected and reported.
    await waitFor(() => expect(probe().status).toBe("dropped"));
    expect(notice()).toHaveTextContent("Wallet connection lost");
    expect(
      within(notice()).getByRole("button", { name: "Reconnect wallet" }),
    ).toBeInTheDocument();

    // Reconnect: the user unlocks the extension and the watcher sees the account again.
    walletUnlocked();
    emitWatch(ACCOUNT_A);

    await waitFor(() => expect(probe().status).toBe("connected"));
    expect(notice()).not.toHaveTextContent("Wallet connection lost");
    expect(probe().address).toBe(ACCOUNT_A);
    // Same account: not an account change, so account-scoped data is not reset/refetched.
    expect(probe().version).toBe(versionBefore);

    // Criterion 2 + 3 after reconnect: same view, every value intact.
    expectStep2Intact();
    expectStep1Intact();
  });

  it("recovers through the notice's Reconnect button", async () => {
    await renderConnected();
    fillStreamSetup();

    walletLocked();
    emitWatch("");
    await waitFor(() => expect(probe().status).toBe("dropped"));

    walletUnlocked();
    fireEvent.click(
      within(notice()).getByRole("button", { name: "Reconnect wallet" }),
    );

    await waitFor(() => expect(probe().status).toBe("connected"));
    expectStep2Intact();
    expectStep1Intact();
  });
});

describe("#1678 detection paths", () => {
  it("wallet locked: watcher reports an empty address", async () => {
    await renderConnected();
    walletLocked();
    emitWatch("");
    await waitFor(() => expect(probe().status).toBe("dropped"));
    expect(probe().address).toBe(ACCOUNT_A);
  });

  it("wallet unavailable: watcher reports an error and the extension is unreachable", async () => {
    await renderConnected();
    mockedIsConnected.mockResolvedValue({ isConnected: false });
    emitWatch("", { error: { code: -1, message: "extension not found" } });
    await waitFor(() => expect(probe().status).toBe("dropped"));

    // Extension comes back; returning to the tab re-checks and recovers.
    walletUnlocked();
    returnToTab();
    await waitFor(() => expect(probe().status).toBe("connected"));
  });

  it("network lost: offline reports the drop, online recovers it", async () => {
    await renderConnected();
    fillStreamSetup();

    goOffline();
    expect(probe().status).toBe("dropped");
    expect(notice()).toHaveTextContent("Wallet connection lost");
    expectStep2Intact();

    goOnline();
    await waitFor(() => expect(probe().status).toBe("connected"));
    expectStep2Intact();
    expectStep1Intact();
  });

  it("stays dropped while the browser is still offline", async () => {
    await renderConnected();
    goOffline();
    mockedGetAddress.mockClear();
    fireEvent.click(
      within(notice()).getByRole("button", { name: "Reconnect wallet" }),
    );
    await act(async () => {});
    expect(probe().status).toBe("dropped");
    expect(mockedGetAddress).not.toHaveBeenCalled();
  });

  it("page backgrounded: returning to the tab re-checks and reports a lock", async () => {
    await renderConnected();
    fillStreamSetup();

    visibility = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    walletLocked(); // locked while the tab was in the background, no watcher event
    returnToTab();
    await waitFor(() => expect(probe().status).toBe("dropped"));
    expectStep2Intact();

    walletUnlocked();
    returnToTab();
    await waitFor(() => expect(probe().status).toBe("connected"));
    expectStep2Intact();
    expectStep1Intact();
  });

  it("does not check the wallet when the tab is hidden", async () => {
    await renderConnected();
    mockedGetAddress.mockClear();
    visibility = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await act(async () => {});
    expect(mockedGetAddress).not.toHaveBeenCalled();
    expect(probe().status).toBe("connected");
  });
});

describe("#1678 single-flight reconnect", () => {
  it("runs exactly one wallet check when several triggers fire together", async () => {
    await renderConnected();
    goOffline();

    let resolveAddress: (value: { address: string }) => void = () => {};
    mockedIsConnected.mockClear();
    mockedGetAddress.mockClear();
    mockedGetAddress.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAddress = resolve;
        }),
    );

    // Manual retry, then every automatic trigger at once.
    online = true;
    fireEvent.click(
      within(notice()).getByRole("button", { name: "Reconnect wallet" }),
    );
    goOnline();
    returnToTab();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    emitWatch("");

    await waitFor(() => expect(probe().status).toBe("reconnecting"));
    expect(notice()).toHaveTextContent("Reconnecting wallet");
    expect(mockedIsConnected).toHaveBeenCalledTimes(1);
    expect(mockedGetAddress).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAddress({ address: ACCOUNT_A });
    });
    await waitFor(() => expect(probe().status).toBe("connected"));
    expect(mockedGetAddress).toHaveBeenCalledTimes(1);

    // The single-flight slot is released afterwards: a later trigger checks again.
    walletUnlocked();
    returnToTab();
    await waitFor(() => expect(mockedGetAddress).toHaveBeenCalledTimes(2));
  });
});

describe("#1678 in-flight requests are not duplicated", () => {
  it("a stream submission pending during the drop is sent exactly once", async () => {
    await renderConnected();

    type CreateStreamResult = Awaited<ReturnType<typeof createStream>>;
    let resolveCreate: (value: CreateStreamResult) => void = () => {};
    mockedCreateStream.mockImplementation(
      () =>
        new Promise<CreateStreamResult>((resolve) => {
          resolveCreate = resolve;
        }),
    );

    // Advanced mode submits through a single createStream call.
    selectSingleStreamInContainer(modal());
    fireEvent.click(within(modal()).getByRole("radio", { name: /advanced/i }));
    fireEvent.change(field("create-stream-recipient"), {
      target: { value: RECIPIENT },
    });
    fireEvent.change(field("create-stream-deposit"), {
      target: { value: "150" },
    });
    fireEvent.click(
      within(modal()).getByRole("button", { name: "Create stream" }),
    );
    await waitFor(() => expect(mockedCreateStream).toHaveBeenCalledTimes(1));

    // Drop and reconnect while the submission is still pending.
    walletLocked();
    emitWatch("");
    await waitFor(() => expect(probe().status).toBe("dropped"));
    walletUnlocked();
    emitWatch(ACCOUNT_A);
    await waitFor(() => expect(probe().status).toBe("connected"));
    goOffline();
    goOnline();
    await waitFor(() => expect(probe().status).toBe("connected"));

    expect(mockedCreateStream).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({
        status: "SUCCESS",
        txHash: "abc123",
      } as unknown as CreateStreamResult);
    });
    expect(mockedCreateStream).toHaveBeenCalledTimes(1);
    expect(mockedCreateStream.mock.calls[0]?.[0]).toBe(ACCOUNT_A);
  });

  it("blocks a new submission while dropped instead of tearing the form down", async () => {
    await renderConnected();
    selectSingleStreamInContainer(modal());
    fireEvent.click(within(modal()).getByRole("radio", { name: /advanced/i }));
    fireEvent.change(field("create-stream-recipient"), {
      target: { value: RECIPIENT },
    });
    fireEvent.change(field("create-stream-deposit"), {
      target: { value: "150" },
    });

    walletLocked();
    emitWatch("");
    await waitFor(() => expect(probe().status).toBe("dropped"));

    fireEvent.click(
      within(modal()).getByRole("button", { name: "Create stream" }),
    );
    expect(
      await within(modal()).findByText(/Reconnect your wallet to continue/),
    ).toBeInTheDocument();
    expect(mockedCreateStream).not.toHaveBeenCalled();
    expect(field("create-stream-recipient").value).toBe(RECIPIENT);
    expect(field("create-stream-deposit").value).toBe("150");
  });

  it("does not re-read the account or bump the account context on a same-account reconnect", async () => {
    await renderConnected();
    const versionBefore = probe().version;
    goOffline();
    goOnline();
    await waitFor(() => expect(probe().status).toBe("connected"));
    expect(probe().version).toBe(versionBefore);
  });
});

describe("#1678 user-initiated disconnect keeps existing behaviour", () => {
  it("clears the session and routes to connect-wallet without a drop notice", async () => {
    await renderConnected();
    fillStreamSetup();

    fireEvent.click(screen.getByRole("button", { name: "probe-disconnect" }));

    await waitFor(() => expect(probe().status).toBe("disconnected"));
    expect(probe().address).toBe("");
    expect(
      screen.getByRole("heading", { name: "Connect a wallet" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Stream setup" }),
    ).not.toBeInTheDocument();
    expect(notice()).not.toHaveTextContent("Wallet connection lost");
    expect(watchers[0]?.stop).toHaveBeenCalled();
  });

  it("does not treat network events after a disconnect as a drop", async () => {
    await renderConnected();
    fireEvent.click(screen.getByRole("button", { name: "probe-disconnect" }));
    await waitFor(() => expect(probe().status).toBe("disconnected"));

    mockedGetAddress.mockClear();
    goOffline();
    goOnline();
    returnToTab();
    await act(async () => {});
    expect(probe().status).toBe("disconnected");
    expect(mockedGetAddress).not.toHaveBeenCalled();
  });

  it("revoking the app's access in the wallet is a disconnect, not a drop", async () => {
    await renderConnected();
    mockedIsAllowed.mockResolvedValue({ isAllowed: false });
    mockedGetAddress.mockResolvedValue({ address: "" });
    emitWatch("");

    await waitFor(() => expect(probe().status).toBe("disconnected"));
    expect(
      screen.getByRole("heading", { name: "Connect a wallet" }),
    ).toBeInTheDocument();
  });

  it("an explicit disconnect while dropped disconnects and clears the notice", async () => {
    await renderConnected();
    goOffline();
    fireEvent.click(screen.getByRole("button", { name: "probe-disconnect" }));
    await waitFor(() => expect(probe().status).toBe("disconnected"));
    expect(notice()).not.toHaveTextContent("Wallet connection lost");
  });
});

describe("#1678 different account on reconnect", () => {
  it("is handled as an account switch: new sender, bumped account context, form preserved", async () => {
    await renderConnected();
    fillStreamSetup();
    const versionBefore = probe().version;

    walletLocked();
    emitWatch("");
    await waitFor(() => expect(probe().status).toBe("dropped"));

    // The user unlocks a different account.
    walletUnlocked(ACCOUNT_B);
    emitWatch(ACCOUNT_B);

    await waitFor(() => expect(probe().status).toBe("connected"));
    expect(probe().address).toBe(ACCOUNT_B);
    expect(probe().version).toBeGreaterThan(versionBefore);
    // Preserve-and-revalidate (ACCOUNT_SWITCH_INVARIANTS_SPEC.md): the draft
    // stays; the sender is taken from the account connected at submit time.
    expectStep2Intact();
    expectStep1Intact();
  });

  it("a reconnect check that finds a different account switches to it", async () => {
    await renderConnected();
    goOffline();
    walletUnlocked(ACCOUNT_B);
    goOnline();

    await waitFor(() => expect(probe().address).toBe(ACCOUNT_B));
    expect(probe().status).toBe("connected");
  });
});

describe("#1678 cleanup on unmount", () => {
  it("removes every listener and stops the watcher", async () => {
    const windowRemove = vi.spyOn(window, "removeEventListener");
    const documentRemove = vi.spyOn(document, "removeEventListener");
    const { unmount } = await renderConnected();

    unmount();

    const windowEvents = windowRemove.mock.calls.map(([type]) => type);
    expect(windowEvents).toEqual(
      expect.arrayContaining(["online", "offline", "focus"]),
    );
    expect(documentRemove.mock.calls.map(([type]) => type)).toContain(
      "visibilitychange",
    );
    expect(watchers.every((w) => w.stop.mock.calls.length > 0)).toBe(true);

    mockedIsConnected.mockClear();
    online = false;
    window.dispatchEvent(new Event("offline"));
    online = true;
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
    await act(async () => {});
    expect(mockedIsConnected).not.toHaveBeenCalled();

    windowRemove.mockRestore();
    documentRemove.mockRestore();
  });

  it("ignores a reconnect check that resolves after unmount", async () => {
    const errorSpy = vi.spyOn(console, "error");
    const { unmount } = await renderConnected();
    goOffline();

    let resolveAddress: (value: { address: string }) => void = () => {};
    mockedGetAddress.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAddress = resolve;
        }),
    );
    goOnline();
    await waitFor(() => expect(mockedGetAddress).toHaveBeenCalled());

    unmount();
    await act(async () => {
      resolveAddress({ address: ACCOUNT_A });
    });

    const updateAfterUnmount = errorSpy.mock.calls.some((args) =>
      String(args[0]).includes("unmounted component"),
    );
    expect(updateAfterUnmount).toBe(false);
    errorSpy.mockRestore();
  });
});
