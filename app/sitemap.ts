import type { MetadataRoute } from "next";
import { collections } from "@/lib/mongodb";
import { SITE_URL } from "@/lib/site";
import { sfToday, shiftDate } from "@/lib/time";

// Query at request time so builds don't need the database
export const dynamic = "force-dynamic";

const RECENT_DAYS = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [{ url: SITE_URL, changeFrequency: "always", priority: 1 }];

  try {
    const { calls } = await collections();
    const recent = await calls
      .find({ received_date: { $gte: shiftDate(sfToday(), -(RECENT_DAYS - 1)) } }, { projection: { _id: 0, id: 1 } })
      .limit(10_000)
      .toArray();
    for (const c of recent) {
      entries.push({ url: `${SITE_URL}/calls/${c.id}`, changeFrequency: "hourly", priority: 0.5 });
    }
  } catch (err) {
    console.error("[sitemap]", err);
  }

  return entries;
}
