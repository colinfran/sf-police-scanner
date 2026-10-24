import Link from "next/link";
import { memo } from "react";
import { rememberScannerScroll } from "@/lib/client-cache";
import { agencyLabel, callLocation, callPriority, callStatus, callType, titleCase } from "@/lib/format";
import { formatTime12 } from "@/lib/time";
import type { Call } from "@/lib/types";
import CallTypeIcon from "./CallTypeIcon";
import PriorityBadge from "./PriorityBadge";

interface RowProps {
  call: Call;
  isNew: boolean;
}

function CallRowView({ call, isNew }: RowProps) {
  const status = callStatus(call);
  const meta = [
    call.analysis_neighborhood,
    call.police_district && titleCase(call.police_district),
    call.agency && agencyLabel(call.agency),
  ].filter(Boolean);

  return (
    <li className="[contain-intrinsic-size:auto_84px] [content-visibility:auto]">
      {/* No prefetch: a busy day has ~1,700 rows */}
      <Link
        href={`/calls/${call.id}`}
        prefetch
        onClick={rememberScannerScroll}
        className={`grid w-full grid-cols-[4.5rem_1.5rem_1fr_auto] items-center gap-x-3 gap-y-3 px-3 py-3 text-left hover:bg-zinc-900/60 focus-visible:bg-zinc-900 focus-visible:outline-none sm:grid-cols-[6.5rem_2rem_1fr_auto] sm:gap-x-5 sm:px-4 ${
          isNew ? "new-call" : ""
        }`}
      >
        <time className="text-right font-mono text-[11px] text-zinc-400 sm:text-sm">{formatTime12(call.received_datetime)}</time>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base leading-none sm:text-xl">
          <CallTypeIcon call={call} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3">
            <span className="text-sm font-semibold sm:text-base">{callType(call)}</span>
            {isNew && (
              <span className="rounded bg-red-600 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide">New</span>
            )}
            {call.disposition && <span className="text-[11px] text-zinc-500 sm:text-xs">{call.disposition}</span>}
          </div>
          <div className="truncate text-xs text-zinc-300 sm:text-sm">{callLocation(call)}</div>
          {meta.length > 0 && <div className="text-[11px] text-zinc-500 sm:text-xs">{meta.join(" · ")}</div>}
          <div className={`text-[11px] font-medium uppercase tracking-wide sm:text-xs ${status.className}`}>{status.label}</div>
        </div>
        <PriorityBadge priority={callPriority(call)} />
      </Link>
    </li>
  );
}

// Refreshes return new objects for every call; only re-render rows whose data or state actually changed
const CallRow = memo(
  CallRowView,
  (prev, next) =>
    prev.call.id === next.call.id &&
    prev.call.call_last_updated_at === next.call.call_last_updated_at &&
    prev.isNew === next.isNew,
);

interface Props {
  calls: Call[];
  newIds: Set<string>;
}

export default function CallList({ calls, newIds }: Props) {
  return (
    <ul className="divide-y divide-zinc-900">
      {calls.map((c) => (
        <CallRow key={c.id} call={c} isNew={newIds.has(c.id)} />
      ))}
    </ul>
  );
}
