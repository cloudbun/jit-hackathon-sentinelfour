import { useState, useEffect } from "react";
import { createApplication, getAgents } from "../../lib/api";
import type { Agent } from "../../lib/types";

export function AddApplicationForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("other");
  const [status, setStatus] = useState("running");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      getAgents().then(setAgents);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !name.trim()) return;
    setSubmitting(true);
    try {
      await createApplication({
        agent_id: Number(agentId),
        name: name.trim(),
        version: version.trim(),
        vendor: vendor.trim(),
        category,
        status,
      });
      setAgentId("");
      setName("");
      setVersion("");
      setVendor("");
      setCategory("other");
      setStatus("running");
      setOpen(false);
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="ticket-mono border border-zinc-700/60 px-3 py-1.5 text-[10px] uppercase tracking-wide text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
      >
        + Add Application
      </button>
    );
  }

  const inputCls = "ticket-mono border border-zinc-700/60 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500";

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 ticket-mono flex-wrap">
      <select value={agentId} onChange={(e) => setAgentId(e.target.value)}
        className={`${inputCls} uppercase w-36`}>
        <option value="">Agent...</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>{a.hostname}</option>
        ))}
      </select>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="APP NAME"
        className={`${inputCls} w-32`} />
      <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="VERSION"
        className={`${inputCls} w-24`} />
      <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="VENDOR"
        className={`${inputCls} w-28`} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}
        className={`${inputCls} uppercase`}>
        <option value="other">Other</option>
        <option value="database">Database</option>
        <option value="web-server">Web Server</option>
        <option value="runtime">Runtime</option>
        <option value="security">Security</option>
      </select>
      <select value={status} onChange={(e) => setStatus(e.target.value)}
        className={`${inputCls} uppercase`}>
        <option value="running">Running</option>
        <option value="stopped">Stopped</option>
        <option value="vulnerable">Vulnerable</option>
        <option value="outdated">Outdated</option>
      </select>
      <button type="submit" disabled={submitting}
        className="border border-zinc-700/60 bg-zinc-800 px-3 py-1.5 text-[10px] uppercase tracking-wide text-zinc-200 hover:bg-zinc-700 transition-colors disabled:opacity-50">
        {submitting ? "..." : "Add"}
      </button>
      <button type="button" onClick={() => setOpen(false)}
        className="border border-zinc-700/60 px-3 py-1.5 text-[10px] uppercase tracking-wide text-zinc-500 hover:text-zinc-200 transition-colors">
        Cancel
      </button>
    </form>
  );
}
