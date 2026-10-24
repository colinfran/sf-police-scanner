"use client";

import Link from "next/link";
import { useEffect } from "react";
import { rememberScannerScroll } from "@/lib/client-cache";
import { callLatLng } from "@/lib/format";
import type { Call } from "@/lib/types";
import CallDetailBody from "./CallDetailBody";

interface Props {
  call: Call;
  onClose: () => void;
  onViewOnMap: (id: string) => void;
}

export default function CallDrawer({ call, onClose, onViewOnMap }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      {/* z-index sits above Leaflet's panes and controls */}
      <div className="fixed inset-0 z-[1100] bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Call details"
        className="fixed inset-y-0 right-0 z-[1101] w-full max-w-md overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex gap-2 text-xs">
            {callLatLng(call) && (
              <button
                type="button"
                onClick={() => onViewOnMap(call.id)}
                className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
              >
                View on map
              </button>
            )}
            <Link
              prefetch
              href={`/calls/${call.id}`}
              onClick={rememberScannerScroll}
              className="rounded border border-zinc-700 px-3 py-1.5 hover:bg-zinc-900"
            >
              Open page
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded px-2 py-1 text-lg leading-none text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            ×
          </button>
        </div>
        <CallDetailBody call={call} />
      </aside>
    </>
  );
}
