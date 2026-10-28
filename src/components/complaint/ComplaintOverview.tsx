import { useState } from "react";
import { format } from "date-fns";
import { ExternalLink, MapPin, Sparkles, TriangleAlert } from "lucide-react";
import type { ComplaintDetail } from "@/lib/complaints";
import { damageLabel, effectiveDamageType, effectiveSeverity } from "@/lib/constants";
import { AiStatusBadge, DemoBadge, SeverityBadge, StatusBadge } from "@/components/badges";
import { ComplaintsMap, TileWarning } from "@/components/map/Maps";
import { PhotoGallery } from "./PhotoGallery";
import { Timeline } from "./Timeline";

export function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ComplaintHeader({ detail }: { detail: ComplaintDetail }) {
  const c = detail.complaint;
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-sm font-semibold text-muted-foreground">{c.reference}</p>
          {c.is_demo ? <DemoBadge /> : null}
        </div>
        <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{c.road_name || "Road damage report"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reported {format(new Date(c.created_at), "d MMM yyyy, HH:mm")}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status} className="px-3 py-1 text-sm" />
        <SeverityBadge severity={effectiveSeverity(c)} ai={!c.severity && !!c.ai_severity} />
      </div>
    </div>
  );
}

export function AiPanel({ detail }: { detail: ComplaintDetail }) {
  const c = detail.complaint;
  return (
    <div className="space-y-3 text-sm">
      <AiStatusBadge status={c.ai_status} />
      {c.ai_status === "completed" && c.ai_severity ? (
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs text-muted-foreground">AI damage type</dt>
            <dd className="font-medium">{damageLabel(c.ai_damage_type)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">AI severity</dt>
            <dd><SeverityBadge severity={c.ai_severity} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Confidence</dt>
            <dd className="font-medium tabular-nums">{c.ai_confidence != null ? `${Math.round(c.ai_confidence * 100)}%` : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Severity score</dt>
            <dd className="font-medium tabular-nums">{c.ai_severity_score ?? "—"}</dd>
          </div>
        </dl>
      ) : null}
      {c.ai_message ? <p className="text-muted-foreground">{c.ai_message}</p> : null}
      {c.ai_status === "completed" ? (
        <p className="flex gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          Automated estimate only — not a certified engineering assessment.
        </p>
      ) : null}
      {c.classification_reviewed_at ? (
        <p className="flex items-center gap-1.5 text-xs">
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          Inspector-reviewed: {damageLabel(c.damage_type)}, {c.severity}
        </p>
      ) : null}
    </div>
  );
}

export function LocationSection({
  detail,
  detailHref,
}: {
  detail: ComplaintDetail;
  detailHref: "/app/complaints/$reference" | "/inspector/complaints/$reference";
}) {
  const c = detail.complaint;
  const [tileError, setTileError] = useState(false);
  const approx = c.location_source === "gps" ? c.location_accuracy_m != null && c.location_accuracy_m > 50 : c.location_source === "map";
  const sourceLabel =
    c.location_source === "gps" ? "Device GPS" : c.location_source === "map" ? "Selected on map" : "Entered manually";
  return (
    <Section title="Location">
      <ComplaintsMap
        height={240}
        detailHref={detailHref}
        onTileError={() => setTileError(true)}
        complaints={[
          {
            id: c.id,
            reference: c.reference,
            is_demo: c.is_demo,
            road_name: c.road_name,
            latitude: c.latitude,
            longitude: c.longitude,
            status: c.status,
            severity: effectiveSeverity(c),
            damage_type: effectiveDamageType(c),
          },
        ]}
      />
      {tileError ? <TileWarning /> : null}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Coordinates</dt>
          <dd className="font-mono">{c.latitude.toFixed(6)}, {c.longitude.toFixed(6)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Source</dt>
          <dd>
            {sourceLabel}
            {c.location_accuracy_m != null ? ` (±${Math.round(c.location_accuracy_m)} m)` : ""}
            {approx ? <span className="ml-1 rounded bg-accent px-1.5 text-xs text-accent-foreground">Approximate</span> : null}
          </dd>
        </div>
        {c.address ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">Address</dt>
            <dd>{c.address}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <a
          className="inline-flex items-center gap-1 font-medium underline decoration-primary decoration-2 underline-offset-4"
          href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=18/${c.latitude}/${c.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin className="size-3.5" aria-hidden /> Open in OpenStreetMap <ExternalLink className="size-3" aria-hidden />
        </a>
        <a
          className="inline-flex items-center gap-1 font-medium underline decoration-primary decoration-2 underline-offset-4"
          href={`https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Open in Google Maps <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </Section>
  );
}

export function ComplaintBody({
  detail,
  detailHref,
}: {
  detail: ComplaintDetail;
  detailHref: "/app/complaints/$reference" | "/inspector/complaints/$reference";
}) {
  const c = detail.complaint;
  const reportImgs = detail.images.filter((i) => i.kind === "report");
  const afterImgs = detail.images.filter((i) => i.kind === "after_repair");
  return (
    <div className="space-y-6">
      <Section title="Description">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.description}</p>
        {c.assigned_team ? (
          <p className="mt-3 text-sm"><span className="text-muted-foreground">Repair team:</span> <strong>{c.assigned_team}</strong></p>
        ) : null}
      </Section>
      <Section title={`Damage photos (${reportImgs.length})`}>
        <PhotoGallery
          images={reportImgs}
          detections={detail.detections}
          emptyText={c.is_demo ? "Demo record — no photos attached." : "No photos uploaded."}
        />
      </Section>
      {afterImgs.length || c.status === "Resolved" ? (
        <Section title={`After-repair photos (${afterImgs.length})`}>
          <PhotoGallery images={afterImgs} emptyText="No after-repair photos." />
          {c.resolution_note ? (
            <p className="mt-3 rounded-md bg-status-resolved/10 px-3 py-2 text-sm">
              <strong>Resolution note:</strong> {c.resolution_note}
            </p>
          ) : null}
        </Section>
      ) : null}
      <LocationSection detail={detail} detailHref={detailHref} />
    </div>
  );
}

export function HistorySection({ detail }: { detail: ComplaintDetail }) {
  return (
    <Section title="Status history">
      <Timeline history={detail.history} updates={detail.updates} assignments={detail.assignments} />
    </Section>
  );
}
