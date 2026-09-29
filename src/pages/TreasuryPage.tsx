import { useState } from "react";
import DemoBanner, { type DemoState } from "../components/treasuryOverviewPage/DemoBanner";
import Header, { type TreasuryPeriod } from "../components/treasuryOverviewPage/Header";
import Metrics from "../components/treasuryOverviewPage/Metrics";
import { lazy, Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
const ActivityHeatmap = lazy(() => import("../components/treasuryOverviewPage/ActivityHeatmap"));
const TreasuryFlowSankey = lazy(() => import("../components/treasuryOverviewPage/TreasuryFlowSankey"));
const RecentStreams = lazy(() => import("../components/treasuryOverviewPage/RecentStreams"));
const ReportBuilderPanel = lazy(() => import("../components/treasuryOverviewPage/ReportBuilderPanel"));
import { useTreasuryOverviewData } from "../components/treasuryOverviewPage/useTreasuryOverviewData";
import { useWallet } from "../components/wallet-connect/Walletcontext";

/**
 * TreasuryPage renders the treasury overview.
 *
 * It uses `useTreasuryOverviewData` which returns:
 * - `metrics`: data for the Metrics component (or undefined)
 * - `streams`: recent streams data (or undefined)
 * - `isDemoMode`: boolean indicating demo mode
 * - `loading`: boolean indicating loading state
 * - `error`: string | null error message
 * - `resolvedPeriod`: period corresponding to the resolved metrics
 * - `boundaries`: explicit date boundaries for the resolved period
 *
 * When both `metrics` and `streams` are missing while not loading or erroring,
 * a defensive empty-state fallback is shown.
 *
 * ## Colour-blind simulation
 * Colour-blind simulation controls are provided by the persistent app layout
 * so the preview can be disabled after navigating to another affected view.
 */
export default function TreasuryPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<TreasuryPeriod>("30d");
  const { metrics, streams, isDemoMode, loading, error, refetch, resolvedPeriod, boundaries } =
    useTreasuryOverviewData(selectedPeriod);
  const { connected: walletConnected } = useWallet();
  const [showReportBuilder, setShowReportBuilder] = useState(false);

  const demoState: DemoState = loading
    ? "loading"
    : (metrics && metrics.length > 0) || (streams && streams.length > 0)
    ? "loaded"
    : "empty";

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen" data-demo-mode={isDemoMode || undefined}>
        {isDemoMode && <DemoBanner state={demoState} />}
        <Header
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          loading={true}
          resolvedPeriod={resolvedPeriod}
          boundaries={boundaries}
        />
        <div role="status" className="text-sm text-gray-500">
          Loading treasury overview...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen" data-demo-mode={isDemoMode || undefined}>
        {isDemoMode && <DemoBanner state={demoState} />}
        <Header
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          loading={false}
          resolvedPeriod={resolvedPeriod}
          boundaries={boundaries}
        />
        <div role="alert" className="text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen" data-demo-mode={isDemoMode || undefined}>
      {isDemoMode && <DemoBanner state={demoState} />}

      <Header
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        loading={loading}
        resolvedPeriod={resolvedPeriod}
        boundaries={boundaries}
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
      <ErrorBoundary>
        <Metrics metrics={metrics || []} loading={loading} error={error} isDemoMode={isDemoMode} />
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={<div role="status" className="sr-only">Loading treasury activity...</div>}>
          <ActivityHeatmap streams={streams || []} loading={loading} error={error} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense fallback={<div role="status" className="sr-only">Loading treasury flow diagram...</div>}>
          <TreasuryFlowSankey streams={streams || []} loading={loading} error={error} isDemoMode={isDemoMode} />
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
            isDemoMode={isDemoMode}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
