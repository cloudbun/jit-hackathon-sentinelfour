import type { FeedItem, Severity } from "../../lib/types";
import { Card, CardHeader, CardBody } from "../shared/Card";
import { EmptyState } from "../shared/EmptyState";

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const severityColor: Record<Severity, string> = {
  info: "text-zinc-500",
  low: "text-blue-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export function ThreatFeedPanel({ items }: { items: FeedItem[] }) {
  return (
    <Card>
      <CardHeader>Latest Threat Intel</CardHeader>
      <CardBody className="p-0">
        {items.length === 0 ? (
          <EmptyState message="No feed items yet" />
        ) : (
          <div className="ticket-mono divide-y divide-dotted divide-zinc-700/30">
            {items.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className={`shrink-0 text-[10px] font-bold uppercase w-16 pt-0.5 ${severityColor[item.severity]}`}>
                  {item.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-200 hover:text-zinc-100 transition-colors line-clamp-1"
                  >
                    {item.title}
                  </a>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    {item.feed_name} // {timeAgo(item.pub_date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
