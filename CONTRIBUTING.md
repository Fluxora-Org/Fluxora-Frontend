# Contributing to Fluxora Frontend

Thanks for contributing to Fluxora. This guide covers everything you need to go from zero to a mergeable PR: local setup, branch naming, commit conventions, and the full test/coverage workflow.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Environment Variables](#environment-variables)
4. [Branch Naming](#branch-naming)
5. [Commit Conventions](#commit-conventions)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Lint and Format](#lint-and-format)
9. [Design Specs and Docs](#design-specs-and-docs)
10. [Pull Request Expectations](#pull-request-expectations)
11. [Security Notes](#security-notes)

---

## Prerequisites

- **Node.js** 18 or later
- **npm** (bundled with Node) or **pnpm**
- **Git**

For end-to-end tests you also need Playwright browsers installed (see [E2E Tests](#e2e-tests)).

---

## Local Setup

```bash
# 1. Clone and enter the repo
git clone https://github.com/Fluxora-Org/Fluxora-Frontend.git
cd Fluxora-Frontend

# 2. Install dependencies
npm install
# or: pnpm install

# 3. Copy the environment file
cp .env.example .env

# 4. Start the dev server
npm run dev
# or: pnpm run dev
```

The app runs at [http://localhost:5173](http://localhost:5173).

---

## Environment Variables

All runtime config lives in `.env` (gitignored). Copy `.env.example` as shown above, then set the values you need.

| Variable | Required at runtime | Purpose |
|---|---|---|
| `VITE_API_URL` | For live API calls | Backend base URL |
| `VITE_NETWORK` | For wallet validation | `TESTNET` (default) or `PUBLIC` |
| `VITE_RPC_URL` | For on-chain transactions | Soroban RPC endpoint |
| `VITE_STREAM_CONTRACT_ID` | For on-chain streaming | Deployed contract address (`C…`) |
| `VITE_USE_MOCKS` | No | `true` enables mock data paths |
| `VITE_DEMO_MODE` | No | `true` renders static fixture data |
| `VITE_TX_POLL_INTERVAL_MS` | No | Transaction polling interval (ms, default `750`) |
| `VITE_TX_POLL_MAX_ATTEMPTS` | No | Max polling attempts (default `6`) |
| `VITE_TX_POLL_BACKOFF_FACTOR` | No | Exponential backoff multiplier (default `1.25`) |
| `VITE_TX_DEMO_CONFIRMATION_ATTEMPTS` | No | Mock confirmation cycles (default `2`) |

For full documentation of each variable, see [docs/environment.md](docs/environment.md).

> **Tip for local development:** Set `VITE_USE_MOCKS=true` in your `.env` to run the full UI without a live backend or wallet.

---

## Branch Naming

Use this pattern:

```
<type>/<short-kebab-description>
```

Common types mirror the commit types below:

| Type | When to use |
|---|---|
| `feat` | New feature or UI component |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructure with no behaviour change |
| `test` | Adding or updating tests |
| `chore` | Tooling, deps, config changes |
| `ci` | CI/CD workflow changes |

Examples:

```
feat/stream-cancel-button
fix/wallet-disconnect-race
docs/contributing-guide
test/metric-card-coverage
```

---

## Commit Conventions

This repo follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<optional scope>): <short summary>

<optional body — what and why, not how>

<optional footer — e.g. Closes #123>
```

Rules:

- Use the imperative mood in the summary: "add X", not "added X".
- Keep the summary line under 72 characters.
- Reference the relevant GitHub issue in the footer when applicable: `Closes #390`.
- Do not mix unrelated changes in a single commit.

Examples:

```
feat(streams): add cancel stream confirmation modal

Closes #201
```

```
fix(wallet): clear stale address on Freighter disconnect

Prevents the app shell from showing a connected state after
the extension removes the session.

Closes #312
```

```
docs: add contributing guide

Covers setup, branch naming, commit conventions, and the
test/coverage workflow for new contributors.

Closes #390
```

---

## Development Workflow

```bash
# Run the dev server
npm run dev

# Production build (type-check + bundle)
npm run build

# Preview the production build locally
npm run preview

# Bundle size report (runs build first)
npm run build:report
```

---

## Testing

### Unit Tests

Vitest runs all `*.test.tsx` / `*.test.ts` files under `src/`, excluding `e2e/`.

```bash
# Single run (used in CI)
npm run test

# Watch mode (local development)
npm run test:watch
```

### Coverage

The CI `coverage` job enforces **95% thresholds** across statements, branches, functions, and lines. Run this locally before opening a PR:

```bash
npm run test:coverage
```

The report is written to `coverage/` (HTML) and printed to the terminal. If your branch adds a new production module, append it to the `include` list in `vitest.config.ts` and add tests to cover it — otherwise the coverage job will fail.

### E2E Tests

Playwright drives the browser-level tests in `e2e/`. Install browsers once:

```bash
npx playwright install --with-deps
```

Then run:

```bash
# Full e2e suite (starts the dev server automatically)
npm run test:e2e

# Accessibility-only suite
npm run test:a11y
```

Playwright auto-starts `npm run dev` on port 5173 before the suite and tears it down after. Set `PLAYWRIGHT_BASE_URL` to point at a different server if needed.

---

## Lint and Format

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors where possible
npm run lint:fix

# Format source files
npm run format

# Check formatting without writing
npm run format:check
```

The repo uses ESLint flat config with TypeScript, React Hooks, and React Refresh rules. Prettier handles formatting for `src/**/*.{ts,tsx,css}` and top-level config files.

Both `lint` and `format:check` run in CI. Fix all warnings before pushing — the build fails on lint errors.

---

## Design Specs and Docs

Several design and accessibility specs live at the repo root and in `docs/`. Refer to them when working on UI components:

| File | Topic |
|---|---|
| [DESIGN_SPEC.md](DESIGN_SPEC.md) | Visual design system |
| [DESIGN_TOKENS_QUICK_REFERENCE.md](DESIGN_TOKENS_QUICK_REFERENCE.md) | Token reference |
| [DARK_THEME_SPEC.md](DARK_THEME_SPEC.md) | Dark mode behaviour |
| [FOCUS_RING_SPEC.md](FOCUS_RING_SPEC.md) | Focus ring standards |
| [WALLET_FLOWS_DESIGN_SPEC.md](WALLET_FLOWS_DESIGN_SPEC.md) | Wallet UX flows |
| [STREAM_CARD_INTERACTION_SPEC.md](STREAM_CARD_INTERACTION_SPEC.md) | Stream card interactions |
| [EMPTY_STATES_DESIGN_SPEC.md](EMPTY_STATES_DESIGN_SPEC.md) | Empty state patterns |
| [LOADING_SKELETON_DESIGN_SPEC.md](LOADING_SKELETON_DESIGN_SPEC.md) | Loading skeleton patterns |
| [MODAL_FOCUS_MANAGEMENT_DESIGN_SPEC.md](MODAL_FOCUS_MANAGEMENT_DESIGN_SPEC.md) | Modal focus management |
| [docs/environment.md](docs/environment.md) | All `VITE_*` variables |
| [docs/security.md](docs/security.md) | Contract security model |
| [docs/soroban-contract-abi.md](docs/soroban-contract-abi.md) | Contract ABI reference |

---

## Pull Request Expectations

- Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md) completely.
- Every PR must pass the full CI matrix before merge:
  - `npm run build` — TypeScript type check + production bundle
  - `npm run test` — all unit tests green
  - `npm run test:coverage` — all coverage thresholds ≥ 95%
  - `npm run lint` — no lint errors
- Link the related issue in the PR description and in the commit footer (`Closes #<number>`).
- Keep PRs focused. One concern per PR makes review faster.
- Add or update tests for every behaviour change. See [Coverage](#coverage).

---

## Security Notes

- **`VITE_*` variables are public.** Vite statically inlines them into the client bundle at build time. Anyone can read them by inspecting the page source or network traffic. Never put secrets, private keys, seed phrases, wallet credentials, or sensitive API tokens in `.env` or `.env.local`.
- Private secrets belong on the backend (`fluxora-backend`). The frontend only holds public metadata: RPC endpoints, contract IDs, network identifiers, and feature flags.
- Address inputs are sanitized through `sanitizeStellarAddress` before reaching explorer links, the clipboard, or query strings.
- The `/app` route subtree is protected by `RequireWallet`. This is a **client-side UX guard only** — backend services must still enforce authorization independently.

For the full contract security model see [docs/security.md](docs/security.md).
