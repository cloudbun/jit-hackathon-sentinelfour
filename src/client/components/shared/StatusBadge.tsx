import type { AgentStatus } from "../../lib/types";

const statusColor: Record<AgentStatus, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  alert: "#eab308",
};

const statusLabels: Record<AgentStatus, string> = {
  online: "HEALTHY",
  offline: "UNHEALTHY",
  alert: "ALERT",
};

export function StatusBadge({ status }: { status: AgentStatus }) {
  const color = statusColor[status];
  return (
    <span className="ticket-mono inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
      <span
        className={`h-2 w-2 rounded-full ${status !== "online" ? "status-blink" : ""}`}
        style={{ backgroundColor: color }}
      />
      {statusLabels[status]}
    </span>
  );
}
