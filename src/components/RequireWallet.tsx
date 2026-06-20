import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useWallet } from "./wallet-connect/Walletcontext";

interface RequireWalletProps {
  children: ReactNode;
}

/**
 * Gates app routes until the shared wallet context finishes silent restore.
 *
 * This is client-side UX gating only. Backend APIs must still enforce their own
 * authorization before returning privileged treasury or stream data.
 */
export default function RequireWallet({ children }: RequireWalletProps) {
  const wallet = useWallet();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}${location.hash}`;

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

  return <>{children}</>;
}
