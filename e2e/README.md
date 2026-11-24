# End-to-End Tests (Playwright)

The suite in `e2e/` covers the full user-facing flows (wallet, streams, treasury,
embed and landing), plus accessibility, performance and visual-regression
checks. [`playwright.config.ts`](../playwright.config.ts) starts the Vite dev
server in mock/demo mode unless `PLAYWRIGHT_BASE_URL` points at an existing
app. Tests use local demo data only: no real wallet extension, signing,
deploy credentials or live backend is required.

## Commands

| Command | What it runs |
| --- | --- |
| `npm run test:e2e` | Every spec in `e2e/` on Chromium and Firefox, against the dev server managed by `playwright.config.ts`. |
| `npm run test:e2e:full` | The full browser matrix, including WebKit (`PLAYWRIGHT_WEBKIT=1`). Use on macOS or a WebKit-capable runner. |
| `npm run test:a11y` | The axe accessibility scans (specs matching `accessibility`). |
| `npm run test:performance` | The landing FCP budget against a production build served by `playwright.performance.config.ts` (Chromium only). |

Filter or debug with standard Playwright options, for example:

```bash
npm run test:e2e -- stream-filter-sort --project=chromium
npx playwright test wallet-connect --ui
npx playwright test --reporter=html && npx playwright show-report
```

### Running the full matrix (all browsers)

On macOS or a WebKit-capable runner:

```bash
npm run test:e2e:full
# equivalent to: PLAYWRIGHT_WEBKIT=1 playwright test
```

### CI configuration

The default `test:e2e` script runs Chromium and Firefox. WebKit is opt-in via
`PLAYWRIGHT_WEBKIT=1` because most Linux CI runners do not support WebKit.

To enable WebKit on a macOS CI runner:

```yaml
- name: Run full cross-browser e2e
  run: npm run test:e2e:full
  env:
    CI: true
    PLAYWRIGHT_WEBKIT: "1"
```

## Landing performance budget

The landing route has a production-build median FCP budget of 1,800 ms across
three uncached navigations. Each run uses Chromium at a fixed 1280x720 viewport
with 4x CPU throttling and 40 ms / 1.5 Mbps network emulation. The performance
gate also measures CLS from navigation using the Web Vitals session-window
definition, with a maximum score of 0.1:
Traces and failure screenshots are enabled in the default config; CI retries
each test twice. HTML reports are written locally with `open: "never"`.

## Browsers

| Browser | Project | Default CI | Full matrix |
| --- | --- | --- | --- |
| Chrome (Chromium) | `chromium` | Yes | Yes |
| Firefox | `firefox` | Yes | Yes |
| Safari (WebKit) | `webkit` | No | Yes (`PLAYWRIGHT_WEBKIT=1` or `test:e2e:full`) |

WebKit is opt-in because most Linux CI runners do not support it; locally it is
included unless `CI=true`. Run one project with
`npx playwright test --project=firefox`. Firefox can differ in
`backdrop-filter` rendering, and WebKit in Web Crypto behaviour, but every
flow uses mock wallet state, so no extension or elevated browser permission is
needed.

## Environment variables

