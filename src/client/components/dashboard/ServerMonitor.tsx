import type { ServerHealth, WebhookUpload } from "../../lib/types";

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1">
      <span className="text-[10px] uppercase tracking-widest text-zinc-600">{label}</span>
      <span className="text-xs text-zinc-200 tabular-nums">
        {value}{unit && <span className="text-zinc-600 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function UploadEntry({ upload }: { upload: WebhookUpload }) {
  const hasErrors = upload.errors > 0;
  const summary = upload.mode === "bulk_advisory"
    ? `${upload.matched} matched`
    : `${upload.created} new, ${upload.updated} updated`;

  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${hasErrors ? "bg-amber-400" : "bg-emerald-400"}`} />
          <span className="text-[10px] uppercase text-zinc-400">
            {upload.mode === "bulk_advisory" ? "Advisory" : "Upsert"}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 mt-0.5 pl-3">
          {summary}{hasErrors ? `, ${upload.errors} err` : ""}
        </p>
      </div>
      <span className="text-[9px] text-zinc-700 shrink-0">{timeAgo(upload.timestamp)}</span>
    </div>
  );
}

export function ServerMonitor({ health }: { health: ServerHealth | null }) {
  if (!health) return null;

  const heapPercent = health.memory.heap_total_mb > 0
    ? Math.round((health.memory.heap_used_mb / health.memory.heap_total_mb) * 100)
    : 0;

  return (
    <div className="ticket-mono divide-y divide-dotted divide-zinc-700/30">
      {/* Status row */}
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-xs text-emerald-400 uppercase tracking-widest">Healthy</span>
        <span className="ml-auto text-[10px] text-zinc-600">PID {health.runtime.pid}</span>
      </div>

      {/* Uptime & Runtime */}
      <div className="px-4 py-2.5">
        <Metric label="Uptime" value={formatUptime(health.uptime_seconds)} />
        <Metric label="Runtime" value={`Bun ${health.runtime.version}`} />
        <Metric label="Platform" value={health.runtime.platform} />
      </div>

      {/* Memory */}
      <div className="px-4 py-2.5">
        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">Memory</p>
        <div className="h-1.5 bg-zinc-800 mb-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              heapPercent > 85 ? "bg-red-400" : heapPercent > 60 ? "bg-amber-400" : "bg-emerald-400"
            }`}
            style={{ width: `${heapPercent}%` }}
          />
        </div>
        <Metric label="Heap" value={`${health.memory.heap_used_mb} / ${health.memory.heap_total_mb}`} unit="MB" />
        <Metric label="RSS" value={health.memory.rss_mb} unit="MB" />
      </div>

      {/* Requests */}
      <div className="px-4 py-2.5">
        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">Requests</p>
        <Metric label="Total" value={health.requests.total.toLocaleString()} />
        <Metric label="Errors" value={health.requests.errors.toLocaleString()} />
        <Metric
          label="Error Rate"
          value={health.requests.error_rate}
          unit="%"
        />
      </div>

      {/* Response Times */}
      <div className="px-4 py-2.5">
        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">Response Times</p>
        <Metric label="Avg" value={health.response_times.avg_ms} unit="ms" />
        <Metric label="P95" value={health.response_times.p95_ms} unit="ms" />
        <Metric label="P99" value={health.response_times.p99_ms} unit="ms" />
      </div>

      {/* Webhook Uploads */}
      <div className="px-4 py-2.5">
        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1.5">Webhook Uploads</p>
        {health.webhook_uploads.length === 0 ? (
          <p className="text-[10px] text-zinc-700 italic">No uploads yet</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {health.webhook_uploads.map((u, i) => (
              <UploadEntry key={i} upload={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
