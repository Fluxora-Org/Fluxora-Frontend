# e2e — Playwright Accessibility Tests

Automated axe-core accessibility scans for all primary Fluxora Frontend routes.

## Setup

Dependencies are installed with the rest of the project:

```bash
npm install
npx playwright install chromium
```

## Running the scans

Start the dev server and run the full suite:

```bash
npm run dev &
npx playwright test accessibility
```

Or let the Playwright config start the server automatically:

```bash
npx playwright test
```

## What is scanned

| Route | Label |
|-------|-------|
| `/` | Landing (Home) |
| `/landing` | Landing page |
| `/app` | Dashboard |
| `/app/streams` | Streams |
| `/app/recipient` | Recipient |
| `/connect-wallet` | Connect Wallet |

Each route is scanned against WCAG 2.0/2.1 AA rules. The suite **fails on any serious or critical violation**.

## Triaging failures

1. Run with `--reporter=html` for a visual report:
   ```bash
   npx playwright test --reporter=html
   npx playwright show-report
   ```
2. Each failure message includes the axe rule ID, impact level, and description.
3. Look up the rule at [dequeuniversity.com/rules/axe](https://dequeuniversity.com/rules/axe/).
4. Fix the violation in the component, then re-run.

## Allowlisting known issues

If a violation cannot be fixed immediately, add it to the `ALLOWLISTED_RULES` map in `e2e/axe-helper.ts`:

```ts
export const ALLOWLISTED_RULES: Record<string, string> = {
  "color-contrast": "tracked in #999 – design token update pending",
};
```

> Keep the allowlist small and always reference a tracking issue.

## CI integration

The `webServer` option in `playwright.config.ts` starts `npm run dev` automatically when `CI=true`. Add to your workflow:

```yaml
- name: Run accessibility tests
  run: npx playwright test accessibility
  env:
    CI: true
```
