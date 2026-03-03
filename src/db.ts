import { Database } from "bun:sqlite";

const dbPath = process.env.DATABASE_PATH ?? "data.db";
export const db = new Database(dbPath, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    os TEXT NOT NULL DEFAULT '',
    agent_type TEXT NOT NULL CHECK(agent_type IN ('server', 'workstation', 'firewall')) DEFAULT 'server',
    status TEXT NOT NULL CHECK(status IN ('online', 'offline', 'alert')) DEFAULT 'offline',
    threat_level TEXT NOT NULL CHECK(threat_level IN ('none', 'low', 'medium', 'high', 'critical')) DEFAULT 'none',
    last_heartbeat TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK(event_type IN ('heartbeat', 'alert', 'threat_detected', 'status_change')),
    severity TEXT NOT NULL CHECK(severity IN ('info', 'low', 'medium', 'high', 'critical')) DEFAULT 'info',
    message TEXT NOT NULL DEFAULT '',
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_agent_events_agent_created
    ON agent_events(agent_id, created_at DESC);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '',
    vendor TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL CHECK(category IN ('database', 'web-server', 'runtime', 'security', 'other')) DEFAULT 'other',
    status TEXT NOT NULL CHECK(status IN ('running', 'stopped', 'vulnerable', 'outdated')) DEFAULT 'running',
    advisory_markdown TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(agent_id, name, version)
  );
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_applications_agent_created
    ON applications(agent_id, created_at DESC);
`);

// Migration: add advisory_markdown column if it doesn't exist yet
try {
  db.exec("ALTER TABLE applications ADD COLUMN advisory_markdown TEXT NOT NULL DEFAULT ''");
} catch {
  // Column already exists — ignore
}

db.exec(`
  CREATE TABLE IF NOT EXISTS feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    enabled INTEGER NOT NULL DEFAULT 1,
    last_fetched_at TEXT,
    fetch_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS feed_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feed_id INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    pub_date TEXT,
    guid TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('info', 'low', 'medium', 'high', 'critical')) DEFAULT 'info',
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(feed_id, guid)
  );
`);

// Seed default threat-intel feeds if none exist
const feedCount = db.query("SELECT COUNT(*) as count FROM feeds").get() as { count: number };
if (feedCount.count === 0) {
  const defaultFeeds: [string, string][] = [
    ["CISA Advisories",            "https://www.cisa.gov/cybersecurity-advisories/all.xml"],
    ["CISA ICS Advisories",        "https://www.cisa.gov/cybersecurity-advisories/ics-advisories.xml"],
    ["AWS Security Bulletins",     "https://aws.amazon.com/security/security-bulletins/rss/feed/"],
    ["Cisco Security Advisories",  "https://sec.cloudapps.cisco.com/security/center/xmlContent.do?url=/document/blobs/rss/latest_security_advisories.xml"],
    ["Palo Alto Security Advisories", "https://security.paloaltonetworks.com/rss.xml"],
  ];

  const insertFeed = db.prepare("INSERT INTO feeds (name, url) VALUES (?, ?)");
  for (const [name, url] of defaultFeeds) {
    insertFeed.run(name, url);
  }
}
