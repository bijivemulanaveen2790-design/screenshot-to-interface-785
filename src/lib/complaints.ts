import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Complaint = Database["public"]["Tables"]["complaints"]["Row"];
export type ComplaintImage = Database["public"]["Tables"]["complaint_images"]["Row"];
export type AiDetection = Database["public"]["Tables"]["ai_detections"]["Row"];
export type StatusHistory = Database["public"]["Tables"]["status_history"]["Row"];
export type ComplaintUpdate = Database["public"]["Tables"]["complaint_updates"]["Row"];
export type RepairAssignment = Database["public"]["Tables"]["repair_assignments"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export const BUCKET = "complaint-photos";

/** Columns safe to list (no internal reviewer ids). */
const LIST_COLUMNS =
  "id, reference, is_demo, description, road_name, address, latitude, longitude, location_source, location_accuracy_m, status, ai_status, ai_damage_type, ai_severity, ai_confidence, damage_type, severity, assigned_team, created_at, updated_at, resolved_at";

export type ComplaintListItem = Pick<
  Complaint,
  | "id"
  | "reference"
  | "is_demo"
  | "description"
  | "road_name"
  | "address"
  | "latitude"
  | "longitude"
  | "location_source"
  | "location_accuracy_m"
  | "status"
  | "ai_status"
  | "ai_damage_type"
  | "ai_severity"
  | "ai_confidence"
  | "damage_type"
  | "severity"
  | "assigned_team"
  | "created_at"
  | "updated_at"
  | "resolved_at"
>;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Citizen: RLS returns only the signed-in user's complaints. Staff: everything. */
export const myComplaintsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["complaints", "mine", userId],
    queryFn: async () =>
      check(
        await supabase
          .from("complaints")
          .select(LIST_COLUMNS)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ) as ComplaintListItem[],
  });

export const allComplaintsQuery = () =>
  queryOptions({
    queryKey: ["complaints", "all"],
    queryFn: async () =>
      check(
        await supabase
          .from("complaints")
          .select(LIST_COLUMNS)
          .order("created_at", { ascending: false })
          .limit(1000),
      ) as ComplaintListItem[],
  });

export interface ComplaintDetail {
  complaint: Complaint;
  images: ComplaintImage[];
  detections: AiDetection[];
  history: StatusHistory[];
  updates: ComplaintUpdate[];
  assignments: RepairAssignment[];
}

export const complaintDetailQuery = (reference: string) =>
  queryOptions({
    queryKey: ["complaint", reference],
    queryFn: async (): Promise<ComplaintDetail | null> => {
      const complaint = check(
        await supabase.from("complaints").select("*").eq("reference", reference).maybeSingle(),
      );
      if (!complaint) return null;
      const id = complaint.id;
      const [images, detections, history, updates, assignments] = await Promise.all([
        supabase.from("complaint_images").select("*").eq("complaint_id", id).order("created_at"),
        supabase.from("ai_detections").select("*").eq("complaint_id", id),
        supabase.from("status_history").select("*").eq("complaint_id", id).order("created_at"),
        supabase.from("complaint_updates").select("*").eq("complaint_id", id).order("created_at"),
        supabase.from("repair_assignments").select("*").eq("complaint_id", id).order("created_at"),
      ]);
      return {
        complaint,
        images: check(images),
        detections: check(detections),
        history: check(history),
        updates: check(updates),
        assignments: check(assignments),
      };
    },
  });

export const notificationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["notifications", userId],
    queryFn: async () =>
      check(
        await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(200),
      ),
  });

export async function markNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error(error.message);
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}

function extFor(type: string) {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}

export async function uploadComplaintImage(
  complaintId: string,
  file: File,
  kind: "report" | "after_repair",
  userId: string,
) {
  const path = `${complaintId}/${kind}-${crypto.randomUUID()}.${extFor(file.type)}`;
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(`Upload failed for ${file.name}: ${up.error.message}`);
  const { error } = await supabase.from("complaint_images").insert({
    complaint_id: complaintId,
    storage_path: path,
    kind,
    content_type: file.type,
    size_bytes: file.size,
    uploaded_by: userId,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** Friendly message from a Postgres/RPC error. */
export function errorMessage(e: unknown) {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong";
}
