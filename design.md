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
Security monitoring agents. Fields: id, hostname, ip_address, os, agent_type (server|workstation|firewall), status (online|offline|alert), threat_level (none|low|medium|high|critical), last_heartbeat, created_at, updated_at.

### `agent_events`
Event log per agent. Fields: id, agent_id (FK), event_type (heartbeat|alert|threat_detected|status_change), severity (info|low|medium|high|critical), message, metadata (JSON), created_at. Indexed on (agent_id, created_at DESC).

### `applications`
Software inventory per agent. Fields: id, agent_id (FK), name, version, vendor, category (database|web-server|runtime|security|other), status (running|stopped|vulnerable|outdated), created_at. Unique on (agent_id, name, version).

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
- `DELETE /:id` — delete application

### Dashboard (`/dashboard`)
- `GET /summary` — aggregated stats: agent counts, threat breakdown, feed/app counts, recent events & feed items

### Webhook (`/webhook`)
- `POST /n8n` — upsert applications from n8n automation (single or array), auto-creates agents by hostname, normalizes category/status

## Feed Ingestion

- Supports RSS 2.0 and Atom feeds
- Auto-tags severity by keyword (critical/zero-day/RCE → critical, exploit/vulnerability/CVE → high, patch/update/advisory → medium)
- Scheduler runs every 15 minutes, deduplicates by GUID

## Seed Data

8 pre-seeded agents (web servers, databases, cache, firewall, CI runner, dev workstation) with ~45 applications across them. Includes intentionally vulnerable/outdated entries for demo purposes.

## Client Structure

- Tab-based layout: Dashboard | Applications
- Dashboard: StatsGrid (5 stat cards), RecentEventsPanel, AgentStatusList
- Agents: AgentCard with auto-triage breadcrumb animation, AgentDetailModal, AddAgentForm
- Applications: ApplicationsTab with filters, AddApplicationForm
- Feeds: FeedItemsList with severity coloring, AddFeedForm, FeedList
- Shared: Card, StatusBadge, SeverityBadge, EmptyState, PageHeader, Sidebar

## UI Theme

Dark theme (zinc-950), monospace "ticket-mono" font, color-coded status (green/red/amber). 30-second auto-refresh polling on dashboard.
