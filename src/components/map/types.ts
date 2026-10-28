import type { ComplaintStatus, DamageType, Severity } from "@/lib/constants";

export interface MapComplaint {
  id: string;
  reference: string;
  is_demo: boolean;
  road_name: string | null;
  latitude: number;
  longitude: number;
  status: ComplaintStatus;
  severity: Severity | null;
  damage_type: DamageType | null;
}
