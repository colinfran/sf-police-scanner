"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Plugin attaches to the global `L` that Leaflet's UMD build sets
import "leaflet.heat";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { clientCache, rememberScannerScroll } from "@/lib/client-cache";
import type { NearMe } from "@/lib/filters";
import {
  PRIORITIES,
  PRIORITY_COLORS,
  callLatLng,
  callLocation,
  callPriority,
  callStatus,
  callType,
  isActive,
} from "@/lib/format";
import { formatTime12 } from "@/lib/time";
import type { Call } from "@/lib/types";

const SF_CENTER: [number, number] = [37.7599, -122.4348];
const MAX_ZOOM = 16;
// Individual dots from this zoom in; grouped below it
const CLUSTER_UNTIL_ZOOM = 14;
const CELL_PX = 56;
const GRAY = "#a1a1aa";

type Located = { call: Call; latLng: [number, number] };
type Mode = "points" | "heat";
type Cluster = { key: string; single: Located } | { key: string; center: [number, number]; icon: L.DivIcon };

function priorityRank(c: Call): number {
  const i = (PRIORITIES as readonly string[]).indexOf(callPriority(c));
  return i === -1 ? PRIORITIES.length : i;
}

function CallPopup({ call, showLink }: { call: Call; showLink: boolean }) {
  return (
    <div className="space-y-0.5 text-zinc-900">
      <div className="font-semibold">{callType(call)}</div>
      <div>{callLocation(call)}</div>
      <div className="text-xs text-zinc-600">
        {formatTime12(call.received_datetime)} · Priority {callPriority(call)} · {callStatus(call).label}
      </div>
      {call.analysis_neighborhood && <div className="text-xs text-zinc-600">{call.analysis_neighborhood}</div>}
      {showLink && (
        <Link
          href={`/calls/${call.id}`}
          prefetch={true}
          onClick={(e) => rememberScannerScroll(e, call.id)}
          className="mt-1 inline-block text-xs font-semibold !text-blue-700 hover:underline"
        >
          Details →
        </Link>
      )}
    </div>
  );
}

function CallDot({ call, latLng, showLink }: Located & { showLink: boolean }) {
  const color = PRIORITY_COLORS[callPriority(call)] ?? GRAY;
  return (
    <CircleMarker
      center={latLng}
      radius={6}
      pathOptions={{ color, fillColor: color, weight: 1, fillOpacity: isActive(call) ? 0.75 : 0.25 }}
    >
      <Popup>
        <CallPopup call={call} showLink={showLink} />
      </Popup>
    </CircleMarker>
  );
}

function clusterIcon(count: number, color: string): L.DivIcon {
  const size = Math.round(26 + Math.min(22, Math.sqrt(count) * 3));
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    html: `<div class="call-cluster" style="--cluster-color:${color};width:${size}px;height:${size}px">${count}</div>`,
  });
}

function ClusteredDots({ located, showLink }: { located: Located[]; showLink: boolean }) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const clusters = useMemo<Cluster[] | null>(() => {
    if (zoom >= CLUSTER_UNTIL_ZOOM) return null;
    const cells = new Map<string, Located[]>();
    for (const m of located) {
      const p = map.project(m.latLng, zoom);
      const key = `${Math.floor(p.x / CELL_PX)}:${Math.floor(p.y / CELL_PX)}`;
      const cell = cells.get(key);
      if (cell) cell.push(m);
      else cells.set(key, [m]);
    }
    return [...cells.entries()].map(([key, group]): Cluster => {
      if (group.length === 1) return { key, single: group[0] };
      const lat = group.reduce((s, m) => s + m.latLng[0], 0) / group.length;
      const lng = group.reduce((s, m) => s + m.latLng[1], 0) / group.length;
      const top = group.reduce((best, m) => (priorityRank(m.call) < priorityRank(best.call) ? m : best));
      return { key, center: [lat, lng], icon: clusterIcon(group.length, PRIORITY_COLORS[callPriority(top.call)] ?? GRAY) };
    });
  }, [located, zoom, map]);

  if (!clusters) {
    return (
      <>
        {located.map((m) => (
          <CallDot key={m.call.id} {...m} showLink={showLink} />
        ))}
      </>
    );
  }

  return (
    <>
      {clusters.map((c) =>
        "single" in c ? (
          <CallDot key={c.single.call.id} {...c.single} showLink={showLink} />
        ) : (
          <Marker
            key={`cluster:${c.key}`}
            position={c.center}
            icon={c.icon}
            eventHandlers={{ click: () => map.flyTo(c.center, Math.min(zoom + 2, CLUSTER_UNTIL_ZOOM)) }}
          />
        ),
      )}
    </>
  );
}

function HeatLayer({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.heatLayer(
      points.map(([lat, lng]) => [lat, lng, 0.6] as [number, number, number]),
      { radius: 20, blur: 16, maxZoom: 15, minOpacity: 0.3 },
    ).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, points]);
  return null;
}

