const PRIORITY_STYLES: Record<string, string> = {
  A: "bg-red-500/20 text-red-300 ring-red-500/40",
  B: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  C: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ring-1 ${
        PRIORITY_STYLES[priority] ?? "bg-zinc-800 text-zinc-300 ring-zinc-700"
      }`}
      title={`Priority ${priority}`}
    >
      {priority}
    </span>
  );
}
