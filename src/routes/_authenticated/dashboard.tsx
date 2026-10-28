import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchRoles } from "@/hooks/use-auth";

/** Sends each signed-in person to their home: inspectors to the desk, citizens to their dashboard. */
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async ({ context }) => {
    const roles = await context.queryClient.fetchQuery({
      queryKey: ["roles", context.user.id],
      queryFn: () => fetchRoles(context.user.id),
    });
    const staff = roles.includes("inspector") || roles.includes("admin");
    throw redirect({ to: staff ? "/inspector" : "/app", replace: true });
  },
});
