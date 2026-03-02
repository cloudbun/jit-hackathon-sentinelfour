import { useState } from "react";
import { createAgent } from "../../lib/api";

export function AddAgentForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [hostname, setHostname] = useState("");
  const [ip, setIp] = useState("");
  const [os, setOs] = useState("");
  const [type, setType] = useState("server");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostname.trim() || !ip.trim()) return;
    setSubmitting(true);
    try {
      await createAgent({ hostname: hostname.trim(), ip_address: ip.trim(), os: os.trim(), agent_type: type });
      setHostname("");
      setIp("");
      setOs("");
      setType("server");
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
        + Add Agent
      </button>
    );
  }

  const inputCls = "ticket-mono border border-zinc-700/60 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500";

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 ticket-mono">
      <input value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="HOSTNAME"
        className={`${inputCls} w-32`} />
      <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP_ADDR"
        className={`${inputCls} w-28`} />
      <input value={os} onChange={(e) => setOs(e.target.value)} placeholder="OS"
        className={`${inputCls} w-24`} />
      <select value={type} onChange={(e) => setType(e.target.value)}
        className={`${inputCls} uppercase`}>
        <option value="server">Server</option>
        <option value="workstation">Workstation</option>
        <option value="firewall">Firewall</option>
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
