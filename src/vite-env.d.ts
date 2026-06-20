/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TX_POLL_INTERVAL_MS?: string;
  readonly VITE_TX_POLL_MAX_ATTEMPTS?: string;
  readonly VITE_TX_POLL_BACKOFF_FACTOR?: string;
  readonly VITE_TX_DEMO_CONFIRMATION_ATTEMPTS?: string;
}
