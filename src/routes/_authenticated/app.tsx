import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Bell, FilePlus2, HelpCircle, LayoutDashboard, ListChecks } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/report", label: "Report Road Damage", icon: FilePlus2 },
  { to: "/app/complaints", label: "My Complaints", icon: ListChecks },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/help", label: "Help", icon: HelpCircle },
];

export const Route = createFileRoute("/_authenticated/app")({
  component: CitizenLayout,
});

function CitizenLayout() {
  const { user } = Route.useRouteContext();
  return (
    <AppShell userId={user.id} items={NAV} area="citizen">
      <Outlet />
    </AppShell>
  );
}
