# End-to-End Tests

Run the browser smoke suite with:

```bash
npm run test:e2e
```

The suite starts the Vite dev server from `playwright.config.ts` and covers:
- Create stream wizard
- Recipient withdrawal surface
- Theme customization flow
- Wallet connection/disconnection
- Landing page CTAs
- Stream detail views

These tests use local demo data only; they do not connect to wallets, sign transactions, or
The suite starts the Vite dev server from `playwright.config.ts` and covers the
current create-stream wizard, the recipient withdrawal surface, and the embedded stream widget display flow. These tests
use local demo data only; they do not connect to wallets, sign transactions, or
call deploy credentials.

Set `PLAYWRIGHT_BASE_URL` to target an already-running app, or
`PLAYWRIGHT_PORT` to change the managed dev-server port.

## Cross-Browser Matrix

Fluxora Frontend e2e tests run across multiple browser engines to catch
CSS and Web Crypto API differences that Chromium-only CI may miss.

| Browser | Engine | Default CI | Full Matrix |
|---------|--------|------------|-------------|
| Chrome  | Chromium | Yes | Yes |
| Firefox | Gecko    | Yes | Yes |
| Safari  | WebKit   | No (macOS only) | Yes (set `PLAYWRIGHT_WEBKIT=1`) |

### Running individual projects

```bash
# Chromium only
npx playwright test --project=chromium

# Firefox only
npx playwright test --project=firefox

# WebKit only (requires macOS or PLAYWRIGHT_WEBKIT=1)
npx playwright test --project=webkit
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

The landing route has a production-build FCP budget of 1,800 ms. The dedicated
check uses Chromium at a fixed 1280x720 viewport with 4x CPU throttling and
40 ms / 1.5 Mbps network emulation, so measurements remain comparable across
releases and fail CI when the budget is exceeded:

```bash
npm run test:performance
```

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

Full validation guide: `../THEME_E2E_TEST_VALIDATION.md`

## Colour-blind simulation flow

The colour-blind simulation preview on the treasury overview has dedicated
end-to-end coverage in `colorblind-simulation-flow.spec.ts`.

### Running the flow only

```bash
npm run test:e2e -- colorblind-simulation-flow
```

### What's covered

- All three presets (protanopia, deuteranopia, tritanopia): select on the
  treasury overview, verify the preview, then disable it from the banner.
- The active preset's filter reference resolves to a real `feColorMatrix`
  definition (the bridge to `contrastUtils.ts`), so a dropped filter definition
  fails the suite instead of silently previewing unfiltered colours.
- Keyboard-only preset selection.
- Failure paths: spoofed/leftover browser storage cannot enable the preview, and
  a reload returns to `Off` without persisting anything.
- A canary test that removes the SVG filter definitions and asserts the flow
  assertion goes red, so the success path cannot pass vacuously.
