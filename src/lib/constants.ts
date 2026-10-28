export const STATUSES = ["Reported", "Under Review", "In Progress", "Resolved"] as const;
export type ComplaintStatus = (typeof STATUSES)[number];

export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const DAMAGE_TYPES = [
  "pothole",
  "alligator_crack",
  "longitudinal_crack",
  "transverse_crack",
  "rutting",
  "patch_failure",
  "other",
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const DAMAGE_LABELS: Record<DamageType, string> = {
  pothole: "Pothole",
  alligator_crack: "Alligator crack",
  longitudinal_crack: "Longitudinal crack",
  transverse_crack: "Transverse crack",
  rutting: "Rutting",
  patch_failure: "Patch failure",
  other: "Other damage",
};

export const STATUS_DESCRIPTIONS: Record<ComplaintStatus, string> = {
  Reported: "A citizen has submitted the complaint.",
  "Under Review": "An inspector is reviewing the report.",
  "In Progress": "Repair work has started.",
  Resolved: "Repair completed and confirmed by an inspector.",
};

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES = 6;

export function damageLabel(t: string | null | undefined) {
  if (!t) return "Not classified";
  return DAMAGE_LABELS[t as DamageType] ?? t;
}

/** Final severity: inspector-reviewed value wins over the AI estimate. */
export function effectiveSeverity(c: { severity: Severity | null; ai_severity: Severity | null }) {
  return c.severity ?? c.ai_severity ?? null;
}

export function effectiveDamageType(c: { damage_type: DamageType | null; ai_damage_type: DamageType | null }) {
  return c.damage_type ?? c.ai_damage_type ?? null;
}

export function validateImageFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: only JPG, PNG or WebP photos are accepted.`;
  }
  if (file.size > MAX_IMAGE_BYTES) return `${file.name}: photo is larger than 10 MB.`;
  if (file.size === 0) return `${file.name}: file is empty.`;
  return null;
}
