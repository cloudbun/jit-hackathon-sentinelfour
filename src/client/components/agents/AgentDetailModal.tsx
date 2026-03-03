import { useEffect, useState } from "react";
import type { Severity, ThreatLevel } from "../../lib/types";
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

interface TriageAction {
  id: string;
  label: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "pending" | "running" | "complete";
  timestamp?: string;
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

const actionSeverityColors: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  critical: { dot: "bg-red-400",    text: "text-red-400",    bg: "bg-red-500/10",    border: "border-l-red-500/60" },
  high:     { dot: "bg-orange-400", text: "text-orange-400", bg: "bg-orange-500/10", border: "border-l-orange-500/60" },
  medium:   { dot: "bg-amber-400",  text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-l-amber-500/60" },
  low:      { dot: "bg-blue-400",   text: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-l-blue-500/60" },
};

const statusIcons: Record<string, string> = {
  pending: "○",
  running: "◎",
  complete: "●",
};

function getTriageActions(threatLevel: ThreatLevel, hostname: string): TriageAction[] {
  const base: TriageAction[] = [
    { id: "isolate",   label: "Isolate host from network",         description: `Apply network ACL to quarantine ${hostname} — block all non-management traffic`, severity: "critical", status: "complete", timestamp: "2m ago" },
    { id: "snapshot",  label: "Capture forensic snapshot",         description: "Memory dump + disk image captured for incident analysis", severity: "critical", status: "complete", timestamp: "1m ago" },
    { id: "killproc",  label: "Terminate suspicious processes",    description: "Kill anomalous outbound connections and unauthorized child processes", severity: "high", status: "running" },
  ];

  if (threatLevel === "critical" || threatLevel === "high") {
    return [
      ...base,
      { id: "block_ip",  label: "Block attacker IPs at firewall",  description: "Push IOC IPs (45.33.32.156, 198.51.100.23) to fw-edge deny list", severity: "high",   status: "pending" },
      { id: "patch",     label: "Apply emergency patches",         description: "Queue CVE-2024-1019 (ModSecurity) and PHP 8.3 upgrade for immediate deployment", severity: "high",   status: "pending" },
      { id: "rotate",    label: "Rotate compromised credentials",  description: "Invalidate API keys, session tokens, and DB credentials exposed on this host", severity: "high",   status: "pending" },
      { id: "scan",      label: "Sweep lateral movement indicators", description: "Scan adjacent hosts (web-01, db-master) for IOCs from this incident", severity: "medium", status: "pending" },
      { id: "escalate",  label: "Escalate to SOC team",            description: "Create incident ticket with forensic artifacts and timeline for Tier 2 review", severity: "medium", status: "pending" },
      { id: "report",    label: "Generate incident report",        description: "Compile timeline, affected assets, and remediation steps into PDF", severity: "low",    status: "pending" },
    ];
  }

  return [
    ...base,
    { id: "scan",    label: "Run vulnerability assessment",  description: `Full CVE scan on ${hostname} to identify additional exposure`, severity: "medium", status: "pending" },
    { id: "monitor", label: "Enable enhanced monitoring",     description: "Increase log verbosity and enable packet capture for 24h", severity: "low",    status: "pending" },
    { id: "report",  label: "Generate incident report",       description: "Compile timeline and affected assets summary", severity: "low",    status: "pending" },
  ];
}

function TriageActionsPanel({ threatLevel, hostname }: { threatLevel: ThreatLevel; hostname: string }) {
  const [actions, setActions] = useState<TriageAction[]>(() => getTriageActions(threatLevel, hostname));

  const handleExecute = (id: string) => {
    setActions(prev => prev.map(a => {
      if (a.id === id && a.status === "pending") {
        return { ...a, status: "running" as const };
      }
      return a;
    }));
    // Simulate completion after delay
    setTimeout(() => {
      setActions(prev => prev.map(a => {
        if (a.id === id && a.status === "running") {
          return { ...a, status: "complete" as const, timestamp: "just now" };
        }
        return a;
      }));
    }, 1500 + Math.random() * 1500);
  };

  const handleExecuteAll = () => {
    const pending = actions.filter(a => a.status === "pending");
    pending.forEach((a, i) => {
      setTimeout(() => handleExecute(a.id), i * 800);
    });
  };

  const pendingCount = actions.filter(a => a.status === "pending").length;
  const completeCount = actions.filter(a => a.status === "complete").length;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between border-b border-dotted border-amber-500/30 pb-2 mb-3">
        <h3 className="ticket-mono text-[9px] font-bold uppercase tracking-widest text-amber-400">
          Triage Actions
          <span className="text-zinc-600 ml-2">{completeCount}/{actions.length} complete</span>
        </h3>
        {pendingCount > 0 && (
          <button
            onClick={handleExecuteAll}
            className="ticket-mono text-[9px] uppercase tracking-wide px-2.5 py-1 border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            Execute All ({pendingCount})
          </button>
        )}
      </div>
      <div className="space-y-0">
        {actions.map((action) => {
          const colors = actionSeverityColors[action.severity];
          return (
            <div
              key={action.id}
              className={`flex items-start gap-3 border-l-2 ${colors.border} ${action.status === "complete" ? "opacity-60" : ""} ${colors.bg} px-3 py-2.5 mb-px`}
            >
              <span className={`mt-0.5 text-xs ${action.status === "complete" ? "text-emerald-400" : action.status === "running" ? "text-amber-400 status-blink" : "text-zinc-600"}`}>
                {statusIcons[action.status]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${action.status === "complete" ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                    {action.label}
                  </span>
                  <span className={`text-[9px] uppercase font-bold ${colors.text}`}>{action.severity}</span>
                  {action.timestamp && (
                    <span className="text-[9px] text-zinc-600">{action.timestamp}</span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{action.description}</p>
              </div>
              {action.status === "pending" && (
                <button
                  onClick={() => handleExecute(action.id)}
                  className="ticket-mono text-[9px] uppercase tracking-wide px-2 py-1 border border-zinc-700/60 text-zinc-500 hover:text-zinc-200 hover:border-zinc-500 transition-colors shrink-0 mt-0.5"
                >
                  Run
                </button>
              )}
              {action.status === "running" && (
                <span className="ticket-mono text-[9px] uppercase tracking-wide text-amber-400 status-blink shrink-0 mt-1 px-2">
                  Running...
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

              {agent.status === "alert" && agent.threat_level !== "none" && (
                <TriageActionsPanel threatLevel={agent.threat_level} hostname={agent.hostname} />
              )}

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
