const TZ = "America/Los_Angeles";

/** "YYYY-MM-DDTHH:mm:ss" in SF local time, matching the dataset's floating timestamps. */
export function sfLocalIso(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
}

export function sfToday(): string {
  return sfLocalIso().slice(0, 10);
}

/** "2026-10-14T13:20:30" -> "1:20:30 PM" */
export function formatTime12(iso: string): string {
  const h = Number(iso.slice(11, 13));
  return `${h % 12 || 12}${iso.slice(13, 19)} ${h < 12 ? "AM" : "PM"}`;
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Earliest day with reliable data
export const MIN_DATE = "2026-10-12";
