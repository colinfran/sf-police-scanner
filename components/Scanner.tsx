"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cacheCalls, clientCache, type CallsResponse } from "@/lib/client-cache";
import {
  EMPTY_FILTERS,
  VIEWS,
  applyFilters,
  hasActiveFilters,
  toQueryString,
  uniqueValues,
  type Filters,
  type NearMe,
  type UrlState,
  type View,
} from "@/lib/filters";
import { MIN_DATE, formatDay, sfToday, shiftDate } from "@/lib/time";
import type { Call, Day } from "@/lib/types";
import { LAST_SCANNER_URL_KEY } from "./BackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CallList from "./CallList";
import DatePicker from "./DatePicker";
import FilterBar, { type GeoState } from "./FilterBar";
import Footer from "./Footer";
import { CallListSkeleton, MapSkeleton, Skeleton, StatsSkeleton } from "./Skeleton";
import Stats from "./Stats";

// Leaflet needs `window`, so skip SSR
const CallMap = dynamic(() => import("./CallMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const REFRESH_MS = 30_000;
const NEAR_ME_RADIUS_M = 1000;
// Syncs run every ~10 min; warn once a couple have clearly been missed
const STALE_AFTER_MIN = 25;

// Ticks on its own so the rest of the page doesn't re-render every second
function RefreshCountdown({ nextAt }: { nextAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.min(REFRESH_MS / 1000, Math.max(0, Math.ceil((nextAt - now) / 1000)));
  return (
    <span className="ml-2 text-xs tabular-nums text-zinc-600">
      {secs > 0 ? `Refreshing in ${secs}s` : "Refreshing…"}
    </span>
  );
}

export default function Scanner({ initial }: { initial: UrlState }) {
  // Returning from a call page: resume exactly where the user left off
  const [start] = useState(() => (clientCache.returnScrollY !== null && clientCache.ui) || initial);
  const [date, setDate] = useState(start.date);
  const [view, setView] = useState<View>(start.view);
  const [filters, setFilters] = useState<Filters>(start.filters);
  const [nearMe, setNearMe] = useState<NearMe | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [data, setData] = useState<CallsResponse | null>(() => clientCache.calls.get(start.date)?.data ?? null);
  const [days, setDays] = useState<Day[] | null>(() => clientCache.days?.data ?? null);
  const [error, setError] = useState<string | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<number | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const seenRef = useRef<{ date: string; ids: Set<string> } | null>(
    data ? { date: data.date, ids: new Set(data.calls.map((c) => c.id)) } : null,
  );
  const today = sfToday();
  const isToday = date === today;

  // Returning from a call page: restore scroll once the cached list has rendered
  useLayoutEffect(() => {
    const y = clientCache.returnScrollY;
    clientCache.returnScrollY = null;
    if (y === null || !data) return;
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
  }, []);

  const load = useCallback(
    async (signal: AbortSignal) => {
      try {
        const res = await fetch(`/api/calls?date=${encodeURIComponent(date)}`, { signal, cache: "no-store" });
        if (!res.ok) {
          throw new Error(res.status === 429 ? "Too many requests — try again in a minute" : `Failed to load calls (${res.status})`);
        }
        const json: CallsResponse = await res.json();
        cacheCalls(json);
        // Calls not seen in the previous refresh of the same day are "new"
        const seen = seenRef.current;
        setNewIds(
          seen && seen.date === json.date
            ? new Set(json.calls.filter((c) => !seen.ids.has(c.id)).map((c) => c.id))
            : new Set(),
        );
        seenRef.current = { date: json.date, ids: new Set(json.calls.map((c) => c.id)) };
        setData(json);
        setError(null);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      }
    },
    [date],
  );

  // Day counts aren't polled; they refresh on page load and when the date changes
  useEffect(() => {
    const cached = clientCache.days;
    if (cached && Date.now() - cached.fetchedAt < REFRESH_MS) return;
    const ctrl = new AbortController();
    fetch("/api/days", { signal: ctrl.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((d: Day[] | null) => {
        if (d) clientCache.days = { data: d, fetchedAt: Date.now() };
        setDays((prev) => d ?? prev ?? []);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setDays((prev) => prev ?? []);
      });
    return () => ctrl.abort();
  }, [date]);

  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Schedule the next refresh only after the current one finishes
    const run = async () => {
      setNextRefreshAt(null);
      await load(ctrl.signal);
      if (!isToday || ctrl.signal.aborted) return;
      setNextRefreshAt(Date.now() + REFRESH_MS);
      timer = setTimeout(run, REFRESH_MS);
    };
    // Cached data that's still fresh (e.g. after coming back from a call page) waits out the countdown
    const cached = clientCache.calls.get(date);
    const age = cached ? Date.now() - cached.fetchedAt : Infinity;
    if (age < REFRESH_MS) {
      setData((prev) => (prev?.date === date ? prev : cached!.data));
      if (isToday) {
        setNextRefreshAt(Date.now() + REFRESH_MS - age);
        timer = setTimeout(run, REFRESH_MS - age);
      }
    } else {
      run();
    }
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [load, isToday, date]);

  // Keep the URL in sync so any view can be shared or bookmarked
  useEffect(() => {
    const qs = toQueryString({ date, view, filters }, today);
    clientCache.ui = { date, view, filters };
    const next = qs ? `?${qs}` : "";
    if (next !== window.location.search) window.history.replaceState(null, "", `${window.location.pathname}${next}`);
    sessionStorage.setItem(LAST_SCANNER_URL_KEY, `/${next}`);
  }, [date, view, filters, today]);

  const allCalls = data && data.date === date ? data.calls : null;
  const calls = useMemo(() => (allCalls ? applyFilters(allCalls, filters, nearMe) : null), [allCalls, filters, nearMe]);
  const districts = useMemo(() => (allCalls ? uniqueValues(allCalls, "police_district") : []), [allCalls]);
  const agencies = useMemo(() => (allCalls ? uniqueValues(allCalls, "agency") : []), [allCalls]);
  const newCount = useMemo(() => (calls ? calls.filter((c) => newIds.has(c.id)).length : 0), [calls, newIds]);
  const filtering = hasActiveFilters(filters) || nearMe !== null;

  const changeDate = useCallback((d: string) => setDate(d), []);
  const updateFilters = useCallback((patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch })), []);
  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setNearMe(null);
    setGeoState("idle");
  }, []);
  const searchFor = useCallback((q: string) => updateFilters({ q }), [updateFilters]);
  const filterDistrict = useCallback((district: string) => updateFilters({ district }), [updateFilters]);

  const toggleNearMe = useCallback(() => {
    if (nearMe) {
      setNearMe(null);
      return;
    }
    if (!navigator.geolocation) {
      setGeoState("error");
      return;
    }
    setGeoState("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNearMe({ point: [pos.coords.latitude, pos.coords.longitude], radius: NEAR_ME_RADIUS_M });
        setGeoState("idle");
      },
      () => setGeoState("error"),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, [nearMe]);

  const staleMinutes =
    data?.lastSyncAt != null ? Math.round((Date.now() - Date.parse(data.lastSyncAt)) / 60_000) : null;

  // Patch the viewed day's count from the latest refresh so the sidebar stays live
  const sidebarDays = useMemo(() => {
    if (!days) return null;
    const list = days.filter((d) => d.date >= MIN_DATE);
    if (!data) return list;
    const live = { date: data.date, count: data.calls.length };
    const i = list.findIndex((d) => d.date === live.date);
    if (i >= 0) return list.map((d, j) => (j === i ? live : d));
    return live.count > 0 ? [live, ...list].sort((a, b) => b.date.localeCompare(a.date)) : list;
  }, [days, data]);

  const loadingCalls = calls === null && !error;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            {isToday && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />}
            <span className={`relative inline-flex h-3 w-3 rounded-full ${isToday ? "bg-red-500" : "bg-zinc-600"}`} />
          </span>
          <h1 className="text-xl font-bold tracking-tight">SF Police Scanner</h1>
        </div>
        <div className="text-xs text-zinc-500">
          {!data && !error && <Skeleton className="h-3.5 w-56" />}
          {data?.dataAsOf && <>Data as of {data.dataAsOf.replace("T", " ").slice(0, 16)} · </>}
          {data?.lastSyncAt && <>Synced {new Date(data.lastSyncAt).toLocaleTimeString()}</>}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => changeDate(shiftDate(date, -1))}
          disabled={date <= MIN_DATE}
          className="border-zinc-800 bg-transparent hover:bg-zinc-900 dark:bg-transparent dark:hover:bg-zinc-900"
        >
          ← Prev
        </Button>
        <DatePicker value={date} min={MIN_DATE} max={today} onChange={changeDate} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => changeDate(shiftDate(date, 1))}
          disabled={isToday}
          className="border-zinc-800 bg-transparent hover:bg-zinc-900 dark:bg-transparent dark:hover:bg-zinc-900"
        >
          Next →
        </Button>
        {!isToday && (
          <Button
            type="button"
            size="sm"
            onClick={() => changeDate(today)}
            className="bg-red-600 text-white hover:bg-red-500"
          >
            Live
          </Button>
        )}
        <Input
          type="search"
          aria-label="Search calls"
          placeholder="Search type, location, district…"
          value={filters.q}
          maxLength={100}
          onChange={(e) => updateFilters({ q: e.target.value })}
          className="ml-auto h-7 w-full border-zinc-800 bg-zinc-900 text-sm sm:w-72 dark:bg-zinc-900"
        />
      </div>

      <FilterBar
        filters={filters}
        onChange={updateFilters}
        onClear={clearFilters}
        showClear={filtering}
        districts={districts}
        agencies={agencies}
        nearMe={nearMe !== null}
        nearMeLabel={`Within ${NEAR_ME_RADIUS_M / 1000} km`}
        geoState={geoState}
        onToggleNearMe={toggleNearMe}
      />

      {staleMinutes !== null && staleMinutes > STALE_AFTER_MIN && (
        <div className="rounded border border-amber-900 bg-amber-950/40 px-4 py-2 text-sm text-amber-300">
          Data may be out of date — the last sync was {staleMinutes} minutes ago.
        </div>
      )}

      {error && <div className="rounded border border-red-900 bg-red-950/50 px-4 py-2 text-sm text-red-300">{error}</div>}

      <div className="flex flex-1 gap-4">
        <aside className="sticky top-4 hidden max-h-[calc(100vh-2rem)] w-44 shrink-0 self-start overflow-y-auto lg:block">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Previous days</h2>
          <ul className="space-y-0.5">
            {!sidebarDays &&
              Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="flex justify-between px-2 py-1.5">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-8" />
                </li>
              ))}
            {sidebarDays?.map((d) => (
              <li key={d.date}>
                <button
                  onClick={() => changeDate(d.date)}
                  className={`flex w-full justify-between rounded px-2 py-1 text-sm ${
                    d.date === date ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900"
                  }`}
                >
                  <span>{d.date === today ? "Today" : formatDay(d.date)}</span>
                  <span className="text-zinc-500">{d.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2 text-sm text-zinc-400">
            <div className="flex flex-wrap items-center gap-1">
              {formatDay(date)} ·{" "}
              {calls && allCalls ? (
                `${calls.length}${calls.length !== allCalls.length ? ` of ${allCalls.length}` : ""} call${allCalls.length === 1 ? "" : "s"}`
              ) : (
                <Skeleton className="inline-block h-4 w-16 align-middle" />
              )}
              {newCount > 0 && (
                <span className="ml-1 rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-semibold text-red-300">
                  +{newCount} new
                </span>
              )}
              {isToday &&
                (nextRefreshAt ? (
                  <RefreshCountdown nextAt={nextRefreshAt} />
                ) : (
                  <span className="ml-2 text-xs text-zinc-600">Refreshing…</span>
                ))}
            </div>
            <div className="flex overflow-hidden rounded border border-zinc-800 text-xs">
              {VIEWS.map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`px-3 py-1 capitalize ${view === v ? "bg-zinc-800 text-white" : "hover:bg-zinc-900"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {view === "map" &&
            (calls ? (
              <CallMap calls={calls} nearMe={nearMe} persistView />
            ) : (
              loadingCalls && <MapSkeleton />
            ))}

          {view === "stats" &&
            (calls ? (
              <Stats calls={calls} onSearch={searchFor} onDistrict={filterDistrict} />
            ) : (
              loadingCalls && <StatsSkeleton />
            ))}

          {view === "list" && (
            <>
              {loadingCalls && <CallListSkeleton />}
              {calls && calls.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">
                  {filtering ? (
                    <>
                      No calls match your filters.{" "}
                      <button onClick={clearFilters} className="underline hover:text-white">
                        Clear filters
                      </button>
                    </>
                  ) : (
                    "No calls recorded."
                  )}
                </div>
              )}
              {calls && <CallList calls={calls} newIds={newIds} />}
            </>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
