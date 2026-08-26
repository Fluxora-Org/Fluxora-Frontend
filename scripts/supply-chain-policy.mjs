/**
 * supply-chain-policy.mjs
 *
 * Shared policy and pure evaluation logic for the two production dependency
 * gates (scripts/vulnerability-audit.mjs and scripts/license-audit.mjs). See
 * docs/supply-chain-policy.md for the full rationale behind these choices.
 *
 * Design decisions (issue: dependency vulnerability and license gates):
 *
 * 1. Severity threshold — "high". Findings rated "high" or "critical" in the
 *    production dependency tree fail the build; "moderate" and "low" are
 *    reported but non-blocking. A frontend with no server-side secrets has a
 *    materially smaller blast radius than a backend service, so gating on
 *    "moderate" would mostly generate noise (this repo's current production
 *    tree already carries 4 moderate findings — see the baseline file) without
 *    a proportional safety benefit.
 *
 * 2. License allowlist — permissive, OSI-approved licenses only. Copyleft
 *    licenses (GPL/AGPL/LGPL/MPL) and unlicensed/unknown packages are
 *    disallowed by default and must be explicitly baselined with a reason.
 *
 * 3. Dev-only packages — excluded entirely from both gates. They never ship
 *    in the production bundle (`npm run build`), so they cannot introduce a
 *    supply-chain risk to end users through this artifact. This mirrors
 *    `npm audit --omit=dev` / `pnpm audit --prod`, the exact commands named
 *    in the issue's Verification section. (A compromised dev-only package
 *    could still threaten the build environment itself — that is a distinct,
 *    CI/build-pipeline-hardening concern out of scope for this issue.)
 *
 * 4. "New" findings only fail the build — a checked-in baseline
 *    (scripts/supply-chain-baseline.json) records currently-known, reviewed
 *    findings with a reason and a `reviewBy` date. A baselined finding does
 *    not fail CI as long as its severity/license hasn't gotten worse and its
 *    review date hasn't passed; once either happens, it is treated as new and
 *    blocks the build again until re-reviewed. This lets us introduce the
 *    gate today without being blocked by pre-existing findings unrelated to
 *    this change (e.g. the axios transitive dependency below), while still
 *    forcing periodic reconsideration rather than a silent permanent pass.
 *
 * 5. Authorization — both gates call only the public npm registry
 *    (`npm audit`) and read the already-committed lockfile; neither requires
 *    new credentials, tokens, or registry configuration.
 */

export const SEVERITY_ORDER = ["info", "low", "moderate", "high", "critical"];

/** Findings at or above this severity fail the build (see rationale above). */
export const VULNERABILITY_SEVERITY_THRESHOLD = "high";

/** Permissive, OSI-approved licenses accepted for production dependencies. */
export const LICENSE_ALLOWLIST = new Set([
  "MIT",
  "ISC",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "0BSD",
  "CC0-1.0",
  "Unlicense",
]);

/**
 * Rank of a severity string; unrecognised severities rank *above* "critical"
 * so an unexpected/malformed value fails closed instead of being ignored.
 */
export function severityRank(severity) {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? SEVERITY_ORDER.length : index;
}

/** True when `severity` is at or above `threshold` on the standard ordering. */
export function meetsOrExceeds(severity, threshold) {
  return severityRank(severity) >= severityRank(threshold);
}

/**
 * Validates a single baseline entry's shape. Throws rather than silently
 * tolerating a malformed entry — an unreviewable baseline entry must not be
 * able to suppress a real finding.
 */
export function assertValidBaselineEntry(key, entry) {
  if (!entry || typeof entry !== "object") {
    throw new Error(`Baseline entry "${key}" must be an object.`);
  }
  if (!entry.reason || typeof entry.reason !== "string") {
    throw new Error(`Baseline entry "${key}" is missing a "reason" string.`);
  }
  if (!entry.reviewBy || Number.isNaN(Date.parse(entry.reviewBy))) {
    throw new Error(
      `Baseline entry "${key}" is missing a valid "reviewBy" date (YYYY-MM-DD).`,
    );
  }
}

/** True once a baseline entry's `reviewBy` date has passed. */
export function isBaselineExpired(entry, now = new Date()) {
  return new Date(entry.reviewBy) < now;
}

/**
 * Splits an SPDX-ish license expression such as "(MIT OR Apache-2.0)" or
 * "MIT AND ISC" into its candidate identifiers. This is intentionally
 * lenient: for either operator, the expression is treated as allowed if *any*
 * candidate identifier is on the allowlist. That is the safe direction for an
 * OR (at least one permissive option exists) and a deliberately permissive
 * simplification for AND (full dual-license clause interaction is out of
 * scope for an automated gate) — documented here rather than silently
 * assumed.
 */
export function licenseCandidates(licenseField) {
  if (!licenseField || typeof licenseField !== "string") return [];
  return licenseField
    .replace(/[()]/g, "")
    .split(/\s+(?:OR|AND)\s+/i)
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

/** True when at least one candidate identifier in `licenseField` is allowed. */
export function licenseIsAllowed(licenseField, allowlist = LICENSE_ALLOWLIST) {
  const candidates = licenseCandidates(licenseField);
  return candidates.some((candidate) => allowlist.has(candidate));
}
