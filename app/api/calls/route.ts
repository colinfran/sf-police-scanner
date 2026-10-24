import { NextResponse, type NextRequest } from "next/server";
import { collections } from "@/lib/mongodb";
import { rateLimit } from "@/lib/rate-limit";
import { DATE_RE, sfToday } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "calls", 60);
  if (limited) return limited;

  const date = req.nextUrl.searchParams.get("date") ?? sfToday();
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date; expected YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const { calls, meta } = await collections();
    const [rows, state] = await Promise.all([
      calls
        .find({ received_date: date }, { projection: { _id: 0 } })
        .sort({ received_datetime: -1 })
        .limit(10_000)
        .toArray(),
      meta.findOne({ _id: "sync" }),
    ]);

    return NextResponse.json({
      date,
      calls: rows,
      lastSyncAt: state?.lastSyncAt ?? null,
      dataAsOf: state?.dataAsOf ?? null,
    });
  } catch (err) {
    console.error("[api/calls]", err);
    return NextResponse.json({ error: "Failed to load calls" }, { status: 500 });
  }
}
