import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { MapPinOff } from "lucide-react";
import type { MapComplaint } from "./types";

const ComplaintsMapImpl = lazy(() => import("./ComplaintsMapImpl"));
const LocationPickerImpl = lazy(() => import("./LocationPickerImpl"));

function MapSkeleton({ height = 320 }: { height?: number }) {
  return (
    <div style={{ height }} className="grid animate-pulse place-items-center rounded-lg border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}

export function TileWarning() {
  return (
    <p className="mt-2 flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
      <MapPinOff className="size-3.5" aria-hidden />
      Some map tiles failed to load. Use the list below or enter coordinates manually.
    </p>
  );
}

export function ComplaintsMap(props: {
  complaints: MapComplaint[];
  detailHref: "/app/complaints/$reference" | "/inspector/complaints/$reference";
  height?: number;
  onTileError?: () => void;
}) {
  return (
    <ClientOnly fallback={<MapSkeleton height={props.height ?? 480} />}>
      <Suspense fallback={<MapSkeleton height={props.height ?? 480} />}>
        <ComplaintsMapImpl {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export function LocationPicker(props: {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const [tileError, setTileError] = useState(false);
  return (
    <div>
      <ClientOnly fallback={<MapSkeleton />}>
        <Suspense fallback={<MapSkeleton />}>
          <LocationPickerImpl {...props} onTileError={() => setTileError(true)} />
        </Suspense>
      </ClientOnly>
      {tileError ? <TileWarning /> : null}
    </div>
  );
}
