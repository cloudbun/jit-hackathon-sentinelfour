import { Elysia, t } from "elysia";
import { db } from "../db";

export const agentsApi = new Elysia({ prefix: "/agents" })
  .get("/", ({ query }) => {
    if (query.status) {
      return db.query("SELECT * FROM agents WHERE status = ? ORDER BY updated_at DESC").all(query.status);
    }
    return db.query("SELECT * FROM agents ORDER BY updated_at DESC").all();
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
    }),
  })

  .get("/:id", ({ params: { id } }) => {
    const agent = db.query("SELECT * FROM agents WHERE id = ?").get(id);
    if (!agent) return new Response("Not found", { status: 404 });
    const events = db.query(
      "SELECT * FROM agent_events WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50"
    ).all(id);
    return { ...agent as any, events };
  })

  .post("/", ({ body }) => {
    const stmt = db.prepare(
      "INSERT INTO agents (hostname, ip_address, os, agent_type, status, threat_level) VALUES (?, ?, ?, ?, ?, ?) RETURNING *"
    );
    return stmt.get(body.hostname, body.ip_address, body.os ?? "", body.agent_type ?? "server", body.status ?? "offline", body.threat_level ?? "none");
  }, {
    body: t.Object({
      hostname: t.String({ minLength: 1 }),
      ip_address: t.String({ minLength: 1 }),
      os: t.Optional(t.String()),
      agent_type: t.Optional(t.Union([t.Literal("server"), t.Literal("workstation"), t.Literal("firewall")])),
      status: t.Optional(t.Union([t.Literal("online"), t.Literal("offline"), t.Literal("alert")])),
      threat_level: t.Optional(t.Union([t.Literal("none"), t.Literal("low"), t.Literal("medium"), t.Literal("high"), t.Literal("critical")])),
    }),
  })

  .put("/:id", ({ params: { id }, body }) => {
    const existing = db.query("SELECT * FROM agents WHERE id = ?").get(id);
    if (!existing) return new Response("Not found", { status: 404 });
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined) {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
    if (fields.length === 0) return existing;
    fields.push("updated_at = datetime('now')");
    values.push(id);
    return db.prepare(`UPDATE agents SET ${fields.join(", ")} WHERE id = ? RETURNING *`).get(...values);
  }, {
    body: t.Object({
      hostname: t.Optional(t.String()),
      ip_address: t.Optional(t.String()),
      os: t.Optional(t.String()),
      agent_type: t.Optional(t.Union([t.Literal("server"), t.Literal("workstation"), t.Literal("firewall")])),
      status: t.Optional(t.Union([t.Literal("online"), t.Literal("offline"), t.Literal("alert")])),
      threat_level: t.Optional(t.Union([t.Literal("none"), t.Literal("low"), t.Literal("medium"), t.Literal("high"), t.Literal("critical")])),
    }),
  })

  .delete("/:id", ({ params: { id } }) => {
    db.prepare("DELETE FROM agents WHERE id = ?").run(id);
    return { ok: true };
  })

  .post("/:id/heartbeat", ({ params: { id } }) => {
    const agent = db.query("SELECT * FROM agents WHERE id = ?").get(id);
    if (!agent) return new Response("Not found", { status: 404 });
    db.prepare("UPDATE agents SET status = 'online', last_heartbeat = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
    db.prepare(
      "INSERT INTO agent_events (agent_id, event_type, severity, message) VALUES (?, 'heartbeat', 'info', 'Heartbeat received')"
    ).run(id);
    return db.query("SELECT * FROM agents WHERE id = ?").get(id);
  })

  .post("/:id/event", ({ params: { id }, body }) => {
    const agent = db.query("SELECT * FROM agents WHERE id = ?").get(id);
    if (!agent) return new Response("Not found", { status: 404 });
    const event = db.prepare(
      "INSERT INTO agent_events (agent_id, event_type, severity, message, metadata) VALUES (?, ?, ?, ?, ?) RETURNING *"
    ).get(id, body.event_type, body.severity ?? "info", body.message ?? "", JSON.stringify(body.metadata ?? {}));

    if (body.severity === "critical" || body.severity === "high") {
      db.prepare("UPDATE agents SET status = 'alert', threat_level = ?, updated_at = datetime('now') WHERE id = ?")
        .run(body.severity, id);
    }
    return event;
  }, {
    body: t.Object({
      event_type: t.Union([t.Literal("heartbeat"), t.Literal("alert"), t.Literal("threat_detected"), t.Literal("status_change")]),
      severity: t.Optional(t.Union([t.Literal("info"), t.Literal("low"), t.Literal("medium"), t.Literal("high"), t.Literal("critical")])),
      message: t.Optional(t.String()),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
  });
