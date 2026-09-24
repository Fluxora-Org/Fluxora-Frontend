# Supply-chain policy: vulnerability and license gates

CI (`.github/workflows/ci.yml`, job `supply-chain-audit`) enforces an
auditable policy over the **production** dependency tree — the packages that
actually ship in the built bundle (`npm run build`). This document records
the policy and the reasoning behind it; the enforcement logic lives in
`scripts/vulnerability-audit.mjs`, `scripts/license-audit.mjs`, and the shared
`scripts/supply-chain-policy.mjs`.

## Running locally

```bash
npm run audit:vulnerabilities   # npm audit --omit=dev, gated by severity + baseline
npm run audit:licenses          # license allowlist check, gated by baseline
npm run audit:supply-chain      # both, in sequence — what CI runs
```

Equivalent manual verification (as named in the originating issue):

```bash
pnpm audit --prod   # cross-check against the pnpm lockfile
npm run build       # confirm the change doesn't affect the production bundle
```

## Design decisions

### 1. Severity threshold: `high`

Findings rated **high** or **critical** in the production dependency tree
fail the build. **Moderate** and **low** findings are reported in the CI log
but do not block merges.

This app is a client-rendered SPA with no server-side secrets (see
[`CONTRIBUTING.md`](../CONTRIBUTING.md#security-notes) — all `VITE_*` values
are public by construction). Its blast radius from a dependency
vulnerability is materially smaller than a backend service's. Gating on
`moderate` would currently block on 4 pre-existing, already-triaged findings
(see the baseline below) without a proportional safety benefit; gating on
`high`/`critical` catches the findings worth stopping a merge for.

### 2. License allowlist: permissive, OSI-approved licenses only

```
MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, Unlicense
```

Every current production dependency license (`MIT`, `ISC`, `Apache-2.0`,
`BSD-3-Clause`) is on this list, so the gate starts clean. Copyleft licenses
(GPL/AGPL/LGPL/MPL family) and packages with a missing/unrecognised license
field are disallowed by default — an unknown license is treated as a policy
violation to investigate, not silently accepted.

A compound SPDX expression such as `(MIT OR Apache-2.0)` is treated as
allowed if **any** candidate identifier is on the allowlist. This is
deliberately lenient (see the code comment on `licenseCandidates` in
`scripts/supply-chain-policy.mjs`) and applies the same way to an `AND`
expression — full dual-license clause interaction is out of scope for an
automated gate.

### 3. Dev-only packages: excluded entirely

Both gates operate on the same production-only scope as
`npm audit --omit=dev` / `pnpm audit --prod` — the exact commands named in
the issue's Verification section. A dev-only package (`"dev": true` in
`package-lock.json`) never ships in the built bundle, so it cannot introduce
a supply-chain risk to end users through that artifact.

This does **not** cover the build environment itself — a compromised
dev-only package could still threaten a CI runner or a contributor's machine
at install/build time. That is a distinct, real concern, but a different one
(build-pipeline hardening, e.g. lockfile integrity checks or `npm ci
--ignore-scripts`), and is out of scope for this issue.

### 4. Only *new* findings fail the build — the baseline

`scripts/supply-chain-baseline.json` is a checked-in record of
currently-known findings that have already been reviewed:

```json
{
  "vulnerabilities": {
    "axios": {
      "severity": "high",
      "reason": "Transitive dependency of @stellar/stellar-sdk...",
      "reviewBy": "2026-11-30"
    }
  },
  "licenses": {}
}
```

A finding fails the build only when it is **both**:

- **disallowed** — severity at/above the threshold, or a license not on the
  allowlist, and
- **new** — not covered by a baseline entry whose recorded severity/coverage
  is at least as strict as the current finding, and whose `reviewBy` date has
  not passed.

This lets the gate go live today without being blocked by the 5 vulnerability
findings already present in this dependency tree (none introduced by this
change — see below), while still forcing periodic reconsideration: once a
`reviewBy` date passes, or a finding's severity regresses beyond what was
reviewed, it is treated as new and blocks the build again.

