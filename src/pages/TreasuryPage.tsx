import DemoBanner from "../components/treasuryOverviewPage/DemoBanner";
import Header from "../components/treasuryOverviewPage/Header"
import Metrics from "../components/treasuryOverviewPage/Metrics";
import RecentStreams from "../components/treasuryOverviewPage/RecentStreams";
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
 *
 * When both `metrics` and `streams` are missing while not loading or erroring,
 * a defensive empty‑state fallback is shown.
 */
export default function TreasuryPage() {
  const { metrics, streams, isDemoMode, loading, error, refetch } =
    useTreasuryOverviewData();
  const { connected: walletConnected } = useWallet();

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
        {isDemoMode && <DemoBanner />}
        <Header />
        <div role="status" className="text-sm text-gray-500">
          Loading treasury overview...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
        {isDemoMode && <DemoBanner />}
        <Header />
        <div role="alert" className="text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
      {isDemoMode && <DemoBanner />}
      <Header />
      <Metrics metrics={metrics || []} loading={loading} error={error} />
      <RecentStreams
        streams={streams || []}
        loading={loading}
        error={error}
        onRetry={refetch}
        walletConnected={walletConnected}
      />
    </div>
  );
}
