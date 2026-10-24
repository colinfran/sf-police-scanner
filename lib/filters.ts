import { PRIORITIES, agencyLabel, callLatLng, distanceMeters, isActive } from "./format";
import { DATE_RE, MIN_DATE } from "./time";
import type { Call } from "./types";

export const VIEWS = ["list", "map", "stats"] as const;
export type View = (typeof VIEWS)[number];

export const STATUSES = ["all", "active", "closed"] as const;
export type StatusFilter = (typeof STATUSES)[number];

export interface Filters {
  q: string;
  priorities: string[];
  status: StatusFilter;
  district: string;
  agency: string;
}

export const EMPTY_FILTERS: Filters = { q: "", priorities: [], status: "all", district: "", agency: "" };

export interface NearMe {
  point: [number, number];
  radius: number;
}

export interface UrlState {
  date: string;
  view: View;
  filters: Filters;
}

const MAX_TEXT = 100;

type Params = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export function parseUrlState(params: Params, today: string): UrlState {
  const date = first(params.date);
  const view = first(params.view) as View;
  const status = first(params.status) as StatusFilter;
  const priorities = first(params.p)
    .toUpperCase()
    .split(",")
    .filter((p): p is (typeof PRIORITIES)[number] => (PRIORITIES as readonly string[]).includes(p));

  return {
    date: DATE_RE.test(date) && date >= MIN_DATE && date <= today ? date : today,
    view: VIEWS.includes(view) ? view : "list",
    filters: {
      q: first(params.q).slice(0, MAX_TEXT),
      priorities: [...new Set(priorities)],
      status: STATUSES.includes(status) ? status : "all",
      district: first(params.district).slice(0, MAX_TEXT),
      agency: first(params.agency).slice(0, MAX_TEXT),
    },
  };
}

export function toQueryString(state: UrlState, today: string): string {
  const p = new URLSearchParams();
  const { filters: f } = state;
  if (state.date !== today) p.set("date", state.date);
  if (state.view !== "list") p.set("view", state.view);
  if (f.q) p.set("q", f.q);
  if (f.priorities.length) p.set("p", f.priorities.join(","));
  if (f.status !== "all") p.set("status", f.status);
  if (f.district) p.set("district", f.district);
  if (f.agency) p.set("agency", f.agency);
  return p.toString();
}

export function hasActiveFilters(f: Filters): boolean {
  return Boolean(f.q || f.priorities.length || f.status !== "all" || f.district || f.agency);
}

export function applyFilters(calls: Call[], f: Filters, nearMe: NearMe | null): Call[] {
  const q = f.q.toLowerCase();
  return calls.filter((c) => {
    if (f.priorities.length && !f.priorities.includes(c.priority_final ?? c.priority_original ?? "")) return false;
    if (f.status === "active" && !isActive(c)) return false;
    if (f.status === "closed" && isActive(c)) return false;
    if (f.district && c.police_district !== f.district) return false;
    if (f.agency && c.agency !== f.agency) return false;
    if (
      q &&
      ![
        c.call_type_final_desc,
        c.call_type_original_desc,
        c.intersection_name,
        c.analysis_neighborhood,
        c.police_district,
        c.agency,
        c.agency && agencyLabel(c.agency),
      ].some((v) => v?.toLowerCase().includes(q))
    ) {
      return false;
    }
    if (nearMe) {
      const ll = callLatLng(c);
      if (!ll || distanceMeters(ll, nearMe.point) > nearMe.radius) return false;
    }
    return true;
  });
}

/** Sorted unique non-empty values of a field, for filter dropdowns. */
export function uniqueValues(calls: Call[], key: "police_district" | "agency"): string[] {
  return [...new Set(calls.map((c) => c[key]).filter((v): v is string => Boolean(v)))].sort();
}
