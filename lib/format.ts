import type { Call } from "./types";

export const PRIORITY_COLORS: Record<string, string> = {
  A: "#ef4444",
  B: "#f59e0b",
  C: "#38bdf8",
};

export const PRIORITIES = ["A", "B", "C"] as const;

export const TIMELINE: { key: keyof Call; label: string }[] = [
  { key: "received_datetime", label: "Received" },
  { key: "entry_datetime", label: "Entered" },
  { key: "dispatch_datetime", label: "Dispatched" },
  { key: "enroute_datetime", label: "En route" },
  { key: "onscene_datetime", label: "On scene" },
  { key: "close_datetime", label: "Closed" },
];

export function callStatus(c: Call): { label: string; className: string } {
  if (c.close_datetime) return { label: "Closed", className: "text-zinc-500" };
  if (c.onscene_datetime) return { label: "On scene", className: "text-emerald-400" };
  if (c.enroute_datetime) return { label: "En route", className: "text-amber-400" };
  if (c.dispatch_datetime) return { label: "Dispatched", className: "text-sky-400" };
  return { label: "Pending", className: "text-red-400" };
}

export function callLocation(c: Call): string {
  if (c.intersection_name) return c.intersection_name.replace(/\s*\\\s*/g, " / ");
  return c.sensitive_call ? "Location withheld" : "Unknown location";
}

export function callType(c: Call): string {
  return c.call_type_final_desc ?? c.call_type_original_desc ?? "Unknown";
}

export function callPriority(c: Call): string {
  return c.priority_final ?? c.priority_original ?? "?";
}

/** [lat, lng] for Leaflet, or null if the call has no location. */
export function callLatLng(c: Call): [number, number] | null {
  const coords = c.intersection_point?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lng, lat] = coords.map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

export function isActive(c: Call): boolean {
  return !c.close_datetime;
}

export function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (ch) => ch.toUpperCase());
}

const AGENCY_LABELS: Record<string, string> = {
  "Municipal Transportation Agency": "MUNI",
};

export function agencyLabel(agency: string): string {
  return AGENCY_LABELS[agency] ?? agency;
}

/** Minutes between two dataset timestamps (both SF local time), or null if either is missing. */
export function minutesBetween(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const ms = Date.parse(`${to.slice(0, 19)}Z`) - Date.parse(`${from.slice(0, 19)}Z`);
  return Number.isFinite(ms) && ms >= 0 ? ms / 60_000 : null;
}

/** Received → on scene, excluding officer-initiated calls where it's always ~0. */
export function responseMinutes(c: Call): number | null {
  if (c.onview_flag === "Y") return null;
  const m = minutesBetween(c.received_datetime, c.onscene_datetime);
  return m !== null && m < 24 * 60 ? m : null;
}

export function formatMinutes(m: number): string {
  if (m < 1) return `${Math.round(m * 60)}s`;
  if (m < 60) return `${Math.round(m)}m`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h}h ${r}m` : `${h}h`;
}

export function distanceMeters([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}
