# End-to-End Tests

Run the browser smoke suite with:

```bash
npm run test:e2e
```

This runs the configured Chromium, Firefox, and WebKit projects. For the fast
local path that matches the previous Chromium-only run, use:

```bash
npm run test:e2e:chromium
```

To be explicit when validating all browser engines locally or in CI, use:

```bash
npm run test:e2e:browsers
```

You can also target a single Playwright project directly, for example:

```bash
npm run test:e2e -- --project=webkit
```

The suite starts the Vite dev server from `playwright.config.ts` and covers the
current create-stream wizard plus the recipient withdrawal surface. These tests
use local demo data only; they do not connect to wallets, sign transactions, or
call deploy credentials.

Set `PLAYWRIGHT_BASE_URL` to target an already-running app, or
`PLAYWRIGHT_PORT` to change the managed dev-server port.
