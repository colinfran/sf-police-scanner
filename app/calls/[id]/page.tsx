import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import BackLink from "@/components/BackLink";
import CallDetailBody from "@/components/CallDetailBody";
import CallPageMap from "@/components/CallPageMap";
import Footer from "@/components/Footer";
import { getCall } from "@/lib/calls";
import { callLatLng, callLocation, callPriority, callStatus, callType } from "@/lib/format";
import { SITE_NAME } from "@/lib/site";
import { formatDay, formatTime12 } from "@/lib/time";

export const revalidate = 60;

type Params = Promise<{ id: string }>;

const loadCall = cache(getCall);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const call = await loadCall(id);
  if (!call) return { title: "Call not found", robots: { index: false } };

  const title = `${callType(call)} – ${callLocation(call)}`;
  const description =
    `${callType(call)} reported ${formatDay(call.received_date)} at ${formatTime12(call.received_datetime)}` +
    ` near ${callLocation(call)}${call.analysis_neighborhood ? ` in ${call.analysis_neighborhood}` : ""}, San Francisco.` +
    ` Priority ${callPriority(call)} · ${callStatus(call).label}.`;
  const url = `/calls/${call.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "article", url, siteName: SITE_NAME, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CallPage({ params }: { params: Params }) {
  const { id } = await params;
  const call = await loadCall(id);
  if (!call) notFound();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <nav className="flex items-center justify-between text-sm">
        <BackLink fallbackHref={`/?date=${call.received_date}`} className="text-zinc-400 hover:text-white">
          ← Back to scanner
        </BackLink>
        <Link prefetch href="/" className="font-semibold tracking-tight">
          🚨 {SITE_NAME}
        </Link>
      </nav>
      <article className="grid gap-6 md:grid-cols-2">
        <CallDetailBody call={call} />
        {callLatLng(call) && <CallPageMap call={call} />}
      </article>
      <Footer />
    </div>
  );
}
