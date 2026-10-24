export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-zinc-800/70 ${className}`} />;
}

export function MapSkeleton({ className = "h-[70vh]" }: { className?: string }) {
  return <Skeleton className={`rounded-none ${className}`} />;
}

export function CallListSkeleton() {
  return (
    <ul className="divide-y divide-zinc-900" aria-busy="true" aria-label="Loading calls">
      {Array.from({ length: 10 }, (_, i) => (
        <li
          key={i}
          className="grid grid-cols-[4.5rem_1.5rem_1fr_auto] items-center gap-x-3 gap-y-3 px-3 py-3 sm:grid-cols-[6.5rem_2rem_1fr_auto] sm:gap-x-5 sm:px-4"
        >
          <Skeleton className="ml-auto h-4 w-16 sm:w-20" />
          <Skeleton className="h-6 w-6" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-6 w-6" />
        </li>
      ))}
    </ul>
  );
}

export function StatsSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading stats">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-44" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
