import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ClipboardList, Hammer, Search } from "lucide-react";
import { allComplaintsQuery } from "@/lib/complaints";
import { effectiveDamageType, effectiveSeverity } from "@/lib/constants";
import { PageHeader, StatCard, EmptyState } from "@/components/StatCard";
import { ComplaintTable } from "@/components/ComplaintTable";
import { ComplaintsMap } from "@/components/map/Maps";

export const Route = createFileRoute("/_authenticated/inspector/")({
  head: () => ({ meta: [{ title: "Inspector dashboard — RoadWatch" }] }),
  component: InspectorDashboard,
});

function InspectorDashboard() {
  const { data = [], isLoading, isError, error } = useQuery(allComplaintsQuery());
  const pending = data.filter((c) => c.status === "Reported" || c.status === "Under Review");
  const urgent = data.filter((c) => {
    const s = effectiveSeverity(c);
    return (s === "High" || s === "Critical") && c.status !== "Resolved";
  });
  const demoCount = data.filter((c) => c.is_demo).length;

  return (
    <div>
      <PageHeader title="Inspector dashboard" description="Workload across all citizen complaints." />
      {demoCount ? (
        <p className="mb-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Includes {demoCount} sample record{demoCount > 1 ? "s" : ""} marked <strong>DEMO</strong> — they are not real citizen reports. Hide them with the Demo switch on the complaint lists.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total complaints" value={data.length} icon={ClipboardList} loading={isLoading} />
        <StatCard label="Pending inspection" value={pending.length} icon={Search} tone="review" loading={isLoading} />
        <StatCard label="High / Critical open" value={urgent.length} icon={AlertTriangle} tone="critical" loading={isLoading} />
        <StatCard label="Repairs in progress" value={data.filter((c) => c.status === "In Progress").length} icon={Hammer} tone="progress" loading={isLoading} />
        <StatCard label="Resolved" value={data.filter((c) => c.status === "Resolved").length} icon={CheckCircle2} tone="resolved" loading={isLoading} />
      </div>

      {isError ? <p className="mt-6 text-sm text-destructive">Could not load complaints: {(error as Error).message}</p> : null}

      <div className="mt-8 grid gap-6 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Needs inspection</h2>
            <Link to="/inspector/inspections" className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4">Open queue</Link>
          </div>
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-lg bg-muted" />
          ) : pending.length === 0 ? (
            <EmptyState icon={Search} title="Queue is clear">No complaints waiting for inspection.</EmptyState>
          ) : (
            <ComplaintTable items={pending.slice(0, 6)} />
          )}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Open complaints map</h2>
            <Link to="/inspector/map" className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4">Full map</Link>
          </div>
          <ComplaintsMap
            height={420}
            detailHref="/inspector/complaints/$reference"
            complaints={data
              .filter((c) => c.status !== "Resolved")
              .map((c) => ({
                id: c.id, reference: c.reference, is_demo: c.is_demo, road_name: c.road_name,
                latitude: c.latitude, longitude: c.longitude, status: c.status,
                severity: effectiveSeverity(c), damage_type: effectiveDamageType(c),
              }))}
          />
        </div>
      </div>
    </div>
  );
}
