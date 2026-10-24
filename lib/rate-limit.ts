import { NextResponse, type NextRequest } from "next/server";

// Best-effort, per-instance limiter: serverless instances don't share memory
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns a 429 response if the client is over `limit` requests per minute for `bucket`, else null. */
export function rateLimit(req: NextRequest, bucket: string, limit: number): NextResponse | null {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }

  const key = `${bucket}:${clientIp(req)}`;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  if (++entry.count <= limit) return null;

  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
