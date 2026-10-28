import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Camera, CheckCircle2, Crosshair, ImagePlus, Loader2, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeComplaint, type AnalysisOutcome } from "@/lib/ai-analysis.functions";
import { errorMessage, uploadComplaintImage } from "@/lib/complaints";
import { MAX_IMAGES, validateImageFile } from "@/lib/constants";
import { LocationPicker } from "@/components/map/Maps";
import { PageHeader } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/app/report")({
  head: () => ({ meta: [{ title: "Report road damage — RoadWatch" }] }),
  component: ReportPage,
});

type Source = "gps" | "map" | "manual";
interface Picked { file: File; url: string }

async function reverseGeocode(lat: number, lng: number) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { display_name?: string; address?: Record<string, string> };
    const road = j.address?.road ?? j.address?.pedestrian ?? j.address?.highway ?? null;
    return { road, address: j.display_name ?? null };
  } catch {
    return null;
  }
}

function ReportPage() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeComplaint);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<Picked[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [road, setRoad] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [geoState, setGeoState] = useState<"idle" | "locating" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [lookup, setLookup] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; ai: AnalysisOutcome | null; uploadError?: string } | null>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: Picked[] = [];
    for (const f of Array.from(list)) {
      const err = validateImageFile(f);
      if (err) { toast.error(err); continue; }
      next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setPhotos((prev) => {
      const merged = [...prev, ...next];
      if (merged.length > MAX_IMAGES) toast.error(`You can attach up to ${MAX_IMAGES} photos.`);
      return merged.slice(0, MAX_IMAGES);
    });
  }

  async function setPoint(la: number, ln: number, src: Source, acc: number | null) {
    setLat(la); setLng(ln); setSource(src); setAccuracy(acc);
    setLatText(la.toFixed(6)); setLngText(ln.toFixed(6));
    setLookup(true);
    const r = await reverseGeocode(la, ln);
    setLookup(false);
    if (r) {
      if (r.road) setRoad((v) => v || r.road!);
      if (r.address) setAddress(r.address);
    }
  }

  function useGps() {
    if (!("geolocation" in navigator)) {
      setGeoState("error");
      setGeoError("This device doesn't support location. Pick the point on the map or type coordinates.");
      return;
    }
    setGeoState("locating"); setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("idle");
        setPoint(pos.coords.latitude, pos.coords.longitude, "gps", pos.coords.accuracy);
      },
      (err) => {
        setGeoState("error");
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Pick the point on the map or type coordinates."
            : "Couldn't get your location. Pick the point on the map or type coordinates.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function applyManual() {
    const la = Number(latText), ln = Number(lngText);
    if (!latText || !lngText || Number.isNaN(la) || Number.isNaN(ln) || la < -90 || la > 90 || ln < -180 || ln > 180) {
      toast.error("Enter a valid latitude (−90 to 90) and longitude (−180 to 180).");
      return;
    }
    setPoint(la, ln, "manual", null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) return toast.error("Add at least one photo of the damage.");
    if (lat == null || lng == null || !source) return toast.error("Set the damage location.");
    if (description.trim().length < 10) return toast.error("Describe the damage in at least 10 characters.");

    setSubmitting("Creating complaint…");
    const { data: created, error } = await supabase
      .from("complaints")
      .insert({
        user_id: user.id,
        reference: "pending",
        description: description.trim(),
        road_name: road.trim() || null,
        address: address.trim() || null,
        latitude: lat,
        longitude: lng,
        location_source: source,
        location_accuracy_m: accuracy,
      })
      .select("id, reference")
      .single();
    if (error || !created) {
      setSubmitting(null);
      return toast.error(`Could not submit: ${error?.message ?? "unknown error"}`);
    }

    let uploadError: string | undefined;
    try {
      for (let i = 0; i < photos.length; i++) {
        setSubmitting(`Uploading photo ${i + 1} of ${photos.length}…`);
        await uploadComplaintImage(created.id, photos[i].file, "report", user.id);
      }
    } catch (err) {
      uploadError = errorMessage(err);
    }

    let ai: AnalysisOutcome | null = null;
    if (!uploadError) {
      setSubmitting("Running AI analysis…");
      try {
        ai = await analyze({ data: { complaintId: created.id } });
      } catch {
        ai = { status: "failed", message: "AI analysis unavailable. Your complaint will be inspected manually." };
      }
    }
    setSubmitting(null);
    qc.invalidateQueries({ queryKey: ["complaints"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    setDone({ reference: created.reference, ai, uploadError });
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-card p-8 text-center shadow-card">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-bold">Complaint submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your reference number is</p>
        <p className="mt-1 font-mono text-2xl font-semibold">{done.reference}</p>
        {done.uploadError ? (
          <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            The complaint was created, but a photo failed to upload: {done.uploadError}
          </p>
        ) : null}
        {done.ai ? (
          <p className="mt-4 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{done.ai.message}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/app/complaints/$reference" params={{ reference: done.reference }}>View complaint</Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Report another</Button>
        </div>
      </div>
    );
  }

  const approx = source === "map" || (source === "gps" && accuracy != null && accuracy > 50);

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Report road damage" description="Photos, location and a short description help inspectors act faster." />

      <section className="rounded-lg border bg-card p-5 shadow-card">
        <h2 className="font-display font-bold">1. Photos</h2>
        <p className="mt-1 text-sm text-muted-foreground">JPG, PNG or WebP, up to 10 MB each, max {MAX_IMAGES}.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}><ImagePlus /> Upload photos</Button>
          <Button type="button" variant="outline" onClick={() => camRef.current?.click()}><Camera /> Take photo</Button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Upload photos" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Take photo with camera" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>
        {photos.length ? (
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p.url} className="relative aspect-square overflow-hidden rounded-md border">
                <img src={p.url} alt={`Selected photo ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => { URL.revokeObjectURL(p.url); setPhotos((prev) => prev.filter((x) => x !== p)); }}
                  className="absolute right-1 top-1 rounded-full bg-foreground/80 p-1 text-background"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-card">
        <h2 className="font-display font-bold">2. Location</h2>
        <p className="mt-1 text-sm text-muted-foreground">Use your current location, tap the map, or type coordinates.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="ink" onClick={useGps} disabled={geoState === "locating"}>
            {geoState === "locating" ? <Loader2 className="animate-spin" /> : <Crosshair />} Use my current location
          </Button>
          {source ? (
            <span className="inline-flex items-center gap-1 text-sm">
              <MapPin className="size-4 text-primary" aria-hidden />
              {source === "gps" ? `GPS${accuracy != null ? ` (±${Math.round(accuracy)} m)` : ""}` : source === "map" ? "Selected on map" : "Entered manually"}
              {approx ? <span className="ml-1 rounded bg-accent px-1.5 text-xs text-accent-foreground">Approximate</span> : null}
            </span>
          ) : null}
        </div>
        {geoError ? <p className="mt-2 text-sm text-destructive">{geoError}</p> : null}
        <div className="mt-4">
          <LocationPicker lat={lat} lng={lng} accuracy={accuracy} onPick={(a, b) => setPoint(a, b, "map", null)} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="lat">Latitude</Label>
            <Input id="lat" inputMode="decimal" value={latText} onChange={(e) => setLatText(e.target.value)} placeholder="e.g. 17.385044" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lng">Longitude</Label>
            <Input id="lng" inputMode="decimal" value={lngText} onChange={(e) => setLngText(e.target.value)} placeholder="e.g. 78.486671" />
          </div>
          <Button type="button" variant="outline" onClick={applyManual}>Set coordinates</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="road">Road name {lookup ? <span className="text-xs text-muted-foreground">(looking up…)</span> : null}</Label>
            <Input id="road" value={road} onChange={(e) => setRoad(e.target.value)} maxLength={200} placeholder="If known" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addr">Address / landmark</Label>
            <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={500} placeholder="If known" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 shadow-card">
        <h2 className="font-display font-bold">3. Description</h2>
        <Label htmlFor="desc" className="sr-only">Description</Label>
        <Textarea
          id="desc"
          className="mt-3 min-h-28"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="What's wrong, how big is it, which lane, any hazard to traffic?"
          required
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/2000</p>
      </section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={!!submitting}>
          {submitting ? <><Loader2 className="animate-spin" /> {submitting}</> : "Submit complaint"}
        </Button>
      </div>
    </form>
  );
}
