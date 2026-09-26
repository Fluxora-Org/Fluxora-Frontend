/**
 * Tests for shouldShowZeroAccrualBanner — issue #1669
 *
 * Validates each acceptance criterion at the four boundary states
 * defined in the issue:
 *   • before-cliff  (cliff date has not been crossed yet)
 *   • mid-schedule  (cliff has passed, accrual has started, but balance = 0)
 *   • paused        (no active streams — banner must NOT show)
 *   • matured       (stream completed — banner must NOT show)
 *
 * And additional edge cases:
 *   • rate-zero     (active stream with monthlyRate=0)
 *   • wallet disconnected
 *   • no streams
 *   • non-zero withdrawable
 */
import { describe, it, expect } from "vitest";
import {
  shouldShowZeroAccrualBanner,
  type StreamForAccrualCheck,
} from "../zeroAccrualBannerCondition";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = "2025-06-15T12:00:00.000Z";

/** Active stream whose cliff is in the future (before-cliff boundary) */
const activeBeforeCliff: StreamForAccrualCheck = {
  status: "Active",
  monthlyRate: 1000,
  cliffDate: "2025-12-31", // cliff has NOT passed relative to NOW
  withdrawableAmount: 0,
};

/** Active stream whose cliff has already passed (mid-schedule boundary) */
const activePastCliff: StreamForAccrualCheck = {
  status: "Active",
  monthlyRate: 500,
  cliffDate: "2025-01-01", // cliff passed before NOW
  withdrawableAmount: 0,
};

/** Active stream with a zero rate */
const activeZeroRate: StreamForAccrualCheck = {
  status: "Active",
  monthlyRate: 0,
  cliffDate: "2025-01-01",
  withdrawableAmount: 0,
};

/** Active stream with a positive withdrawable balance */
const activeWithBalance: StreamForAccrualCheck = {
  status: "Active",
  monthlyRate: 800,
  cliffDate: "2025-01-01",
  withdrawableAmount: 250,
};

/** Paused stream (not Active) */
const pausedStream: StreamForAccrualCheck = {
  status: "Paused",
  monthlyRate: 1000,
  withdrawableAmount: 0,
};

/** Completed / matured stream */
const completedStream: StreamForAccrualCheck = {
  status: "Completed",
  monthlyRate: 1000,
  withdrawableAmount: 0,
};

// ── Wallet disconnected ───────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — wallet disconnected", () => {
  it("returns show=false when wallet is not connected", () => {
    const result = shouldShowZeroAccrualBanner(
      [activeBeforeCliff],
      false,
      NOW,
    );
    expect(result.show).toBe(false);
  });
});

// ── No streams ────────────────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — no streams", () => {
  it("returns show=false when stream list is empty", () => {
    const result = shouldShowZeroAccrualBanner([], true, NOW);
    expect(result.show).toBe(false);
  });
});

// ── Before-cliff boundary ─────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — before-cliff boundary", () => {
  it("shows banner with reason=cliff when all active streams are before their cliff", () => {
    // The cliff has not been crossed; nothing is withdrawable yet. This is
    // expected behaviour and should be communicated to the user.
    const result = shouldShowZeroAccrualBanner(
      [activeBeforeCliff],
      true,
      NOW,
    );
    expect(result.show).toBe(true);
    expect(result.reason).toBe("cliff");
  });

  it("does NOT show banner before cliff when balance > 0 (cliff already passed for another stream)", () => {
    // Mix: one stream before cliff (balance=0), one with a balance.
    const result = shouldShowZeroAccrualBanner(
      [activeBeforeCliff, activeWithBalance],
      true,
      NOW,
    );
    // Total withdrawable > 0, so banner is suppressed.
    expect(result.show).toBe(false);
  });

  it("shows cliff reason when multiple active streams are all before their cliff", () => {
    const secondBeforeCliff: StreamForAccrualCheck = {
      status: "Active",
      monthlyRate: 200,
      cliffDate: "2025-09-01",
      withdrawableAmount: 0,
    };
    const result = shouldShowZeroAccrualBanner(
      [activeBeforeCliff, secondBeforeCliff],
      true,
      NOW,
    );
    expect(result.show).toBe(true);
    expect(result.reason).toBe("cliff");
  });
});

