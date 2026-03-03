import { Elysia, t } from "elysia";
import { db } from "../db";

export const applicationsApi = new Elysia({ prefix: "/applications" })
  .get("/summary", () => {
    const total = db.query("SELECT COUNT(*) as count FROM applications").get() as { count: number };

    const byStatus = db.query(
      "SELECT status, COUNT(*) as count FROM applications GROUP BY status"
    ).all() as { status: string; count: number }[];

    const byCategory = db.query(
      "SELECT category, COUNT(*) as count FROM applications GROUP BY category"
    ).all() as { category: string; count: number }[];

    const uniqueNames = db.query(
      "SELECT COUNT(DISTINCT name) as count FROM applications"
    ).get() as { count: number };

    const statusMap: Record<string, number> = {};
    for (const row of byStatus) statusMap[row.status] = row.count;

    const categoryMap: Record<string, number> = {};
    for (const row of byCategory) categoryMap[row.category] = row.count;

    return {
      total: total.count,
      unique_names: uniqueNames.count,
      by_status: {
        running: statusMap["running"] ?? 0,
        stopped: statusMap["stopped"] ?? 0,
        vulnerable: statusMap["vulnerable"] ?? 0,
        outdated: statusMap["outdated"] ?? 0,
      },
      by_category: {
        database: categoryMap["database"] ?? 0,
        "web-server": categoryMap["web-server"] ?? 0,
        runtime: categoryMap["runtime"] ?? 0,
        security: categoryMap["security"] ?? 0,
        other: categoryMap["other"] ?? 0,
      },
    };
  })

  .get("/", ({ query }) => {
    const conditions: string[] = [];
    const params: string[] = [];

    if (query.status) {
      conditions.push("a.status = ?");
      params.push(query.status);
    }
    if (query.category) {
      conditions.push("a.category = ?");
      params.push(query.category);
    }
    if (query.search) {
      conditions.push("(a.name LIKE ? OR a.vendor LIKE ?)");
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    return db.query(`
      SELECT a.*, ag.hostname as agent_hostname
      FROM applications a
      JOIN agents ag ON ag.id = a.agent_id
      ${where}
      ORDER BY a.name ASC, a.version ASC
    `).all(...params);
  }, {
    query: t.Object({
      status: t.Optional(t.String()),
      category: t.Optional(t.String()),
      search: t.Optional(t.String()),
    }),
  })

  .post("/", ({ body }) => {
    const stmt = db.prepare(
      "INSERT INTO applications (agent_id, name, version, vendor, category, status, advisory_markdown) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *"
    );
    const app = stmt.get(body.agent_id, body.name, body.version ?? "", body.vendor ?? "", body.category ?? "other", body.status ?? "running", body.advisory_markdown ?? "");
    if (!app) return new Response("Failed to create", { status: 500 });
    const agent = db.query("SELECT hostname FROM agents WHERE id = ?").get(body.agent_id) as { hostname: string } | null;
    return { ...(app as any), agent_hostname: agent?.hostname ?? "" };
  }, {
    body: t.Object({
      agent_id: t.Number(),
      name: t.String({ minLength: 1 }),
      version: t.Optional(t.String()),
      vendor: t.Optional(t.String()),
      category: t.Optional(t.Union([
        t.Literal("database"), t.Literal("web-server"), t.Literal("runtime"), t.Literal("security"), t.Literal("other"),
      ])),
      status: t.Optional(t.Union([
        t.Literal("running"), t.Literal("stopped"), t.Literal("vulnerable"), t.Literal("outdated"),
      ])),
      advisory_markdown: t.Optional(t.String()),
    }),
  })

  .delete("/:id", ({ params: { id } }) => {
    db.prepare("DELETE FROM applications WHERE id = ?").run(id);
    return { ok: true };
  });
