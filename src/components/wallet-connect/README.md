# Wallet Connect Module

This directory contains the wallet connection components, hooks, and deterministic state machine driving Stellar and hardware wallet integrations for Fluxora.

## Key Files
- `useWalletStateMachine.ts`: Deterministic reducer-based finite state machine managing connection screens and lifecycle.
- `useWalletStateMachine.md`: Complete state machine specification, topology, transition matrix, and illegal transition rejection rules.
- `Walletbutton.tsx`: Wallet connection button component.
- `Walletcontext.tsx`: Context provider managing connected wallet address, balance, and network.
- `useFreighterSign.ts`: Freighter signing integration hook.
- `WalletConnectionNotice.tsx`: Notice banner displaying wallet status and notices.
- `__tests__/useWalletStateMachine.test.ts`: Exhaustive test suite covering all legal transitions, illegal transitions, and sequential validation.

For detailed documentation on the wallet state machine, see [useWalletStateMachine.md](./useWalletStateMachine.md).
