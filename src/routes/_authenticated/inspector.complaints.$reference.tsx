import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileQuestion, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeComplaint } from "@/lib/ai-analysis.functions";
import { complaintDetailQuery, errorMessage, uploadComplaintImage, type ComplaintDetail } from "@/lib/complaints";
import {
  DAMAGE_TYPES,
  SEVERITIES,
  STATUSES,
  damageLabel,
  validateImageFile,
  type ComplaintStatus,
  type DamageType,
  type Severity,
} from "@/lib/constants";
import { AiPanel, ComplaintBody, ComplaintHeader, HistorySection, Section } from "@/components/complaint/ComplaintOverview";
import { EmptyState } from "@/components/StatCard";
import { StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/inspector/complaints/$reference")({
  head: ({ params }) => ({ meta: [{ title: `${params.reference} — Inspection` }] }),
  component: InspectorComplaint,
});

function useRefresh(reference: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["complaint", reference] });
    qc.invalidateQueries({ queryKey: ["complaints"] });
  };
}

function StatusPanel({ detail, reference }: { detail: ComplaintDetail; reference: string }) {
  const c = detail.complaint;
  const refresh = useRefresh(reference);
  const [next, setNext] = useState<ComplaintStatus | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const afterCount = detail.images.filter((i) => i.kind === "after_repair").length;
  const resolving = next === "Resolved";

  async function save() {
    if (!next) return;
    setBusy(true);
    const { error } = await supabase.rpc("set_complaint_status", { _complaint_id: c.id, _status: next, _note: note || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Status changed to ${next}. The citizen has been notified.`);
    setNext(""); setNote("");
    refresh();
  }

  return (
    <Section title="Update status">
      <div className="mb-3 flex items-center gap-2 text-sm">Current: <StatusBadge status={c.status} /></div>
      <div className="grid grid-cols-2 gap-2">
        {STATUSES.filter((s) => s !== c.status).map((s) => (
          <Button key={s} type="button" variant={next === s ? "ink" : "outline"} size="sm" onClick={() => setNext(s)}>
            {s}
          </Button>
        ))}
      </div>
      {next ? (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="snote">{resolving ? "Resolution note (required)" : "Note (optional, shown in history)"}</Label>
            <Textarea id="snote" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
          </div>
          {resolving && afterCount === 0 ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Upload at least one after-repair photo below before resolving.
            </p>
          ) : null}
          <Button
            className="w-full"
            variant={resolving ? "success" : "default"}
            disabled={busy || (resolving && (afterCount === 0 || !note.trim()))}
            onClick={save}
          >
            {busy ? <Loader2 className="animate-spin" /> : null} Confirm: mark as {next}
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Opening a complaint never changes its status. Choose a new status above.</p>
      )}
    </Section>
  );
}

function ClassificationPanel({ detail, reference }: { detail: ComplaintDetail; reference: string }) {
  const c = detail.complaint;
  const refresh = useRefresh(reference);
  const [type, setType] = useState<DamageType | "">(c.damage_type ?? c.ai_damage_type ?? "");
  const [sev, setSev] = useState<Severity | "">(c.severity ?? c.ai_severity ?? "");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setType(c.damage_type ?? c.ai_damage_type ?? "");
    setSev(c.severity ?? c.ai_severity ?? "");
  }, [c.damage_type, c.ai_damage_type, c.severity, c.ai_severity]);

  async function save() {
    if (!type || !sev) return toast.error("Choose both damage type and severity.");
    setBusy(true);
    const { error } = await supabase.rpc("review_classification", { _complaint_id: c.id, _damage_type: type, _severity: sev });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Classification saved.");
    refresh();
  }

  return (
    <Section title="AI result & classification">
      <AiPanel detail={detail} />
      <div className="mt-4 space-y-3 border-t pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inspector classification</p>
        <Select value={type} onValueChange={(v) => setType(v as DamageType)}>
          <SelectTrigger aria-label="Damage type"><SelectValue placeholder="Damage type" /></SelectTrigger>
          <SelectContent>{DAMAGE_TYPES.map((d) => <SelectItem key={d} value={d}>{damageLabel(d)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sev} onValueChange={(v) => setSev(v as Severity)}>
          <SelectTrigger aria-label="Severity"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" className="w-full" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : null} {c.classification_reviewed_at ? "Update classification" : "Confirm classification"}
        </Button>
      </div>
    </Section>
  );
}

function AssignPanel({ detail, reference }: { detail: ComplaintDetail; reference: string }) {
  const refresh = useRefresh(reference);
  const [team, setTeam] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("assign_repair_team", { _complaint_id: detail.complaint.id, _team: team, _note: note || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Assigned to ${team}.`);
    setTeam(""); setNote("");
    refresh();
  }
  return (
    <Section title="Repair team">
      {detail.complaint.assigned_team ? (
        <p className="mb-3 text-sm">Currently: <strong>{detail.complaint.assigned_team}</strong></p>
      ) : <p className="mb-3 text-sm text-muted-foreground">No team assigned yet.</p>}
      <form onSubmit={save} className="space-y-2">
        <Label htmlFor="team" className="sr-only">Team name</Label>
        <Input id="team" placeholder="e.g. Ward 104 Road Crew" value={team} onChange={(e) => setTeam(e.target.value)} maxLength={120} required />
        <Input placeholder="Note (optional)" aria-label="Assignment note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        <Button type="submit" variant="outline" className="w-full" disabled={busy}>Assign team</Button>
      </form>
    </Section>
  );
}

function UpdatePanel({ detail, reference }: { detail: ComplaintDetail; reference: string }) {
  const refresh = useRefresh(reference);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("add_complaint_update", { _complaint_id: detail.complaint.id, _body: body, _internal: internal });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(internal ? "Internal note saved." : "Update posted. The citizen has been notified.");
    setBody("");
    refresh();
  }
  return (
    <Section title="Comments & inspection notes">
      <form onSubmit={save} className="space-y-2">
        <Label htmlFor="upd" className="sr-only">Comment</Label>
        <Textarea id="upd" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} placeholder="Site visit findings, next steps…" required />
        <div className="flex items-center gap-2">
          <Checkbox id="internal" checked={internal} onCheckedChange={(v) => setInternal(v === true)} />
          <Label htmlFor="internal" className="text-sm font-normal">Internal note (hidden from citizen)</Label>
        </div>
        <Button type="submit" variant="outline" className="w-full" disabled={busy}>{internal ? "Save note" : "Post update to citizen"}</Button>
      </form>
    </Section>
  );
}

