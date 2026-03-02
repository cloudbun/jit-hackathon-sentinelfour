import { useState, useCallback } from "react";
import { getFeeds, getFeedItems, refreshAllFeeds } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { usePolling } from "../../hooks/usePolling";
import { PageHeader } from "../layout/PageHeader";
import { FeedList } from "./FeedList";
import { FeedItemsList } from "./FeedItemsList";
import { AddFeedForm } from "./AddFeedForm";

export function FeedsPage() {
  const [severityFilter, setSeverityFilter] = useState("");

  const feeds = useApi(() => getFeeds(), []);
  const items = useApi(
    () => getFeedItems({ limit: 50, severity: severityFilter || undefined }),
    [severityFilter]
  );

  const refetchAll = useCallback(() => {
    feeds.refetch();
    items.refetch();
  }, [feeds.refetch, items.refetch]);

  usePolling(refetchAll);

  const handleRefreshAll = async () => {
    await refreshAllFeeds();
    refetchAll();
  };

  return (
    <div>
      <PageHeader
        title="Threat Feeds"
        description="RSS/Atom security intelligence feeds"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshAll}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Refresh All
            </button>
            <AddFeedForm onCreated={refetchAll} />
          </div>
        }
      />

      <div className="space-y-6">
        <FeedList feeds={feeds.data ?? []} onRefresh={refetchAll} />
        <FeedItemsList
          items={items.data ?? []}
          severityFilter={severityFilter}
          onFilterChange={setSeverityFilter}
        />
      </div>
    </div>
  );
}
