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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
