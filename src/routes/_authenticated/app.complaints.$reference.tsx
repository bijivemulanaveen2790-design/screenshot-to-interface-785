import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { complaintDetailQuery } from "@/lib/complaints";
import { STATUSES, STATUS_DESCRIPTIONS } from "@/lib/constants";
import { AiPanel, ComplaintBody, ComplaintHeader, HistorySection, Section } from "@/components/complaint/ComplaintOverview";
import { EmptyState } from "@/components/StatCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/complaints/$reference")({
  head: ({ params }) => ({ meta: [{ title: `${params.reference} — RoadWatch` }] }),
  component: CitizenComplaintDetail,
});

function Progress({ status }: { status: (typeof STATUSES)[number] }) {
  const idx = STATUSES.indexOf(status);
  return (
    <ol className="grid grid-cols-4 gap-2">
      {STATUSES.map((s, i) => (
        <li key={s}>
          <div className={cn("h-1.5 rounded-full", i <= idx ? "bg-primary" : "bg-muted")} />
          <p className={cn("mt-2 text-xs font-semibold", i <= idx ? "text-foreground" : "text-muted-foreground")}>{s}</p>
          <p className="hidden text-xs text-muted-foreground md:block">{STATUS_DESCRIPTIONS[s]}</p>
        </li>
      ))}
    </ol>
  );
}

function CitizenComplaintDetail() {
  const { reference } = Route.useParams();
  const { data, isLoading, isError, error } = useQuery(complaintDetailQuery(reference));

  return (
    <div>
      <Link to="/app/complaints" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> My complaints
      </Link>
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load this complaint: {(error as Error).message}</p>
      ) : !data ? (
        <EmptyState icon={FileQuestion} title="Complaint not found">
          This reference doesn't match any of your complaints.
        </EmptyState>
      ) : (
        <>
          <ComplaintHeader detail={data} />
          <div className="mb-6 rounded-lg border bg-card p-5 shadow-card">
            <Progress status={data.complaint.status} />
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <ComplaintBody detail={data} detailHref="/app/complaints/$reference" />
            <div className="space-y-6">
              <Section title="AI analysis"><AiPanel detail={data} /></Section>
              <HistorySection detail={data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
