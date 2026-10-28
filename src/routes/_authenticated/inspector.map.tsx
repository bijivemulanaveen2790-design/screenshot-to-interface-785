import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { allComplaintsQuery } from "@/lib/complaints";
import { SEVERITIES, effectiveDamageType, effectiveSeverity } from "@/lib/constants";
import { ComplaintsMap, TileWarning } from "@/components/map/Maps";
import { ComplaintTable, FilterBar, useFilteredComplaints } from "@/components/ComplaintTable";
import { PageHeader } from "@/components/StatCard";
import { SEVERITY_COLOR_VAR } from "@/components/badges";

export const Route = createFileRoute("/_authenticated/inspector/map")({
  head: () => ({ meta: [{ title: "Map view — RoadWatch Inspector" }] }),
  component: MapView,
});

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {[...SEVERITIES, "none" as const].map((s) => (
        <span key={s} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-foreground/60" style={{ background: SEVERITY_COLOR_VAR[s] }} />
          {s === "none" ? "Not assessed" : s}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-full border-2 border-dashed border-muted-foreground" /> Resolved (hollow)
      </span>
    </div>
  );
}

function MapView() {
  const { data = [], isLoading } = useQuery(allComplaintsQuery());
  const { filters, setFilters, filtered } = useFilteredComplaints(data);
  const [tileError, setTileError] = useState(false);

  return (
    <div>
      <PageHeader title="Map view" description="Every complaint on the map. Marker colour shows severity; resolved complaints are hollow." />
      <FilterBar filters={filters} setFilters={setFilters} />
      <div className="mb-3"><Legend /></div>
      {isLoading ? (
        <div className="h-[560px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <ComplaintsMap
          height={560}
          detailHref="/inspector/complaints/$reference"
          onTileError={() => setTileError(true)}
          complaints={filtered.map((c) => ({
            id: c.id, reference: c.reference, is_demo: c.is_demo, road_name: c.road_name,
            latitude: c.latitude, longitude: c.longitude, status: c.status,
            severity: effectiveSeverity(c), damage_type: effectiveDamageType(c),
          }))}
        />
      )}
      {tileError ? <TileWarning /> : null}
      <h2 className="mb-3 mt-8 font-display text-lg font-bold">List ({filtered.length})</h2>
      <ComplaintTable items={filtered} />
    </div>
  );
}
