import type { Agent, AgentWithEvents, DashboardSummary, Feed, FeedItem } from "./types";

const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Agents
export const getAgents = (status?: string) =>
  request<Agent[]>(`/agents${status ? `?status=${status}` : ""}`);

export const getAgent = (id: number) =>
  request<AgentWithEvents>(`/agents/${id}`);

export const createAgent = (data: { hostname: string; ip_address: string; os?: string; agent_type?: string }) =>
  request<Agent>("/agents", { method: "POST", body: JSON.stringify(data) });

export const updateAgent = (id: number, data: Partial<Agent>) =>
  request<Agent>(`/agents/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteAgent = (id: number) =>
  request<{ ok: boolean }>(`/agents/${id}`, { method: "DELETE" });

export const heartbeatAgent = (id: number) =>
  request<Agent>(`/agents/${id}/heartbeat`, { method: "POST" });

export const createAgentEvent = (id: number, data: { event_type: string; severity?: string; message?: string }) =>
  request(`/agents/${id}/event`, { method: "POST", body: JSON.stringify(data) });

// Feeds
export const getFeeds = () => request<Feed[]>("/feeds");

export const createFeed = (data: { name: string; url: string }) =>
  request<Feed>("/feeds", { method: "POST", body: JSON.stringify(data) });

export const deleteFeed = (id: number) =>
  request<{ ok: boolean }>(`/feeds/${id}`, { method: "DELETE" });

export const refreshFeed = (id: number) =>
  request<{ ok: boolean }>(`/feeds/${id}/refresh`, { method: "POST" });

export const refreshAllFeeds = () =>
  request<{ total: number; succeeded: number; failed: number }>("/feeds/refresh-all", { method: "POST" });

export const getFeedItems = (params?: { limit?: number; offset?: number; severity?: string }) => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  if (params?.severity) qs.set("severity", params.severity);
  return request<FeedItem[]>(`/feeds/items?${qs}`);
};

// Dashboard
export const getDashboardSummary = () =>
  request<DashboardSummary>("/dashboard/summary");
