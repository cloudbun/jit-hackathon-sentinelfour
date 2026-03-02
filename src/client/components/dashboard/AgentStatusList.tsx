import type { Agent, AgentStatus } from "../../lib/types";
import { Card, CardHeader, CardBody } from "../shared/Card";
import { EmptyState } from "../shared/EmptyState";

const statusColor: Record<AgentStatus, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  alert: "#eab308",
};

const statusLabel: Record<AgentStatus, string> = {
  online: "HEALTHY",
  offline: "UNHEALTHY",
  alert: "ALERT",
};

export function AgentStatusList({ agents }: { agents: Agent[] }) {
  return (
    <Card>
      <CardHeader>Agent Status</CardHeader>
      <CardBody className="p-0">
        {agents.length === 0 ? (
          <EmptyState message="No agents registered" />
        ) : (
          <div className="divide-y divide-zinc-800">
            {agents.slice(0, 8).map((agent) => (
              <div key={agent.id} className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${agent.status === "alert" ? "status-blink" : ""}`}
                    style={{ backgroundColor: statusColor[agent.status] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-medium text-zinc-200 truncate lowercase">{agent.hostname}</p>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide">{agent.ip_address} // {agent.agent_type}</p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-mono font-bold uppercase tracking-wide shrink-0"
                  style={{ color: statusColor[agent.status] }}
                >
                  {statusLabel[agent.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