| Variable | Default | Effect |
| --- | --- | --- |
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:${PLAYWRIGHT_PORT}` | Test an already-running app; the config then reuses the server at that URL. |
| `PLAYWRIGHT_PORT` | `5173` | Port used by the managed Vite dev server (ignored when `PLAYWRIGHT_BASE_URL` is set). |
| `PLAYWRIGHT_WEBKIT` | unset | When `1`, enables the WebKit project in CI and for `test:e2e:full`. |

The performance config also reads `PLAYWRIGHT_PERFORMANCE_PORT` (default
`4173`) and shares `PLAYWRIGHT_BASE_URL`. Shell `VITE_*` values take
precedence over the mock defaults set by the dev-server config.

## Mock and demo-data conventions

- The managed dev server runs with `VITE_USE_MOCKS=true`, `VITE_DEMO_MODE=true`,
  `VITE_E2E=true`, `VITE_E2E_FORCE_SHARE_FAILURE=true` and
  `VITE_NETWORK=TESTNET`. `VITE_E2E` opens wallet-gated `/app/*` routes without
  a browser extension. RPC URL and stream contract ID use the safe example
  values from `.env.example`.
- Known records come from the seeded dataset in
  `src/data/streamRecords.ts` (for example `STR-001`, “Dev Grant - Alice”).
  Assertions rely on that deterministic data and on user-visible roles,
  labels and text, not component internals.
- Wallet state is injected before navigation (a stubbed `window.freighterApi`
  with a non-real TESTNET address), Soroban/report endpoints are intercepted
  with `page.route()`, and browser storage is seeded for theme, session and
  failure-path checks. Never add real addresses or credentials to fixtures.
- Success and failure paths are both covered: rejected signatures, network
  mismatches, offline submissions, failed chunk loads and share/export errors
  all exercise the visible recovery UI.

## Spec index

### Wallet

| Spec | Covers |
| --- | --- |
| `account-switching.spec.ts` | Account switch syncs across tabs; unusable account notice and reconnect recovery. |
| `failed-transaction-recovery.spec.ts` | Signing rejection on a second creation recovered through Try again. |
| `first-visit-without-wallet.spec.ts` | First visit redirects to the wallet entry point; missing extension gets install guidance. |
| `network-switch.spec.ts` | Network mismatch blocks connecting; reconnect succeeds after switching to TESTNET. |
| `transaction-status-resolution.spec.ts` | Pending transaction resolves on-chain; on-chain failure exposes the retry path. |
| `wallet-connect.spec.ts` | Freighter connect success, rejection, retry and not-installed prompt. |
| `wallet-disconnect-reconnect.spec.ts` | Disconnect redirect with `returnTo`, reconnect restore and navbar states. |
| `wallet-transaction-retry.spec.ts` | Rejected signature retried without leaving a duplicate pending state. |

### Streams

| Spec | Covers |
| --- | --- |
| `create-stream-flow.spec.ts` | Three-step wizard success, signing rejection/retry and recipient validation. |
| `create-stream.spec.ts` | Wizard creates a stream and the success dialog shows a generated ID. |
| `csv-batch-import.spec.ts` | CSV dry-run review; invalid rows block the whole batch. |
| `offline-queue.spec.ts` | Offline submission queues, flushes on reconnect, plus failure/retry/edit recovery. |
| `recipient.spec.ts` | Withdraw panel success, rejected withdrawal and retry. |
| `responsive-address-amount.spec.ts` | Long address and amount review fits 320px and 1280px dialogs. |
| `stream-cancellation.spec.ts` | Pause/Cancel success reporting and disabled state for completed streams. |
| `stream-detail.spec.ts` | Deep link to a known stream with timeline, and unknown-id not-found state. |
| `stream-filter-sort.spec.ts` | Status/search filters, every sort mode, empty state and Clear filters. |
| `stream-top-up.spec.ts` | Valid top-up confirmation and rejection of negative amounts. |
| `voice-actions.spec.ts` | Voice commands, confirmation modals, cancellations, mic errors and navigation. |
| `workspace-sharing.spec.ts` | Slack share after stream creation and retry after a send failure. |

### Treasury

| Spec | Covers |
| --- | --- |
| `treasury-lazy.spec.ts` | Lazy-loaded chunks render Activity/Flow headings and the Export Report modal. |
| `treasury-overview.spec.ts` | Metrics, periods, report export, refresh and upstream failure/retry recovery. |

### Accessibility

| Spec | Covers |
| --- | --- |
| `accessibility-create-stream.spec.ts` | CreateStream modal axe scan, focus trap/restore and keyboard wizard navigation. |
| `accessibility.spec.ts` | Axe scans of primary routes, including guarded routes with a mock wallet. |
| `colorblind-simulation-flow.spec.ts` | All presets, filter reference, keyboard use, spoofed storage, reload reset and canary. |
| `dashboard-keyboard-navigation.spec.ts` | Skip link, navbar/sidebar tab order and skip-link bypass. |
| `reduced-motion.spec.ts` | Reduced-motion connection presentation, rejected access and retry. |
| `stream-timeline-color-independence.spec.ts` | Timeline stays interpretable under grayscale and color-blind filters. |
| `streams-sr-traversal.spec.ts` | ARIA live regions, filter/search announcements and accessible load errors. |
| `touch-targets.spec.ts` | 44x44 touch targets and documented exceptions across routes at 320px. |

The colour-blind simulation checks assert that each preset resolves to a real
`feColorMatrix` definition (the bridge to `contrastUtils.ts`) and include a
canary that turns the chain red if that definition is removed.

### Theme

| Spec | Covers |
| --- | --- |
| `theme-customization.spec.ts` | Light/dark toggle, persistence, system preference, keyboard/mobile use and blocked or invalid storage. |
| `visual-regression.spec.ts` | Full-page light and dark screenshots for landing, dashboard, stream detail, recipient and connect-wallet. |

See [THEME_TEST_QUICK_REFERENCE.md](./THEME_TEST_QUICK_REFERENCE.md) for theme
commands, quick validation steps and troubleshooting.

### Embed

| Spec | Covers |
| --- | --- |
| `embed-widget-display.spec.ts` | Full and compact widget presets and unavailable state for an unknown stream id. |

### Core and platform

| Spec | Covers |
| --- | --- |
| `chunk-load-recovery.spec.ts` | Failed Streams chunk error and in-place Try Again recovery. |
| `fab-obscure.spec.ts` | FAB spacer prevents content being obscured at 320px. |
| `landing-cls.spec.ts` | Landing hero cumulative layout shift stays at or below 0.1. |
| `landing-cta.spec.ts` | Hero CTA (including keyboard activation) navigates to the wallet entry point. |
| `landing-performance.spec.ts` | First contentful paint budget under CPU and network throttling. |
| `not-found.spec.ts` | 404 rendering for unknown routes, home link and no console errors. |
| `responsive-transaction-controls.spec.ts` | Create-stream and treasury report controls fit without horizontal scroll. |
| `session-recovery.spec.ts` | Saved streams search restored or discarded via the reload recovery banner. |
| `small-viewport-operation-flow.spec.ts` | Mobile drawer navigation loop and abandoned connect-wallet dismissal. |

## Accessibility scans

`e2e/axe-helper.ts` scans WCAG 2.0/2.1 A and AA rules and fails on any serious
or critical violation. The route scans cover `/`, `/landing`, `/app`,
`/connect-wallet`, `/app/streams` (mock wallet) and `/app/recipient` (mock
wallet); the modal scan adds a dialog-scoped check with `color-contrast`
deferred.

To triage a failure, re-run with `--reporter=html`, check the axe rule ID and
impact in the failure message, and consult the Deque rule documentation before
fixing the component. If a violation cannot be fixed immediately, add it to
`ALLOWLISTED_RULES` in `e2e/axe-helper.ts` with a tracking issue; keep the
allowlist empty wherever possible.

## Performance budget

The landing route has a 1,800 ms first-contentful-paint budget. The dedicated
run builds the app, serves it with `npm run preview` on port 4173, and measures
Chromium at a fixed 1280x720 viewport with 4x CPU throttling and 40 ms /
1.5 Mbps network emulation:

```bash
npm run test:performance
```

The HTML report is written to `playwright-performance-report/`. To adjust a
budget, first capture repeated measurements on the production preview under
the same emulation settings, investigate and fix regressions rather than
raising the limit to accommodate noise, then update the corresponding constant
or assertion in `landing-performance.spec.ts` or `landing-cls.spec.ts` and
document the rationale here.

### Browser-specific notes

- **Chromium**: Baseline browser; all features expected to work.
- **Firefox**: `backdrop-filter` support and CSS variable behaviour differ
  slightly; ensure wallet modal overlays render correctly.
- **WebKit**: Web Crypto API (`crypto.subtle`) is available but some
  algorithms behave differently. All e2e flows use mock wallet state — no
  real wallet extensions or elevated browser permissions are required.

## Accessibility (axe) scans

Automated axe-core accessibility scans cover all primary Fluxora Frontend routes.

### Setup

Dependencies are installed with the rest of the project:

```bash
npm install
npx playwright install chromium
```

### Running the scans

Start the dev server and run the accessibility suite:

```bash
npm run dev &
npm run test:a11y
```

Or let the Playwright config start the server automatically:

```bash
npx playwright test accessibility
```

### What is scanned

| Route | Label |
|-------|-------|
| `/` | Landing (Home) |
| `/landing` | Landing page |
| `/app` | Dashboard |
| `/app/streams` | Streams |
| `/app/recipient` | Recipient |
| `/connect-wallet` | Connect Wallet |

Each route is scanned against WCAG 2.0/2.1 AA rules. The suite **fails on any serious or critical violation**.

### Triaging failures

1. Run with `--reporter=html` for a visual report:
   ```bash
   npx playwright test --reporter=html
   npx playwright show-report
   ```
2. Each failure message includes the axe rule ID, impact level, and description.
3. Look up the rule at [dequeuniversity.com/rules/axe](https://dequeuniversity.com/rules/axe/).
4. Fix the violation in the component, then re-run.

### Allowlisting known issues

If a violation cannot be fixed immediately, add it to the `ALLOWLISTED_RULES` map in `e2e/axe-helper.ts`:

```ts
export const ALLOWLISTED_RULES: Record<string, string> = {
  "color-contrast": "tracked in #999 – design token update pending",
};
```

> Keep the allowlist small and always reference a tracking issue.

### CI integration

The `webServer` option in `playwright.config.ts` starts `npm run dev` automatically when `CI=true`. Add to your workflow:

```yaml
- name: Run accessibility tests
  run: npm run test:a11y
  env:
    CI: true
```


## Theme Customization Tests

The theme customization flow has dedicated end-to-end coverage in `theme-customization.spec.ts`.

### Running theme tests only

```bash
npm run test:e2e -- theme-customization
```

### What's covered

- Theme toggle (light ↔ dark)
- Persistence across page reloads and navigation
- Keyboard accessibility
- Mobile menu variant
- System preference detection
- localStorage failure graceful degradation
- Invalid theme value rejection (security)

### Quick validation

See `THEME_TEST_QUICK_REFERENCE.md` for common commands and validation steps.

Full validation guide: `../docs/archive/THEME_E2E_TEST_VALIDATION.md`

## Colour-blind simulation flow

The colour-blind simulation preview on the treasury overview has dedicated
end-to-end coverage in `colorblind-simulation-flow.spec.ts`.
## Visual-regression snapshots

`e2e/visual-regression.spec.ts-snapshots` currently contains only `*-win32.png`
baselines: five flows in light and dark themes for Chromium, Firefox and
WebKit. Playwright appends a platform suffix to snapshot names, so runs on
Linux or macOS look for `-linux` / `-darwin` files and will not match the
committed Windows baselines. When a visual change is intentional, review the
affected flow first, then regenerate and inspect the baselines:

```bash
# From the repo root, on the platform whose baselines you are updating
npx playwright test e2e/visual-regression.spec.ts --update-snapshots
# For one engine only
npx playwright test e2e/visual-regression.spec.ts --project=chromium --update-snapshots
```

Commit only the PNGs you intended to change. Running the update on Linux or
macOS creates new platform-specific files rather than replacing the win32
baselines; add those only if you want to maintain baselines for that platform.
Verify the result with `npm run test:e2e -- visual-regression`.
