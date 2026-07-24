import DemoBanner from "../components/treasuryOverviewPage/DemoBanner";
import Header from "../components/treasuryOverviewPage/Header";
import Metrics from "../components/treasuryOverviewPage/Metrics";
import RecentStreams from "../components/treasuryOverviewPage/RecentStreams";
import { useTreasuryOverviewData } from "../components/treasuryOverviewPage/useTreasuryOverviewData";
import {
  ColorBlindSimulationProvider,
  ColorBlindToggle,
} from "../components/colorBlindSimulation";

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

  if (loading) {
    return (
      <ColorBlindSimulationProvider>
        <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
          {isDemoMode && <DemoBanner />}
          {/* Design-QA: colour-blind simulation toggle */}
          <ColorBlindToggle />
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
          {isDemoMode && <DemoBanner />}
          {/* Design-QA: colour-blind simulation toggle */}
          <ColorBlindToggle />
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
        {isDemoMode && <DemoBanner />}

        {/* Design-QA: colour-blind simulation toggle — placed above page content
            so the entire Metrics and RecentStreams area is filtered.
            This component is not rendered in production end-user UI; it is
            intended for design review and QA sessions only. */}
        <ColorBlindToggle />

        <Header />
        <Metrics metrics={metrics || []} loading={loading} error={error} />
        <RecentStreams
          streams={streams || []}
          loading={loading}
          error={error}
          onRetry={refetch}
        />
      </div>
    </ColorBlindSimulationProvider>
  );
}
