import { Elysia } from "elysia";
import { db } from "../db";

export const dashboardApi = new Elysia({ prefix: "/dashboard" })
  .get("/summary", () => {
    const agentsByStatus = db.query(
      "SELECT status, COUNT(*) as count FROM agents GROUP BY status"
    ).all() as { status: string; count: number }[];

    const threatBreakdown = db.query(
      "SELECT threat_level, COUNT(*) as count FROM agents WHERE threat_level != 'none' GROUP BY threat_level"
    ).all() as { threat_level: string; count: number }[];

    const totalAgents = db.query("SELECT COUNT(*) as count FROM agents").get() as { count: number };
    const totalFeeds = db.query("SELECT COUNT(*) as count FROM feeds").get() as { count: number };

    const recentEvents = db.query(`
      SELECT ae.*, a.hostname
      FROM agent_events ae
      JOIN agents a ON a.id = ae.agent_id
      ORDER BY ae.created_at DESC
      LIMIT 20
    `).all();

    const recentFeedItems = db.query(`
      SELECT fi.*, f.name as feed_name
      FROM feed_items fi
      JOIN feeds f ON f.id = fi.feed_id
      ORDER BY fi.pub_date DESC, fi.created_at DESC
      LIMIT 20
    `).all();

    const statusMap: Record<string, number> = {};
    for (const row of agentsByStatus) statusMap[row.status] = row.count;

    return {
      agents: {
        total: totalAgents.count,
        online: statusMap["online"] ?? 0,
        offline: statusMap["offline"] ?? 0,
        alert: statusMap["alert"] ?? 0,
      },
      threats: threatBreakdown,
      feeds: { total: totalFeeds.count },
      recentEvents,
      recentFeedItems,
    };
  });
