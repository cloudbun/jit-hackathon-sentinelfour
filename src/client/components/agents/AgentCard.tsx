import type { Agent, AgentStatus, ThreatLevel } from "../../lib/types";

const statusColor: Record<AgentStatus, string> = {
  online: "#22c55e",
  offline: "#ef4444",
  alert: "#eab308",
};

const statusLabel: Record<AgentStatus, string> = {
  online: "HEALTHY_CONNECTED",
  offline: "UNHEALTHY_OFFLINE",
  alert: "ALERT_TRIGGERED",
};

const cardStyles: Record<AgentStatus, string> = {
  online: "border-l-emerald-500 border-zinc-700/60 bg-black",
  offline: "border-l-red-500 bg-red-950/30 border-red-500/30 border-pulse-red",
  alert: "border-l-yellow-500 bg-amber-950/20 border-amber-500/25 border-pulse-amber",
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "NEVER";
  const d = new Date(dateStr + "Z");
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s AGO`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h AGO`;
  return `${Math.floor(diff / 86400)}d AGO`;
}

// Auto-triage steps generated based on threat level
interface TriageStep {
  label: string;
  status: "done" | "active" | "pending";
}

function getTriageSteps(threatLevel: ThreatLevel): TriageStep[] {
  const base: TriageStep[] = [
    { label: "DETECT", status: "done" },
    { label: "ISOLATE", status: "done" },
    { label: "ANALYZE", status: "done" },
  ];

  if (threatLevel === "critical") {
    return [
      ...base,
      { label: "CONTAIN", status: "active" },
      { label: "ESCALATE", status: "pending" },
      { label: "REMEDIATE", status: "pending" },
    ];
  }
  if (threatLevel === "high") {
    return [
      ...base,
      { label: "CONTAIN", status: "active" },
      { label: "REMEDIATE", status: "pending" },
    ];
  }
  return [
    ...base,
    { label: "MONITOR", status: "active" },
    { label: "RESOLVE", status: "pending" },
  ];
}

const stepColor: Record<TriageStep["status"], string> = {
  done: "text-emerald-400",
  active: "text-amber-400",
  pending: "text-zinc-600",
};

const dotColor: Record<TriageStep["status"], string> = {
  done: "bg-emerald-400",
  active: "bg-amber-400",
  pending: "bg-zinc-700",
};

function TriageBreadcrumb({ threatLevel }: { threatLevel: ThreatLevel }) {
  const steps = getTriageSteps(threatLevel);

  return (
    <div className="border-t border-dotted border-amber-500/20 px-4 py-2.5 bg-amber-950/10">
      <p className="text-[8px] uppercase tracking-[3px] text-amber-500/60 mb-2">Auto-Triage</p>
      <div className="flex items-center gap-0">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            {/* Step */}
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor[step.status]} ${step.status === "active" ? "status-blink" : ""}`} />
              <span className={`text-[10px] font-bold uppercase tracking-wide ${stepColor[step.status]}`}>
                {step.label}
              </span>
            </div>
            {/* Connector */}
            {i < steps.length - 1 && (
              <span className={`mx-1.5 text-[10px] ${i < steps.findIndex(s => s.status === "active") ? "text-emerald-400/40" : "text-zinc-700"}`}>
                &rarr;
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentCard({ agent, onSelect, onDelete }: { agent: Agent; onSelect: (a: Agent) => void; onDelete: (id: number) => void }) {
  const color = statusColor[agent.status];
  const isAlert = agent.status === "alert";

  return (
    <div
      onClick={() => onSelect(agent)}
      className={`group relative cursor-pointer border border-l-[3px] ticket-mono transition-all hover:shadow-[4px_4px_0px_rgba(255,255,255,0.05)] ${cardStyles[agent.status]}`}
    >
      {/* Header row */}
      <div className="flex items-baseline justify-between border-b border-dotted border-zinc-700/40 px-4 py-2.5">
        <span className="text-base font-bold tracking-tight lowercase text-zinc-100">{agent.hostname}</span>
        <span className="text-xs opacity-60 uppercase">{agent.os || "UNKNOWN"}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {/* Status line */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${agent.status !== "online" ? "status-blink" : ""}`}
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-bold uppercase tracking-wide" style={{ color }}>{statusLabel[agent.status]}</span>
        </div>

        {/* Data rows */}
        <div className="space-y-0">
          <div className="flex justify-between border-b border-dotted border-zinc-700/30 py-1">
            <span className="text-xs opacity-60">IP_ADDR</span>
            <span className="text-sm font-bold">{agent.ip_address}</span>
          </div>
          <div className="flex justify-between border-b border-dotted border-zinc-700/30 py-1">
            <span className="text-xs opacity-60">AGENT_TYPE</span>
            <span className="text-sm font-bold uppercase">{agent.agent_type}</span>
          </div>
          {agent.threat_level !== "none" && (
            <div className="flex justify-between border-b border-dotted border-zinc-700/30 py-1">
              <span className="text-xs opacity-60">THREAT_LVL</span>
              <span className="text-sm font-bold uppercase" style={{ color }}>{agent.threat_level}</span>
            </div>
          )}
          <div className="flex justify-between py-1">
            <span className="text-xs opacity-60">KEEPALIVE</span>
            <span className="text-sm font-bold">{timeAgo(agent.last_heartbeat)}</span>
          </div>
        </div>
      </div>

      {/* Triage breadcrumb — animated reveal on hover for alert agents */}
      {isAlert && (
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-200 ease-out">
          <div className="overflow-hidden">
            <TriageBreadcrumb threatLevel={agent.threat_level} />
          </div>
        </div>
      )}

      {/* Delete action */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(agent.id); }}
        className="absolute top-2.5 right-3 text-xs uppercase opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
      >
        [X]
      </button>
    </div>
  );
}
