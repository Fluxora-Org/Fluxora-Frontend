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
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_TX_BASE_FEE?: string;
  /**
   * Maximum number of retry attempts for `waitForTransaction` confirmation
   * polling. Clamped to [1, 300]. Defaults to `15`.
   */
  readonly VITE_TX_CONFIRMATION_MAX_RETRIES?: string;
  /**
   * Delay in milliseconds between each `waitForTransaction` confirmation poll.
   * Clamped to [100, 30000]. Defaults to `1500`.
   */
  readonly VITE_TX_CONFIRMATION_DELAY_MS?: string;
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
