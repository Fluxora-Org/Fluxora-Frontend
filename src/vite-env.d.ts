/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_STREAM_CONTRACT_ID: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_NETWORK: string;
  readonly VITE_USE_MOCKS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