**Adding or renewing a baseline entry** requires a `reason` (why it's
acceptable for now) and a `reviewBy` date (an explicit forcing function to
revisit it) — both are validated and the script throws on a malformed entry
rather than silently accepting it.

**Temporary license exemption** (for a one-off, e.g. investigating a new
dependency before deciding): `node scripts/license-audit.mjs --allow
<package-name>`, mirroring the `--allow <chunkName>` pattern already used by
`scripts/bundle-size-report.mjs`.

### 5. Authorization

Both gates call only the public npm registry (`npm audit`) and read the
already-committed lockfile. Neither requires new credentials, tokens, or
registry configuration — no CI secrets were added or changed by this issue.

### 6. Retry and failure behaviour

`npm audit --omit=dev --json` can fail transiently (registry hiccup, network
blip). `vulnerability-audit.mjs` retries up to `SUPPLY_CHAIN_AUDIT_RETRIES`
times (default 2, i.e. 3 attempts total) with a linear backoff
(`SUPPLY_CHAIN_AUDIT_RETRY_DELAY_MS`, default 1000ms). If every attempt fails
to produce a parseable report, the script **fails closed** — exits 1 with a
clear message — rather than treating an unverifiable audit as a pass.

## Current baseline (as of this change)

Running `npm audit --omit=dev --json` against this repo's lockfile today
reports 5 findings in the production tree, none introduced by this change:

| Package | Severity | Why it's baselined |
|---|---|---|
| `axios` | high | Transitive dep of `@stellar/stellar-sdk`; fix requires a stellar-sdk major bump |
| `@remix-run/router` | moderate | Transitive dep of `react-router-dom`; open-redirect advisory |
| `@stellar/stellar-sdk` | moderate | Inherited entirely from its `axios` dependency |
| `react-router` | moderate | Open-redirect/SSR-hydration advisories; this app is client-rendered only |
| `react-router-dom` | moderate | Open-redirect advisory, same family as `react-router` |

Only `axios` (high) is actually evaluated against the `high` severity
threshold today; the four `moderate` findings are recorded for visibility and
in case the threshold is ever lowered, but don't need baseline coverage to
pass under the current policy.

License audit: 75 production packages checked, 0 violations, 0 baseline
entries needed — every current production license is already on the
allowlist.

## Known limitation: manifest-declared scope, not built-bundle truth

Both gates classify "production" the same way `npm audit --omit=dev` /
`pnpm audit --prod` do: by which `package.json` list (and its lockfile
closure) a package is declared under, not by analysing what `vite build`
actually tree-shakes into `dist/`. This is the same approximation the
tooling named in the issue's Verification section uses, and matching it
keeps `npm run audit:supply-chain` and `pnpm audit --prod` in agreement in
the common case. A package that's genuinely unused at runtime but still
listed in `dependencies` (or vice versa) would be mis-scoped by this
approximation; closing that gap would mean correlating the audit against the
built output, which is a larger effort than this issue covers.

**A concrete instance of this exists in the current `package.json`:**
`@tailwindcss/vite` is listed in *both* `dependencies` and `devDependencies`,
and `@testing-library/dom` is listed only in `dependencies` despite being a
test-only utility. This is why `pnpm audit --prod` currently reports 20
findings against this repo while `npm audit --omit=dev` reports 5: pnpm's
resolver treats a package present in `dependencies` as production even when
it's duplicated in `devDependencies`, while npm's lockfile marks
`@tailwindcss/vite` `dev: true` (excluding it, and its `vite`/`esbuild`/
`postcss` chain, from `--omit=dev`). Since CI installs via `npm ci`
(`package-lock.json`), these gates are built on npm's classification, which
is also what this repo's own `pnpm audit --prod` verification command should
be read against with that discrepancy in mind.

Fixing the `package.json` classification itself is out of this issue's
scope (it's a dependency-churn/unrelated-refactor change per the issue's own
"Out of scope" section) — flagged here for maintainers as a worthwhile
follow-up, not silently patched.
