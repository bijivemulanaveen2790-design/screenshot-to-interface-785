import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ClipboardCheck, Hammer, MapPin, ShieldCheck, CheckCircle2 } from "lucide-react";
import heroRoad from "@/assets/hero-road.jpg";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RoadWatch — Report road damage and track repairs" },
      {
        name: "description",
        content:
          "Photograph a pothole or crack, pin its location, and follow every step until inspectors confirm the repair.",
      },
      { property: "og:title", content: "RoadWatch — Report road damage and track repairs" },
      {
        property: "og:description",
        content: "Photograph road damage, pin the location and follow the repair from report to resolution.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  { icon: Camera, title: "Reported", body: "Upload photos, pin the spot on the map and describe the damage." },
  { icon: ClipboardCheck, title: "Under review", body: "A road inspector checks your photos, location and severity." },
  { icon: Hammer, title: "In progress", body: "A repair team is assigned and work starts on site." },
  { icon: CheckCircle2, title: "Resolved", body: "The inspector confirms the fix with an after-repair photo." },
];

function Index() {
  const { user } = useUser();
  return (
    <div className="min-h-screen bg-background">
      <div className="hazard-stripe h-1.5" aria-hidden />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Brand />
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link to="/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth">Report damage</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="survey-grid border-y">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <MapPin className="size-3.5 text-primary" aria-hidden /> Citizen road maintenance desk
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl">
              Report a damaged road.
              <br />
              <span className="underline decoration-primary decoration-[6px] underline-offset-[10px]">
                Watch it get fixed.
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Snap a photo of a pothole or crack, pin the exact spot, and follow every status change until an inspector
              confirms the repair.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={user ? "/app/report" : "/auth"}>
                  <Camera /> Report road damage
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to={user ? "/app/complaints" : "/auth"}>Track my complaints</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img
              src={heroRoad}
              alt="A large water-filled pothole with cracked asphalt beside a yellow and black road barrier"
              width={1600}
              height={1008}
              className="aspect-[16/11] w-full rounded-xl border object-cover shadow-raised"
            />
            <div className="absolute -bottom-5 left-4 right-4 flex items-center justify-between gap-3 rounded-lg border bg-card p-3 shadow-raised sm:left-8 sm:right-auto sm:w-80">
              <div>
                <p className="font-mono text-xs text-muted-foreground">Example reference</p>
                <p className="font-mono text-sm font-semibold">RD-2610-K7Q2MX</p>
              </div>
              <span className="rounded-full bg-status-progress/10 px-2.5 py-0.5 text-xs font-semibold text-status-progress">
                In Progress
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">From report to repair</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-lg border bg-card p-5 shadow-card">
              <div className="flex items-center justify-between">
                <s.icon className="size-5 text-foreground" aria-hidden />
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <p className="mt-4 font-display font-bold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2">
          <div className="flex gap-4">
            <ShieldCheck className="size-6 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-display font-bold">No user ID to remember</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with your email. Your complaints are visible only to you and authorised inspectors — a reference
                number alone never reveals your report.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <ClipboardCheck className="size-6 shrink-0 text-foreground" aria-hidden />
            <div>
              <p className="font-display font-bold">Honest AI assistance</p>
              <p className="mt-1 text-sm text-muted-foreground">
                When the detection model is connected, it suggests damage type and severity. Inspectors always review it,
                and it is never a certified engineering assessment.
              </p>
            </div>
          </div>
        </div>
      </section>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground sm:px-6">
        RoadWatch road damage desk · Map data © OpenStreetMap contributors
      </footer>
    </div>
  );
}
