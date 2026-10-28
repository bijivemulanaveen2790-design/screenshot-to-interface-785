import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "@tanstack/react-router";
import type { MapComplaint } from "./types";
import { SEVERITY_COLOR_VAR } from "@/components/badges";
import { damageLabel } from "@/lib/constants";

function readVar(v: string) {
  if (typeof window === "undefined") return v;
  const name = v.replace(/^var\((--[^)]+)\)$/, "$1");
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

function FitBounds({ points }: { points: MapComplaint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0]!.latitude, points[0]!.longitude], 15);
      return;
    }
    const b = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function ComplaintsMapImpl({
  complaints,
  detailHref,
  onTileError,
  height = 480,
}: {
  complaints: MapComplaint[];
  detailHref: "/app/complaints/$reference" | "/inspector/complaints/$reference";
  onTileError?: () => void;
  height?: number;
}) {
  const center: [number, number] = complaints.length
    ? [complaints[0]!.latitude, complaints[0]!.longitude]
    : [20.5937, 78.9629];
  return (
    <div style={{ height }} className="overflow-hidden rounded-lg border">
      <MapContainer center={center} zoom={complaints.length ? 12 : 4} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => onTileError?.() }}
        />
        <FitBounds points={complaints} />
        {complaints.map((c) => {
          const color = readVar(SEVERITY_COLOR_VAR[c.severity ?? "none"]);
          const resolved = c.status === "Resolved";
          return (
            <CircleMarker
              key={c.id}
              center={[c.latitude, c.longitude]}
              radius={resolved ? 7 : 10}
              pathOptions={{
                color: resolved ? color : "#1f2430",
                weight: resolved ? 2 : 2,
                fillColor: color,
                fillOpacity: resolved ? 0.15 : 0.9,
                dashArray: resolved ? "3 3" : undefined,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-mono text-xs font-semibold">
                    {c.reference} {c.is_demo ? "· DEMO" : ""}
                  </p>
                  <p className="font-semibold">{c.road_name || "Unnamed road"}</p>
                  <p>
                    {c.status} · {c.severity ?? "Not assessed"} · {damageLabel(c.damage_type)}
                  </p>
                  <Link to={detailHref} params={{ reference: c.reference }} className="underline">
                    Open details
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
