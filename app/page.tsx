import { redirect } from "next/navigation";
import Scanner from "@/components/Scanner";
import { parseUrlState } from "@/lib/filters";
import { sfToday } from "@/lib/time";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  // Older shared links opened a call in a side panel via ?call=<id>
  if (typeof params.call === "string" && /^\d{1,20}$/.test(params.call)) redirect(`/calls/${params.call}`);
  const initial = parseUrlState(params, sfToday());
  return <Scanner initial={initial} />;
}
