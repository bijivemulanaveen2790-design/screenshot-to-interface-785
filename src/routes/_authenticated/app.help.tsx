import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/StatCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { STATUSES, STATUS_DESCRIPTIONS } from "@/lib/constants";
import { DAMAGE_WEIGHTS, SEVERITY_THRESHOLDS, MIN_CONFIDENCE } from "@/lib/severity";
import { damageLabel } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/app/help")({
  head: () => ({ meta: [{ title: "Help — RoadWatch" }] }),
  component: Help,
});

function Help() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Help" description="How reporting, tracking and AI analysis work." />
      <Accordion type="multiple" defaultValue={["report"]} className="rounded-lg border bg-card px-5 shadow-card">
        <AccordionItem value="report">
          <AccordionTrigger>How do I report road damage?</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm">
            <p>Open <strong>Report Road Damage</strong>, add one or more photos (or take one with your phone camera), set the location and describe the problem.</p>
            <p>For location you can use your device GPS, tap the map, or type coordinates. We never guess a location for you — if GPS is unavailable, pick the point on the map.</p>
            <p>Photos must be JPG, PNG or WebP and up to 10 MB each (max 6).</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="track">
          <AccordionTrigger>How do I track my complaint?</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm">
            <p>Each complaint gets a reference number like <span className="font-mono">RD-2610-K7Q2MX</span>. You don't need a user ID — just sign in with the same account and open <strong>My Complaints</strong>.</p>
            <p>Only you and authorised inspectors can view your complaint. A reference number alone does not give anyone access.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="status">
          <AccordionTrigger>What do the statuses mean?</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1 text-sm">
              {STATUSES.map((s) => <li key={s}><strong>{s}</strong> — {STATUS_DESCRIPTIONS[s]}</li>)}
            </ul>
            <p className="mt-2 text-sm">You get an in-app notification each time an inspector changes the status or posts an update. Email and SMS alerts are not set up.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="ai">
          <AccordionTrigger>How is severity estimated?</AccordionTrigger>
          <AccordionContent className="space-y-2 text-sm">
            <p>When the road damage detection model is connected, it finds damage regions in your photos. Each detection with at least {MIN_CONFIDENCE * 100}% confidence adds:</p>
            <p className="rounded bg-muted px-3 py-2 font-mono text-xs">weight × confidence × (1 + 4 × share of photo covered)</p>
            <ul className="grid grid-cols-2 gap-x-4 text-xs">
              {Object.entries(DAMAGE_WEIGHTS).map(([k, w]) => <li key={k}>{damageLabel(k)}: weight {w}</li>)}
            </ul>
            <p>Total below {SEVERITY_THRESHOLDS.medium} → Low, below {SEVERITY_THRESHOLDS.high} → Medium, below {SEVERITY_THRESHOLDS.critical} → High, otherwise Critical.</p>
            <p>This is an automated estimate, not a certified engineering assessment. Inspectors review and can correct it. If the model isn't available, you'll see “AI analysis unavailable” and your complaint goes to manual inspection.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
