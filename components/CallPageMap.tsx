"use client";

import dynamic from "next/dynamic";
import type { Call } from "@/lib/types";
import { MapSkeleton } from "./Skeleton";

// Leaflet needs `window`, so skip SSR
const CallMap = dynamic(() => import("./CallMap"), {
  ssr: false,
  loading: () => <MapSkeleton className="h-80 rounded-lg" />,
});

export default function CallPageMap({ call }: { call: Call }) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <CallMap calls={[call]} focusCall={call} showControls={false} className="h-80" />
    </div>
  );
}
