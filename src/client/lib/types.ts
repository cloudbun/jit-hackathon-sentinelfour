export type AgentType = "server" | "workstation" | "firewall";
export type AgentStatus = "online" | "offline" | "alert";
export type ThreatLevel = "none" | "low" | "medium" | "high" | "critical";
export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type EventType = "heartbeat" | "alert" | "threat_detected" | "status_change";

export interface Agent {
  id: number;
  hostname: string;
  ip_address: string;
  os: string;
  agent_type: AgentType;
  status: AgentStatus;
  threat_level: ThreatLevel;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentEvent {
  id: number;
  agent_id: number;
  event_type: EventType;
  severity: Severity;
  message: string;
  metadata: string;
  created_at: string;
  hostname?: string;
}

export interface AgentWithEvents extends Agent {
  events: AgentEvent[];
}

export interface Feed {
  id: number;
  name: string;
  url: string;
  enabled: number;
  last_fetched_at: string | null;
  fetch_error: string | null;
  created_at: string;
  item_count: number;
}

export interface FeedItem {
  id: number;
  feed_id: number;
  title: string;
  link: string;
  description: string;
  pub_date: string | null;
  guid: string;
  severity: Severity;
  read: number;
  created_at: string;
  feed_name: string;
}

export interface DashboardSummary {
  agents: {
    total: number;
    online: number;
    offline: number;
    alert: number;
  };
  threats: { threat_level: string; count: number }[];
  feeds: { total: number };
  applications: { total: number };
  recentEvents: AgentEvent[];
  recentFeedItems: FeedItem[];
}

export type ApplicationStatus = "running" | "stopped" | "vulnerable" | "outdated";
export type ApplicationCategory = "database" | "web-server" | "runtime" | "security" | "other";

export interface Application {
  id: number;
  agent_id: number;
  agent_hostname: string;
  name: string;
  version: string;
  vendor: string;
  category: ApplicationCategory;
  status: ApplicationStatus;
  advisory_markdown: string;
  created_at: string;
}

export interface ApplicationSummary {
  total: number;
  unique_names: number;
  by_status: Record<ApplicationStatus, number>;
  by_category: Record<ApplicationCategory, number>;
}

export type Page = "dashboard" | "agents" | "feeds";
