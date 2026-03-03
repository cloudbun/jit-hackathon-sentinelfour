import { db } from "./db";

const agents = [
  { hostname: "web-01",    ip_address: "10.0.1.10", os: "Ubuntu 22.04 LTS",     agent_type: "server" },
  { hostname: "web-02",    ip_address: "10.0.1.11", os: "Ubuntu 22.04 LTS",     agent_type: "server" },
  { hostname: "db-master", ip_address: "10.0.2.10", os: "Debian 12",            agent_type: "server" },
  { hostname: "db-replica",ip_address: "10.0.2.11", os: "Debian 12",            agent_type: "server" },
  { hostname: "cache-01",  ip_address: "10.0.3.10", os: "Alpine 3.19",          agent_type: "server" },
  { hostname: "fw-edge",   ip_address: "10.0.0.1",  os: "pfSense 2.7",         agent_type: "firewall" },
  { hostname: "ci-runner", ip_address: "10.0.4.10", os: "Ubuntu 24.04 LTS",     agent_type: "server" },
  { hostname: "dev-ws-01", ip_address: "10.0.5.10", os: "macOS 15.3",           agent_type: "workstation" },
  { hostname: "log-collector", ip_address: "10.0.6.10", os: "Ubuntu 22.04 LTS", agent_type: "server" },
  { hostname: "vpn-gateway",   ip_address: "10.0.0.5",  os: "Ubuntu 24.04 LTS", agent_type: "server" },
] as const;

const insertAgent = db.prepare(
  "INSERT OR IGNORE INTO agents (hostname, ip_address, os, agent_type, status, threat_level) VALUES (?, ?, ?, ?, ?, ?)"
);

const agentIds: Record<string, number> = {};

for (const a of agents) {
  const status = a.hostname === "web-02" ? "alert"
    : a.hostname === "db-replica" ? "offline"
    : a.hostname === "log-collector" ? "offline"
    : a.hostname === "vpn-gateway" ? "alert"
    : "online";
  const threat = a.hostname === "web-02" ? "high"
    : a.hostname === "dev-ws-01" ? "medium"
    : a.hostname === "vpn-gateway" ? "critical"
    : "none";
  insertAgent.run(a.hostname, a.ip_address, a.os, a.agent_type, status, threat);
  const row = db.query("SELECT id FROM agents WHERE hostname = ?").get(a.hostname) as { id: number };
  agentIds[a.hostname] = row.id;
}

// Set last_heartbeat for online agents
const now = new Date();
for (const a of agents) {
  if (a.hostname === "db-replica" || a.hostname === "log-collector") continue; // offline, no heartbeat
  const ago = a.hostname === "web-02" ? 180_000 : a.hostname === "vpn-gateway" ? 120_000 : Math.floor(Math.random() * 60_000);
  const hb = new Date(now.getTime() - ago).toISOString().replace("T", " ").slice(0, 19);
  db.prepare("UPDATE agents SET last_heartbeat = ? WHERE id = ?").run(hb, agentIds[a.hostname]);
}

// Seed agent events
const insertEvent = db.prepare(
  "INSERT INTO agent_events (agent_id, event_type, severity, message, created_at) VALUES (?, ?, ?, ?, ?)"
);

function minutesAgo(m: number): string {
  return new Date(now.getTime() - m * 60_000).toISOString().replace("T", " ").slice(0, 19);
}

