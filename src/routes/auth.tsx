import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — RoadWatch" },
      { name: "description", content: "Sign in to report road damage and track your complaints." },
      { property: "og:title", content: "Sign in — RoadWatch" },
      { property: "og:description", content: "Sign in to report road damage and track your complaints." },
    ],
  }),
  component: AuthPage,
});

function safePath(p: string | undefined) {
  if (!p) return "/dashboard";
  try {
    const u = new URL(p, "http://x");
    if (u.origin !== "http://x" && typeof window !== "undefined" && u.origin !== window.location.origin)
      return "/dashboard";
    return u.pathname.startsWith("/") && !u.pathname.startsWith("//") ? u.pathname + u.search : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const target = safePath(redirect);
  const [tab, setTab] = useState("signin");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: target, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) navigate({ to: target, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters for your password.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { display_name: name.trim() || undefined } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (!data.session) setSentTo(email);
  }

  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("If an account exists for that email, a reset link is on its way.");
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message ?? "Sign-in failed");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="hazard-stripe absolute inset-x-0 top-0 h-2" aria-hidden />
        <Link to="/">
          <Brand inverted />
        </Link>
        <div>
          <p className="font-display text-4xl font-extrabold leading-tight text-sidebar-accent-foreground">
            Spot it. Snap it.
            <br />
            Track the repair.
          </p>
          <p className="mt-4 max-w-sm text-sm text-sidebar-foreground/70">
            No user ID to remember. Sign in with your email and every complaint you file stays linked to you —
            visible only to you and the road inspectors.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Road maintenance complaint desk</p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link to="/">
              <Brand />
            </Link>
          </div>
          {sentTo ? (
            <div className="rounded-lg border bg-card p-6 text-center shadow-card">
              <MailCheck className="mx-auto size-10 text-success" aria-hidden />
              <h1 className="mt-3 font-display text-xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{sentTo}</strong>. Open it to activate your account, then sign in.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => { setSentTo(null); setTab("signin"); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold">Welcome</h1>
              <p className="mb-6 mt-1 text-sm text-muted-foreground">Sign in or create an account to continue.</p>
              <div className="space-y-2">
                <button type="button" className="lovable-auth-button w-full" onClick={() => social("lovable")}>
                  Continue with Lovable
                </button>
                <Button variant="outline" className="w-full" onClick={() => social("google")}>
                  <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                    <path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
                  </svg>
                  Continue with Google
                </Button>
              </div>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or use email <span className="h-px flex-1 bg-border" />
              </div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create</TabsTrigger>
                  <TabsTrigger value="forgot">Forgot</TabsTrigger>
                </TabsList>
                <TabsContent value="signin">
                  <form onSubmit={signIn} className="mt-4 space-y-3">
                    <Field id="si-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                    <Field id="si-pass" label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="animate-spin" /> : null} Sign in
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={signUp} className="mt-4 space-y-3">
                    <Field id="su-name" label="Your name" value={name} onChange={setName} autoComplete="name" required={false} />
                    <Field id="su-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                    <Field id="su-pass" label="Password (min. 8 characters)" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="animate-spin" /> : null} Create account
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="forgot">
                  <form onSubmit={forgot} className="mt-4 space-y-3">
                    <Field id="fp-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? <Loader2 className="animate-spin" /> : null} Send reset link
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} required={required} />
    </div>
  );
}
