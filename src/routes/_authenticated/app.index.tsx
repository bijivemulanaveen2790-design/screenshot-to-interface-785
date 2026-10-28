import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDot, FilePlus2, Files, Hammer, Search } from "lucide-react";
import { myComplaintsQuery } from "@/lib/complaints";
import { EmptyState, PageHeader, StatCard } from "@/components/StatCard";
import { CitizenComplaintList } from "@/components/ComplaintList";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "My dashboard — RoadWatch" }] }),
  component: CitizenDashboard,
});

function CitizenDashboard() {
  const { user } = Route.useRouteContext();
  const { data = [], isLoading, isError, error } = useQuery(myComplaintsQuery(user.id));
  const count = (s: string) => data.filter((c) => c.status === s).length;

  return (
    <div>
      <PageHeader
        title="Your road reports"
        description="Every complaint you file and where it stands today."
        actions={
          <Button asChild>
            <Link to="/app/report"><FilePlus2 /> Report road damage</Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total submitted" value={data.length} icon={Files} loading={isLoading} />
        <StatCard label="Reported" value={count("Reported")} icon={CircleDot} tone="reported" loading={isLoading} />
        <StatCard label="Under review" value={count("Under Review")} icon={Search} tone="review" loading={isLoading} />
        <StatCard label="In progress" value={count("In Progress")} icon={Hammer} tone="progress" loading={isLoading} />
        <StatCard label="Resolved" value={count("Resolved")} icon={CheckCircle2} tone="resolved" loading={isLoading} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Recent complaints</h2>
          {data.length > 5 ? (
            <Link to="/app/complaints" className="text-sm font-medium underline decoration-primary decoration-2 underline-offset-4">
              View all
            </Link>
          ) : null}
        </div>
        {isError ? (
          <p className="text-sm text-destructive">Could not load complaints: {(error as Error).message}</p>
        ) : isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : data.length === 0 ? (
          <EmptyState icon={FilePlus2} title="No complaints yet">
            Spotted a pothole or broken road? <Link to="/app/report" className="font-medium underline">File your first report</Link>.
          </EmptyState>
        ) : (
          <CitizenComplaintList items={data.slice(0, 5)} />
        )}
      </div>
    </div>
  );
}
