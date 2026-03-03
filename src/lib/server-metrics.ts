const startedAt = Date.now();

let totalRequests = 0;
let totalErrors = 0;
const recentResponseTimes: number[] = [];
const MAX_SAMPLES = 200;

export interface WebhookUpload {
  timestamp: string;
  mode: "bulk_advisory" | "upsert";
  created: number;
  updated: number;
  matched: number;
  errors: number;
}

const recentUploads: WebhookUpload[] = [];
const MAX_UPLOADS = 20;

export function recordRequest(durationMs: number, isError: boolean) {
  totalRequests++;
  if (isError) totalErrors++;
  recentResponseTimes.push(durationMs);
  if (recentResponseTimes.length > MAX_SAMPLES) {
    recentResponseTimes.shift();
  }
}

export function recordWebhookUpload(upload: Omit<WebhookUpload, "timestamp">) {
  recentUploads.unshift({
    ...upload,
    timestamp: new Date().toISOString(),
  });
  if (recentUploads.length > MAX_UPLOADS) {
    recentUploads.pop();
  }
}

export function getMetrics() {
  const mem = process.memoryUsage();
  const sorted = [...recentResponseTimes].sort((a, b) => a - b);
  const avg = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0;

  return {
    status: "healthy" as const,
    uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    started_at: new Date(startedAt).toISOString(),
    memory: {
      rss_mb: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    },
    requests: {
      total: totalRequests,
      errors: totalErrors,
      error_rate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 10000) / 100 : 0,
    },
    response_times: {
      avg_ms: Math.round(avg * 100) / 100,
      p95_ms: Math.round(p95 * 100) / 100,
      p99_ms: Math.round(p99 * 100) / 100,
      samples: sorted.length,
    },
    runtime: {
      version: process.versions?.bun ?? process.version,
      platform: process.platform,
      pid: process.pid,
    },
    webhook_uploads: recentUploads,
  };
}
