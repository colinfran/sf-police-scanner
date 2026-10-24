import { NextResponse, type NextRequest } from "next/server";
import { collections } from "@/lib/mongodb";
import { rateLimit } from "@/lib/rate-limit";
import { sfToday, shiftDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const DAYS_SHOWN = 14;

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, "days", 30);
  if (limited) return limited;

  try {
    const { calls } = await collections();
    const since = shiftDate(sfToday(), -(DAYS_SHOWN - 1));
    const days = await calls
      .aggregate<{ date: string; count: number }>([
        // Range match uses the received_date index so we only count recent calls
        { $match: { received_date: { $gte: since } } },
        { $group: { _id: "$received_date", count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
        { $project: { _id: 0, date: "$_id", count: 1 } },
      ])
      .toArray();
    return NextResponse.json(days);
  } catch (err) {
    console.error("[api/days]", err);
    return NextResponse.json({ error: "Failed to load days" }, { status: 500 });
  }
}
