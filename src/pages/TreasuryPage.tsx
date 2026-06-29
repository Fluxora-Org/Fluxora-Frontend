import DemoBanner from "../components/treasuryOverviewPage/DemoBanner";
import Header from "../components/treasuryOverviewPage/Header"
import Metrics from "../components/treasuryOverviewPage/Metrics";
import RecentStreams from "../components/treasuryOverviewPage/RecentStreams";
import { useTreasuryOverviewData } from "../components/treasuryOverviewPage/useTreasuryOverviewData";

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
 * a defensive empty‑state fallback is shown.
 */
export default function TreasuryPage() {
  const { metrics, streams, isDemoMode, loading, error } =
    useTreasuryOverviewData();

  return (
    <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
      {isDemoMode && <DemoBanner />}
      <Header />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-gray-500">
          Loading treasury overview...
        </p>
      ) : error ? null : (!metrics || !streams) ? (
        <p role="status" className="text-sm text-gray-500">
          No treasury data available.
        </p>
      ) : (
        <>
          <Metrics metrics={metrics} loading={loading} error={error} />
          <RecentStreams streams={streams} />
        </>
      )}
    </div>
  );
}
