import { useState, useMemo } from "react";
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
  low: "bg-blue-500/5",
  medium: "bg-amber-500/10 border-l-2 border-l-amber-500/40",
  high: "bg-orange-500/15 border-l-2 border-l-orange-500/60",
  critical: "bg-red-500/20 border-l-2 border-l-red-500/70",
};

const severityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

type SortField = "time" | "severity" | "agent" | "type";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block ${active ? "text-zinc-300" : "text-zinc-700"}`}>
      {active ? (dir === "desc" ? "▼" : "▲") : "▽"}
    </span>
  );
}

export function RecentEventsPanel({ events, className = "" }: { events: AgentEvent[]; className?: string }) {
  const [sortField, setSortField] = useState<SortField>("time");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const list = events.slice(0, 20);
    const dir = sortDir === "desc" ? -1 : 1;

    return [...list].sort((a, b) => {
      switch (sortField) {
        case "severity":
          return ((severityRank[a.severity] ?? 0) - (severityRank[b.severity] ?? 0)) * dir;
        case "agent":
          return (a.hostname ?? "").localeCompare(b.hostname ?? "") * dir;
        case "type":
          return a.event_type.localeCompare(b.event_type) * dir;
        case "time":
        default:
          return a.created_at.localeCompare(b.created_at) * dir;
      }
    });
  }, [events, sortField, sortDir]);

  const headerBtn = (field: SortField, label: string) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center hover:text-zinc-300 transition-colors"
    >
      {label}
      <SortIcon active={sortField === field} dir={sortDir} />
    </button>
  );

  return (
    <Card className={`flex flex-col ${className}`}>
      <CardHeader>Recent Events</CardHeader>
      <CardBody className="p-0 flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <EmptyState message="No events recorded" />
        ) : (
          <div className="ticket-mono">
            {/* Header */}
            <div className="flex items-center border-b border-zinc-700/40 text-[9px] uppercase tracking-widest text-zinc-500 select-none">
              <div className="w-20 shrink-0 px-3 py-2">{headerBtn("severity", "Severity")}</div>
              <div className="w-36 shrink-0 px-3 py-2">{headerBtn("time", "Time")}</div>
              <div className="w-32 shrink-0 px-3 py-2">{headerBtn("agent", "Agent")}</div>
              <div className="w-28 shrink-0 px-3 py-2">{headerBtn("type", "Type")}</div>
              <div className="flex-1 px-3 py-2">Message</div>
            </div>
            {/* Rows */}
            {sorted.map((event) => (
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
