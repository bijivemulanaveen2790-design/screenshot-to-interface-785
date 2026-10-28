import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { allComplaintsQuery } from "@/lib/complaints";
import type { ComplaintStatus } from "@/lib/constants";
import { ComplaintTable, FilterBar, useFilteredComplaints } from "@/components/ComplaintTable";
import { EmptyState, PageHeader } from "@/components/StatCard";

/** Shared page body for inspector complaint lists, optionally pinned to some statuses. */
export function InspectorList({
  title,
  description,
  statuses,
}: {
  title: string;
  description: string;
  statuses?: ComplaintStatus[];
}) {
  const { data = [], isLoading, isError, error } = useQuery(allComplaintsQuery());
  const scoped = statuses ? data.filter((c) => statuses.includes(c.status)) : data;
  const { filters, setFilters, filtered } = useFilteredComplaints(scoped);
  return (
    <div>
      <PageHeader title={title} description={description} />
      <FilterBar filters={filters} setFilters={setFilters} hideStatus={statuses?.length === 1} />
      {isError ? (
        <p className="text-sm text-destructive">Could not load complaints: {(error as Error).message}</p>
      ) : isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No complaints match">Adjust the filters to see more.</EmptyState>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">{filtered.length} of {scoped.length} complaints</p>
          <ComplaintTable items={filtered} />
        </>
      )}
    </div>
  );
}
