# Environment Variables

This document describes all client-side environment variables used by the Fluxora frontend application.

> [!CAUTION]
> **CRITICAL SECURITY WARNING**
> 
> All environment variables prefixed with `VITE_` are statically compiled into the client-side JavaScript bundle during the Vite build process. They are **entirely public** and will be visible to anyone inspecting the network traffic, the compiled bundle, or the client application state in their web browser.
> 
> **Never store secrets, private signing keys, seed phrases, or sensitive API credentials in these variables.**
> 
> If you need to manage secret keys, they must be processed on a secure backend service (such as `fluxora-backend`). The frontend only stores public client metadata, RPC endpoints, and contract IDs.

---

## Configuration Files

The application runtime configuration is parsed and validated by two key configuration modules:
- [src/lib/config.ts](file:///c:/Users/cisat/.antigravity-ide/Fluxora-Frontend/src/lib/config.ts): Handles core app configurations, including API base URLs, Stellar network selections, contract addresses, and feature/mock flags.
- [src/lib/transactionConfig.ts](file:///c:/Users/cisat/.antigravity-ide/Fluxora-Frontend/src/lib/transactionConfig.ts): Handles transaction status polling parameters, retry thresholds, and exponential backoff configuration.

Copy `.env.example` to `.env` or `.env.local` to override these configurations in your local environment.

---

## Core Variables

### `VITE_API_URL`
- **Purpose**: Base URL endpoint for the Fluxora backend REST API services.
- **Required/Optional**: Optional. If not set (or empty), frontend operations requiring the backend may gracefully fail or fall back to mock data paths (if `VITE_USE_MOCKS` is enabled).
- **Format**: A valid absolute URL including the protocol (`http://` or `https://`).
- **Example**: `https://api.fluxora.example.com`

### `VITE_NETWORK`
- **Purpose**: The expected Stellar network for wallet validation and connection. Used by the wallet state manager to verify that the connected Freighter/Albedo/WalletConnect extension is configured for the matching network.
- **Required/Optional**: Optional. If missing or invalid, the application fails safe and defaults to `TESTNET`.
- **Format**: Case-insensitive string matching the network enum values: `PUBLIC` (Mainnet) or `TESTNET`.
- **Expected Values**: 
  - `TESTNET` (resolves label: "Testnet", passphrase: "Test SDF Network ; September 2015")
  - `PUBLIC` (resolves label: "Public Network (Mainnet)", passphrase: "Public Global Stellar Network ; September 2015")
- **Example**: `VITE_NETWORK=TESTNET`

### `VITE_RPC_URL`
- **Purpose**: Soroban RPC server endpoint used by the Stellar SDK client to simulate and submit transactions.
- **Required/Optional**: Optional during build, but required at runtime for live wallet transactions.
- **Format**: A valid absolute URL including the protocol (`http://` or `https://`).
- **Example**: `https://soroban-testnet.stellar.org`

### `VITE_STREAM_CONTRACT_ID`
- **Purpose**: The smart contract address of the deployed Fluxora treasury streaming protocol.
- **Required/Optional**: Optional during build, but required at runtime for live on-chain streaming interactions.
- **Format**: A valid Stellar Contract ID consisting of the character `C` followed by exactly 55 uppercase alphanumeric characters (56 characters total).
- **Example**: `CBQQXQSQB4GBB5XDPBFWEXTURY5HDG37TIE7YZ3WHP3DXVZQ2E4UHY4Z`

### `VITE_USE_MOCKS`
- **Purpose**: Enables local client-side mocks for wallet interactions and API services, which is useful for testing without active RPC/Stellar connections.
- **Required/Optional**: Optional. Defaults to `false`.
- **Format**: Boolean-equivalent string: `"true"` or `"1"` resolves to `true`; any other value (or empty/unset) resolves to `false`.
- **Example**: `VITE_USE_MOCKS=true`

---

## Development & Testing Variables

### `VITE_DEMO_MODE`
- **Purpose**: Renders the treasury overview dashboard with static fixture metrics and streams, useful for testing, screenshots, and visual previews.
- **Required/Optional**: Optional. Defaults to `false`.
- **Format**: Boolean-equivalent string: `"true"` or `"1"` resolves to `true`; any other value (or empty/unset) resolves to `false`.
- **Example**: `VITE_DEMO_MODE=false`

---

## Transaction Polling Knobs

These variables define the timing characteristics of the transaction-status confirmation layer.

### `VITE_TX_POLL_INTERVAL_MS`
- **Purpose**: Interval in milliseconds between subsequent transaction-status check requests during transaction confirmation polling.
- **Required/Optional**: Optional. Defaults to `750`.
- **Format**: Positive integer greater than or equal to `1`.
- **Example**: `750`

### `VITE_TX_POLL_MAX_ATTEMPTS`
- **Purpose**: The maximum number of status check attempts before marking a transaction as timed out/failed.
- **Required/Optional**: Optional. Defaults to `6`.
- **Format**: Positive integer greater than or equal to `1`.
- **Example**: `6`

### `VITE_TX_POLL_BACKOFF_FACTOR`
- **Purpose**: Exponential backoff multiplier applied to the poll interval after each status check attempt.
- **Required/Optional**: Optional. Defaults to `1.25`.
- **Format**: Positive floating-point number greater than or equal to `1.0`.
- **Example**: `1.25`

### `VITE_TX_DEMO_CONFIRMATION_ATTEMPTS`
- **Purpose**: Number of simulated poll confirmation check cycles to execute in demo/mock mode before marking a transaction successful.
- **Required/Optional**: Optional. Defaults to `2`.
- **Format**: Positive integer greater than or equal to `1`.
- **Example**: `2`

### `VITE_TX_CONFIRMATION_MAX_RETRIES`
- **Purpose**: Maximum number of poll attempts `waitForTransaction` makes before raising a timeout error. Increase this on Testnet or slow networks where block confirmation can take longer than the default window.
- **Required/Optional**: Optional. Defaults to `15`.
- **Clamping**: Values outside `[1, 300]` are clamped to prevent an unbounded or zero-attempt loop.
- **Format**: Positive integer in the range `[1, 300]`.
- **Maximum total wait**: ≈ `VITE_TX_CONFIRMATION_MAX_RETRIES × VITE_TX_CONFIRMATION_DELAY_MS`
- **Example**: `15` (22.5 s at the default 1 500 ms delay)

### `VITE_TX_CONFIRMATION_DELAY_MS`
- **Purpose**: Milliseconds to wait between each `waitForTransaction` confirmation poll attempt. Increase to reduce RPC traffic on slow networks; decrease to confirm faster in controlled environments.
- **Required/Optional**: Optional. Defaults to `1500`.
- **Clamping**: Values outside `[100, 30000]` are clamped to prevent instant hammering or excessively long pauses.
- **Format**: Positive integer in the range `[100, 30000]`.
- **Maximum total wait**: ≈ `VITE_TX_CONFIRMATION_MAX_RETRIES × VITE_TX_CONFIRMATION_DELAY_MS`
- **Example**: `1500`
