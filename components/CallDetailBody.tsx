import {
  TIMELINE,
  agencyLabel,
  callLocation,
  callPriority,
  callStatus,
  callType,
  formatMinutes,
  minutesBetween,
  responseMinutes,
  titleCase,
} from "@/lib/format";
import { formatDay, formatTime12 } from "@/lib/time";
import type { Call } from "@/lib/types";
import CallTypeIcon from "./CallTypeIcon";
import PriorityBadge from "./PriorityBadge";

function stepTime(value: string, receivedDate: string): string {
  const time = formatTime12(value);
  return value.slice(0, 10) === receivedDate ? time : `${formatDay(value.slice(0, 10))}, ${time}`;
}

export default function CallDetailBody({ call }: { call: Call }) {
  const priority = callPriority(call);
  const status = callStatus(call);
  const response = responseMinutes(call);
  const steps = TIMELINE.flatMap(({ key, label }) => {
    const value = call[key];
    return typeof value === "string" && value ? [{ label, value }] : [];
  });

  const details: [string, string | undefined][] = [
    ["Neighborhood", call.analysis_neighborhood],
    ["Police district", call.police_district && titleCase(call.police_district)],
    ["Supervisor district", call.supervisor_district && String(Number(call.supervisor_district))],
    ["Agency", call.agency && agencyLabel(call.agency)],
    ["Disposition", call.disposition],
    ["Officer-initiated", call.onview_flag === "Y" ? "Yes" : call.onview_flag === "N" ? "No" : undefined],
    [
      "Original call type",
      call.call_type_original_desc !== call.call_type_final_desc ? call.call_type_original_desc : undefined,
    ],
    ["Original priority", call.priority_original !== call.priority_final ? call.priority_original : undefined],
    ["CAD number", call.cad_number],
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={priority} />
          <span className={`text-xs font-medium uppercase tracking-wide ${status.className}`}>{status.label}</span>
        </div>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-bold">
          <CallTypeIcon call={call} className="text-2xl" />
          {callType(call)}
        </h1>
        <p className="text-zinc-300">{callLocation(call)}</p>
        <p className="text-sm text-zinc-500">
          {formatDay(call.received_date)} · {formatTime12(call.received_datetime)}
        </p>
      </div>

      {response !== null && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Response time</div>
          <div className="text-2xl font-bold">{formatMinutes(response)}</div>
          <div className="text-xs text-zinc-500">From call received to officers on scene</div>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Timeline</h2>
        <ol className="ml-1.5 space-y-3 border-l border-zinc-800">
          {steps.map((step, i) => {
            const delta = i > 0 ? minutesBetween(steps[i - 1].value, step.value) : null;
            return (
              <li key={step.label} className="relative ml-4">
                <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-zinc-500" />
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium">{step.label}</span>
                  <time className="font-mono text-xs text-zinc-400">{stepTime(step.value, call.received_date)}</time>
                </div>
                {delta !== null && delta > 0 && <div className="text-xs text-zinc-500">+{formatMinutes(delta)}</div>}
              </li>
            );
          })}
        </ol>
      </section>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {details
          .filter((d): d is [string, string] => Boolean(d[1]))
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-zinc-200">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
