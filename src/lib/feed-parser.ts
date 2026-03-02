import { XMLParser } from "fast-xml-parser";

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
  guid: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export async function parseFeed(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "SentinelFour/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);
  const xml = await res.text();
  const parsed = parser.parse(xml);

  // RSS 2.0
  if (parsed.rss?.channel) {
    const channel = parsed.rss.channel;
    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    return items.map((item: any) => ({
      title: item.title ?? "",
      link: item.link ?? "",
      description: stripHtml(item.description ?? ""),
      pubDate: item.pubDate ?? null,
      guid: String(item.guid?.["#text"] ?? item.guid ?? item.link ?? item.title ?? ""),
    }));
  }

  // Atom
  if (parsed.feed?.entry) {
    const entries = Array.isArray(parsed.feed.entry) ? parsed.feed.entry : [parsed.feed.entry];
    return entries.map((entry: any) => ({
      title: entry.title?.["#text"] ?? entry.title ?? "",
      link: entry.link?.["@_href"] ?? (Array.isArray(entry.link) ? entry.link[0]?.["@_href"] : "") ?? "",
      description: stripHtml(entry.summary?.["#text"] ?? entry.summary ?? entry.content?.["#text"] ?? entry.content ?? ""),
      pubDate: entry.published ?? entry.updated ?? null,
      guid: entry.id ?? entry.link?.["@_href"] ?? entry.title ?? "",
    }));
  }

  return [];
}

function stripHtml(html: string): string {
  return String(html).replace(/<[^>]*>/g, "").trim().slice(0, 500);
}

const SEVERITY_PATTERNS: [RegExp, string][] = [
  [/critical|zero[- ]?day|rce|remote code execution/i, "critical"],
  [/exploit|vulnerability|cve-\d{4}/i, "high"],
  [/patch|update|advisory|security fix/i, "medium"],
  [/low severity|informational/i, "low"],
];

export function autoTagSeverity(title: string, description: string): string {
  const text = `${title} ${description}`;
  for (const [pattern, severity] of SEVERITY_PATTERNS) {
    if (pattern.test(text)) return severity;
  }
  return "info";
}
