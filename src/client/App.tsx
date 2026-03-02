import { useState, useCallback } from "react";
import { getDashboardSummary, getAgents, getFeeds, getFeedItems, deleteAgent, refreshFeed, deleteFeed, refreshAllFeeds } from "./lib/api";
import { useApi } from "./hooks/useApi";
import { usePolling } from "./hooks/usePolling";
import { StatsGrid } from "./components/dashboard/StatsGrid";
import { RecentEventsPanel } from "./components/dashboard/RecentEventsPanel";
import { AgentCard } from "./components/agents/AgentCard";
import { AgentDetailModal } from "./components/agents/AgentDetailModal";
import { AddAgentForm } from "./components/agents/AddAgentForm";
import { FeedItemsList } from "./components/feeds/FeedItemsList";
import { AddFeedForm } from "./components/feeds/AddFeedForm";
import { Card, CardHeader, CardBody } from "./components/shared/Card";
import { EmptyState } from "./components/shared/EmptyState";
import type { Agent } from "./lib/types";

export function App() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [severityFilter, setSeverityFilter] = useState("");

  const summary = useApi(() => getDashboardSummary(), []);
  const agents = useApi(() => getAgents(), []);
  const feeds = useApi(() => getFeeds(), []);
  const feedItems = useApi(
    () => getFeedItems({ limit: 30, severity: severityFilter || undefined }),
    [severityFilter]
  );

  const refetchAll = useCallback(() => {
    summary.refetch();
    agents.refetch();
    feeds.refetch();
    feedItems.refetch();
  }, [summary.refetch, agents.refetch, feeds.refetch, feedItems.refetch]);

  usePolling(refetchAll);

  const handleDeleteAgent = useCallback(async (id: number) => {
    await deleteAgent(id);
    refetchAll();
  }, [refetchAll]);

  const handleRefreshAllFeeds = async () => {
    await refreshAllFeeds();
    refetchAll();
  };

  if (summary.loading && !summary.data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center ticket-mono text-zinc-500 text-xs uppercase tracking-widest">
        Initializing...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <header className="border-b border-zinc-700/60 bg-black sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-zinc-700/60 bg-zinc-900">
              <svg className="h-4 w-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="ticket-mono">
              <h1 className="text-sm font-bold uppercase tracking-widest text-zinc-100">SentinelFour</h1>
              <p className="text-[9px] uppercase tracking-widest text-zinc-600">Security Monitoring Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3 ticket-mono">
            <span className="text-[9px] uppercase tracking-widest text-zinc-600">Auto-refresh 30s</span>
            <button
              onClick={refetchAll}
              className="border border-zinc-700/60 px-3 py-1.5 text-[10px] uppercase tracking-wide text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="grid grid-cols-12 gap-4">

          {/* Row 1: Stats */}
          <div className="col-span-12">
            {summary.data && <StatsGrid summary={summary.data} />}
          </div>

          {/* Row 2: Agents + Recent Events (equal height) */}
          <div className="col-span-5 flex">
            <Card className="flex-1 flex flex-col">
              <CardHeader
                action={<AddAgentForm onCreated={refetchAll} />}
              >
                Agents
              </CardHeader>
              <CardBody className="flex-1 overflow-y-auto">
                {!agents.data || agents.data.length === 0 ? (
                  <EmptyState message="No agents registered. Add one to get started." />
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {agents.data.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        onSelect={setSelectedAgent}
                        onDelete={handleDeleteAgent}
                      />
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
          <div className="col-span-7 flex">
            <RecentEventsPanel events={summary.data?.recentEvents ?? []} className="flex-1" />
          </div>

          {/* Row 3: Feeds config (4 cols) + Threat Intel (8 cols) */}
          <div className="col-span-4 flex">
            <Card className="flex-1 flex flex-col">
              <CardHeader
                action={
                  <div className="flex items-center gap-2 ticket-mono">
                    <button
                      onClick={handleRefreshAllFeeds}
                      className="text-[10px] uppercase tracking-wide text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      Refresh All
                    </button>
                    <AddFeedForm onCreated={refetchAll} />
                  </div>
                }
              >
                Feeds
              </CardHeader>
              <CardBody className="p-0 flex-1 overflow-y-auto">
                {!feeds.data || feeds.data.length === 0 ? (
                  <EmptyState message="No feeds configured" />
                ) : (
                  <div className="ticket-mono divide-y divide-dotted divide-zinc-700/30">
                    {feeds.data.map((feed) => (
                      <div key={feed.id} className="group flex items-center justify-between px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-200">{feed.name}</p>
                            <span className="text-[10px] text-zinc-600">
                              [{feed.item_count}]
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-zinc-700 truncate">{feed.url}</p>
                          {feed.fetch_error && (
                            <p className="mt-0.5 text-[10px] text-red-400 truncate">ERR: {feed.fetch_error}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={async () => { await refreshFeed(feed.id); refetchAll(); }}
                            className="px-2 py-1 text-[10px] uppercase text-zinc-500 hover:text-zinc-200 transition-colors"
                          >
                            Refresh
                          </button>
                          <button
                            onClick={async () => { await deleteFeed(feed.id); refetchAll(); }}
                            className="px-2 py-1 text-[10px] uppercase text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
          <div className="col-span-8 flex">
            <div className="flex-1">
              <FeedItemsList
                items={feedItems.data ?? []}
                severityFilter={severityFilter}
                onFilterChange={setSeverityFilter}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedAgent && (
        <AgentDetailModal agentId={selectedAgent.id} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
