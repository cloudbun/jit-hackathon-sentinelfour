System requirements:

# SentinelFour

## Executive Summary

SentinelFour is a lightweight, self-hosted security operations dashboard built for small-to-mid-size infrastructure teams. It consolidates three core workflows into a single pane of glass: real-time agent monitoring across servers, workstations, and firewalls; software inventory tracking with automatic vulnerability and outdated-version flagging; and threat intelligence feed aggregation from RSS/Atom sources with keyword-based severity tagging. The platform integrates with automation tools like n8n via webhook, enabling teams to keep their asset inventory up to date without manual entry. Built on Bun, Elysia, React, and SQLite, it is designed to be fast to deploy (single binary + embedded database), easy to extend, and opinionated toward operational simplicity over enterprise complexity.

## Tech Stack

- **Runtime:** Bun
- **Backend:** Elysia (TypeScript)
- **Frontend:** React 19, Vite, Tailwind CSS 4
- **Database:** SQLite (WAL mode)
- **Feed Parsing:** fast-xml-parser (RSS/Atom)

## Database Schema

### `agents`
Security monitoring agents. Fields: id, hostname (unique), ip_address, os, agent_type (server|workstation|firewall), status (online|offline|alert), threat_level (none|low|medium|high|critical), last_heartbeat, created_at, updated_at.

### `agent_events`
Event log per agent. Fields: id, agent_id (FK), event_type (heartbeat|alert|threat_detected|status_change), severity (info|low|medium|high|critical), message, metadata (JSON), created_at. Indexed on (agent_id, created_at DESC).

### `applications`
Software inventory per agent. Fields: id, agent_id (FK), name, version, vendor, category (database|web-server|runtime|security|other), status (running|stopped|vulnerable|outdated), advisory_markdown, created_at. Unique on (agent_id, name, version).

### `feeds`
Security threat feeds. Fields: id, name, url (unique), enabled, last_fetched_at, fetch_error, created_at.

### `feed_items`
Parsed feed entries with auto-tagged severity. Fields: id, feed_id (FK), title, link, description, pub_date, guid, severity (info|low|medium|high|critical), read, created_at. Unique on (feed_id, guid).

## API Routes

All prefixed with `/api`.

### Agents (`/agents`)
- `GET /` — list agents (optional `?status=` filter)
- `GET /:id` — agent detail + last 50 events
- `POST /` — create agent
- `PUT /:id` — update agent
- `DELETE /:id` — delete agent
- `POST /:id/heartbeat` — record heartbeat, set status online
- `POST /:id/event` — create event, auto-escalate on high/critical severity

### Feeds (`/feeds`)
- `GET /` — list feeds with item counts
- `POST /` — add feed (triggers background fetch)
- `DELETE /:id` — delete feed
- `POST /:id/refresh` — refresh single feed
- `POST /refresh-all` — refresh all enabled feeds
- `GET /items?limit=50&offset=0&severity=` — list feed items with filtering

### Applications (`/applications`)
- `GET /summary` — stats: total, unique names, breakdown by status/category
- `GET /?status=&category=&search=` — list with filters
- `POST /` — create application
- `PUT /:id` — update application (version, status, vendor, category, advisory_markdown)
- `DELETE /:id` — delete application

### Dashboard (`/dashboard`)
- `GET /summary` — aggregated stats: agent counts, threat breakdown, feed/app counts, recent events & feed items

### Server (`/server`)
- `GET /health` — API server health: uptime, memory (RSS/heap), request count, error rate, response time percentiles (avg/p95/p99), runtime info (Bun version, platform, PID), recent webhook upload history

### Webhook (`/webhook`)
- `POST /n8n` — upsert applications from n8n automation (single or array), auto-creates agents by hostname, normalizes category/status. Bulk advisories are also inserted as feed items under the "n8n Advisories" feed with auto-tagged severity.

## Feed Ingestion

- Supports RSS 2.0 and Atom feeds
- Auto-tags severity by keyword (critical/zero-day/RCE → critical, exploit/vulnerability/CVE → high, patch/update/advisory → medium)
- Scheduler runs every 15 minutes, upserts by GUID (updates existing items with latest content)
- Webhook advisories are added to a dedicated "n8n Advisories" feed (enabled=0, so the RSS scheduler skips it)

## Seed Data

10 pre-seeded agents (web servers, databases, cache, firewall, CI runner, dev workstation, log collector, VPN gateway) with ~54 applications across them. Every alert and vulnerability has a clear remediation path through the API.

### Incident Resolution Playbook

| Problem | Agent | API Call |
|---------|-------|----------|
| WAF bypass / active exploit | web-02 | `PUT /agents/:id { status: "online", threat_level: "none" }` |
| ModSecurity 3.0.8 vulnerable | web-02 | `PUT /applications/:id { version: "3.0.12", status: "running", advisory_markdown: "" }` |
| PHP 8.1.27 outdated | web-02 | `PUT /applications/:id { version: "8.3.13", status: "running", advisory_markdown: "" }` |
| OpenSSL 3.0.2 outdated | web-02 | `PUT /applications/:id { version: "3.0.15", status: "running", advisory_markdown: "" }` |
| Agent offline | db-replica | `POST /agents/:id/heartbeat` |
| OpenSSL 3.0.11 outdated | db-replica | `PUT /applications/:id { version: "3.0.15", status: "running", advisory_markdown: "" }` |
| Snort 2.9.20 EOL | fw-edge | `PUT /applications/:id { version: "3.1.77.0", status: "running", advisory_markdown: "" }` |
| ClamAV 1.3.0 vulnerable | dev-ws-01 | `PUT /applications/:id { version: "1.3.1", status: "running", advisory_markdown: "" }` |
| Elevated threat level | dev-ws-01 | `PUT /agents/:id { threat_level: "none" }` |
| Agent offline (disk full) | log-collector | `POST /agents/:id/heartbeat` |
| regreSSHion RCE / brute-force | vpn-gateway | `PUT /agents/:id { status: "online", threat_level: "none" }` |
| OpenSSH 9.6p1 vulnerable | vpn-gateway | `PUT /applications/:id { version: "9.8p2", status: "running", advisory_markdown: "" }` |
| OpenVPN 2.5.9 EOL | vpn-gateway | `PUT /applications/:id { version: "2.6.12", status: "running", advisory_markdown: "" }` |

## Deployment

### Docker Compose (recommended)

`docker-compose.yml` runs SentinelFour and n8n on a shared network. The n8n workflow reaches the API via `http://sentinelfour:3000`. Dashboard at `:3000`, n8n at `:5678`.

### Standalone Docker

`run.sh` manages a single container. Use `./run.sh compose` for the full stack with n8n.

## Client Structure

- Tab-based layout: Dashboard | Applications
- Dashboard: StatsGrid (5 stat cards), ServerMonitor (API health panel), RecentEventsPanel, AgentStatusList
- Agents: AgentCard with auto-triage breadcrumb animation, AgentDetailModal, AddAgentForm
- Applications: ApplicationsTab with filters, AddApplicationForm
- Feeds: FeedItemsList with severity coloring, AddFeedForm, FeedList
- Shared: Card, StatusBadge, SeverityBadge, EmptyState, PageHeader, Sidebar

## UI Theme

Dark theme (zinc-950), monospace "ticket-mono" font, color-coded status (green/red/amber). 30-second auto-refresh polling on dashboard.
