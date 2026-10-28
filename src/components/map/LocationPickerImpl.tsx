import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Circle, useMap, useMapEvents } from "react-leaflet";

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [lat, lng, map]);
  return null;
}

export default function LocationPickerImpl({
  lat,
  lng,
  accuracy,
  onPick,
  onTileError,
}: {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  onPick: (lat: number, lng: number) => void;
  onTileError?: () => void;
}) {
  const has = lat != null && lng != null;
  return (
    <div className="h-72 overflow-hidden rounded-lg border sm:h-80">
      <MapContainer
        center={has ? [lat!, lng!] : [20.5937, 78.9629]}
        zoom={has ? 16 : 5}
        className="h-full w-full cursor-crosshair"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => onTileError?.() }}
        />
        <ClickHandler onPick={onPick} />
        <Recenter lat={lat} lng={lng} />
        {has && accuracy ? (
          <Circle center={[lat!, lng!]} radius={accuracy} pathOptions={{ color: "#d99a1e", weight: 1, fillOpacity: 0.1 }} />
        ) : null}
        {has ? (
          <CircleMarker
            center={[lat!, lng!]}
            radius={10}
            pathOptions={{ color: "#1f2430", weight: 3, fillColor: "#f2b134", fillOpacity: 1 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
