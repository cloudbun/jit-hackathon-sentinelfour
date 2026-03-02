import type { DashboardSummary } from "../../lib/types";

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  borderColor: string;
}

function StatCard({ label, value, color, borderColor }: StatCardProps) {
  return (
    <div className={`border border-l-[3px] border-zinc-700/60 bg-black px-5 py-4 ${borderColor}`}>
      <p className="ticket-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
      <p className={`ticket-mono text-4xl font-bold leading-none ${color}`}>{value}</p>
    </div>
  );
}

export function StatsGrid({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Healthy Agents"
        value={summary.agents.online}
        color="text-emerald-400"
        borderColor="border-l-emerald-500"
      />
      <StatCard
        label="Unhealthy Agents"
        value={summary.agents.offline}
        color="text-red-400"
        borderColor="border-l-red-500"
      />
      <StatCard
        label="Active Alerts"
        value={summary.agents.alert}
        color="text-amber-400"
        borderColor="border-l-amber-500"
      />
      <StatCard
        label="Threat Feeds"
        value={summary.feeds.total}
        color="text-zinc-300"
        borderColor="border-l-zinc-500"
      />
    </div>
  );
}
