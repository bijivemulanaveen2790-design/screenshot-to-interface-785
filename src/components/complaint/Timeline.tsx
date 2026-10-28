import { format } from "date-fns";
import { MessageSquare, Users, Lock } from "lucide-react";
import type { RepairAssignment, StatusHistory, ComplaintUpdate } from "@/lib/complaints";
import { StatusBadge } from "@/components/badges";
import { cn } from "@/lib/utils";

type Entry =
  | { kind: "status"; at: string; row: StatusHistory }
  | { kind: "update"; at: string; row: ComplaintUpdate }
  | { kind: "assign"; at: string; row: RepairAssignment };

export function Timeline({
  history,
  updates,
  assignments,
}: {
  history: StatusHistory[];
  updates: ComplaintUpdate[];
  assignments: RepairAssignment[];
}) {
  const entries: Entry[] = [
    ...history.map((row) => ({ kind: "status" as const, at: row.created_at, row })),
    ...updates.map((row) => ({ kind: "update" as const, at: row.created_at, row })),
    ...assignments.map((row) => ({ kind: "assign" as const, at: row.created_at, row })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No history yet.</p>;

  return (
    <ol className="relative space-y-5 border-l-2 border-border pl-5">
      {entries.map((e) => (
        <li key={`${e.kind}-${e.row.id}`} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute -left-[27px] top-1 size-3 rounded-full border-2 border-background",
              e.kind === "status" ? "bg-primary" : "bg-muted-foreground",
            )}
          />
          <p className="text-xs text-muted-foreground">{format(new Date(e.at), "d MMM yyyy, HH:mm")}</p>
          {e.kind === "status" ? (
            <div className="mt-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {e.row.from_status ? (
                  <>
                    <StatusBadge status={e.row.from_status} />
                    <span aria-hidden>→</span>
                  </>
                ) : null}
                <StatusBadge status={e.row.to_status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">by {e.row.changed_by_name ?? "System"}</p>
              {e.row.note ? <p className="mt-1 text-sm">{e.row.note}</p> : null}
            </div>
          ) : e.kind === "update" ? (
            <div className="mt-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {e.row.is_internal ? <Lock className="size-3.5" aria-hidden /> : <MessageSquare className="size-3.5" aria-hidden />}
                {e.row.is_internal ? "Internal note" : "Inspector update"} · {e.row.author_name ?? "Inspector"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{e.row.body}</p>
            </div>
          ) : (
            <div className="mt-1">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Users className="size-3.5" aria-hidden /> Assigned to {e.row.team_name}
              </p>
              <p className="text-xs text-muted-foreground">by {e.row.assigned_by_name ?? "Inspector"}</p>
              {e.row.note ? <p className="mt-1 text-sm">{e.row.note}</p> : null}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