// ── Mid-schedule boundary ─────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — mid-schedule boundary", () => {
  it("shows banner when cliff has passed but withdrawable is still 0", () => {
    // The cliff crossed but nothing has accrued to the withdrawable balance
    // yet (e.g. very recent cliff crossing, fractional accrual not released).
    const result = shouldShowZeroAccrualBanner(
      [activePastCliff],
      true,
      NOW,
    );
    expect(result.show).toBe(true);
  });

  it("does not show banner mid-schedule when withdrawable > 0", () => {
    const result = shouldShowZeroAccrualBanner(
      [{ ...activePastCliff, withdrawableAmount: 100 }],
      true,
      NOW,
    );
    expect(result.show).toBe(false);
  });

  it("does not show banner when some streams have balance even if others have zero", () => {
    const result = shouldShowZeroAccrualBanner(
      [activePastCliff, activeWithBalance],
      true,
      NOW,
    );
    expect(result.show).toBe(false);
  });
});

// ── Paused boundary ───────────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — paused state", () => {
  it("does NOT show banner when only paused streams exist (no Active streams)", () => {
    // Paused streams are not Active, so condition 4 (active streams > 0) fails.
    // The caller should use reason="paused" directly if they need to inform
    // the user about the pause state.
    const result = shouldShowZeroAccrualBanner(
      [pausedStream],
      true,
      NOW,
    );
    expect(result.show).toBe(false);
  });

  it("still shows banner when mix of paused and active streams exists with zero balance", () => {
    // One paused stream + one active before-cliff. Total withdrawable = 0.
    // Active stream count > 0 → banner should show.
    const result = shouldShowZeroAccrualBanner(
      [pausedStream, activeBeforeCliff],
      true,
      NOW,
    );
    expect(result.show).toBe(true);
  });

  it("does NOT show banner when paused + completed (no active streams)", () => {
    const result = shouldShowZeroAccrualBanner(
      [pausedStream, completedStream],
      true,
      NOW,
    );
    expect(result.show).toBe(false);
  });
});

// ── Matured boundary ──────────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — matured / completed state", () => {
  it("does NOT show banner when all streams are Completed (matured)", () => {
    // A completed stream has no further accrual. The zero-accrual banner is
    // not the right UX here; the caller should show a completion state instead.
    const result = shouldShowZeroAccrualBanner(
      [completedStream],
      true,
      NOW,
    );
    expect(result.show).toBe(false);
  });

  it("does NOT show banner for a mix of completed and paused streams", () => {
    const result = shouldShowZeroAccrualBanner(
      [completedStream, pausedStream],
      true,
      NOW,
    );
    expect(result.show).toBe(false);
  });
});

// ── rate-zero boundary ────────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — rate-zero", () => {
  it("shows banner with reason=rate-zero when active stream has monthlyRate=0", () => {
    const result = shouldShowZeroAccrualBanner(
      [activeZeroRate],
      true,
      NOW,
    );
    expect(result.show).toBe(true);
    expect(result.reason).toBe("rate-zero");
  });

  it("prefers rate-zero reason over cliff when both conditions are present", () => {
    // One stream has zero rate, another is before its cliff.
    // rate-zero is more actionable and takes priority.
    const result = shouldShowZeroAccrualBanner(
      [activeZeroRate, activeBeforeCliff],
      true,
      NOW,
    );
    expect(result.show).toBe(true);
    expect(result.reason).toBe("rate-zero");
  });
});

// ── Non-zero withdrawable ─────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — non-zero withdrawable balance", () => {
  it("does NOT show banner when total withdrawable > 0", () => {
    const result = shouldShowZeroAccrualBanner(
      [activeWithBalance],
      true,
      NOW,
    );
    expect(result.show).toBe(false);
  });

  it("does NOT show banner even when only one stream among many has a balance", () => {
    const result = shouldShowZeroAccrualBanner(
      [activeBeforeCliff, activeZeroRate, activeWithBalance],
      true,
      NOW,
    );
    // Total withdrawable = 250 > 0
    expect(result.show).toBe(false);
  });
});

// ── No-cliff streams ──────────────────────────────────────────────────────────

describe("shouldShowZeroAccrualBanner — streams without a cliff", () => {
  it("shows banner for active stream with no cliff and zero balance", () => {
    const noCliff: StreamForAccrualCheck = {
      status: "Active",
      monthlyRate: 1000,
      // no cliffDate
      withdrawableAmount: 0,
    };
    const result = shouldShowZeroAccrualBanner([noCliff], true, NOW);
    expect(result.show).toBe(true);
  });
});
