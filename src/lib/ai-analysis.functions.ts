import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { estimateSeverity, normalizeLabel, type ScoredDetection } from "./severity";

/**
 * Expected FastAPI contract (one image per request):
 *   POST {AI_DETECTION_URL}/detect   multipart/form-data, field "file"
 *   optional header: Authorization: Bearer {AI_DETECTION_API_KEY}
 *   200 → { model_version?: string, image_width: number, image_height: number,
 *           detections: [{ label: string, confidence: 0..1, bbox: [x1, y1, x2, y2] }] }
 */
const detectionResponse = z.object({
  model_version: z.string().optional(),
  image_width: z.number().positive(),
  image_height: z.number().positive(),
  detections: z.array(
    z.object({
      label: z.string().min(1),
      confidence: z.number().min(0).max(1),
      bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    }),
  ),
});

export type AnalysisOutcome =
  | { status: "unavailable"; message: string }
  | { status: "failed"; message: string }
  | { status: "completed"; message: string; severity: string | null; detections: number };

export const analyzeComplaint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ complaintId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<AnalysisOutcome> => {
    const { supabase, userId } = context;

    // Caller must own the complaint or be staff — RLS enforces visibility.
    const { data: complaint, error } = await supabase
      .from("complaints")
      .select("id, user_id")
      .eq("id", data.complaintId)
      .maybeSingle();
    if (error || !complaint) throw new Error("Complaint not found");
    if (complaint.user_id !== userId) {
      const { data: staff } = await supabase.rpc("is_staff", { _user_id: userId });
      if (!staff) throw new Error("Not allowed");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const baseUrl = process.env["AI_DETECTION_URL"]?.replace(/\/+$/, "");
    const apiKey = process.env["AI_DETECTION_API_KEY"];

    if (!baseUrl) {
      const message =
        "AI analysis unavailable — no detection model is connected yet. An inspector will assess this complaint manually.";
      await supabaseAdmin
        .from("complaints")
        .update({ ai_status: "unavailable", ai_message: message })
        .eq("id", complaint.id);
      return { status: "unavailable", message };
    }

    const { data: images } = await supabaseAdmin
      .from("complaint_images")
      .select("id, storage_path, content_type")
      .eq("complaint_id", complaint.id)
      .eq("kind", "report");

    try {
      if (!images || images.length === 0) throw new Error("No report photos to analyse");
      const scored: ScoredDetection[] = [];
      const rows: {
        complaint_id: string;
        image_id: string;
        label: ScoredDetection["label"];
        raw_label: string;
        confidence: number;
        bbox: { x1: number; y1: number; x2: number; y2: number };
        image_width: number;
        image_height: number;
        model_version: string | null;
      }[] = [];
      let modelVersion: string | null = null;

      for (const img of images) {
        const file = await supabaseAdmin.storage.from("complaint-photos").download(img.storage_path);
        if (file.error || !file.data) throw new Error("Could not read a stored photo");
        const form = new FormData();
        form.append("file", new Blob([await file.data.arrayBuffer()], { type: img.content_type }), "image");
        const res = await fetch(`${baseUrl}/detect`, {
          method: "POST",
          body: form,
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
          signal: AbortSignal.timeout(45_000),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error(`AI detection failed [${res.status}]: ${body.slice(0, 500)}`);
          throw new Error(`Detection service returned ${res.status}`);
        }
        const parsed = detectionResponse.parse(await res.json());
        modelVersion = parsed.model_version ?? modelVersion;
        for (const d of parsed.detections) {
          const label = normalizeLabel(d.label);
          scored.push({
            label,
            confidence: d.confidence,
            bbox: d.bbox,
            imageWidth: parsed.image_width,
            imageHeight: parsed.image_height,
          });
          rows.push({
            complaint_id: complaint.id,
            image_id: img.id,
            label,
            raw_label: d.label,
            confidence: d.confidence,
            bbox: { x1: d.bbox[0], y1: d.bbox[1], x2: d.bbox[2], y2: d.bbox[3] },
            image_width: parsed.image_width,
            image_height: parsed.image_height,
            model_version: parsed.model_version ?? null,
          });
        }
      }

      const result = estimateSeverity(scored);
      await supabaseAdmin.from("ai_detections").delete().eq("complaint_id", complaint.id);
      if (rows.length) await supabaseAdmin.from("ai_detections").insert(rows);
      const message = result.severity
        ? `AI detected ${result.countedDetections} damage region(s). Severity is an automated estimate, not a certified engineering assessment.`
        : "AI did not detect road damage in the photos. An inspector will review manually.";
      await supabaseAdmin
        .from("complaints")
        .update({
          ai_status: "completed",
          ai_damage_type: result.dominantType,
          ai_severity: result.severity,
          ai_confidence: result.confidence,
          ai_severity_score: result.score,
          ai_model_version: modelVersion,
          ai_analyzed_at: new Date().toISOString(),
          ai_message: message,
        })
        .eq("id", complaint.id);
      return { status: "completed", message, severity: result.severity, detections: result.countedDetections };
    } catch (e) {
      console.error("AI analysis error", e);
      const message =
        "AI analysis unavailable — the detection service could not process the photos. An inspector will assess this complaint manually.";
      await supabaseAdmin
        .from("complaints")
        .update({ ai_status: "failed", ai_message: message })
        .eq("id", complaint.id);
      return { status: "failed", message };
    }
  });
