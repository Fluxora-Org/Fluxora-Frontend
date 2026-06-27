/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_STREAM_CONTRACT_ID: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_NETWORK: string;
  readonly VITE_USE_MOCKS: string;
  readonly VITE_TX_POLL_INTERVAL_MS?: string;
  readonly VITE_TX_POLL_MAX_ATTEMPTS?: string;
  readonly VITE_TX_POLL_BACKOFF_FACTOR?: string;
  readonly VITE_TX_DEMO_CONFIRMATION_ATTEMPTS?: string;
  /**
   * How often (in ms) WatchWalletChanges polls the Freighter extension for
   * account/network changes. Defaults to 2000 ms. Must be ≥ 500 ms.
   * Useful to increase on slow networks or in CI to reduce noise.
   */
  readonly VITE_WALLET_WATCH_INTERVAL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
