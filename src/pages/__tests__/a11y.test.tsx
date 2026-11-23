/**
 * @file a11y.test.tsx
 * @description Accessibility gate — unit-level axe scans for every primary flow.
 *
 * Issue #1716 – "Add an accessibility gate to CI covering the primary flows"
 *
 * ## Covered flows
 * | Flow               | Route                  |
 * | ------------------ | ---------------------- |
 * | Dashboard          | /app                   |
 * | Connect Wallet     | /connect-wallet        |
 * | Streams            | /app/streams           |
 * | Recipient Portal   | /app/recipient         |
 * | Treasury Overview  | /app/treasurypage      |
 *
 * ## How violations are handled
 * - A test **fails** immediately when axe reports any new serious/critical WCAG
 *   2.1 AA violation not present in the baseline.
 * - Known pre-existing violations are tracked in `a11y-baseline.json` so their
 *   count cannot grow silently.
 *
 * ## Adding a temporary allowlist entry
 * If a new violation must be deferred (pending a design-token fix, etc.):
 *   1. Add the axe rule ID to `DEFERRED_RULES` with a tracking comment.
 *   2. Open a tracking GitHub issue and reference it in the comment.
 *   3. Remove it from `DEFERRED_RULES` once the fix lands.
 */

import { act, render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/matchers";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { AxeResults, Result } from "axe-core";

// --- Extend vitest expect with vitest-axe matchers ---
expect.extend(toHaveNoViolations);

// ---------------------------------------------------------------------------
// Deferred rules — rules that have known violations awaiting a fix.
// ---------------------------------------------------------------------------
/**
 * Rule IDs to skip globally for all scans in this file.
 * Add entries only when a tracking issue exists.
 */
const DEFERRED_RULES: string[] = [
  // "color-contrast", // Example: tracked in #999 – design token update pending
];

// ---------------------------------------------------------------------------
// Axe run options applied to every scan
// ---------------------------------------------------------------------------
function makeAxeOptions(extraDisabled: string[] = []) {
  const disabled = [...DEFERRED_RULES, ...extraDisabled];
  return {
    runOnly: {
      type: "tag" as const,
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },
    ...(disabled.length > 0
      ? {
          rules: Object.fromEntries(
            disabled.map((id) => [id, { enabled: false }]),
          ),
        }
      : {}),
  };
}

/** Filter violations to serious and critical only (mirrors the e2e strategy). */
function seriousCritical(violations: Result[]): Result[] {
  return violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? ""),
  );
}

/** Format a human-readable violation summary for test failure messages. */
function formatViolationMessage(
  flowLabel: string,
  violations: Result[],
): string {
  if (violations.length === 0) return "";
  return (
    `[${flowLabel}] Found ${violations.length} serious/critical axe violation(s):\n` +
    violations
      .map(
        (v) =>
          `  - ${v.id} (${v.impact}): ${v.description}\n` +
          v.nodes
            .slice(0, 3)
            .map((n) => `      node: ${n.html.slice(0, 120)}`)
            .join("\n"),
      )
      .join("\n")
  );
}

// ---------------------------------------------------------------------------
// Module-level mocks (vi.mock calls are hoisted to the top of the file)
// ---------------------------------------------------------------------------

// Wallet context — disconnected by default.
const walletState = vi.hoisted(() => ({
  connected: false,
  address: null as string | null,
  network: null as string | null,
  loading: false,
}));

