import type { Page } from "@playwright/test";

export const DEFAULT_STUB_ADDRESS =
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
export const DEFAULT_STUB_NETWORK = "TESTNET";

export type FreighterMockMode = "grants" | "denies" | "missing";

export interface FreighterMockOptions {
  address?: string;
  network?: string;
  mode?: FreighterMockMode;
  connected?: boolean;
  autoConnect?: boolean;
  delayMs?: number;
}

export interface FreighterStubState {
  mode: FreighterMockMode;
  connected: boolean;
  autoConnect: boolean;
  address: string;
  network: string;
  delayMs: number;
}

export interface FreighterStubApi {
  isConnected: () => Promise<{ isConnected: boolean; error?: { message: string } }>;
  getAddress: () => Promise<{ address?: string; error?: { message: string } }>;
  getNetwork: () => Promise<{ network?: string; error?: { message: string } }>;
  requestAccess: () => Promise<{ address?: string; error?: { message: string } }>;
  WatchWalletChanges: new () => { watch: (cb?: (state: unknown) => void) => void; stop: () => void };
  isBrowser: boolean;
  signTransaction?: () => Promise<{ error?: { message: string } }>;
  signAuthEntry?: () => Promise<{ error?: { message: string } }>;
  getNetworkDetails?: () => Promise<{ network?: string; networkPassphrase?: string }>;
}

declare global {
  interface Window {
    __freighterStubState?: FreighterStubState;
    __freighterStub?: FreighterStubApi;
    __freighterState?: { connected: boolean };
    __freighterStubAddress?: string;
    __freighterStubNetwork?: string;
    __fluxoraNetwork?: string;
  }
}

/**
 * Injects a typed Freighter extension mock into the page and intercepts
 * the Vite `@stellar/freighter-api` chunk.
 */
export async function installFreighterMock(
  page: Page,
  options: FreighterMockOptions = {},
): Promise<void> {
  const initialAddress = options.address ?? DEFAULT_STUB_ADDRESS;
  const initialNetwork = options.network ?? DEFAULT_STUB_NETWORK;
  const initialMode = options.mode ?? "grants";
  const initiallyConnected =
    options.connected ?? (initialMode !== "missing" && options.autoConnect !== false);
  const autoConnect = options.autoConnect ?? initiallyConnected;
  const delayMs = options.delayMs ?? 0;

  await page.addInitScript(
    ({ address, network, mode, connected, autoConnectEnabled, delay }) => {
      const state: FreighterStubState = {
        mode,
        connected,
        autoConnect: autoConnectEnabled,
        address,
        network,
        delayMs: delay,
      };

      window.__freighterStubState = state;
      window.__freighterState = { connected: state.connected };
      window.__freighterStubAddress = state.address;
      window.__freighterStubNetwork = state.network;
      window.__fluxoraNetwork = state.network;

      const delayFn = (ms: number) =>
        ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();

      const stub: FreighterStubApi = {
        isConnected: async () => {
          const s = window.__freighterStubState;
          if (s?.delayMs) await delayFn(s.delayMs);
          if (!s || s.mode === "missing" || !s.connected) {
            return { isConnected: false };
          }
          return { isConnected: true };
        },
        getAddress: async () => {
          const s = window.__freighterStubState;
          if (s?.delayMs) await delayFn(s.delayMs);
          if (!s || s.mode === "missing" || !s.connected) {
            return { address: "", error: { message: "Not connected" } };
          }
          if (!s.autoConnect) {
            return { address: "" };
          }
          return { address: s.address };
        },
        getNetwork: async () => {
          const s = window.__freighterStubState;
          if (s?.delayMs) await delayFn(s.delayMs);
          if (!s || s.mode === "missing" || !s.connected) {
            return { network: "", error: { message: "Not connected" } };
          }
          return { network: s.network };
        },
        requestAccess: async () => {
          const s = window.__freighterStubState;
          if (s?.delayMs) await delayFn(s.delayMs);
          if (!s || s.mode === "denies") {
            return {
              address: "",
              error: { message: "User rejected the connection request" },
            };
          }
          if (s) {
            s.connected = true;
            s.autoConnect = true;
            if (window.__freighterState) {
              window.__freighterState.connected = true;
            }
          }
          return { address: s?.address ?? "" };
        },
        WatchWalletChanges: class {
          watch() {}
          stop() {}
        },
        isBrowser: true,
        signTransaction: () => Promise.resolve({ error: { message: "stub" } }),
        signAuthEntry: () => Promise.resolve({ error: { message: "stub" } }),
        getNetworkDetails: async () => {
          const s = window.__freighterStubState;
          return { network: s?.network ?? "", networkPassphrase: "" };
        },
      };

      window.__freighterStub = stub;
    },
    {
      address: initialAddress,
      network: initialNetwork,
      mode: initialMode,
      connected: initiallyConnected,
      autoConnectEnabled: autoConnect,
      delay: delayMs,
    },
  );

  await page.route(/vendor-stellar.*\.js/, async (route) => {
    const stubModule = `
const s = window.__freighterStub || {};
const noop = () => Promise.resolve({ isConnected: false });
export const isConnected = s.isConnected ? s.isConnected.bind(s) : noop;
export const getAddress = s.getAddress ? s.getAddress.bind(s) : () => Promise.resolve({ address: '' });
export const getNetwork = s.getNetwork ? s.getNetwork.bind(s) : () => Promise.resolve({ network: '' });
export const requestAccess = s.requestAccess ? s.requestAccess.bind(s) : () => Promise.resolve({ address: '' });
export const WatchWalletChanges = s.WatchWalletChanges ?? class { watch(){} stop(){} };
export const isBrowser = true;
export const signTransaction = s.signTransaction ?? (() => Promise.resolve({ error: { message: 'stub' } }));
export const signAuthEntry = s.signAuthEntry ?? (() => Promise.resolve({ error: { message: 'stub' } }));
export const getNetworkDetails = s.getNetworkDetails ?? (() => Promise.resolve({ network: '', networkPassphrase: '' }));
export default { isConnected, getAddress, getNetwork, requestAccess, WatchWalletChanges, isBrowser };
`;
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: stubModule,
    });
  });
}

/** Update the stubbed Freighter mode on the running page. */
export async function setFreighterMode(page: Page, mode: FreighterMockMode): Promise<void> {
  await page.evaluate((m) => {
    if (window.__freighterStubState) {
      window.__freighterStubState.mode = m;
    }
  }, mode);
}

/** Update the stubbed Freighter connection state on the running page. */
export async function setFreighterConnected(page: Page, connected: boolean): Promise<void> {
  await page.evaluate((c) => {
    if (window.__freighterStubState) {
      window.__freighterStubState.connected = c;
      window.__freighterStubState.autoConnect = c;
    }
    if (window.__freighterState) {
      window.__freighterState.connected = c;
    }
  }, connected);
}

/** Update the stubbed Freighter network on the running page. */
export async function setFreighterNetwork(page: Page, network: string): Promise<void> {
  await page.evaluate((n) => {
    if (window.__freighterStubState) {
      window.__freighterStubState.network = n;
    }
    window.__freighterStubNetwork = n;
    window.__fluxoraNetwork = n;
  }, network);
}