const events: { agent: string; type: string; severity: string; message: string; minutesAgo: number }[] = [
  // ── web-02 alert chain ──
  // Resolution: PUT /agents/:id { status: "online", threat_level: "none" }
  //             PUT /applications/:id { version: "3.0.12", status: "running", advisory_markdown: "" } (ModSecurity)
  //             PUT /applications/:id { version: "8.3.13", status: "running", advisory_markdown: "" } (PHP)
  //             PUT /applications/:id { version: "3.0.15", status: "running", advisory_markdown: "" } (OpenSSL)
  { agent: "web-02", type: "threat_detected", severity: "critical", message: "WAF bypass attempt detected — ModSecurity CVE-2024-1019 exploit pattern matched on /api/admin", minutesAgo: 3 },
  { agent: "web-02", type: "alert",           severity: "high",     message: "Suspicious POST payload bypassed ModSecurity rules, request forwarded to origin", minutesAgo: 3 },
  { agent: "web-02", type: "threat_detected", severity: "high",     message: "Anomalous outbound connection to 45.33.32.156:8443 from Apache worker pid 2847", minutesAgo: 2 },
  { agent: "web-02", type: "status_change",   severity: "high",     message: "Agent status changed: online → alert (auto-triage initiated)", minutesAgo: 2 },
  { agent: "web-02", type: "alert",           severity: "critical", message: "PHP deserialization payload detected in POST body — potential RCE via outdated PHP 8.1.27", minutesAgo: 1 },

  // ── fw-edge — blocked traffic ──
  // Resolution: no agent action needed (already online), but Snort needs upgrade
  //             PUT /applications/:id { version: "3.1.77.0", status: "running", advisory_markdown: "" } (Snort)
  { agent: "fw-edge", type: "alert",           severity: "medium",   message: "Suricata IDS: 47 blocked inbound scan attempts from 192.168.1.0/24 in last 5 min", minutesAgo: 8 },
  { agent: "fw-edge", type: "threat_detected", severity: "medium",   message: "Snort alert SID:1-42340 — potential SQL injection in HTTP query string", minutesAgo: 15 },
  { agent: "fw-edge", type: "heartbeat",       severity: "info",     message: "Firewall health check: 12,847 rules active, 99.2% packet inspection rate", minutesAgo: 1 },

  // ── dev-ws-01 — ClamAV vulnerability ──
  // Resolution: PUT /agents/:id { threat_level: "none" }
  //             PUT /applications/:id { version: "1.3.1", status: "running", advisory_markdown: "" } (ClamAV)
  { agent: "dev-ws-01", type: "threat_detected", severity: "high",   message: "ClamAV 1.3.0 vulnerable to CVE-2024-20328 (command injection) — update to 1.3.1+", minutesAgo: 45 },
  { agent: "dev-ws-01", type: "alert",           severity: "medium", message: "Potentially malicious file quarantined: /tmp/.cache/x86_dropper.bin (Trojan.Generic)", minutesAgo: 30 },

  // ── db-master — normal operations ──
  { agent: "db-master", type: "heartbeat", severity: "info",   message: "PostgreSQL 16.2 healthy — 142 active connections, replication lag 0ms", minutesAgo: 1 },
  { agent: "db-master", type: "alert",     severity: "low",    message: "pg_stat_monitor: query runtime exceeded 5s threshold on 3 queries in last hour", minutesAgo: 20 },

  // ── db-replica — offline ──
  // Resolution: POST /agents/:id/heartbeat (brings it online)
  //             PUT /applications/:id { version: "3.0.15", status: "running", advisory_markdown: "" } (OpenSSL)
  { agent: "db-replica", type: "status_change", severity: "medium", message: "Agent status changed: online → offline (heartbeat timeout 120s exceeded)", minutesAgo: 60 },
  { agent: "db-replica", type: "alert",         severity: "medium", message: "Replication stream disconnected — standby is 247 WAL segments behind", minutesAgo: 58 },

  // ── ci-runner — routine ──
  { agent: "ci-runner", type: "heartbeat",       severity: "info", message: "Docker Engine healthy — 8 containers running, 2.1GB memory used", minutesAgo: 1 },
  { agent: "ci-runner", type: "alert",           severity: "low",  message: "Trivy scan: 3 new CVEs found in node:20-slim base image (2 medium, 1 low)", minutesAgo: 12 },
  { agent: "ci-runner", type: "threat_detected", severity: "medium", message: "Container escape attempt blocked by seccomp profile on build-runner-7", minutesAgo: 90 },

  // ── web-01 — healthy heartbeats ──
  { agent: "web-01", type: "heartbeat", severity: "info", message: "nginx 1.25.4 serving 1,247 req/s — all upstreams healthy", minutesAgo: 1 },
  { agent: "web-01", type: "heartbeat", severity: "info", message: "Node.js PM2: 4/4 processes online, avg response time 23ms", minutesAgo: 2 },
  { agent: "web-01", type: "alert",     severity: "low",  message: "Fail2Ban: banned 12 IPs in last hour (SSH brute force)", minutesAgo: 5 },

  // ── cache-01 — normal ──
  { agent: "cache-01", type: "heartbeat", severity: "info",   message: "Redis 7.2.4 cluster healthy — 98.7% hit rate, 1.2GB memory used", minutesAgo: 1 },
  { agent: "cache-01", type: "alert",     severity: "low",    message: "Memcached: eviction rate elevated (142/min), consider increasing max memory", minutesAgo: 35 },

  // ── log-collector — offline (no fix needed, just an example of offline state) ──
  { agent: "log-collector", type: "heartbeat",     severity: "info",   message: "Fluentd pipeline healthy — 24,300 events/s ingested across 12 inputs", minutesAgo: 125 },
  { agent: "log-collector", type: "status_change", severity: "medium", message: "Agent status changed: online → offline (heartbeat timeout 120s exceeded)", minutesAgo: 120 },
  { agent: "log-collector", type: "alert",         severity: "high",   message: "Disk usage critical: /var/log at 97% — log rotation may have stalled", minutesAgo: 122 },

  // ── vpn-gateway — alert with critical threat, fully fixable ──
  // Resolution: PUT /agents/:id { status: "online", threat_level: "none" }
  //             PUT /applications/:id { version: "9.8p2", status: "running", advisory_markdown: "" } (OpenSSH)
  //             PUT /applications/:id { version: "2.6.12", status: "running", advisory_markdown: "" } (OpenVPN)
  { agent: "vpn-gateway", type: "threat_detected", severity: "critical", message: "OpenSSH CVE-2024-6387 (regreSSHion) — unauthenticated RCE exploit attempt detected from 203.0.113.42", minutesAgo: 5 },
  { agent: "vpn-gateway", type: "alert",           severity: "critical", message: "Brute-force SSH login attempts: 847 failed attempts from 6 unique IPs in last 10 min", minutesAgo: 4 },
  { agent: "vpn-gateway", type: "status_change",   severity: "critical", message: "Agent status changed: online → alert (auto-triage initiated)", minutesAgo: 4 },
  { agent: "vpn-gateway", type: "threat_detected", severity: "high",     message: "OpenVPN TLS handshake anomaly — potential downgrade attack on tun0 interface", minutesAgo: 2 },
];

