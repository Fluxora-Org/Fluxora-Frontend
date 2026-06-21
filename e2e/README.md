# End-to-End Tests

Run the browser smoke suite with:

```bash
npm run test:e2e
```

The suite starts the Vite dev server from `playwright.config.ts` and covers the
current create-stream wizard plus the recipient withdrawal surface. These tests
use local demo data only; they do not connect to wallets, sign transactions, or
call deploy credentials.

Set `PLAYWRIGHT_BASE_URL` to target an already-running app, or
`PLAYWRIGHT_PORT` to change the managed dev-server port.
