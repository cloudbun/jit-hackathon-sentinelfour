import { useState, useCallback } from "react";
import { getApplications, getApplicationSummary, deleteApplication } from "../../lib/api";
import { useApi } from "../../hooks/useApi";
import { usePolling } from "../../hooks/usePolling";
import { Card, CardHeader, CardBody } from "../shared/Card";
import { EmptyState } from "../shared/EmptyState";
import { AddApplicationForm } from "./AddApplicationForm";
import type { ApplicationSummary } from "../../lib/types";

const statusColors: Record<string, { text: string; bg: string; border: string }> = {
  running:    { text: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-800/50" },
  stopped:    { text: "text-zinc-500",    bg: "bg-zinc-900/40",    border: "border-zinc-700/50" },
  vulnerable: { text: "text-red-400",     bg: "bg-red-950/40",     border: "border-red-800/50" },
  outdated:   { text: "text-amber-400",   bg: "bg-amber-950/40",   border: "border-amber-800/50" },
};

const categoryColors: Record<string, { text: string; bg: string; border: string }> = {
  database:     { text: "text-violet-400",  bg: "bg-violet-950/40",  border: "border-violet-800/50" },
  "web-server": { text: "text-sky-400",     bg: "bg-sky-950/40",     border: "border-sky-800/50" },
  runtime:      { text: "text-orange-400",  bg: "bg-orange-950/40",  border: "border-orange-800/50" },
  security:     { text: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-800/50" },
  other:        { text: "text-zinc-400",    bg: "bg-zinc-900/40",    border: "border-zinc-700/50" },
};

function SummaryCards({ summary }: { summary: ApplicationSummary }) {
  const cards = [
    { label: "Total Apps",  value: summary.total,               color: "text-sky-400",     border: "border-l-sky-500" },
    { label: "Running",     value: summary.by_status.running,    color: "text-emerald-400", border: "border-l-emerald-500" },
    { label: "Stopped",     value: summary.by_status.stopped,    color: "text-zinc-400",    border: "border-l-zinc-500" },
    { label: "Vulnerable",  value: summary.by_status.vulnerable, color: "text-red-400",     border: "border-l-red-500" },
    { label: "Outdated",    value: summary.by_status.outdated,   color: "text-amber-400",   border: "border-l-amber-500" },
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className={`border border-l-[3px] border-zinc-700/60 bg-black px-5 py-4 ${c.border}`}>
          <p className="ticket-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-2">{c.label}</p>
          <p className={`ticket-mono text-4xl font-bold leading-none ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function Badge({ label, colors }: { label: string; colors: { text: string; bg: string; border: string } }) {
  return (
    <span className={`inline-block border ${colors.border} ${colors.bg} ${colors.text} px-2 py-0.5 text-[10px] uppercase tracking-wide ticket-mono`}>
      {label}
    </span>
  );
}

function parseAdvisoryMarkdown(md: string) {
  const elements: React.ReactNode[] = [];
  const lines = md.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      elements.push(<hr key={i} className="border-zinc-700/50 my-3" />);
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mt-3 mb-2">
          {line.slice(4)}
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-sm font-bold text-zinc-100 uppercase tracking-wider mt-3 mb-2">
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      continue;
    }

    // Inline formatting: bold and links
    const formatInline = (text: string): React.ReactNode[] => {
      const nodes: React.ReactNode[] = [];
      // Match **bold**, [text](url), or plain text segments
      const regex = /(\*\*(.+?)\*\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          nodes.push(text.slice(lastIndex, match.index));
        }
        if (match[1]) {
          // Bold
          nodes.push(<strong key={match.index} className="text-zinc-100 font-semibold">{match[2]}</strong>);
        } else if (match[3]) {
          // Link
          nodes.push(
            <a key={match.index} href={match[5]} target="_blank" rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
              {match[4]}
            </a>
          );
        }
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
      }
      return nodes;
    };

    elements.push(
      <p key={i} className="text-xs text-zinc-400 leading-relaxed">
        {formatInline(line)}
      </p>
    );
  }

  return elements;
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
      viewBox="0 0 20 20" fill="currentColor"
    >
      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
    </svg>
  );
}

export function ApplicationsTab() {
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = useCallback((id: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const summaryApi = useApi(() => getApplicationSummary(), []);
  const appsApi = useApi(
    () => getApplications({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      search: search || undefined,
    }),
    [statusFilter, categoryFilter, search]
  );

  const refetchAll = useCallback(() => {
    summaryApi.refetch();
    appsApi.refetch();
  }, [summaryApi.refetch, appsApi.refetch]);

  usePolling(refetchAll);

  const handleDelete = useCallback(async (id: number) => {
    await deleteApplication(id);
    refetchAll();
  }, [refetchAll]);

  const inputCls = "ticket-mono border border-zinc-700/60 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500";

  return (
    <div className="space-y-4">
      {summaryApi.data && <SummaryCards summary={summaryApi.data} />}

      <Card>
        <CardHeader action={<AddApplicationForm onCreated={refetchAll} />}>
          Software Inventory
        </CardHeader>
        <CardBody className="p-0">
          {/* Filter bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700/30">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH APPS..."
              className={`${inputCls} w-56`}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className={`${inputCls} uppercase`}>
              <option value="">All Status</option>
              <option value="running">Running</option>
              <option value="stopped">Stopped</option>
              <option value="vulnerable">Vulnerable</option>
              <option value="outdated">Outdated</option>
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
              className={`${inputCls} uppercase`}>
              <option value="">All Categories</option>
              <option value="database">Database</option>
              <option value="web-server">Web Server</option>
              <option value="runtime">Runtime</option>
              <option value="security">Security</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Table */}
          {!appsApi.data || appsApi.data.length === 0 ? (
            <EmptyState message="No applications found. Add one or adjust filters." />
          ) : (
            <div className="ticket-mono">
              <div className="grid grid-cols-[auto_2fr_1fr_1.5fr_1fr_1fr_1.5fr_auto] gap-3 px-4 py-2 border-b border-zinc-700/30 text-[9px] uppercase tracking-widest text-zinc-600">
                <span className="w-4"></span>
                <span>Name</span>
                <span>Version</span>
                <span>Vendor</span>
                <span>Category</span>
                <span>Status</span>
                <span>Agent</span>
                <span></span>
              </div>
              <div className="divide-y divide-dotted divide-zinc-700/30">
                {appsApi.data.map((app) => {
                  const hasAdvisory = !!app.advisory_markdown;
                  const isExpanded = expandedRows.has(app.id);
                  return (
                    <div key={app.id}>
                      <div
                        className={`group grid grid-cols-[auto_2fr_1fr_1.5fr_1fr_1fr_1.5fr_auto] gap-3 items-center px-4 py-2.5 ${hasAdvisory ? "cursor-pointer hover:bg-zinc-800/30" : ""}`}
                        onClick={() => hasAdvisory && toggleRow(app.id)}
                      >
                        <span className="w-4 flex items-center justify-center">
                          {hasAdvisory && <ChevronIcon expanded={isExpanded} />}
                        </span>
                        <span className="text-xs text-zinc-200 truncate">{app.name}</span>
                        <span className="text-xs text-zinc-400 truncate">{app.version || "—"}</span>
                        <span className="text-xs text-zinc-400 truncate">{app.vendor || "—"}</span>
                        <Badge label={app.category} colors={categoryColors[app.category] ?? categoryColors.other} />
                        <Badge label={app.status} colors={statusColors[app.status] ?? statusColors.stopped} />
                        <span className="text-xs text-zinc-500 truncate">{app.agent_hostname}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-[10px] uppercase text-zinc-600 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                      {isExpanded && hasAdvisory && (
                        <div className="px-4 pb-4 pt-1 pl-11 border-t border-zinc-800/50 bg-zinc-900/30">
                          <div className="ticket-mono">
                            {parseAdvisoryMarkdown(app.advisory_markdown)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
