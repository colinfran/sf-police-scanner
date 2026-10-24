import type { AnyBulkWriteOperation } from "mongodb";
import { collections } from "./mongodb";
import { sfLocalIso } from "./time";
import type { Call } from "./types";

const API_URL =
  process.env.SCANNER_API_URL ?? "https://data.sf.gov/api/v3/views/gnap-fj3t/query.json";
const API_KEY = process.env.SCANNER_API_KEY;
const API_SECRET = process.env.SCANNER_API_SECRET;
const PAGE_SIZE = 1000;
// Kept small so a run fits in a serverless timeout; large backfills finish over several runs.
const MAX_PAGES = 10;
const INITIAL_BACKFILL_DAYS = 7;
// Ignore requests arriving sooner than this after the last sync; kept under the 1-minute schedule to tolerate jitter.
const MIN_SYNC_INTERVAL_MS = 30_000;
const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/;

export interface SyncResult {
  skipped: boolean;
  fetched: number;
  upserted: number;
  modified: number;
  cursor: string;
}

type RawRow = Record<string, unknown>;

// SODA3 requires authentication; API key + secret are passed via HTTP Basic Auth.
const AUTH_HEADER =
  API_KEY && API_SECRET
    ? `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64")}`
    : null;

async function query(soql: string): Promise<RawRow[]> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(AUTH_HEADER ? { Authorization: AUTH_HEADER } : {}),
    },
    body: JSON.stringify({ query: soql }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`data.sf.gov ${res.status}: ${await res.text()}`);
  return res.json();
}

function toCall(row: RawRow): Call {
  const doc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    // Drop Socrata system fields (":id", ":version", ...)
    if (!k.startsWith(":")) doc[k] = v;
  }
  doc.received_date = String(row.received_datetime).slice(0, 10);
  return doc as unknown as Call;
}

async function doSync(): Promise<SyncResult> {
  const { calls, meta } = await collections();
  const state = await meta.findOne({ _id: "sync" });

  if (state && Date.now() - state.lastSyncAt.getTime() < MIN_SYNC_INTERVAL_MS) {
    return { skipped: true, fetched: 0, upserted: 0, modified: 0, cursor: state.cursor };
  }

  let cursor = state?.cursor ?? sfLocalIso(new Date(Date.now() - INITIAL_BACKFILL_DAYS * 86_400_000));
  if (!TIMESTAMP_RE.test(cursor)) throw new Error(`Invalid sync cursor: ${cursor}`);

  let fetched = 0;
  let upserted = 0;
  let modified = 0;
  let dataAsOf = state?.dataAsOf;
  const startCursor = cursor;

  for (let page = 0; page < MAX_PAGES; page++) {
    const rows = await query(
      `SELECT * WHERE call_last_updated_at >= '${startCursor}' ` +
        `ORDER BY call_last_updated_at ASC, id ASC LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}`,
    );
    const valid = rows.filter((r) => r.id && r.received_datetime);
    fetched += valid.length;

    if (valid.length) {
      const ops: AnyBulkWriteOperation<Call>[] = valid.map((row) => {
        const call = toCall(row);
        return { updateOne: { filter: { id: call.id }, update: { $set: call }, upsert: true } };
      });
      const res = await calls.bulkWrite(ops, { ordered: false });
      upserted += res.upsertedCount;
      modified += res.modifiedCount;

      const last = valid[valid.length - 1];
      if (typeof last.call_last_updated_at === "string" && TIMESTAMP_RE.test(last.call_last_updated_at)) {
        cursor = last.call_last_updated_at;
      }
      if (typeof last.data_as_of === "string") dataAsOf = last.data_as_of;
    }

    await meta.updateOne(
      { _id: "sync" },
      { $set: { cursor, lastSyncAt: new Date(), dataAsOf } },
      { upsert: true },
    );

    if (rows.length < PAGE_SIZE) break;
  }

  return { skipped: false, fetched, upserted, modified, cursor };
}

const g = globalThis as unknown as { _syncInFlight?: Promise<SyncResult> };

/** Pulls new/updated calls from data.sf.gov into MongoDB. Concurrent calls share one run. */
export function runSync(): Promise<SyncResult> {
  g._syncInFlight ??= doSync().finally(() => {
    g._syncInFlight = undefined;
  });
  return g._syncInFlight;
}
