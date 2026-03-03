import { Elysia, t } from "elysia";
import { db } from "../db";
import { recordWebhookUpload } from "../lib/server-metrics";
import { autoTagSeverity } from "../lib/feed-parser";

const validCategories = ["database", "web-server", "runtime", "security", "other"];
const validStatuses = ["running", "stopped", "vulnerable", "outdated"];

function normalizeCategory(cat: string | undefined): string {
  if (!cat) return "other";
  const lower = cat.toLowerCase().trim();
  return validCategories.includes(lower) ? lower : "other";
}

function normalizeStatus(status: string | undefined): string {
  if (!status) return "running";
  const lower = status.toLowerCase().trim();
  return validStatuses.includes(lower) ? lower : "running";
}

function resolveAgentId(hostname: string): number {
  const existing = db.query("SELECT id FROM agents WHERE hostname = ?").get(hostname) as { id: number } | null;
  if (existing) return existing.id;

  // Auto-create the agent if it doesn't exist
  db.prepare(
    "INSERT INTO agents (hostname, ip_address, os, agent_type, status, threat_level) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(hostname, "0.0.0.0", "", "server", "online", "none");

  const created = db.query("SELECT id FROM agents WHERE hostname = ?").get(hostname) as { id: number };
  return created.id;
}

const N8N_FEED_NAME = "n8n Advisories";
const N8N_FEED_URL = "webhook://n8n";

function getOrCreateWebhookFeed(): number {
  const existing = db.query("SELECT id FROM feeds WHERE url = ?").get(N8N_FEED_URL) as { id: number } | null;
  if (existing) return existing.id;
  const row = db.prepare(
    "INSERT INTO feeds (name, url, enabled) VALUES (?, ?, 0) RETURNING id"
  ).get(N8N_FEED_NAME, N8N_FEED_URL) as { id: number };
  return row.id;
}

function insertFeedItem(feedId: number, title: string, description: string) {
  const guid = `n8n-${Date.now()}-${title.slice(0, 40).replace(/\W+/g, "-")}`;
  const severity = autoTagSeverity(title, description);
  db.prepare(
    "INSERT OR IGNORE INTO feed_items (feed_id, title, link, description, pub_date, guid, severity) VALUES (?, ?, ?, ?, datetime('now'), ?, ?)"
  ).run(feedId, title, "", description.slice(0, 500), guid, severity);
}

interface N8nApplication {
  hostname?: string;
  agent?: string;
  agent_id?: number;
  name: string;
  version?: string;
  vendor?: string;
  category?: string;
  status?: string;
  advisory_markdown?: string;
  body?: { text?: string };
  text?: string;
}

function upsertApplication(app: N8nApplication): { id: number; name: string; action: string } {
  // Resolve agent: prefer hostname/agent field, fall back to agent_id
  let agentId: number;
  const host = app.hostname ?? app.agent;
  if (host) {
    agentId = resolveAgentId(host);
  } else if (app.agent_id) {
    agentId = app.agent_id;
  } else {
    throw new Error("Each application must include 'hostname', 'agent', or 'agent_id'");
  }

  const category = normalizeCategory(app.category);
  const status = normalizeStatus(app.status);
  const version = app.version ?? "";
  const vendor = app.vendor ?? "";
  const advisoryMarkdown = app.advisory_markdown ?? app.body?.text ?? app.text ?? "";

  // Upsert: update if same agent+name+version exists, otherwise insert
  const existing = db.query(
    "SELECT id FROM applications WHERE agent_id = ? AND name = ? AND version = ?"
  ).get(agentId, app.name, version) as { id: number } | null;

  if (existing) {
    db.prepare(
      "UPDATE applications SET vendor = ?, category = ?, status = ?, advisory_markdown = ? WHERE id = ?"
    ).run(vendor, category, status, advisoryMarkdown, existing.id);
    return { id: existing.id, name: app.name, action: "updated" };
  }

  const row = db.prepare(
    "INSERT INTO applications (agent_id, name, version, vendor, category, status, advisory_markdown) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id"
  ).get(agentId, app.name, version, vendor, category, status, advisoryMarkdown) as { id: number };

  return { id: row.id, name: app.name, action: "created" };
}

/**
 * Parse a bulk advisory markdown into sections split by `---` dividers.
 * Each section is matched to applications by checking if the section text
 * mentions the application name (case-insensitive).
 */
function applyBulkAdvisory(text: string): { matched: number; unmatched: number; details: { name: string; id: number }[] } {
  const apps = db.query("SELECT id, name FROM applications").all() as { id: number; name: string }[];

  // Split into sections by --- dividers
  const sections = text.split(/\n---+\n/).filter((s) => s.trim());

  const matched: { name: string; id: number }[] = [];
  const matchedIds = new Set<number>();

  const feedId = getOrCreateWebhookFeed();

  for (const app of apps) {
    // Collect all sections that mention this app name
    const appNameLower = app.name.toLowerCase();
    const relevantSections = sections.filter((section) =>
      section.toLowerCase().includes(appNameLower)
    );

    if (relevantSections.length > 0) {
      const advisory = relevantSections.join("\n\n---\n\n");
      db.prepare(
        "UPDATE applications SET advisory_markdown = ? WHERE id = ?"
      ).run(advisory, app.id);
      matched.push({ name: app.name, id: app.id });
      matchedIds.add(app.id);

      // Add each section as a feed item
      for (const section of relevantSections) {
        const firstLine = section.trim().split("\n")[0].replace(/^#+\s*/, "");
        insertFeedItem(feedId, `${app.name}: ${firstLine}`, section.trim());
      }
    }
  }

  return {
    matched: matched.length,
    unmatched: sections.length - matchedIds.size,
    details: matched,
  };
}

export const webhookApi = new Elysia({ prefix: "/webhook" })
  // Accept JSON from n8n — handles both single object and array of applications
  .post("/n8n", ({ body }) => {
    const payload = body as any;

    // n8n bulk advisory format: { body: { text: "..." } } or { text: "..." }
    const bulkText = payload?.body?.text ?? payload?.text;
    if (bulkText && typeof bulkText === "string" && !payload.name) {
      const result = applyBulkAdvisory(bulkText);
      recordWebhookUpload({
        mode: "bulk_advisory",
        created: 0,
        updated: 0,
        matched: result.matched,
        errors: result.unmatched,
      });
      return {
        mode: "bulk_advisory",
        ...result,
      };
    }

    const items: N8nApplication[] = Array.isArray(payload) ? payload : [payload];
    const results: { id: number; name: string; action: string }[] = [];
    const errors: { index: number; name?: string; error: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name) {
        errors.push({ index: i, error: "Missing required field 'name'" });
        continue;
      }
      try {
        results.push(upsertApplication(item));
      } catch (e: any) {
        errors.push({ index: i, name: item.name, error: e.message });
      }
    }

    const created = results.filter((r) => r.action === "created").length;
    const updated = results.filter((r) => r.action === "updated").length;

    recordWebhookUpload({
      mode: "upsert",
      created,
      updated,
      matched: 0,
      errors: errors.length,
    });

    return {
      received: items.length,
      created,
      updated,
      errors: errors.length,
      results,
      ...(errors.length > 0 ? { error_details: errors } : {}),
    };
  });
