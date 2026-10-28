import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { CheckCircle2, ClipboardList, Hammer, LayoutDashboard, Map, Search, ShieldCheck } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";
import { fetchRoles, useRoles } from "@/hooks/use-auth";

const NAV: NavItem[] = [
  { to: "/inspector", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/inspector/complaints", label: "All Complaints", icon: ClipboardList },
  { to: "/inspector/map", label: "Map View", icon: Map },
  { to: "/inspector/inspections", label: "Inspection Details", icon: Search },
  { to: "/inspector/repairs", label: "Repair Updates", icon: Hammer },
  { to: "/inspector/resolved", label: "Resolved Complaints", icon: CheckCircle2 },
];

export const Route = createFileRoute("/_authenticated/inspector")({
  beforeLoad: async ({ context }) => {
    const roles = await context.queryClient.fetchQuery({
      queryKey: ["roles", context.user.id],
      queryFn: () => fetchRoles(context.user.id),
    });
    if (!roles.includes("inspector") && !roles.includes("admin")) {
      throw redirect({ to: "/app" });
    }
  },
  component: InspectorLayout,
});

function InspectorLayout() {
  const { user } = Route.useRouteContext();
  const { isAdmin } = useRoles(user.id);
  const items = isAdmin ? [...NAV, { to: "/inspector/team", label: "Inspector Access", icon: ShieldCheck }] : NAV;
  return (
    <AppShell userId={user.id} items={items} area="inspector">
      <Outlet />
    </AppShell>
  );
}
