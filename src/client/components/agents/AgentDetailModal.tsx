import { useEffect } from "react";
import type { Severity } from "../../lib/types";
import { getAgent } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { StatusBadge } from "../shared/StatusBadge";
import { SeverityBadge } from "../shared/SeverityBadge";

const rowTint: Record<Severity, string> = {
  info: "",
  low: "",
  medium: "",
  high: "bg-orange-500/5",
  critical: "bg-red-500/8",
};

export function AgentDetailModal({ agentId, onClose }: { agentId: number; onClose: () => void }) {
  const { data: agent, loading } = useApi(() => getAgent(agentId), [agentId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-zinc-700/60 bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !agent ? (
          <div className="flex items-center justify-center h-48 ticket-mono text-zinc-600 text-[10px] uppercase tracking-widest">
            Loading...
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-dotted border-zinc-700/40 px-5 py-4">
              <div className="ticket-mono">
                <h2 className="text-lg font-bold text-zinc-100 lowercase">{agent.hostname}</h2>
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">{agent.ip_address} // {agent.os || "Unknown OS"}</p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={agent.status} />
                {agent.threat_level !== "none" && <SeverityBadge severity={agent.threat_level} />}
                <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-5 py-4">
              {/* Info grid */}
              <div className="grid grid-cols-3 gap-3 mb-5 ticket-mono">
                <div className="border border-zinc-700/40 px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">Agent_Type</p>
                  <p className="text-sm font-bold text-zinc-200 uppercase mt-1">{agent.agent_type}</p>
                </div>
                <div className="border border-zinc-700/40 px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">Last_Keepalive</p>
                  <p className="text-sm font-bold text-zinc-200 mt-1">
                    {agent.last_heartbeat ? new Date(agent.last_heartbeat + "Z").toLocaleString() : "NEVER"}
                  </p>
                </div>
                <div className="border border-zinc-700/40 px-4 py-3">
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">Registered</p>
                  <p className="text-sm font-bold text-zinc-200 mt-1">
                    {new Date(agent.created_at + "Z").toLocaleDateString()}
                  </p>
                </div>
              </div>

              <h3 className="ticket-mono text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-3 border-b border-dotted border-zinc-700/40 pb-2">
                Event Log
              </h3>
              {agent.events.length === 0 ? (
                <p className="ticket-mono text-[10px] text-zinc-600 py-6 text-center uppercase tracking-widest">No events recorded</p>
              ) : (
                <div className="space-y-0 ticket-mono">
                  {agent.events.map((event) => (
                    <div key={event.id} className={`flex items-center justify-between border-b border-dotted border-zinc-700/20 py-2 ${rowTint[event.severity]}`}>
                      <div className="flex items-center gap-3">
                        <SeverityBadge severity={event.severity} />
                        <span className="text-xs text-zinc-300">{event.message || event.event_type.replace(/_/g, " ")}</span>
                      </div>
                      <span className="text-[10px] text-zinc-600">{new Date(event.created_at + "Z").toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
