import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useWallet } from "./wallet-connect/Walletcontext";

const SAFE_DEFAULT = "/app";

/**
 * Sanitizes a post-connect redirect target to prevent open-redirect attacks.
 *
 * Only allows same-origin, in-app relative paths starting with `/`.
 * Rejects absolute URLs (`http://`, `https://`), protocol-relative URLs (`//`),
 * dangerous schemes (`javascript:`), path-traversal segments (`..`), and
 * non-string / empty values.
 *
 * @param returnTo - The raw redirect target from location state (untrusted).
 * @returns A safe redirect path, defaulting to `"/app"` when validation fails.
 */
export function sanitizeReturnTo(returnTo: unknown): string {
  if (typeof returnTo !== "string" || returnTo.trim() === "") {
    return SAFE_DEFAULT;
  }

  const trimmed = returnTo.trim();

  if (/^https?:\/\//i.test(trimmed)) return SAFE_DEFAULT;
  if (/^\/\//.test(trimmed)) return SAFE_DEFAULT;
  if (/^\w+:/i.test(trimmed)) return SAFE_DEFAULT;
  if (!trimmed.startsWith("/")) return SAFE_DEFAULT;
  if (trimmed.includes("..")) return SAFE_DEFAULT;

  return trimmed;
}

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
        state={{ returnTo: sanitizeReturnTo(returnTo) }}
      />
    );
  }

  return <>{children}</>;
}
