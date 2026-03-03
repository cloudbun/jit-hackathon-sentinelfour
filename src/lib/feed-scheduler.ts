import { db } from "../db";
import { parseFeed, autoTagSeverity } from "./feed-parser";

const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

async function refreshAllFeeds() {
  const feeds = db.query("SELECT * FROM feeds WHERE enabled = 1").all() as any[];
  for (const feed of feeds) {
    try {
      const items = await parseFeed(feed.url);
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
        stmt.run(feed.id, item.title, item.link, item.description, item.pubDate, item.guid, severity);
      }
      db.prepare("UPDATE feeds SET last_fetched_at = datetime('now'), fetch_error = NULL WHERE id = ?").run(feed.id);
    } catch (err: any) {
      db.prepare("UPDATE feeds SET fetch_error = ? WHERE id = ?").run(err.message, feed.id);
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startFeedScheduler() {
  if (timer) return;
  console.log("Feed scheduler started (every 15 min)");
  // Run once at startup after a short delay
  setTimeout(() => refreshAllFeeds().catch(console.error), 5000);
  timer = setInterval(() => refreshAllFeeds().catch(console.error), INTERVAL_MS);
}

export function stopFeedScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
