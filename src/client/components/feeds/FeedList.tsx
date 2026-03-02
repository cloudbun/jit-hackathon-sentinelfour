import type { Feed } from "../../lib/types";
import { Card, CardHeader, CardBody } from "../shared/Card";
import { EmptyState } from "../shared/EmptyState";
import { refreshFeed, deleteFeed } from "../../lib/api";

export function FeedList({ feeds, onRefresh }: { feeds: Feed[]; onRefresh: () => void }) {
  const handleRefresh = async (id: number) => {
    await refreshFeed(id);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await deleteFeed(id);
    onRefresh();
  };

  return (
    <Card>
      <CardHeader>Configured Feeds</CardHeader>
      <CardBody className="p-0">
        {feeds.length === 0 ? (
          <EmptyState message="No feeds configured" />
        ) : (
          <div className="divide-y divide-zinc-800">
            {feeds.map((feed) => (
              <div key={feed.id} className="group flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-200">{feed.name}</p>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500">
                      {feed.item_count} items
                    </span>
                    {!feed.enabled && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600">disabled</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-600 truncate">{feed.url}</p>
                  {feed.fetch_error && (
                    <p className="mt-0.5 text-xs text-red-400">Error: {feed.fetch_error}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRefresh(feed.id)}
                    className="rounded-md px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    className="rounded-md px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition-colors"
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
  );
}
