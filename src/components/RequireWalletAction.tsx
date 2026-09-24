import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useWallet } from "./wallet-connect/Walletcontext";
import { sanitizeReturnTo } from "./RequireWallet";
import WalletFallback from "./WalletFallback";

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
    return <WalletFallback stage="restoring" />;
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
    return <WalletFallback stage="network-mismatch" />;
  }

  return <>{children}</>;
}