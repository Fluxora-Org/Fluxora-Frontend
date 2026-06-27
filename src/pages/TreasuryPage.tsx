import DemoBanner from "../components/treasuryOverviewPage/DemoBanner";
import Header from "../components/treasuryOverviewPage/Header"
import Metrics from "../components/treasuryOverviewPage/Metrics";
import RecentStreams from "../components/treasuryOverviewPage/RecentStreams";
import { useTreasuryOverviewData } from "../components/treasuryOverviewPage/useTreasuryOverviewData";

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
      ) : (
        <>
          <Metrics metrics={metrics} />
          <RecentStreams streams={streams} />
        </>
      )}
    </div>
  );
}
