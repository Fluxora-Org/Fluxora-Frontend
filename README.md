# Fluxora Frontend

[![CI](https://github.com/Fluxora-Org/Fluxora-Frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/Fluxora-Org/Fluxora-Frontend/actions/workflows/ci.yml)

React dashboard and recipient portal for the Fluxora treasury streaming protocol.

## What's in this repo

- **Dashboard** — Treasury overview, active streams, and capital flow summary
- **Streams** — Create and manage USDC streams (rate, duration, cliff)
- **Recipient Portal** — View incoming streams and withdraw accrued balance

The UI is wired for a future backend API and Stellar wallet integration.

## Tech stack

- React 18
- TypeScript
- Vite
- React Router

## Local setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install and run

```bash
npm install
npm run dev
```

Or with pnpm:

```bash
pnpm install
pnpm run dev
```

App runs at [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
npm run build
npm run build:report
npm run preview
```

Or with pnpm:

```bash
pnpm run build
pnpm run build:report
pnpm run preview
```

### Linting and formatting

The repo uses ESLint flat config with TypeScript, React Hooks, and React
Refresh rules. It also enables unsafe dynamic-code checks such as `no-eval` and
`no-new-func`:

```bash
npm run lint
npm run lint:fix
```

Prettier is configured for the React/Vite source tree:

```bash
npm run format
npm run format:check
```

`format` can normalize the full source tree. `format:check` currently guards the
tooling/config baseline so style checks can run without mixing a repository-wide
format-only diff into feature PRs.

### Bundle and code-splitting

The public marketing routes (`/`, `/landing`) and the core app shell stay in the
initial bundle so first paint remains fast. Heavier authenticated app pages are
loaded behind a shared Suspense skeleton only when a user enters `/app`.

The Vite build uses these manual chunks for app pages:

- `app-dashboard` - `/app`
- `app-streams` - `/app/streams` and `/app/streams/:streamId`
- `app-recipient` - `/app/recipient`
- `app-treasury` - `/app/treasurypage`
- `app-empty-state-demo` - `/app/empty-state-demo`

Run `npm run build` and check `dist/assets` to verify those chunks before
shipping a performance-sensitive release.

`npm run build:report` emits a raw/gzip bundle table from `dist/assets` after
the production build. Vite warns when any chunk exceeds 650 kB, and
`vite.config.ts` splits vendor code into `vendor-react`, `vendor-stellar`, and
`vendor-icons` chunks so PR reviewers can spot bundle regressions.

## Project structure

```
src/
  components/   # Layout, shared UI
  pages/        # Dashboard, Streams, Recipient
  App.tsx
  main.tsx
  index.css
```

## Route Error Recovery

The route tree is wrapped in `src/components/ErrorBoundary.tsx`. Render-time
route failures show the sanitized `ErrorPage` fallback with Try Again and Back to
Dashboard recovery actions, while full error details are logged only in dev/test.

## Theming

Light/dark theming is owned by a single `ThemeProvider` (`src/theme/ThemeProvider.tsx`),
which is the **only** place that writes the `data-theme` attribute on `<html>`.

How a theme is chosen, in order:

1. A valid value persisted in `localStorage` under the `theme` key (an explicit
   user choice).
2. Otherwise, the OS preference via `window.matchMedia("(prefers-color-scheme: dark)")`.

Behavior:

- **No flash (FOUC):** `initTheme()` is called once in `src/main.tsx` to apply the
  resolved theme to `<html>` before React renders.
- **Follows the OS:** while the user has not made an explicit choice, the app tracks
  `prefers-color-scheme` changes live. Once the user toggles, their choice wins.
- **Cross-tab sync:** changing the theme in one tab updates all other open tabs via
  the `storage` event.
- **Hardened input:** only `"light"` and `"dark"` are accepted. Any tampered or
  corrupted `localStorage`/`storage` value is ignored, so it can never be written to
  the DOM (`data-theme`).

Consume it anywhere under the provider with the `useTheme()` hook:

```tsx
import { useTheme } from "./theme/ThemeProvider";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>
      Switch to {theme === "light" ? "dark" : "light"} mode
    </button>
  );
}
```

`useTheme()` throws if used outside a `ThemeProvider`. The provider wraps the app in
`src/App.tsx`.

## Contributing / CI

Pull requests and pushes to `main` run the GitHub Actions CI workflow
(`.github/workflows/ci.yml`) on Node 18 and Node 20. The workflow installs with
`npm ci`, runs `npm run build` for TypeScript and production build verification,
and runs the full unit test suite.

### Coverage gate

A dedicated `coverage` CI job runs `npm run test:coverage` and **fails the PR
check** when any threshold is missed. The coverage report is uploaded as a build
artifact for every run so reviewers can inspect which lines are uncovered.

Thresholds enforced (statements / branches / functions / lines): **95%**

The baseline is the `include` list in `vitest.config.ts`. When adding a new
production module that should be covered, append it to that list and add tests
before opening the PR.

## Streams performance

`src/components/VirtualList.tsx` keeps small stream collections simple, then
switches to windowed rendering once a list passes the configured threshold. The
Streams page uses this for card lists so off-screen `StreamCard` subtrees,
disclosures, SVGs, and `ResizeObserver` work stay unmounted while placeholders
preserve scroll height.

Virtualized placeholders only reserve space and do not echo stream data or use
raw HTML.

## Wallet state

`WalletProvider` in `src/components/wallet-connect/Walletcontext.tsx` is the
single supported wallet state source for app UI. Pages, navigation, and wallet
status components should consume `useWallet()` instead of importing
`@stellar/freighter-api` directly.

The provider only marks a session connected after Freighter confirms an
approved address, watches account and network changes, and clears address and
network on disconnect so stale wallet state cannot keep signing actions enabled.

## Wallet modal

`src/components/ConnectWalletModal.tsx` is the canonical wallet connection
modal. Wallet entry points, including `WalletButton`, should route Freighter,
Albedo, and WalletConnect actions through this component so error states and
focus management stay consistent.

`src/components/ConnectWalletModal.example.tsx` is a sample-only review surface
and is not imported by the application routes.

## App route guard

The `/app` route subtree is wrapped in `RequireWallet`, which reads the shared
`useWallet()` context. While Freighter session restore is still loading, the
guard shows a restoring state instead of redirecting. Disconnected users are
sent to `/connect-wallet` with their intended `/app` destination preserved in
router state for return after connection.

This is a client-side UX guard only. Backend services must still enforce
authorization before returning privileged treasury or stream data.

## Environment

Copy `.env.example` to `.env` or `.env.local` when configuring public API or
Stellar metadata:

- `VITE_API_URL` - backend API base URL
- `VITE_NETWORK` - Stellar network (`TESTNET` or `PUBLIC`); unsupported values fail closed to `TESTNET`
- `VITE_RPC_URL` - Soroban RPC server endpoint
- `VITE_STREAM_CONTRACT_ID` - deployed stream contract ID (`C...`)
- `VITE_USE_MOCKS` - `true` or `1` enables mock-data paths

Only expose public client metadata through `VITE_` variables. Do not put API
secrets, signing keys, or wallet credentials in frontend env files.

## Transaction Signing Layer (Stellar / Soroban)

Fluxora integrates with the Stellar ecosystem for on-chain stream management:
- **Freighter Wallet Integration**: Leverages `@stellar/freighter-api` to securely retrieve accounts, request network passphrases, and sign transactions.
- **Soroban Smart Contract Invocations**: Invokes contract entrypoints (`create_stream`, `withdraw`, `pause_stream`, `cancel_stream`) by building operations, simulating resource costs, and submitting signed envelopes.
- **Network Validation**: Verifies that the connected Freighter extension matches `VITE_NETWORK` before building or signing transactions, protecting users from cross-network mistakes.
- **Robust Error Mapping**: Automatically maps user rejections, simulation failures, and timeouts into descriptive toasts and inline alert messages.

## SEO and Social Previews

Search and link-preview metadata lives in `index.html`. Update the description,
canonical URL, Open Graph tags, Twitter Card tags, and absolute HTTPS preview
image there when launching a new campaign or changing the public marketing URL.

- `VITE_DEMO_MODE` - Set to `true` or `1` to render treasury overview fixture data for screenshots and tests. Leave unset for the default live-data path.

## Related repos

- **fluxora-backend** — API and streaming engine
- **fluxora-contracts** — Soroban smart contracts

Each is a separate Git repository.

Contract source and Soroban tests live in `fluxora-contracts`, not this frontend
repository. Protocol security notes in `docs/security.md` are retained here as
context for the UI, but executable contract coverage belongs with the contracts
repo so it runs in the correct toolchain and CI.
