# Browser storage security policy

`localStorage` and `sessionStorage` are readable by JavaScript executing on the
Fluxora origin. They are not secret stores.

Persist only non-sensitive preferences and presentation state in browser
storage. Do not persist wallet keys, PINs, credentials, OAuth tokens, signed
payloads, transaction parameters, recipient drafts, or account session
snapshots. Session and stream recovery data remain in memory and are discarded
when the page closes. Disconnect clears `sessionStorage` and known account or
session records from `localStorage`, while retaining the preference allowlist
asserted by `browserStorageSecurity.test.ts`.

When adding a browser storage key, add it to the test allowlist only if its
value is a non-sensitive preference or view state. Keep credentials and
transaction/session material in memory or an appropriately protected backend.
