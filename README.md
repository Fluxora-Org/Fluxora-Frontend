# Fluxora Frontend

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
npm run preview
```

Or with pnpm:

```bash
pnpm run build
pnpm run preview
```

## Project structure

```
src/
  components/   # Layout, shared UI
  pages/        # Dashboard, Streams, Recipient
  App.tsx
  main.tsx
  index.css
```

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

## Environment

Create a `.env` (or `.env.local`) when you add API or Stellar config, for example:

- `VITE_API_URL` — Backend API base URL
- `VITE_NETWORK` — Stellar network (testnet / mainnet)

### Transaction lifecycle

Create-stream submission uses a transaction-status lifecycle:

- `submitting` while the UI hands off the transaction reference
- `pending` while the status source is polled
- `confirmed` before the success receipt opens
- `failed` when the status source fails or polling reaches the attempt cap

The polling hook is configured by these optional client-side timing knobs:

- `VITE_TX_POLL_INTERVAL_MS` — first polling delay in milliseconds
- `VITE_TX_POLL_MAX_ATTEMPTS` — maximum status checks before timeout
- `VITE_TX_POLL_BACKOFF_FACTOR` — multiplier applied after each pending check
- `VITE_TX_DEMO_CONFIRMATION_ATTEMPTS` — demo status source confirmation point

These values only control polling cadence. Confirmation must still come from the
status source, not optimistic client time.

## Related repos

- **fluxora-backend** — API and streaming engine
- **fluxora-contracts** — Soroban smart contracts

Each is a separate Git repository.
