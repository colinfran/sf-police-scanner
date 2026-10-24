import type { UrlState } from "./filters";
import type { Call, Day } from "./types";

export interface CallsResponse {
  date: string;
  calls: Call[];
  lastSyncAt: string | null;
  dataAsOf: string | null;
}

const MAX_CACHED_DAYS = 7;

/**
 * In-memory state that outlives the Scanner component across client-side navigations
 * (e.g. list → call page → back), so returning doesn't refetch or reset the view.
 * Only written from effects/handlers, so it stays empty on the server.
 */
export const clientCache = {
  calls: new Map<string, { data: CallsResponse; fetchedAt: number }>(),
  days: null as { data: Day[]; fetchedAt: number } | null,
  ui: null as UrlState | null,
  mapView: null as { center: [number, number]; zoom: number } | null,
  mapMode: null as "points" | "heat" | null,
  /** Scroll position when the user left the scanner for a call page; null if they didn't. */
  returnScrollY: null as number | null,
  /** Call whose map popup linked to the call page, so the map can reopen it on return. */
  returnCallId: null as string | null,
};

export function cacheCalls(data: CallsResponse) {
  clientCache.calls.delete(data.date);
  clientCache.calls.set(data.date, { data, fetchedAt: Date.now() });
  if (clientCache.calls.size > MAX_CACHED_DAYS) {
    clientCache.calls.delete(clientCache.calls.keys().next().value!);
  }
}

/** Call from link click handlers that leave the scanner for a call page. */
export function rememberScannerScroll(e: React.MouseEvent, mapCallId?: string) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  clientCache.returnScrollY = window.scrollY;
  clientCache.returnCallId = mapCallId ?? null;
}
