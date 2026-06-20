import DemoBanner from "../components/treasuryOverviewPage/DemoBanner";
import Header from "../components/treasuryOverviewPage/Header"
import { MetricsContent } from "../components/treasuryOverviewPage/Metrics";
import { RecentStreamsContent } from "../components/treasuryOverviewPage/RecentStreams";
import { useTreasury } from "../components/treasuryOverviewPage/useTreasury";

export default function TreasuryPage() {
  const treasury = useTreasury();

  return (
    <div className="p-6 flex flex-col gap-8 bg-gray-50 min-h-screen">
      <DemoBanner />
      <Header />
      <MetricsContent
        metrics={treasury.metrics}
        loading={treasury.loading}
        error={treasury.error}
        onRetry={treasury.refetch}
      />
      <RecentStreamsContent
        streams={treasury.streams}
        loading={treasury.loading}
        error={treasury.error}
        onRetry={treasury.refetch}
      />
    </div>
  );
}
