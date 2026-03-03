import { Elysia, t } from "elysia";
import { db } from "../db";
import { parseFeed, autoTagSeverity } from "../lib/feed-parser";

async function fetchAndStoreFeed(feedId: number, url: string) {
  try {
    const items = await parseFeed(url);
    const stmt = db.prepare(`
      INSERT INTO feed_items (feed_id, title, link, description, pub_date, guid, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(feed_id, guid) DO UPDATE SET
        title = excluded.title,
        link = excluded.link,
        description = excluded.description,
        pub_date = excluded.pub_date,
        severity = excluded.severity
    `);
    for (const item of items) {
      const severity = autoTagSeverity(item.title, item.description);
      stmt.run(feedId, item.title, item.link, item.description, item.pubDate, item.guid, severity);
    }
    db.prepare("UPDATE feeds SET last_fetched_at = datetime('now'), fetch_error = NULL WHERE id = ?").run(feedId);
  } catch (err: any) {
    db.prepare("UPDATE feeds SET fetch_error = ? WHERE id = ?").run(err.message, feedId);
    throw err;
  }
}

export const feedsApi = new Elysia({ prefix: "/feeds" })
  .get("/", () => {
    return db.query(`
      SELECT f.*, COUNT(fi.id) as item_count
      FROM feeds f
      LEFT JOIN feed_items fi ON fi.feed_id = f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `).all();
  })

  .post("/", async ({ body }) => {
    const feed = db.prepare(
      "INSERT INTO feeds (name, url) VALUES (?, ?) RETURNING *"
    ).get(body.name, body.url) as any;
    // Trigger initial fetch in background
    fetchAndStoreFeed(feed.id, body.url).catch(() => {});
    return feed;
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      url: t.String({ minLength: 1 }),
    }),
  })

  .delete("/:id", ({ params: { id } }) => {
    db.prepare("DELETE FROM feeds WHERE id = ?").run(id);
    return { ok: true };
  })

  .post("/:id/refresh", async ({ params: { id } }) => {
    const feed = db.query("SELECT * FROM feeds WHERE id = ?").get(id) as any;
    if (!feed) return new Response("Not found", { status: 404 });
    await fetchAndStoreFeed(feed.id, feed.url);
    return { ok: true };
  })

  .post("/refresh-all", async () => {
    const feeds = db.query("SELECT * FROM feeds WHERE enabled = 1").all() as any[];
    const results = await Promise.allSettled(
      feeds.map((f) => fetchAndStoreFeed(f.id, f.url))
    );
    return {
      total: feeds.length,
      succeeded: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
    };
  })

  .get("/items", ({ query }) => {
    const limit = Math.min(Number(query.limit) || 50, 200);
    const offset = Number(query.offset) || 0;
    let where = "";
    const params: any[] = [];
    if (query.severity) {
      where = "WHERE fi.severity = ?";
      params.push(query.severity);
    }
    params.push(limit, offset);
    return db.query(`
      SELECT fi.*, f.name as feed_name
      FROM feed_items fi
      JOIN feeds f ON f.id = fi.feed_id
      ${where}
      ORDER BY fi.pub_date DESC, fi.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params);
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
      severity: t.Optional(t.String()),
    }),
  });
