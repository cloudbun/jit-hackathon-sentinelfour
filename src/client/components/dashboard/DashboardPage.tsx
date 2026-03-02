import { useCallback } from "react";
import { getDashboardSummary, getAgents } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { usePolling } from "../../hooks/usePolling";
import { PageHeader } from "../layout/PageHeader";
import { StatsGrid } from "./StatsGrid";
import { AgentStatusList } from "./AgentStatusList";
import { ThreatFeedPanel } from "./ThreatFeedPanel";
import { RecentEventsPanel } from "./RecentEventsPanel";

export function DashboardPage() {
  const summary = useApi(() => getDashboardSummary(), []);
  const agents = useApi(() => getAgents(), []);

  const refetchAll = useCallback(() => {
    summary.refetch();
    agents.refetch();
  }, [summary.refetch, agents.refetch]);

  usePolling(refetchAll);

  if (summary.loading && !summary.data) {
    return <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Loading...</div>;
  }

  if (!summary.data) {
    return <div className="text-red-400 text-sm p-4">Failed to load dashboard</div>;
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Security monitoring overview" />
      <div className="space-y-6">
        <StatsGrid summary={summary.data} />
        <div className="grid grid-cols-2 gap-6">
          <AgentStatusList agents={agents.data ?? []} />
          <ThreatFeedPanel items={summary.data.recentFeedItems} />
        </div>
        <RecentEventsPanel events={summary.data.recentEvents} />
      </div>
    </div>
  );
}
