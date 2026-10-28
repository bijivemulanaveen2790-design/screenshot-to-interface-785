import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BellOff, Check } from "lucide-react";
import { markNotificationsRead, notificationsQuery } from "@/lib/complaints";
import { EmptyState, PageHeader } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — RoadWatch" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(notificationsQuery(user.id));
  const unread = data.filter((n) => !n.read_at);

  async function mark(ids: string[]) {
    await markNotificationsRead(ids);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates from inspectors about your complaints. Shown here in the app only — no email or SMS is sent."
        actions={unread.length ? <Button variant="outline" onClick={() => mark(unread.map((n) => n.id))}><Check /> Mark all read</Button> : null}
      />
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      ) : data.length === 0 ? (
        <EmptyState icon={BellOff} title="No notifications yet">You'll be notified here whenever your complaint's status changes.</EmptyState>
      ) : (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card shadow-card">
          {data.map((n) => (
            <li key={n.id} className={cn("flex items-start gap-3 px-4 py-3", !n.read_at && "bg-accent/40")}>
              <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} />
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.message}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {n.reference ? (
                    <Link
                      to="/app/complaints/$reference"
                      params={{ reference: n.reference }}
                      onClick={() => !n.read_at && mark([n.id])}
                      className="font-mono underline"
                    >
                      {n.reference}
                    </Link>
                  ) : null}{" "}
                  · {format(new Date(n.created_at), "d MMM yyyy, HH:mm")} · {n.read_at ? "Read" : "Unread"}
                </p>
              </div>
              {!n.read_at ? (
                <Button size="sm" variant="ghost" onClick={() => mark([n.id])}>Mark read</Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
