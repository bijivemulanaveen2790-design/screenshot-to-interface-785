import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchRoles } from "@/hooks/use-auth";
import { PageHeader } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/inspector/team")({
  beforeLoad: async ({ context }) => {
    const roles = await context.queryClient.fetchQuery({
      queryKey: ["roles", context.user.id],
      queryFn: () => fetchRoles(context.user.id),
    });
    if (!roles.includes("admin")) throw redirect({ to: "/inspector" });
  },
  head: () => ({ meta: [{ title: "Inspector access — RoadWatch" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const { data = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_staff");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  async function setRole(targetEmail: string, role: "inspector" | "admin", grant: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_role", { _email: targetEmail, _role: role, _grant: grant });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(grant ? `${targetEmail} is now ${role === "admin" ? "an admin" : "an inspector"}.` : `Removed ${role} access for ${targetEmail}.`);
    qc.invalidateQueries({ queryKey: ["staff"] });
    qc.invalidateQueries({ queryKey: ["roles"] });
    setEmail("");
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Inspector access" description="Only inspectors and admins can see all complaints and change statuses." />
      <form
        onSubmit={(e) => { e.preventDefault(); if (email.trim()) setRole(email.trim(), "inspector", true); }}
        className="mb-6 rounded-lg border bg-card p-5 shadow-card"
      >
        <Label htmlFor="em">Grant inspector access</Label>
        <p className="mb-3 text-xs text-muted-foreground">The person must already have an account (they sign up as a citizen first).</p>
        <div className="flex gap-2">
          <Input id="em" type="email" placeholder="inspector@example.gov" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" disabled={busy}><UserPlus /> Grant</Button>
        </div>
      </form>
      <div className="overflow-hidden rounded-lg border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-4 py-2.5">Person</th><th className="px-4 py-2.5">Roles</th><th className="px-4 py-2.5 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>
            ) : (
              data.map((s) => (
                <tr key={s.user_id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.display_name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {s.roles.map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold capitalize text-accent-foreground">
                          {r === "admin" ? <ShieldCheck className="size-3" aria-hidden /> : null}{r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.roles.includes("inspector") && s.user_id !== user.id ? (
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => s.email && setRole(s.email, "inspector", false)}>
                        <UserMinus /> Remove inspector
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
