import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { runSync } from "@/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: NextRequest, secret: string): boolean {
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function isAuthorizedByBody(req: NextRequest, secret: string): Promise<boolean> {
  try {
    const body = await req.clone().json();
    const token = typeof body?.secret === "string" ? body.secret : "";
    const given = Buffer.from(token);
    const expected = Buffer.from(secret);
    return given.length === expected.length && timingSafeEqual(given, expected);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // When CRON_SECRET is set, only callers with a matching bearer token (header) or body secret can trigger a sync
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (!(isAuthorized(req, secret) || (await isAuthorizedByBody(req, secret)))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    const limited = rateLimit(req, "sync", 5);
    if (limited) return limited;
  }

  try {
    return NextResponse.json(await runSync());
  } catch (err) {
    console.error("[api/sync]", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
