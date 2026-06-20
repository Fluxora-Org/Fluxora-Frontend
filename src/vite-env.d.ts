/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STREAM_CONTRACT_ID: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_NETWORK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
