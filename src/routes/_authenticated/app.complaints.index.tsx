import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, ListChecks } from "lucide-react";
import { myComplaintsQuery } from "@/lib/complaints";
import { STATUSES, effectiveDamageType, effectiveSeverity } from "@/lib/constants";
import { EmptyState, PageHeader } from "@/components/StatCard";
import { CitizenComplaintList } from "@/components/ComplaintList";
import { ComplaintsMap } from "@/components/map/Maps";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/app/complaints/")({
  head: () => ({ meta: [{ title: "My complaints — RoadWatch" }] }),
  component: MyComplaints,
});

function MyComplaints() {
  const { user } = Route.useRouteContext();
  const { data = [], isLoading, isError, error } = useQuery(myComplaintsQuery(user.id));
  const [status, setStatus] = useState<string>("all");
  const filtered = useMemo(() => (status === "all" ? data : data.filter((c) => c.status === status)), [data, status]);

  return (
    <div>
      <PageHeader
        title="My complaints"
        description="Open any complaint to see photos, location, severity and its full history."
        actions={<Button asChild><Link to="/app/report"><FilePlus2 /> New report</Link></Button>}
      />
      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({data.length})</TabsTrigger>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>{s} ({data.filter((c) => c.status === s).length})</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isError ? (
        <p className="text-sm text-destructive">Could not load complaints: {(error as Error).message}</p>
      ) : isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ListChecks} title={data.length ? "Nothing in this status" : "No complaints yet"}>
          {data.length ? "Try another tab." : "Reports you submit will appear here."}
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <CitizenComplaintList items={filtered} />
          <ComplaintsMap
            height={360}
            detailHref="/app/complaints/$reference"
            complaints={filtered.map((c) => ({
              id: c.id,
              reference: c.reference,
              is_demo: c.is_demo,
              road_name: c.road_name,
              latitude: c.latitude,
              longitude: c.longitude,
              status: c.status,
              severity: effectiveSeverity(c),
              damage_type: effectiveDamageType(c),
            }))}
          />
        </div>
      )}
    </div>
  );
}
