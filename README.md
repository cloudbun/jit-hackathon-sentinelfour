# SentinelFour

Lightweight, self-hosted security operations dashboard. Monitors agents, tracks software inventory, and aggregates threat intelligence feeds — all in a single pane of glass.

## Quick Start

### Docker Compose (with n8n)

```bash
docker compose up --build
```

- Dashboard at [http://localhost:3000](http://localhost:3000)
- n8n at [http://localhost:5678](http://localhost:5678)

Import `n8n.json` into n8n to enable the advisory summarization workflow. The workflow posts to `http://sentinelfour:3000/api/webhook/n8n` over the shared Docker network.

### Standalone (without n8n)

```bash
./run.sh start
```

Opens at [http://localhost:3000](http://localhost:3000). Requires Docker.

To use a different port:

```bash
PORT=8080 ./run.sh start
```

## Commands

| Command | Description |
|---------|-------------|
| `./run.sh start` | Build image, start container, seed database |
| `./run.sh stop` | Stop and remove the container |
| `./run.sh restart` | Stop, rebuild, and start |
| `./run.sh seed` | Re-seed the database with sample data |
| `./run.sh logs` | Tail container logs |
| `./run.sh build` | Build the Docker image only |
| `./run.sh compose` | Start with Docker Compose (includes n8n) |
| `./run.sh compose-down` | Stop Docker Compose stack |

## Local Development

```bash
bun install
bun run dev
```

Runs the API server on `:3000` and Vite dev server on `:5173`.

## Tech Stack

- **Runtime:** Bun
- **Backend:** Elysia (TypeScript)
- **Frontend:** React 19, Vite, Tailwind CSS 4
- **Database:** SQLite (WAL mode)
- **Feed Parsing:** fast-xml-parser (RSS/Atom)

## Features

- **Agent Monitoring** — Track server, workstation, and firewall agents with heartbeat, status, and threat level
- **API Server Monitoring** — Live dashboard panel showing uptime, memory usage, request counts, error rates, and response time percentiles (avg/p95/p99)
- **Software Inventory** — Catalog applications per agent with vulnerability and outdated-version flagging
- **Threat Feeds** — Aggregate RSS/Atom security feeds with automatic severity tagging by keyword
- **Webhook Integration** — Ingest application data from n8n or other automation tools via `POST /api/webhook/n8n`. Advisories are also added to the threat feed.
- **Auto-Triage** — Visual incident response breadcrumbs based on threat level
- **Incident Resolution** — Every seeded alert has a clear remediation path via API (update agent status, patch application versions, send heartbeats)

## API

All routes are prefixed with `/api`. See [design.md](design.md) for full route documentation.

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard/summary` | Aggregated dashboard stats |
| `GET /api/server/health` | API server health, metrics, and webhook upload history |
| `GET /api/agents` | List agents |
| `PUT /api/agents/:id` | Update agent status/threat level |
| `POST /api/agents/:id/heartbeat` | Bring agent online |
| `GET /api/applications` | List applications (filterable) |
| `PUT /api/applications/:id` | Update application version/status/advisory |
| `GET /api/feeds/items` | List feed items (filterable) |
| `POST /api/webhook/n8n` | Bulk upsert applications + create feed items |