vi.mock("../../components/wallet-connect/Walletcontext", () => ({
  useWallet: () => ({
    ...walletState,
    error: null,
    expectedNetwork: "TESTNET",
    expectedNetworkLabel: "Testnet",
    isNetworkMismatch: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
  WalletProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Treasury data hooks — return empty datasets.
vi.mock("../../components/treasuryOverviewPage/useTreasury", () => ({
  useTreasury: () => ({
    metrics: [],
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRecipientStreams: () => ({
    streams: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
    retryCount: 0,
  }),
}));

// Treasury overview hook (TreasuryPage-specific).
vi.mock("../../components/treasuryOverviewPage/useTreasuryOverviewData", () => ({
  useTreasuryOverviewData: () => ({
    metrics: [],
    streams: [],
    isDemoMode: false,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Stellar transaction layer — not exercised in a11y unit tests.
vi.mock("../../lib/stellar/tx", () => ({
  withdraw: vi.fn().mockRejectedValue(new Error("Not available in tests")),
  getTransactionStatus: vi.fn().mockResolvedValue({ status: "idle" }),
}));

// Onboarding dismissed flag — suppress the onboarding overlay so the main
// page content is what axe actually scans.
vi.mock("../../lib/onboarding", () => ({
  readOnboardingDismissed: () => true,
  writeOnboardingDismissed: vi.fn(),
  ONBOARDING_DISMISSED_STORAGE_KEY: "fluxora.onboarding.dismissed",
}));

// Environment flag — IS_DEV=false keeps ColorBlindToggle out of the page tree.
vi.mock("../../utils/env", () => ({ IS_DEV: false }));

// StreamTimeline.tsx has a pre-existing TypeScript parse error (malformed
// React.FC generic on line 41). Mock it so the Streams page renders.
vi.mock("../../components/StreamTimeline", () => ({
  default: () => null,
}));

// RecipientStreams.tsx has a pre-existing JSX parse error (line 496).
// Mock it so the Recipient page renders.
vi.mock("../../components/recipient/RecipientStreams", () => ({
  RecipientStreams: () => null,
}));

// CreateStreamModal is lazy-loaded; mock it to avoid pulling in the entire
// Stellar transaction signing chain (including useTransactionStatus which
// calls getTransactionStatus from lib/stellar/tx).
vi.mock("../../components/CreateStreamModal", () => ({
  default: () => null,
}));

// ---------------------------------------------------------------------------
// Import pages (must come after vi.mock declarations)
// ---------------------------------------------------------------------------
import Dashboard from "../Dashboard";
import ConnectWallet from "../ConnectWallet";
import Streams from "../Streams";
import Recipient from "../Recipient";
import TreasuryPage from "../TreasuryPage";
import { ToastProvider } from "../../components/toast/ToastProvider";

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------
function renderWithRouter(
  element: React.ReactElement,
  { initialPath, routePath }: { initialPath: string; routePath: string },
) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path={routePath} element={element} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

// ---------------------------------------------------------------------------
// Primary flow accessibility tests
//
// Each test:
//   1. Renders the page inside a MemoryRouter + ToastProvider.
//   2. Runs axe on document.body.
//   3. Asserts zero serious/critical violations.
// ---------------------------------------------------------------------------

describe("Accessibility gate — primary flows", () => {
  // Ensure a clean DOM and consistent state between each test.
  beforeEach(() => {
    walletState.connected = false;
    walletState.address = null;
    walletState.network = null;
    walletState.loading = false;
  });

  afterEach(() => {
    cleanup();
  });

  // ── Dashboard (/app) ──────────────────────────────────────────────────────
  it("Dashboard (/app): no serious/critical WCAG 2.1 AA violations", async () => {
    renderWithRouter(<Dashboard />, {
      initialPath: "/app",
      routePath: "/app",
    });

    const results: AxeResults = await axe(document.body, makeAxeOptions());
    const violations = seriousCritical(results.violations);

    expect(
      violations,
      formatViolationMessage("Dashboard (/app)", violations),
    ).toHaveLength(0);
  });

  // ── Connect Wallet (/connect-wallet) ──────────────────────────────────────
  it("Connect Wallet (/connect-wallet): no serious/critical WCAG 2.1 AA violations", async () => {
    // Force disconnected so ConnectWallet renders its form instead of redirecting.
    walletState.connected = false;

    renderWithRouter(<ConnectWallet />, {
      initialPath: "/connect-wallet",
      routePath: "/connect-wallet",
    });

    const results: AxeResults = await axe(document.body, makeAxeOptions());
    const violations = seriousCritical(results.violations);

    expect(
      violations,
      formatViolationMessage("Connect Wallet (/connect-wallet)", violations),
    ).toHaveLength(0);
  });

  // ── Streams (/app/streams) ────────────────────────────────────────────────
  it("Streams (/app/streams): no serious/critical WCAG 2.1 AA violations", async () => {
    renderWithRouter(<Streams />, {
      initialPath: "/app/streams",
      routePath: "/app/streams",
    });

    // Let any pending microtasks settle (lazy Suspense, useEffect chains).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const results: AxeResults = await axe(document.body, makeAxeOptions());
    const violations = seriousCritical(results.violations);

    expect(
      violations,
      formatViolationMessage("Streams (/app/streams)", violations),
    ).toHaveLength(0);
  });

  // ── Recipient Portal (/app/recipient) ─────────────────────────────────────
  it("Recipient Portal (/app/recipient): no serious/critical WCAG 2.1 AA violations", async () => {
    vi.useFakeTimers();

    renderWithRouter(<Recipient />, {
      initialPath: "/app/recipient",
      routePath: "/app/recipient",
    });

    // Advance past the minimum loading delay the Recipient component enforces.
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Switch back to real timers BEFORE running axe (axe uses real timeouts internally).
    vi.useRealTimers();

    const results: AxeResults = await axe(document.body, makeAxeOptions());
    const violations = seriousCritical(results.violations);

    expect(
      violations,
      formatViolationMessage("Recipient Portal (/app/recipient)", violations),
    ).toHaveLength(0);
  });

  // ── Treasury Overview (/app/treasurypage) ─────────────────────────────────
  it("Treasury Overview (/app/treasurypage): no serious/critical WCAG 2.1 AA violations", async () => {
    renderWithRouter(<TreasuryPage />, {
      initialPath: "/app/treasurypage",
      routePath: "/app/treasurypage",
    });

    // Exclude the nested-interactive rule from the main scan — it is tracked
    // in a11y-baseline.json (ActivityHeatmap renders <button> inside
    // <div role="img">). The baseline enforcement suite below separately
    // asserts this count cannot grow beyond the recorded maximum.
    const results: AxeResults = await axe(
      document.body,
      makeAxeOptions(["nested-interactive"]),
    );
    const violations = seriousCritical(results.violations);

    expect(
      violations,
      formatViolationMessage(
        "Treasury Overview (/app/treasurypage)",
        violations,
      ),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Baseline mechanism — prevents existing violations from growing silently.
//
// When any flow reports violations that were already present before this PR,
// the count is recorded in a11y-baseline.json. Each test below asserts that
// the CURRENT violation count does not exceed the baseline, so a new violation
// introduced on top of an existing one still fails CI.
//
// To update the baseline after intentionally fixing a violation:
//   1. Run `npm run test:a11y:unit` locally.
//   2. Note the new (lower) count for the affected rule/flow.
//   3. Update a11y-baseline.json to reflect the reduction.
//   4. When count reaches 0, remove the entry from the file entirely.
// ---------------------------------------------------------------------------
import baselineJson from "./a11y-baseline.json";

interface BaselineEntry {
  rule: string;
  flow: string;
  maxCount: number;
}

// Filter out comment/documentation entries (objects without a `rule` field).
const baseline: BaselineEntry[] = (baselineJson as unknown[]).filter(
  (e): e is BaselineEntry =>
    typeof e === "object" &&
    e !== null &&
    "rule" in e &&
    "flow" in e &&
    "maxCount" in e,
);

describe("Accessibility gate — baseline enforcement", () => {
  afterEach(() => {
    cleanup();
  });

  if (baseline.length === 0) {
    it("no baseline entries — all flows are clean", () => {
      // This placeholder test keeps the suite from being empty when no
      // baseline entries exist (which is the desired steady state).
      expect(true).toBe(true);
    });
  }

  for (const entry of baseline) {
    it(`[baseline] '${entry.rule}' on '${entry.flow}' must not exceed ${entry.maxCount} occurrence(s)`, async () => {
      const { container } = getFlowRender(entry.flow);

      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });

      const results: AxeResults = await axe(container, {
        runOnly: {
          type: "tag" as const,
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
        },
        rules: { [entry.rule]: { enabled: true } },
      });

      const matchingViolation = results.violations.find(
        (v) => v.id === entry.rule,
      );
      const currentCount = matchingViolation?.nodes.length ?? 0;

      expect(
        currentCount,
        `[BASELINE EXCEEDED] Rule '${entry.rule}' on '${entry.flow}' has ` +
          `${currentCount} occurrence(s) but the baseline cap is ${entry.maxCount}. ` +
          `A new violation was introduced. Fix it or update the baseline with a lower cap.`,
      ).toBeLessThanOrEqual(entry.maxCount);
    });
  }
});

// ---------------------------------------------------------------------------
// Flow render factory used by baseline tests
// ---------------------------------------------------------------------------
function getFlowRender(flow: string): { container: HTMLElement } {
  walletState.connected = false;
  walletState.loading = false;

  const wrap = (
    element: React.ReactElement,
    path: string,
  ): { container: HTMLElement } => {
    const { container } = render(
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    return { container };
  };

  switch (flow) {
    case "Dashboard (/app)":
      return wrap(<Dashboard />, "/app");
    case "Connect Wallet (/connect-wallet)":
      return wrap(<ConnectWallet />, "/connect-wallet");
    case "Streams (/app/streams)":
      return wrap(<Streams />, "/app/streams");
    case "Recipient Portal (/app/recipient)":
      return wrap(<Recipient />, "/app/recipient");
    case "Treasury Overview (/app/treasurypage)":
      return wrap(<TreasuryPage />, "/app/treasurypage");
    default:
      throw new Error(`Unknown flow: "${flow}" — check a11y-baseline.json`);
  }
}
