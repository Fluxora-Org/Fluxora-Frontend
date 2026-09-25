import { Skeleton, SkeletonCard } from "./Skeleton";

/**
 * Wallet stage displayed to the user.
 *
 * - `restoring`: The provider is silently restoring a prior wallet session.
 * - `loading-data`: The wallet is connected but Suspense resources (page
 *   skeleton, data hooks) are still resolving.
 * - `rejected`: The wallet connection was declined by the user.
 * - `network-mismatch`: The wallet is connected to the wrong Stellar network.
 * - `no-wallet`: No Stellar wallet extension is installed in this browser.
 */
export type WalletStage =
  | "restoring"
  | "loading-data"
  | "rejected"
  | "network-mismatch"
  | "no-wallet";

/** Where a visitor without a wallet extension can install one. */
export const STELLAR_WALLET_INSTALL_URL = "https://www.freighter.app/";

/**
 * Actionable copy for every stage that can leave a visitor stuck.
 *
 * `message` names the problem in plain language; `nextStep` tells the visitor
 * exactly how to recover, so the fallback never presents a dead end.
 */
interface StageGuidance {
  message: string;
  nextStep: string;
  installUrl?: string;
}

const STAGE_GUIDANCE: Partial<Record<WalletStage, StageGuidance>> = {
  "no-wallet": {
    message: "No Stellar wallet extension was detected in this browser.",
    nextStep:
      "Install Freighter, or another Stellar wallet extension, then reload this page and try again.",
    installUrl: STELLAR_WALLET_INSTALL_URL,
  },
  rejected: {
    message: "Wallet connection was not approved.",
    nextStep:
      "Open your wallet extension and approve the connection request, then reload this page to try again.",
  },
  "network-mismatch": {
    message: "Your wallet is on the wrong network.",
    nextStep:
      "Switch your wallet to the Stellar network Fluxora expects, then reload this page to try again.",
  },
};

const STAGE_ACCENT: Partial<Record<WalletStage, string>> = {
  "no-wallet": "rgba(239, 68, 68, 0.25)",
  rejected: "rgba(239, 68, 68, 0.25)",
  "network-mismatch": "rgba(245, 158, 11, 0.25)",
};

const STAGE_ACCENT_BACKGROUND: Partial<Record<WalletStage, string>> = {
  "no-wallet": "rgba(239, 68, 68, 0.06)",
  rejected: "rgba(239, 68, 68, 0.06)",
  "network-mismatch": "rgba(245, 158, 11, 0.06)",
};

/**
 * Deterministic, stable fallback for wallet-dependent screens.
 *
 * Unlike ad-hoc inline skeletons scattered across `RequireWallet`,
 * `RequireWalletAction`, and `AppRouteFallback`, this single component
 * guarantees:
 *
 * 1. **No layout shift** – the skeleton dimensions match the real page
 *    layout (heading + subtitle + metric cards + table) so the transition
 *    from skeleton to content is seamless.
 * 2. **Distinguishable stages** – each `WalletStage` renders a visually
 *    distinct skeleton that signals *what* is happening (restoring session,
 *    loading data, rejected, wrong network, or no wallet installed) so users
 *    are never left guessing.
 * 3. **Actionable failures** – the stages a visitor cannot recover from by
 *    waiting (`rejected`, `network-mismatch`, `no-wallet`) name what is
 *    missing and offer a concrete next step instead of a dead end.
 * 4. **A11y** – announces the current stage to assistive technology via
 *    `aria-busy`, `aria-live`, and `role="status"`.
 *
 * @see https://github.com/Fluxora-Org/Fluxora-Frontend/issues/1544
 * @see https://github.com/Fluxora-Org/Fluxora-Frontend/issues/1666
 */
export default function WalletFallback({
  stage = "loading-data",
}: {
  stage?: WalletStage;
}) {
  const label = stageLabel(stage);
  const guidance = STAGE_GUIDANCE[stage];

  return (
    <main
      id="main-content"
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={label}
      className="wallet-fallback"
    >
      {/* Screen-reader only stage announcement */}
      <span className="sr-only">{label}</span>

      {/* Page heading skeleton – matches <h1> + <p> in Dashboard / Streams */}
      <div
        style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.5rem" }}
        aria-hidden="true"
      >
        <Skeleton width={220} height={28} borderRadius={8} />
        <Skeleton width={340} height={14} />
      </div>

      {/* Stage-specific guidance: names the problem and the recovery step */}
      {guidance ? (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            border: `1px solid ${STAGE_ACCENT[stage]}`,
            background: STAGE_ACCENT_BACKGROUND[stage],
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
          role="alert"
        >
          <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>
            {guidance.message}
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
            {guidance.nextStep}
          </span>
          <span
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              marginTop: "0.25rem",
            }}
          >
            {guidance.installUrl ? (
              <a
                href={guidance.installUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.8125rem", color: "var(--accent, #2563eb)" }}
              >
                Install a Stellar wallet
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                fontSize: "0.8125rem",
                background: "none",
                border: 0,
                padding: 0,
                textDecoration: "underline",
                cursor: "pointer",
                color: "var(--accent, #2563eb)",
              }}
            >
              Reload page
            </button>
          </span>
        </div>
      ) : null}

      {/* Metric cards grid – matches Dashboard card grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
        aria-hidden="true"
      >
        {[0, 1, 2].map((item) => (
          <SkeletonCard
            key={item}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <Skeleton width={40} height={40} borderRadius={8} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <Skeleton height={10} width="45%" />
              <Skeleton height={18} width="70%" />
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Table skeleton – matches RecentStreams table */}
      <div style={{ marginTop: "1.5rem" }} aria-hidden="true">
        <SkeletonCard style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["STREAM", "RECIPIENT", "RATE", "STATUS"].map((col) => (
                  <th
                    key={col}
                    style={{
                      textAlign: "left",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "1rem",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, r) => (
                <tr key={r}>
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <Skeleton height={12} width={r % 2 ? "55%" : "70%"} />
                      <Skeleton height={10} width="38%" />
                    </div>
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                    <Skeleton height={12} width="60%" />
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                    <Skeleton height={12} width="45%" />
                  </td>
                  <td style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
                    <Skeleton height={22} width={80} borderRadius={12} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </SkeletonCard>
      </div>
    </main>
  );
}

function stageLabel(stage: WalletStage): string {
  switch (stage) {
    case "restoring":
      return "Restoring wallet session…";
    case "loading-data":
      return "Loading wallet data…";
    case "rejected":
      return "Wallet connection was not approved.";
    case "network-mismatch":
      return "Your wallet is on the wrong network.";
    case "no-wallet":
      return "No Stellar wallet extension was detected.";
  }
}
