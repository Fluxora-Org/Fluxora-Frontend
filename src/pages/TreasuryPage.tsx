import { useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";
import DemoBanner, {
  type DemoState,
} from "../components/treasuryOverviewPage/DemoBanner";
import Header, {
  type TreasuryPeriod,
} from "../components/treasuryOverviewPage/Header";
import Metrics from "../components/treasuryOverviewPage/Metrics";
import { lazy, Suspense } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import WidgetErrorBoundary from "../components/WidgetErrorBoundary";
import {
  TREASURY_ASSET_TREEMAP_WIDGET_ID,
  type GridWidget,
} from "../components/treasuryOverviewPage/widgetLayout";
import type { MetricToken } from "../components/treasuryOverviewPage/Metric";
// Lazy so the treemap, its layout maths and precision helpers stay out of the
// app-treasury route chunk (see scripts/route-budgets.json).
const TreasuryAssetTreemap = lazy(
  () => import("../components/treasuryOverviewPage/TreasuryAssetTreemap"),
);
const ActivityHeatmap = lazy(
  () => import("../components/treasuryOverviewPage/ActivityHeatmap"),
);
const TreasuryFlowSankey = lazy(
  () => import("../components/treasuryOverviewPage/TreasuryFlowSankey"),
);
const RecentStreams = lazy(
  () => import("../components/treasuryOverviewPage/RecentStreams"),
);
const ReportBuilderPanel = lazy(
  () => import("../components/treasuryOverviewPage/ReportBuilderPanel"),
);
import { useTreasuryOverviewData } from "../components/treasuryOverviewPage/useTreasuryOverviewData";
import { useWallet } from "../components/wallet-connect/Walletcontext";
import { MetaTags } from "../components/MetaTags";

const NO_ALLOCATION: MetricToken[] = [];

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
  const {
    metrics,
    streams,
    assetAllocation,
    isDemoMode,
    loading,
    error,
    refetch,
    resolvedPeriod,
    boundaries,
  } = useTreasuryOverviewData(selectedPeriod);
  const { connected: walletConnected } = useWallet();
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const allocationTokens = assetAllocation ?? NO_ALLOCATION;

  // Non-metric widgets that share the draggable metrics grid, widget tray
  // and persisted layout. Each is isolated in its own error boundary.
  const gridWidgets = useMemo<GridWidget[]>(
    () => [
      {
        id: TREASURY_ASSET_TREEMAP_WIDGET_ID,
        label: "Asset Allocation",
        icon: <LayoutGrid size={28} aria-hidden="true" />,
        defaultSize: "2x1",
        content: (
          <WidgetErrorBoundary name="Asset allocation" onRetry={refetch}>
            <Suspense
              fallback={
                <div role="status" className="sr-only">
                  Loading asset allocation...
                </div>
              }
            >
              <TreasuryAssetTreemap
                tokens={allocationTokens}
                isDemoMode={isDemoMode}
                onRetry={refetch}
                showTitle={false}
              />
            </Suspense>
          </WidgetErrorBoundary>
        ),
      },
    ],
    [allocationTokens, isDemoMode, refetch],
  );

  const demoState: DemoState = loading
    ? "loading"
    : (metrics && metrics.length > 0) || (streams && streams.length > 0)
      ? "loaded"
      : "empty";

  if (loading) {
    return (
      <div
        className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen"
        data-demo-mode={isDemoMode || undefined}
      >
        <MetaTags title="Treasury Overview" />
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
      <div
        className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen"
        data-demo-mode={isDemoMode || undefined}
      >
        <MetaTags title="Treasury Overview" />
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
    <div
      className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen"
      data-demo-mode={isDemoMode || undefined}
    >
      <MetaTags title="Treasury Overview" />
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
          <Suspense
            fallback={
              <div role="status" className="sr-only">
                Loading export panel...
              </div>
            }
          >
            <ReportBuilderPanel
              streams={streams || []}
              onClose={() => setShowReportBuilder(false)}
            />
          </Suspense>
        </ErrorBoundary>
      )}
      <ErrorBoundary>
        <Metrics
          metrics={metrics || []}
          loading={loading}
          error={error}
          isDemoMode={isDemoMode}
          extraWidgets={gridWidgets}
        />
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div role="status" className="sr-only">
              Loading treasury activity...
            </div>
          }
        >
          <ActivityHeatmap
            streams={streams || []}
            loading={loading}
            error={error}
          />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div role="status" className="sr-only">
              Loading treasury flow diagram...
            </div>
          }
        >
          <TreasuryFlowSankey
            streams={streams || []}
            loading={loading}
            error={error}
            isDemoMode={isDemoMode}
          />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary>
        <Suspense
          fallback={
            <div role="status" className="sr-only">
              Loading recent streams...
            </div>
          }
        >
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
