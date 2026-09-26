import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 5173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const browserChannel = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  // CI retries absorb transient races (lazy-loaded modal chunks, dev-server
  // cold compiles) instead of failing the whole workflow; traces are captured
  // on the first retry via `trace: "on-first-retry"` below.
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Drive the suite from the seeded demo dataset (src/data/streamRecords.ts)
    // so routes like /app/streams/:streamId resolve real records without a live
    // backend. Existing values from the shell env take precedence.
    env: {
      VITE_NETWORK: process.env.VITE_NETWORK ?? "TESTNET",
      VITE_USE_MOCKS: process.env.VITE_USE_MOCKS ?? "true",
      // Demo/mock configuration so the app boots without live backend
      // credentials, and an explicit network so config validation passes.
      VITE_DEMO_MODE: process.env.VITE_DEMO_MODE ?? "true",
      VITE_NETWORK: process.env.VITE_NETWORK ?? "TESTNET",
      // Marks the run as end-to-end so wallet-gated routes are reachable
      // without a browser wallet extension (see RequireWallet guards).
      VITE_E2E: "true",
      VITE_E2E_FORCE_SHARE_FAILURE: "true",
      // Stream creation flows through the real tx builder at submit time,
      // which throws without a contract ID / RPC URL. The documented example
      // values from .env.example are safe here: the Soroban RPC is stubbed
      // via page.route() in specs (e.g. create-stream-flow.spec.ts),
      // intercepting the same host VITE_RPC_URL points at.
      VITE_RPC_URL:
        process.env.VITE_RPC_URL ?? "https://soroban-testnet.stellar.org",
      VITE_STREAM_CONTRACT_ID:
        process.env.VITE_STREAM_CONTRACT_ID ??
        "CBQQXQSQB4GBB5XDPBFWEXTURY5HDG37TIE7YZ3WHP3DXVZQ2E4UHY4Z",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: browserChannel,
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    // WebKit requires macOS in most CI environments; guard with CI flag or use test:e2e:full
    ...(process.env.CI !== "true" || process.env.PLAYWRIGHT_WEBKIT === "1"
      ? [
          {
            name: "webkit",
            use: {
              ...devices["Desktop Safari"],
            },
          },
        ]
      : []),
  ],
});
