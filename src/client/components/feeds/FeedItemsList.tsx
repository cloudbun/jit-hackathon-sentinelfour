import type { FeedItem, Severity } from "../../lib/types";
import { Card, CardHeader, CardBody } from "../shared/Card";
import { EmptyState } from "../shared/EmptyState";

const severityColor: Record<Severity, string> = {
  info: "text-zinc-500",
  low: "text-blue-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export function FeedItemsList({
  items,
  severityFilter,
  onFilterChange,
}: {
  items: FeedItem[];
  severityFilter: string;
  onFilterChange: (s: string) => void;
}) {
  const severities = ["", "critical", "high", "medium", "low", "info"];

  return (
    <Card>
      <CardHeader
        action={
          <div className="flex gap-1 ticket-mono">
            {severities.map((s) => (
              <button
                key={s}
                onClick={() => onFilterChange(s)}
                className={`px-2 py-1 text-[10px] uppercase tracking-wide transition-colors ${
                  severityFilter === s
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        }
      >
        Feed Items
      </CardHeader>
      <CardBody className="p-0">
        {items.length === 0 ? (
          <EmptyState message="No feed items yet" />
        ) : (
          <div className="ticket-mono divide-y divide-dotted divide-zinc-700/20">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className={`shrink-0 text-[10px] font-bold uppercase w-16 pt-0.5 ${severityColor[item.severity]}`}>
                  {item.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-200 hover:text-zinc-100 transition-colors"
                  >
                    {item.title}
                  </a>
                  <p className="mt-0.5 text-[10px] text-zinc-600 line-clamp-1">{item.description}</p>
                  <p className="mt-0.5 text-[10px] text-zinc-700">
                    {item.feed_name} // {item.pub_date ? new Date(item.pub_date).toLocaleDateString() : ""}
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