function AfterRepairPanel({ detail, reference }: { detail: ComplaintDetail; reference: string }) {
  const { user } = Route.useRouteContext();
  const refresh = useRefresh(reference);
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(list)) {
        const err = validateImageFile(f);
        if (err) { toast.error(err); continue; }
        await uploadComplaintImage(detail.complaint.id, f, "after_repair", user.id);
      }
      toast.success("After-repair photo uploaded.");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section title="After-repair photos">
      <p className="mb-3 text-sm text-muted-foreground">
        {detail.images.filter((i) => i.kind === "after_repair").length} uploaded. Required before resolving.
      </p>
      <Button variant="outline" className="w-full" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="animate-spin" /> : <Camera />} Upload after-repair photo
      </Button>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple className="sr-only" aria-label="Upload after-repair photo" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
    </Section>
  );
}

function InspectorComplaint() {
  const { reference } = Route.useParams();
  const { data, isLoading, isError, error } = useQuery(complaintDetailQuery(reference));
  const analyze = useServerFn(analyzeComplaint);
  const refresh = useRefresh(reference);
  const [rerun, setRerun] = useState(false);

  return (
    <div>
      <Link to="/inspector/complaints" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All complaints
      </Link>
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load: {(error as Error).message}</p>
      ) : !data ? (
        <EmptyState icon={FileQuestion} title="Complaint not found" />
      ) : (
        <>
          <ComplaintHeader detail={data} />
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <ComplaintBody detail={data} detailHref="/inspector/complaints/$reference" />
              <HistorySection detail={data} />
            </div>
            <div className="space-y-6">
              <StatusPanel detail={data} reference={reference} />
              <ClassificationPanel detail={data} reference={reference} />
              {!data.complaint.is_demo && data.images.some((i) => i.kind === "report") ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={rerun}
                  onClick={async () => {
                    setRerun(true);
                    try {
                      const r = await analyze({ data: { complaintId: data.complaint.id } });
                      toast(r.message);
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                    setRerun(false);
                    refresh();
                  }}
                >
                  {rerun ? <Loader2 className="animate-spin" /> : <RefreshCw />} Re-run AI analysis
                </Button>
              ) : null}
              <AssignPanel detail={data} reference={reference} />
              <AfterRepairPanel detail={data} reference={reference} />
              <UpdatePanel detail={data} reference={reference} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
