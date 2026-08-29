import { useState } from "react";
import DemoBanner, { type DemoState } from "../components/treasuryOverviewPage/DemoBanner";
import Header from "../components/treasuryOverviewPage/Header";
import Metrics from "../components/treasuryOverviewPage/Metrics";
import { lazy, Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
const ActivityHeatmap = lazy(() => import("../components/treasuryOverviewPage/ActivityHeatmap"));
const TreasuryFlowSankey = lazy(() => import("../components/treasuryOverviewPage/TreasuryFlowSankey"));
const RecentStreams = lazy(() => import("../components/treasuryOverviewPage/RecentStreams"));
const ReportBuilderPanel = lazy(() => import("../components/treasuryOverviewPage/ReportBuilderPanel"));
import { useTreasuryOverviewData } from "../components/treasuryOverviewPage/useTreasuryOverviewData";
import {
  ColorBlindSimulationProvider,
  ColorBlindToggle,
} from "../components/colorBlindSimulation";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { IS_DEV } from "../utils/env";

/**
 * TreasuryPage renders the treasury overview.
 *
 * It uses `useTreasuryOverviewData` which returns:
 * - `metrics`: data for the Metrics component (or undefined)
 * - `streams`: recent streams data (or undefined)
 * - `isDemoMode`: boolean indicating demo mode
 * - `loading`: boolean indicating loading state
 * - `error`: string | null error message
 *
 * When both `metrics` and `streams` are missing while not loading or erroring,
 * a defensive empty-state fallback is shown.
 *
 * ## Colour-blind simulation
 * The entire page content is wrapped in {@link ColorBlindSimulationProvider}
 * and a {@link ColorBlindToggle} is rendered at the top of the layout. This
 * is a **developer / design-QA affordance only** — not a shipped end-user
 * setting. The toggle allows designers and QA engineers to verify that status
 * indicators (StatusPill, MetricCard) remain legible under protanopia,
 * deuteranopia, and tritanopia simulations.
 */
export default function TreasuryPage() {
  const { metrics, streams, isDemoMode, loading, error, refetch } =
    useTreasuryOverviewData();
  const { connected: walletConnected } = useWallet();
  const [showReportBuilder, setShowReportBuilder] = useState(false);

  const demoState: DemoState = loading
    ? "loading"
    : (metrics && metrics.length > 0) || (streams && streams.length > 0)
    ? "loaded"
    : "empty";

  if (loading) {
    return (
      <ColorBlindSimulationProvider>
        <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
          {isDemoMode && <DemoBanner state={demoState} />}
          {/* Design-QA: colour-blind simulation toggle */}
          {IS_DEV && <ColorBlindToggle />}
          <Header />
          <div role="status" className="text-sm text-gray-500">
            Loading treasury overview...
          </div>
        </div>
      </ColorBlindSimulationProvider>
    );
  }

  if (error) {
    return (
      <ColorBlindSimulationProvider>
        <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
          {isDemoMode && <DemoBanner state={demoState} />}
          {/* Design-QA: colour-blind simulation toggle */}
          {IS_DEV && <ColorBlindToggle />}
          <Header />
          <div role="alert" className="text-sm text-red-600">
            {error}
          </div>
        </div>
      </ColorBlindSimulationProvider>
    );
  }

  return (
    <ColorBlindSimulationProvider>
      <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
        {isDemoMode && <DemoBanner state={demoState} />}

        {/* Design-QA: colour-blind simulation toggle — placed above page content
            so the entire Metrics and RecentStreams area is filtered.
            This component is not rendered in production end-user UI; it is
            intended for design review and QA sessions only. */}
        {IS_DEV && <ColorBlindToggle />}

        <Header
          onExportClick={() => setShowReportBuilder(true)}
          onRefresh={refetch}
        />
        {showReportBuilder && (
          <ErrorBoundary>
            <Suspense fallback={<div role="status" className="sr-only">Loading export panel...</div>}>
              <ReportBuilderPanel
                streams={streams || []}
                onClose={() => setShowReportBuilder(false)}
              />
            </Suspense>
          </ErrorBoundary>
        )}
        <Metrics metrics={metrics || []} loading={loading} error={error} />
        <ErrorBoundary>
          <Suspense fallback={<div role="status" className="sr-only">Loading treasury activity...</div>}>
            <ActivityHeatmap streams={streams || []} loading={loading} error={error} />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<div role="status" className="sr-only">Loading treasury flow diagram...</div>}>
            <TreasuryFlowSankey streams={streams || []} loading={loading} error={error} />
          </Suspense>
        </ErrorBoundary>
        <ErrorBoundary>
          <Suspense fallback={<div role="status" className="sr-only">Loading recent streams...</div>}>
            <RecentStreams
              streams={streams || []}
              loading={loading}
              error={error}
              onRetry={refetch}
              walletConnected={walletConnected}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </ColorBlindSimulationProvider>
  );
}
