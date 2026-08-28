import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useWallet } from "./wallet-connect/Walletcontext";
import { sanitizeReturnTo } from "./RequireWallet";

interface RequireWalletActionProps {
  children: ReactNode;
}

/**
 * Guards routes that can initiate wallet-backed money-moving actions.
 *
 * Unlike RequireWallet, this guard requires both:
 *   1. an authenticated/connected wallet
 *   2. the wallet being connected to Fluxora's expected Stellar network
 *
 * Disconnected users follow the existing connect-wallet flow and retain the
 * route they originally intended to visit.
 *
 * Wrong-network users remain on the intended route but cannot access its
 * actionable UI until the wallet network is corrected.
 */
export default function RequireWalletAction({
  children,
}: RequireWalletActionProps) {
  const wallet = useWallet();
  const location = useLocation();

  const returnTo = sanitizeReturnTo(
    `${location.pathname}${location.search}${location.hash}`,
  );

  if (wallet.loading) {
    return (
      <main
        id="main-content"
        aria-busy="true"
        aria-live="polite"
        className="min-h-[60vh] flex items-center justify-center"
      >
        <div role="status" className="text-body-md text-[var(--muted)]">
          Restoring wallet session...
        </div>
      </main>
    );
  }

  if (!wallet.connected) {
    return (
      <Navigate
        to="/connect-wallet"
        replace
        state={{ returnTo }}
      />
    );
  }

  if (wallet.isNetworkMismatch) {
    return (
      <main
        id="main-content"
        aria-labelledby="wallet-network-required-heading"
        className="min-h-[60vh] flex items-center justify-center px-4"
      >
        <section
          role="alert"
          className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center"
        >
          <h1
            id="wallet-network-required-heading"
            className="text-heading-lg font-semibold"
          >
            Wrong network
          </h1>

          <p className="mt-3 text-body-md text-[var(--muted)]">
            Your wallet is connected to{" "}
            <strong>
              {wallet.network?.toUpperCase() ?? "an unsupported network"}
            </strong>
            , but Fluxora requires{" "}
            <strong>{wallet.expectedNetworkLabel}</strong>.
          </p>

          <p className="mt-2 text-body-sm text-[var(--muted)]">
            Switch your wallet to the required network and try again.
          </p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}