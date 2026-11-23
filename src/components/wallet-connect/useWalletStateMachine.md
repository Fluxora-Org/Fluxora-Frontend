# `useWalletStateMachine`

Deterministic reducer for the wallet picker in `ConnectWalletModal`. Every
screen is a named state and every transition is explicit, so impossible UI
combinations (spinner + error, retry while in flight) cannot occur.

## States

| State | Meaning |
| --- | --- |
| `idle` | Wallet list is shown |
| `connecting` | A connect request is in flight (Freighter or Albedo) |
| `not_installed` | Freighter extension is missing |
| `rejected` | The user declined, or closed the Albedo popup |
| `popup_blocked` | The browser blocked the wallet approval popup |
| `network_mismatch` | Wallet is on a different network than Fluxora |
| `network_timeout` | The wallet did not answer the network check / popup in time |
| `device_searching` … `awaiting_device_confirmation` | Hardware-wallet flow |
| `device_locked_error`, `wrong_app_error`, `unplugged_error` | Hardware errors |
| `mobile_unsupported` | Hardware wallet chosen on mobile |
| `connected` | Wallet approved the session |

## Events

`SELECT_FREIGHTER`, `SELECT_ALBEDO`, `SELECT_HARDWARE`,
`SELECT_HARDWARE_MOBILE`, `DEVICE_FOUND`, `DEVICE_CONFIRMED`,
`CONNECTION_SUCCESS`, `ERROR(kind)`, `RETRY`, `BACK`, `RESET`.

`SELECT_FREIGHTER` and `SELECT_ALBEDO` are only accepted from `idle`, and are
dropped while a request is already in flight (`isRequestInFlight`). `BACK`
returns to `idle` from any non-`connected` state; `RESET` always returns to
`idle`.

## Wallet providers

Both wallets drive the same `connecting` state:

- **Freighter** — `SELECT_FREIGHTER`, then `isConnected` / `requestAccess` /
  `getNetwork` through `freighterProvider`.
- **Albedo** — `SELECT_ALBEDO`, then `albedoProvider.connect()`.

Failure mapping for Albedo (`mapAlbedoErrorToState`):

| Adapter error | Machine state |
| --- | --- |
| `popup_blocked` | `popup_blocked` |
| `timeout` | `network_timeout` |
| `not_installed` | `not_installed` |
| `rejected` (incl. popup closed) | `rejected` |

`RETRY` returns any connect error to `connecting`; the modal re-attempts the
wallet that produced the error (`lastAttemptProviderRef`) rather than always
defaulting to Freighter.

## Provider contract

`src/components/wallet-connect/walletProvider.ts` defines the shared
`WalletProvider` interface (`isAvailable`, `connect`, `restore`, `getAddress`,
`getNetwork`, `signTransaction`, `disconnect`) plus the typed
`WalletProviderError` categories. `freighterProvider` and `albedoProvider`
implement it, and `walletProviders.ts` resolves the adapter selected by
`Walletcontext`.

The selected provider id is persisted (`fluxora.wallet.provider`) so a reload
restores the same wallet, and mirrored into the active-provider registry so
`src/lib/stellar/tx.ts` signs Soroban transactions with the connected wallet.
