/**
 * zeroAccrualBannerCondition
 * ──────────────────────────────────────────────────────────────────────────
 * Pure utility that decides whether the zero-accrual banner should be shown
 * and, if so, which reason to display.
 *
 * This function mirrors the accrual computation that the contract uses so
 * that the banner condition and the on-chain state are always in sync:
 *
 *   Contract accrual rules (simplified):
 *   • Before cliff  → 0 USDC withdrawable (cliff has not been crossed)
 *   • Mid-schedule  → accrual accumulates between cliff and end date
 *   • Paused        → accrual suspended; withdrawable stays at last amount
 *   • Matured       → stream has ended; nothing further accrues
 *
 * The banner should be shown when:
 *   1. Wallet is connected (there is a user to inform)
 *   2. At least one stream exists (no-streams empty state takes precedence)
 *   3. The total withdrawable balance is exactly 0
 *   4. At least one stream is in "Active" status (a paused-only set is a
 *      separate state covered by reason="paused" when callers want it)
 *
 * Boundary behaviour:
 *   • before-cliff  → shows with reason "cliff" (will accrue later, not broken)
 *   • mid-schedule  → shows only when withdrawable is genuinely zero despite
 *                     active streams (possible when rate=0 or cliff not passed)
 *   • paused        → banner is NOT shown by this function; the caller must
 *                     decide to pass reason="paused" directly to the component
 *                     if they want to inform the user of the pause state
 *   • matured       → no active streams → activeStreams.length === 0 → banner
 *                     is suppressed (condition 4 fails)
 *
 * Issue: #1669
 */

export type ZeroAccrualBannerReason = "cliff" | "rate-zero" | "paused" | "schedule-future";

/**
 * Minimal stream shape required by this utility.
 * Intentionally narrow so it works with both StreamRecord and any future type.
 */
export interface StreamForAccrualCheck {
  status: "Active" | "Paused" | "Completed";
  /** Monthly rate of accrual (contract unit, same type as StreamRecord.monthlyRate) */
  monthlyRate: number;
  /** ISO-8601 date string, present when a cliff is configured */
  cliffDate?: string;
  /** Per-stream withdrawable amount in the contract's unit */
  withdrawableAmount: number;
}

export interface ZeroAccrualBannerState {
  /** Whether the banner should be shown */
  show: boolean;
  /**
   * The reason to pass to ZeroAccrualBanner.
   * Only meaningful when show === true.
   */
  reason: ZeroAccrualBannerReason;
}

/**
 * Derives the banner visibility and reason from the current stream set and
 * the total withdrawable balance.
 *
 * @param streams          Full list of streams for the connected wallet.
 * @param walletConnected  Whether a wallet is connected.
 * @param nowIso           Current time as an ISO-8601 string (injectable for
 *                         testing so tests are deterministic). Defaults to
 *                         `new Date().toISOString()`.
 */
export function shouldShowZeroAccrualBanner(
  streams: StreamForAccrualCheck[],
  walletConnected: boolean,
  nowIso: string = new Date().toISOString(),
): ZeroAccrualBannerState {
  // Condition 1: wallet must be connected.
  if (!walletConnected) {
    return { show: false, reason: "cliff" };
  }

  // Condition 2: at least one stream must exist.
  if (streams.length === 0) {
    return { show: false, reason: "cliff" };
  }

  const activeStreams = streams.filter((s) => s.status === "Active");

  // Condition 4: at least one active stream must exist.
  // Matured streams (Completed) and pure-pause sets are handled by other states.
  if (activeStreams.length === 0) {
    return { show: false, reason: "cliff" };
  }

  // Condition 3: total withdrawable balance must be exactly zero.
  const totalWithdrawable = streams.reduce(
    (sum, s) => sum + s.withdrawableAmount,
    0,
  );
  if (totalWithdrawable > 0) {
    return { show: false, reason: "cliff" };
  }

  // ── Determine the most actionable reason ────────────────────────────────
  //
  // Priority: rate-zero > cliff > (anything else falls through to cliff)
  //
  // "rate-zero" is the most actionable because the admin needs to fix the
  // rate; a cliff is a scheduled delay that will resolve itself.
  const hasZeroRateActive = activeStreams.some((s) => s.monthlyRate === 0);
  if (hasZeroRateActive) {
    return { show: true, reason: "rate-zero" };
  }

  // Check whether ALL active streams are still before their cliff.
  // If so, the banner should explain the cliff — not imply something is broken.
  const now = new Date(nowIso).getTime();
  const allBeforeCliff = activeStreams.every((s) => {
    if (!s.cliffDate) return false;
    const cliff = new Date(s.cliffDate).getTime();
    return now < cliff;
  });

  // At least one active stream has a future cliff and no stream has a zero
  // rate → the balance is 0 because the cliff has not been crossed yet.
  if (allBeforeCliff) {
    return { show: true, reason: "cliff" };
  }

  // Mid-schedule: cliff has passed but balance is still 0 (e.g. recently
  // passed cliff, fractional accrual not yet withdrawable, or very low rate).
  // Show the banner with "cliff" as the closest matching reason.
  return { show: true, reason: "cliff" };
}
