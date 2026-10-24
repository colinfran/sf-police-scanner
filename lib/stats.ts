import { PRIORITIES, callType, isActive, responseMinutes } from "./format";
import type { Call } from "./types";

export interface Ranked {
  label: string;
  count: number;
}

export interface ResponseRow {
  label: string;
  avg: number;
  median: number;
  count: number;
}

export interface CallStats {
  total: number;
  active: number;
  byHour: number[];
  topTypes: Ranked[];
  topNeighborhoods: Ranked[];
  responseByDistrict: ResponseRow[];
  responseByPriority: ResponseRow[];
  overallMedianResponse: number | null;
}

function top(counts: Map<string, number>, n: number): Ranked[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function summarize(groups: Map<string, number[]>): ResponseRow[] {
  return [...groups.entries()].map(([label, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      label,
      avg: values.reduce((s, v) => s + v, 0) / values.length,
      median: median(sorted),
      count: values.length,
    };
  });
}

function push(map: Map<string, number[]>, key: string, value: number) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function computeStats(calls: Call[]): CallStats {
  const byHour = Array<number>(24).fill(0);
  const types = new Map<string, number>();
  const hoods = new Map<string, number>();
  const byDistrict = new Map<string, number[]>();
  const byPriority = new Map<string, number[]>();
  const all: number[] = [];
  let active = 0;

  for (const c of calls) {
    const hour = Number(c.received_datetime.slice(11, 13));
    if (hour >= 0 && hour < 24) byHour[hour]++;
    if (isActive(c)) active++;

    const type = callType(c);
    types.set(type, (types.get(type) ?? 0) + 1);
    if (c.analysis_neighborhood) hoods.set(c.analysis_neighborhood, (hoods.get(c.analysis_neighborhood) ?? 0) + 1);

    const rt = responseMinutes(c);
    if (rt === null) continue;
    all.push(rt);
    if (c.police_district) push(byDistrict, c.police_district, rt);
    const p = c.priority_final ?? c.priority_original;
    if (p) push(byPriority, p, rt);
  }

  return {
    total: calls.length,
    active,
    byHour,
    topTypes: top(types, 10),
    topNeighborhoods: top(hoods, 10),
    responseByDistrict: summarize(byDistrict).sort((a, b) => a.median - b.median),
    responseByPriority: summarize(byPriority)
      .filter((r) => (PRIORITIES as readonly string[]).includes(r.label))
      .sort((a, b) => a.label.localeCompare(b.label)),
    overallMedianResponse: all.length ? median(all.sort((a, b) => a - b)) : null,
  };
}
