import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`border border-zinc-700/60 bg-black ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-dotted border-zinc-700/40 px-4 py-3">
      <h3 className="ticket-mono text-xs font-bold uppercase tracking-widest text-zinc-400">{children}</h3>
      {action}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
