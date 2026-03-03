# SentinelFour

Lightweight, self-hosted security operations dashboard. Monitors agents, tracks software inventory, and aggregates threat intelligence feeds — all in a single pane of glass.

## Quick Start

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
- **Software Inventory** — Catalog applications per agent with vulnerability and outdated-version flagging
- **Threat Feeds** — Aggregate RSS/Atom security feeds with automatic severity tagging by keyword
- **Webhook Integration** — Ingest application data from n8n or other automation tools via `POST /api/webhook/n8n`
- **Auto-Triage** — Visual incident response breadcrumbs based on threat level

## API

All routes are prefixed with `/api`. See [design.md](design.md) for full route documentation.

| Endpoint | Description |
|----------|-------------|
| `GET /api/dashboard/summary` | Aggregated dashboard stats |
| `GET /api/agents` | List agents |
| `GET /api/applications` | List applications (filterable) |
| `GET /api/feeds/items` | List feed items (filterable) |
| `POST /api/webhook/n8n` | Bulk upsert applications |
