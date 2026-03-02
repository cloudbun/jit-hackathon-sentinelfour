import { useState, useCallback } from "react";
import { getAgents, deleteAgent } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { usePolling } from "../../hooks/usePolling";
import { PageHeader } from "../layout/PageHeader";
import { AgentCard } from "./AgentCard";
import { AgentDetailModal } from "./AgentDetailModal";
import { AddAgentForm } from "./AddAgentForm";
import { EmptyState } from "../shared/EmptyState";
import type { Agent, AgentStatus } from "../../lib/types";

export function AgentsPage() {
  const [filter, setFilter] = useState<AgentStatus | "">("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const { data: agents, refetch } = useApi(
    () => getAgents(filter || undefined),
    [filter]
  );

  usePolling(refetch);

  const handleDelete = useCallback(async (id: number) => {
    await deleteAgent(id);
    refetch();
  }, [refetch]);

  const filters: { label: string; value: AgentStatus | "" }[] = [
    { label: "All", value: "" },
    { label: "Healthy", value: "online" },
    { label: "Unhealthy", value: "offline" },
    { label: "Alert", value: "alert" },
  ];

  return (
    <div>
      <PageHeader
        title="Agents"
        description="Manage endpoint security agents"
        action={<AddAgentForm onCreated={refetch} />}
      />

      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!agents || agents.length === 0 ? (
        <EmptyState message="No agents found. Add one to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onSelect={setSelectedAgent} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {selectedAgent && (
        <AgentDetailModal agentId={selectedAgent.id} onClose={() => setSelectedAgent(null)} />
      )}
    </div>
  );
}
