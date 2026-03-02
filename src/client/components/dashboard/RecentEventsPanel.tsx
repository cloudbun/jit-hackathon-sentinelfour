import type { AgentEvent, Severity } from "../../lib/types";
import { Card, CardHeader, CardBody } from "../shared/Card";
import { EmptyState } from "../shared/EmptyState";

function formatTime(dateStr: string): string {
  return new Date(dateStr + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const severityColor: Record<Severity, string> = {
  info: "text-zinc-500",
  low: "text-blue-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const rowTint: Record<Severity, string> = {
  info: "",
  low: "",
  medium: "",
  high: "bg-orange-500/5",
  critical: "bg-red-500/8",
};

export function RecentEventsPanel({ events, className = "" }: { events: AgentEvent[]; className?: string }) {
  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader>Recent Events</CardHeader>
      <CardBody className="p-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <EmptyState message="No events recorded" />
        ) : (
          <div className="ticket-mono">
            {/* Header */}
            <div className="flex items-center border-b border-zinc-700/40 text-[9px] uppercase tracking-widest text-zinc-500">
              <div className="w-20 shrink-0 px-3 py-2">Severity</div>
              <div className="w-36 shrink-0 px-3 py-2">Time</div>
              <div className="w-32 shrink-0 px-3 py-2">Agent</div>
              <div className="w-28 shrink-0 px-3 py-2">Type</div>
              <div className="flex-1 px-3 py-2">Message</div>
            </div>
            {/* Rows */}
            {events.slice(0, 20).map((event) => (
              <div key={event.id} className={`flex items-center border-b border-dotted border-zinc-700/20 text-xs ${rowTint[event.severity]}`}>
                <div className={`w-20 shrink-0 px-3 py-2 font-bold uppercase ${severityColor[event.severity]}`}>
                  {event.severity}
                </div>
                <div className="w-36 shrink-0 px-3 py-2 text-zinc-500">{formatTime(event.created_at)}</div>
                <div className="w-32 shrink-0 px-3 py-2 text-zinc-200 lowercase">{event.hostname ?? "—"}</div>
                <div className="w-28 shrink-0 px-3 py-2 text-zinc-500">{event.event_type.replace(/_/g, " ")}</div>
                <div className="flex-1 px-3 py-2 text-zinc-400 truncate">{event.message || "—"}</div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
