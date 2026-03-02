import type { Severity } from "../../lib/types";

const severityColor: Record<Severity, string> = {
  info: "text-zinc-500",
  low: "text-blue-400",
  medium: "text-amber-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`ticket-mono text-[10px] font-bold uppercase tracking-wide ${severityColor[severity]}`}>
      {severity}
    </span>
  );
}