for (const e of events) {
  const aid = agentIds[e.agent];
  if (!aid) continue;
  insertEvent.run(aid, e.type, e.severity, e.message, minutesAgo(e.minutesAgo));
}
console.log(`Seeded ${events.length} events`);

const apps: { agent: string; name: string; version: string; vendor: string; category: string; status: string; advisory_markdown?: string }[] = [
  // web-01 — all healthy
  { agent: "web-01", name: "nginx",              version: "1.25.4",   vendor: "Nginx Inc",            category: "web-server", status: "running" },
  { agent: "web-01", name: "Node.js",            version: "20.11.1",  vendor: "OpenJS Foundation",    category: "runtime",    status: "running" },
  { agent: "web-01", name: "PM2",                version: "5.3.1",    vendor: "Keymetrics",           category: "runtime",    status: "running" },
  { agent: "web-01", name: "OpenSSL",            version: "3.0.13",   vendor: "OpenSSL Project",      category: "security",   status: "running" },
  { agent: "web-01", name: "Fail2Ban",           version: "1.0.2",    vendor: "Fail2Ban",             category: "security",   status: "running" },
  { agent: "web-01", name: "Certbot",            version: "2.9.0",    vendor: "EFF",                  category: "security",   status: "running" },

  // web-02 — 3 fixable problems: PHP outdated, ModSecurity vulnerable, OpenSSL outdated
  // Fix: PUT /applications/:id { version: "8.3.13", status: "running", advisory_markdown: "" }
  { agent: "web-02", name: "Apache httpd",       version: "2.4.58",   vendor: "Apache Foundation",    category: "web-server", status: "running" },
  { agent: "web-02", name: "PHP",                version: "8.1.27",   vendor: "The PHP Group",        category: "runtime",    status: "outdated",
    advisory_markdown: `### PHP 8.1 End-of-Life Notice\n**Severity:** Medium — security-only support ended November 2024\n**Impacted:** PHP 8.1.x (all versions)\n**Fix:** Upgrade to PHP 8.3.13+\n\n---\n\n### CVE-2024-8932 — Heap Buffer Overflow in ldap_escape\n**Severity:** Critical (CVSS 9.8)\n**Impacted:** PHP < 8.3.13, < 8.2.25 — 8.1.x unpatched\n**Fix:** Upgrade to PHP 8.3.13+ or 8.2.25+` },
  // Fix: PUT /applications/:id { version: "3.0.12", status: "running", advisory_markdown: "" }
  { agent: "web-02", name: "ModSecurity",        version: "3.0.8",    vendor: "Trustwave",            category: "security",   status: "vulnerable",
    advisory_markdown: `### CVE-2024-1019 — ModSecurity WAF Bypass via URL Encoding\n**Severity:** Critical (CVSS 8.6) — active exploitation reported\n**Impacted:** ModSecurity v3 < 3.0.12\n**Fix:** Upgrade ModSecurity to v3.0.12+\n\n---\n\n### CVE-2023-38285 — Denial of Service via Crafted Rules\n**Severity:** High (CVSS 7.5)\n**Impacted:** ModSecurity v3 < 3.0.10\n**Fix:** Upgrade to ModSecurity v3.0.10+` },
  // Fix: PUT /applications/:id { version: "3.0.15", status: "running", advisory_markdown: "" }
  { agent: "web-02", name: "OpenSSL",            version: "3.0.2",    vendor: "OpenSSL Project",      category: "security",   status: "outdated",
    advisory_markdown: `### Multiple Vulnerabilities in OpenSSL 3.0.2\n**Severity:** High — 14 security fixes since this version\n**Impacted:** OpenSSL 3.0.0 through 3.0.2\n**Fix:** Upgrade to OpenSSL 3.0.15+` },
  { agent: "web-02", name: "Node.js",            version: "18.19.1",  vendor: "OpenJS Foundation",    category: "runtime",    status: "running" },
  { agent: "web-02", name: "Redis",              version: "7.0.15",   vendor: "Redis Ltd",            category: "database",   status: "running" },

  // db-master — all healthy
  { agent: "db-master", name: "PostgreSQL",      version: "16.2",     vendor: "PostgreSQL Global",    category: "database",   status: "running" },
  { agent: "db-master", name: "pgBouncer",       version: "1.22.0",   vendor: "PgBouncer",            category: "database",   status: "running" },
  { agent: "db-master", name: "pg_stat_monitor",  version: "2.0.4",   vendor: "Percona",              category: "database",   status: "running" },
  { agent: "db-master", name: "OpenSSL",         version: "3.0.13",   vendor: "OpenSSL Project",      category: "security",   status: "running" },
  { agent: "db-master", name: "WAL-G",           version: "3.0.0",    vendor: "WAL-G",                category: "database",   status: "running" },

  // db-replica — agent offline, but apps were running before disconnect
  // Fix: POST /agents/:id/heartbeat (brings agent online)
  //      PUT /applications/:id { version: "3.0.15", status: "running", advisory_markdown: "" } (OpenSSL)
  { agent: "db-replica", name: "PostgreSQL",     version: "16.2",     vendor: "PostgreSQL Global",    category: "database",   status: "running" },
  { agent: "db-replica", name: "pgBouncer",      version: "1.22.0",   vendor: "PgBouncer",            category: "database",   status: "running" },
  { agent: "db-replica", name: "OpenSSL",        version: "3.0.11",   vendor: "OpenSSL Project",      category: "security",   status: "outdated",
    advisory_markdown: `### OpenSSL 3.0.11 — Multiple Pending Fixes\n**Severity:** Medium — 4 security fixes since this version\n**Impacted:** OpenSSL 3.0.x < 3.0.15\n**Fix:** Upgrade to OpenSSL 3.0.15+` },

  // cache-01 — all healthy
  { agent: "cache-01", name: "Redis",            version: "7.2.4",    vendor: "Redis Ltd",            category: "database",   status: "running" },
  { agent: "cache-01", name: "Redis Sentinel",   version: "7.2.4",    vendor: "Redis Ltd",            category: "database",   status: "running" },
  { agent: "cache-01", name: "Memcached",        version: "1.6.23",   vendor: "Memcached",            category: "database",   status: "running" },
  { agent: "cache-01", name: "stunnel",          version: "5.72",     vendor: "stunnel",              category: "security",   status: "running" },

  // fw-edge — Snort outdated, rest healthy
  // Fix: PUT /applications/:id { version: "3.1.77.0", status: "running", advisory_markdown: "" }
  { agent: "fw-edge", name: "Suricata",          version: "7.0.3",    vendor: "OISF",                 category: "security",   status: "running" },
  { agent: "fw-edge", name: "pfSense",           version: "2.7.2",    vendor: "Netgate",              category: "security",   status: "running" },
  { agent: "fw-edge", name: "OpenVPN",           version: "2.6.8",    vendor: "OpenVPN Inc",          category: "security",   status: "running" },
  { agent: "fw-edge", name: "HAProxy",           version: "2.9.5",    vendor: "HAProxy Technologies", category: "web-server", status: "running" },
  { agent: "fw-edge", name: "Snort",             version: "2.9.20",   vendor: "Cisco Talos",          category: "security",   status: "outdated",
    advisory_markdown: `### Snort 2.x End-of-Life — Upgrade to Snort 3\n**Severity:** High — Snort 2.9.x is no longer maintained\n**Impacted:** Snort 2.9.x (all versions)\n**Fix:** Migrate to Snort 3.1.77.0+\n\n---\n\n### CVE-2021-40114 — Snort Rules Processing Memory Leak\n**Severity:** High (CVSS 7.5)\n**Impacted:** Snort 2.x < 2.9.19, Snort 3.x < 3.1.0.100\n**Fix:** Migrate to Snort 3.1.x+` },

  // ci-runner — all healthy
  { agent: "ci-runner", name: "Docker Engine",   version: "25.0.3",   vendor: "Docker Inc",           category: "runtime",    status: "running" },
  { agent: "ci-runner", name: "containerd",      version: "1.7.13",   vendor: "CNCF",                 category: "runtime",    status: "running" },
  { agent: "ci-runner", name: "GitLab Runner",   version: "16.9.1",   vendor: "GitLab",               category: "other",      status: "running" },
  { agent: "ci-runner", name: "Node.js",         version: "20.11.1",  vendor: "OpenJS Foundation",    category: "runtime",    status: "running" },
  { agent: "ci-runner", name: "Go",              version: "1.22.0",   vendor: "Google",               category: "runtime",    status: "running" },
  { agent: "ci-runner", name: "Python",          version: "3.11.8",   vendor: "PSF",                  category: "runtime",    status: "running" },
  { agent: "ci-runner", name: "Trivy",           version: "0.49.1",   vendor: "Aqua Security",        category: "security",   status: "running" },

  // log-collector — offline, apps were healthy before disconnect
  { agent: "log-collector", name: "Fluentd",          version: "1.16.3",  vendor: "Fluentd Project",      category: "other",      status: "running" },
  { agent: "log-collector", name: "Elasticsearch",    version: "8.12.2",  vendor: "Elastic",              category: "database",   status: "running" },
  { agent: "log-collector", name: "Kibana",           version: "8.12.2",  vendor: "Elastic",              category: "web-server", status: "running" },
  { agent: "log-collector", name: "OpenSSL",          version: "3.0.13",  vendor: "OpenSSL Project",      category: "security",   status: "running" },

  // vpn-gateway — OpenSSH vulnerable + OpenVPN outdated, fully fixable
  // Fix: PUT /agents/:id { status: "online", threat_level: "none" }
  //      PUT /applications/:id { version: "9.8p2", status: "running", advisory_markdown: "" } (OpenSSH)
  //      PUT /applications/:id { version: "2.6.12", status: "running", advisory_markdown: "" } (OpenVPN)
  { agent: "vpn-gateway", name: "OpenSSH",            version: "9.6p1",   vendor: "OpenBSD",              category: "security",   status: "vulnerable",
    advisory_markdown: `### CVE-2024-6387 — regreSSHion: Unauthenticated RCE in OpenSSH\n**Severity:** Critical (CVSS 8.1) — active exploitation in the wild\n**Impacted:** OpenSSH 8.5p1 through 9.7p1\n**Fix:** Upgrade to OpenSSH 9.8p2+\n\n---\n\n### CVE-2024-6409 — Race Condition in Signal Handling\n**Severity:** High (CVSS 7.0)\n**Impacted:** OpenSSH 8.7p1 through 9.7p1\n**Fix:** Upgrade to OpenSSH 9.8p2+` },
  { agent: "vpn-gateway", name: "OpenVPN",            version: "2.5.9",   vendor: "OpenVPN Inc",          category: "security",   status: "outdated",
    advisory_markdown: `### OpenVPN 2.5.x End-of-Life\n**Severity:** High — 2.5.x branch no longer receives security patches\n**Impacted:** OpenVPN 2.5.x (all versions)\n**Fix:** Upgrade to OpenVPN 2.6.12+` },
  { agent: "vpn-gateway", name: "WireGuard",          version: "1.0.20210914", vendor: "WireGuard",        category: "security",   status: "running" },
  { agent: "vpn-gateway", name: "iptables",           version: "1.8.10",  vendor: "netfilter",            category: "security",   status: "running" },
  { agent: "vpn-gateway", name: "StrongSwan",         version: "5.9.14",  vendor: "strongSwan Project",   category: "security",   status: "running" },

  // dev-ws-01 — ClamAV vulnerable, rest healthy
  // Fix: PUT /agents/:id { threat_level: "none" }
  //      PUT /applications/:id { version: "1.3.1", status: "running", advisory_markdown: "" }
  { agent: "dev-ws-01", name: "Docker Desktop",  version: "4.27.2",   vendor: "Docker Inc",           category: "runtime",    status: "running" },
  { agent: "dev-ws-01", name: "Node.js",         version: "21.6.2",   vendor: "OpenJS Foundation",    category: "runtime",    status: "running" },
  { agent: "dev-ws-01", name: "Python",          version: "3.12.2",   vendor: "PSF",                  category: "runtime",    status: "running" },
  { agent: "dev-ws-01", name: "PostgreSQL",      version: "16.2",     vendor: "PostgreSQL Global",    category: "database",   status: "running" },
  { agent: "dev-ws-01", name: "Redis",           version: "7.2.4",    vendor: "Redis Ltd",            category: "database",   status: "running" },
  { agent: "dev-ws-01", name: "ClamAV",          version: "1.3.0",    vendor: "Cisco Talos",          category: "security",   status: "vulnerable",
    advisory_markdown: `### CVE-2024-20328 — ClamAV VirusEvent Command Injection\n**Severity:** Critical (CVSS 9.8) — allows arbitrary command execution\n**Impacted:** ClamAV < 1.3.1\n**Fix:** Upgrade ClamAV to 1.3.1+\n\n---\n\n### CVE-2024-20380 — ClamAV HTML Parser Denial of Service\n**Severity:** High (CVSS 7.5)\n**Impacted:** ClamAV 1.3.0, 1.2.0–1.2.2\n**Fix:** Upgrade to ClamAV 1.3.1+` },
];

const insertApp = db.prepare(
  "INSERT OR IGNORE INTO applications (agent_id, name, version, vendor, category, status, advisory_markdown) VALUES (?, ?, ?, ?, ?, ?, ?)"
);

let count = 0;
for (const app of apps) {
  const aid = agentIds[app.agent];
  if (!aid) {
    console.error(`Unknown agent: ${app.agent}`);
    continue;
  }
  insertApp.run(aid, app.name, app.version, app.vendor, app.category, app.status, app.advisory_markdown ?? "");
  count++;
}

const total = db.query("SELECT COUNT(*) as c FROM applications").get() as { c: number };
console.log(`Seeded ${count} applications across ${agents.length} agents (${total.c} total in DB)`);
