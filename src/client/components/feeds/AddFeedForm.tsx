import { useState } from "react";
import { createFeed } from "../../lib/api";

export function AddFeedForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSubmitting(true);
    try {
      await createFeed({ name: name.trim(), url: url.trim() });
      setName("");
      setUrl("");
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
        + Add Feed
      </button>
    );
  }

  const inputCls = "ticket-mono border border-zinc-700/60 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-zinc-500";

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 ticket-mono">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="FEED NAME"
        className={`${inputCls} w-28`} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL"
        className={`${inputCls} w-48`} />
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
