import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut, Menu, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markNotificationsRead, notificationsQuery } from "@/lib/complaints";
import { useProfile, useRoles } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.to || pathname === `${item.to}/`
          : pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className={cn("size-4", active && "text-sidebar-primary")} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function NotificationBell({ userId, allHref }: { userId: string; allHref: string }) {
  const { data = [] } = useQuery(notificationsQuery(userId));
  const qc = useQueryClient();
  const unread = data.filter((n) => !n.read_at);
  const navigate = useNavigate();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications, ${unread.length} unread`}>
          <Bell />
          {unread.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread.length > 0 ? (
            <button
              className="text-xs font-medium underline decoration-primary underline-offset-2"
              onClick={async () => {
                await markNotificationsRead(unread.map((n) => n.id));
                qc.invalidateQueries({ queryKey: ["notifications"] });
              }}
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {data.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</li>
          ) : (
            data.slice(0, 8).map((n) => (
              <li key={n.id}>
                <button
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left hover:bg-muted",
                    !n.read_at && "bg-accent/50",
                  )}
                  onClick={async () => {
                    if (!n.read_at) {
                      await markNotificationsRead([n.id]);
                      qc.invalidateQueries({ queryKey: ["notifications"] });
                    }
                    if (n.reference)
                      navigate({ to: "/app/complaints/$reference", params: { reference: n.reference } });
                  }}
                >
                  <span className="text-sm">{n.message}</span>
                  <span className="text-xs text-muted-foreground">
                    <span className="font-mono">{n.reference}</span> ·{" "}
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="p-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to={allHref}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Keeps dashboards live: new notifications and complaint changes refresh cached data. */
function RealtimeSync({ userId, staff }: { userId: string; staff: boolean }) {
  const qc = useQueryClient();
  useEffect(() => {
    const suffix = Math.random().toString(36).slice(2);
    const channel = supabase
      .channel(`live-${userId}-${suffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const msg = (payload.new as { message?: string; reference?: string }) ?? {};
          if (msg.message) toast(msg.message, { description: msg.reference });
          qc.invalidateQueries({ queryKey: ["notifications"] });
          qc.invalidateQueries({ queryKey: ["complaints"] });
          qc.invalidateQueries({ queryKey: ["complaint"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => {
        qc.invalidateQueries({ queryKey: ["complaints"] });
        qc.invalidateQueries({ queryKey: ["complaint"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, staff, qc]);
  return null;
}

export function AppShell({
  userId,
  items,
  area,
  children,
}: {
  userId: string;
  items: NavItem[];
  area: "citizen" | "inspector";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { isStaff } = useRoles(userId);
  const { data: profile } = useProfile(userId);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="hazard-stripe h-1.5 w-full" aria-hidden />
      <div className="px-4 py-5">
        <Link to="/" onClick={onNavigate}>
          <Brand inverted />
        </Link>
      </div>
      <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">
        {area === "inspector" ? "Inspector desk" : "Citizen services"}
      </p>
      <div className="flex-1 px-2">
        <NavLinks items={items} onNavigate={onNavigate} />
      </div>
      {isStaff ? (
        <div className="px-2 pb-2">
          <Link
            to={area === "inspector" ? "/app" : "/inspector"}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-md border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
          >
            <Repeat className="size-4" aria-hidden />
            {area === "inspector" ? "Switch to citizen view" : "Switch to inspector desk"}
          </Link>
        </div>
      ) : null}
      <div className="border-t border-sidebar-border p-3">
        <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
          {profile?.display_name ?? "Signed in"}
        </p>
        <p className="truncate text-xs text-sidebar-foreground/60">{profile?.email}</p>
        <button
          onClick={signOut}
          className="mt-2 flex items-center gap-2 text-xs font-medium text-sidebar-foreground/80 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-3.5" aria-hidden /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <RealtimeSync userId={userId} staff={isStaff} />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar()}</aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {sidebar(() => setOpen(false))}
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b bg-background/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu />
            </Button>
            <span className="lg:hidden">
              <Brand />
            </span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell userId={userId} allHref="/app/notifications" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
