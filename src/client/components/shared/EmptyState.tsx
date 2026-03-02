export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
      <p className="ticket-mono text-[10px] uppercase tracking-widest">{message}</p>
    </div>
  );
}
