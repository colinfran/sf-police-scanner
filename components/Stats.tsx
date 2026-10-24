import { useMemo } from "react";
import { PRIORITY_COLORS, formatMinutes, titleCase } from "@/lib/format";
import { computeStats, type Ranked, type ResponseRow } from "@/lib/stats";
import type { Call } from "@/lib/types";

interface Props {
  calls: Call[];
  onSearch: (text: string) => void;
  onDistrict: (district: string) => void;
}

function hourLabel(h: number): string {
  return `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-800 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function BarList({ rows, onPick, format }: { rows: Ranked[]; onPick: (label: string) => void; format?: (s: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <p className="text-sm text-zinc-500">No data.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label}>
          <button
            type="button"
            onClick={() => onPick(r.label)}
            className="group relative block w-full overflow-hidden rounded px-2 py-1 text-left text-sm hover:bg-zinc-900"
            title={`Filter by ${r.label}`}
          >
            <span className="absolute inset-y-0 left-0 bg-zinc-800/80" style={{ width: `${(r.count / max) * 100}%` }} />
            <span className="relative flex justify-between gap-3">
              <span className="truncate">{format ? format(r.label) : r.label}</span>
              <span className="tabular-nums text-zinc-400">{r.count}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ResponseBars({ rows, onPick }: { rows: ResponseRow[]; onPick?: (label: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.median));
  if (!rows.length) return <p className="text-sm text-zinc-500">No calls with an on-scene time yet.</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const content = (
          <>
            <span
              className="absolute inset-y-0 left-0"
              style={{
                width: `${(r.median / max) * 100}%`,
                backgroundColor: PRIORITY_COLORS[r.label] ? `${PRIORITY_COLORS[r.label]}40` : "rgb(39 39 42 / 0.8)",
              }}
            />
            <span className="relative flex justify-between gap-3">
              <span className="truncate">{PRIORITY_COLORS[r.label] ? `Priority ${r.label}` : titleCase(r.label)}</span>
              <span className="tabular-nums text-zinc-400">
                {formatMinutes(r.median)} <span className="text-zinc-600">median · {r.count}</span>
              </span>
            </span>
          </>
        );
        const cls = "relative block w-full overflow-hidden rounded px-2 py-1 text-left text-sm";
        return (
          <li key={r.label}>
            {onPick ? (
              <button type="button" onClick={() => onPick(r.label)} className={`${cls} hover:bg-zinc-900`}>
                {content}
              </button>
            ) : (
              <div className={cls}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function Stats({ calls, onSearch, onDistrict }: Props) {
  const s = useMemo(() => computeStats(calls), [calls]);
  const maxHour = Math.max(1, ...s.byHour);
  const peakHour = s.byHour.indexOf(Math.max(...s.byHour));
  const priorityA = calls.filter((c) => (c.priority_final ?? c.priority_original) === "A").length;

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Calls" value={s.total.toLocaleString()} />
        <Card label="Still open" value={s.active.toLocaleString()} />
        <Card
          label="Median response"
          value={s.overallMedianResponse !== null ? formatMinutes(s.overallMedianResponse) : "—"}
          sub="received → on scene"
        />
        <Card label="Priority A" value={priorityA.toLocaleString()} sub={s.total ? `${Math.round((priorityA / s.total) * 100)}% of calls` : undefined} />
      </div>

      <Section title={`Calls by hour${s.total ? ` · busiest ${hourLabel(peakHour)}` : ""}`}>
        <div className="flex h-36 items-end gap-0.5" role="img" aria-label="Bar chart of calls received per hour">
          {s.byHour.map((n, h) => (
            <div key={h} className="flex h-full flex-1 flex-col justify-end" title={`${hourLabel(h)}: ${n} calls`}>
              <div className="rounded-t bg-red-500/60" style={{ height: `${(n / maxHour) * 100}%`, minHeight: n ? 2 : 0 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex text-[10px] text-zinc-500">
          {s.byHour.map((_, h) => (
            <span key={h} className="flex-1 text-center">
              {h % 3 === 0 ? hourLabel(h) : ""}
            </span>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Top call types">
          <BarList rows={s.topTypes} onPick={onSearch} />
        </Section>
        <Section title="Busiest neighborhoods">
          <BarList rows={s.topNeighborhoods} onPick={onSearch} />
        </Section>
        <Section title="Response time by priority">
          <ResponseBars rows={s.responseByPriority} />
        </Section>
        <Section title="Response time by district">
          <ResponseBars rows={s.responseByDistrict} onPick={onDistrict} />
        </Section>
      </div>

      <p className="text-xs text-zinc-600">
        Response time is from call received to first unit on scene. Officer-initiated calls are excluded. Click a row to
        filter.
      </p>
    </div>
  );
}
