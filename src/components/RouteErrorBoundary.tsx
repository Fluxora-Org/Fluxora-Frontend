import {
  ComponentType,
  Fragment,
  ReactElement,
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";
import ErrorPage from "../pages/ErrorPage";
import WalletFallback from "./WalletFallback";

interface RouteErrorBoundaryProps {
  /** The element rendered for this route (typically a lazy-loaded page). */
  children: ReactElement;
  /**
   * Optional dynamic-import factory for the page. Provide this so that a
   * genuine `import()` failure can be re-attempted on retry: React.lazy caches
   * a rejected import permanently, so the only way to retry is to create a
   * fresh lazy component.
   */
  load?: () => Promise<{ default: ComponentType }>;
}

/**
 * Route-level error boundary with retry and navigation recovery.
 *
 * Unlike a single global boundary around the whole <Routes>, each route gets
 * its own boundary so a failed (lazy-loaded) page is contained to that route
 * and cannot take down the surrounding application shell.
 *
 * - Retry remounts the route without a full page reload. When a `load` factory
 *   is supplied it also rebuilds the lazy component so a failed dynamic import
 *   is re-attempted.
 * - "Back to Dashboard" resets the boundary and navigates to the dashboard.
 * - The boundary renders inside the global providers, so the wallet context
 *   remains mounted and usable after a recovery.
 */
export default function RouteErrorBoundary({
  children,
  load,
}: RouteErrorBoundaryProps) {
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  // When a page is delivered via a `load` factory, rebuild the lazy component
  // on every retry so a rejected dynamic import is re-attempted rather than
  // being served React.lazy's cached rejection. `attempt` must be a dependency
  // even though it is not referenced inside the producer, because incrementing
  // it is what triggers the fresh `lazy(load)` on retry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dynamicLazy = useMemo(() => (load ? lazy(load) : null), [attempt, load]);

  return (
    <ErrorBoundary
      fallback={({ reset }) => (
        <ErrorPage
          type="default"
          errorMessage="This page could not be loaded. Try again or return to the dashboard."
          primaryCtaText="Try Again"
          onRetry={() => {
            reset();
            retry();
          }}
          secondaryCtaText="Back to Dashboard"
          secondaryCtaAction={() => {
            reset();
            retry();
            navigate("/app");
          }}
        />
      )}
    >
      <Suspense fallback={<WalletFallback stage="loading-data" />}>
        {dynamicLazy ? (
          <LazyRouteComponent Lazy={dynamicLazy} attempt={attempt} />
        ) : (
          <Fragment key={attempt}>{children}</Fragment>
        )}
      </Suspense>
    </ErrorBoundary>
  );
}

function LazyRouteComponent({
  Lazy,
  attempt,
}: {
  Lazy: React.LazyExoticComponent<ComponentType>;
  attempt: number;
}) {
  return <Lazy key={attempt} />;
}