function NearMeLayer({ nearMe }: { nearMe: NearMe }) {
  const map = useMap();
  const [lat, lng] = nearMe.point;
  useEffect(() => {
    map.flyToBounds(L.latLng(lat, lng).toBounds(nearMe.radius * 2.2), { duration: 0.8 });
  }, [map, lat, lng, nearMe.radius]);
  return (
    <>
      <Circle
        center={nearMe.point}
        radius={nearMe.radius}
        pathOptions={{ color: "#a78bfa", weight: 1.5, dashArray: "6 6", fillOpacity: 0.05 }}
      />
      <CircleMarker center={nearMe.point} radius={6} pathOptions={{ color: "#fff", weight: 2, fillColor: "#8b5cf6", fillOpacity: 1 }} />
    </>
  );
}

function FocusMarker({ call }: { call: Call }) {
  const map = useMap();
  const ref = useRef<L.CircleMarker>(null);
  const latLng = callLatLng(call);
  const [lat, lng] = latLng ?? [NaN, NaN];

  useEffect(() => {
    if (Number.isNaN(lat)) return;
    const open = () => ref.current?.openPopup();
    map.once("moveend", open);
    map.flyTo([lat, lng], MAX_ZOOM, { duration: 0.8 });
    return () => {
      map.off("moveend", open);
    };
  }, [map, call.id, lat, lng]);

  if (!latLng) return null;
  const color = PRIORITY_COLORS[callPriority(call)] ?? GRAY;
  return (
    <CircleMarker ref={ref} center={latLng} radius={10} pathOptions={{ color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.95 }}>
      <Popup>
        <CallPopup call={call} showLink={false} />
      </Popup>
    </CircleMarker>
  );
}

// Remembers where the user left the map so returning from a call page puts them back there
function ViewSaver() {
  const map = useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      clientCache.mapView = { center: [c.lat, c.lng], zoom: map.getZoom() };
    },
  });
  return null;
}

// Standalone popup (no parent marker) so it opens even when the call's dot is inside a cluster
function ReturnPopup({ call, onClose }: { call: Call; onClose: () => void }) {
  const latLng = callLatLng(call);
  if (!latLng) return null;
  return (
    <Popup position={latLng} eventHandlers={{ remove: onClose }}>
      <CallPopup call={call} showLink />
    </Popup>
  );
}

interface Props {
  calls: Call[];
  focusCall?: Call | null;
  nearMe?: NearMe | null;
  /** Scanner map: link popups to call pages and keep position/mode across navigation. */
  persistView?: boolean;
  className?: string;
  showControls?: boolean;
}

export default function CallMap({
  calls,
  focusCall = null,
  nearMe = null,
  persistView = false,
  className = "h-[70vh]",
  showControls = true,
}: Props) {
  const [mode, setModeState] = useState<Mode>(() => (persistView && clientCache.mapMode) || "points");
  const setMode = (m: Mode) => {
    setModeState(m);
    if (persistView) clientCache.mapMode = m;
  };
  const [initialView] = useState(() => (persistView && clientCache.mapView) || { center: SF_CENTER, zoom: 12 });
  const [returnCallId, setReturnCallId] = useState(() => (persistView ? clientCache.returnCallId : null));
  useEffect(() => {
    if (persistView) clientCache.returnCallId = null;
  }, [persistView]);
  const returnCall = useMemo(
    () => (returnCallId ? calls.find((c) => c.id === returnCallId) ?? null : null),
    [calls, returnCallId],
  );

  const located = useMemo(
    () =>
      calls
        .map((call) => ({ call, latLng: callLatLng(call) }))
        .filter((m): m is Located => m.latLng !== null)
        // Draw lower priorities first so A calls end up on top
        .sort((a, b) => priorityRank(b.call) - priorityRank(a.call)),
    [calls],
  );
  const heatPoints = useMemo(() => located.map((m) => m.latLng), [located]);

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={initialView.center}
        zoom={initialView.zoom}
        maxZoom={MAX_ZOOM}
        preferCanvas
        className="h-full w-full bg-zinc-900"
      >
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={MAX_ZOOM}
        />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={MAX_ZOOM}
        />
        {mode === "points" ? <ClusteredDots located={located} showLink={persistView} /> : <HeatLayer points={heatPoints} />}
        {nearMe && <NearMeLayer nearMe={nearMe} />}
        {focusCall && <FocusMarker call={focusCall} />}
        {persistView && <ViewSaver />}
        {returnCall && <ReturnPopup call={returnCall} onClose={() => setReturnCallId(null)} />}
      </MapContainer>

      {showControls && (
        <div className="absolute right-2 top-2 z-[1000] flex overflow-hidden rounded border border-zinc-700 bg-zinc-950/90 text-xs">
          {(["points", "heat"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`px-3 py-1 ${mode === m ? "bg-zinc-700 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}
            >
              {m === "heat" ? "Heatmap" : "Points"}
            </button>
          ))}
        </div>
      )}

      {showControls && (
        <div className="pointer-events-none absolute bottom-6 right-2 z-[1000] rounded bg-zinc-950/85 px-3 py-2 text-xs text-zinc-300">
          {mode === "points" ? (
            Object.entries(PRIORITY_COLORS).map(([p, color]) => (
              <div key={p} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                Priority {p}
              </div>
            ))
          ) : (
            <div>Brighter = more calls</div>
          )}
          <div className="mt-1 text-zinc-500">
            {located.length} of {calls.length} mapped
          </div>
        </div>
      )}
    </div>
  );
}
